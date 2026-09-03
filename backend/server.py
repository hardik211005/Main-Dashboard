import json
import os
import re
import threading
import time
import uuid
from functools import wraps
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sock import Sock

app = Flask(__name__)
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
    supports_credentials=False,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
)
sock = Sock(app)

JWT_SECRET = os.environ.get("JWT_SECRET", "change-this-secret-key")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 2

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USERS_FILE = os.path.join(BASE_DIR, "data", "users.json")
BLACKLIST_FILE = os.path.join(BASE_DIR, "data", "blacklist.json")
EMPLOYEES_FILE = os.path.join(BASE_DIR, "data", "employees.json")
DASHBOARD_FILE = os.path.join(BASE_DIR, "data", "dashboard.json")
ROLES_FILE = os.path.join(BASE_DIR, "data", "roles.json")

ws_clients = set()
ws_lock = threading.Lock()


def read_json(path):
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        content = f.read().strip()
        return json.loads(content) if content else []


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def get_roles():
    return read_json(ROLES_FILE)


def get_user_role(user):
    roles = get_roles()
    role_id = user.get("roleId") or "RID002"
    role = next((r for r in roles if r.get("id") == role_id), None)
    if not role:
        role = next((r for r in roles if r.get("id") == "RID002"), None)
    return role


def resolved_user(user):
    role = get_user_role(user)
    return {
        "id": user["id"],
        "name": user.get("name", ""),
        "username": user.get("username", ""),
        "email": user.get("email", ""),
        "roleId": role.get("id") if role else user.get("roleId"),
        "roleName": role.get("roleName") if role else "Viewer",
        "permissions": role.get("permissions", []) if role else [],
    }


def create_token(user):
    payload = {
        "id": user["id"],
        "username": user.get("username", ""),
        "email": user.get("email", ""),
        "name": user.get("name", ""),
        "roleId": user.get("roleId") or "RID002",
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token):
    blacklist = read_json(BLACKLIST_FILE)
    if token in blacklist:
        return None, "Token has been logged out. Please login again."

    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM]), None
    except jwt.ExpiredSignatureError:
        return None, "Token expired"
    except jwt.InvalidTokenError:
        return None, "Invalid token"


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"message": "No token provided"}), 401

        token = auth_header.split(" ", 1)[1].strip()
        payload, error = decode_token(token)
        if error:
            status = 401 if "logged out" in error else 403
            return jsonify({"message": error}), status

        request.user = payload
        request.token = token
        return f(*args, **kwargs)

    return decorated


def has_permission(payload, module, action):
    users = read_json(USERS_FILE)
    user = next((u for u in users if u.get("id") == payload.get("id")), None)
    if not user:
        return False
    role = get_user_role(user)
    return any(
        p.get("module") == module and bool(p.get(action, False))
        for p in (role or {}).get("permissions", [])
    )


def permission_required(module, action):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not has_permission(request.user, module, action):
                return jsonify({
                    "message": f"Permission denied: {action} access to {module} is required"
                }), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


def next_role_id(roles):
    nums = []
    for role in roles:
        match = role.get("id", "").replace("RID", "")
        if match.isdigit():
            nums.append(int(match))
    return f"RID{(max(nums, default=0) + 1):03d}"


def public_access_user(user):
    result = {k: v for k, v in user.items() if k != "password"}
    role = get_user_role(user)
    result["roleId"] = role.get("id") if role else user.get("roleId")
    result["roleName"] = role.get("roleName") if role else "Viewer"
    return result


def generate_username(data, users):
    requested = (data.get("username") or data.get("userName") or "").strip()
    if requested:
        return requested

    email = (data.get("email") or "").strip()
    base = email.split("@", 1)[0] if "@" in email else ""
    if not base:
        base = re.sub(r"[^a-z0-9]+", "", (data.get("name") or "user").lower()) or "user"

    candidate = base
    counter = 1
    taken = {u.get("username", "").lower() for u in users}
    while candidate.lower() in taken:
        counter += 1
        candidate = f"{base}{counter}"
    return candidate


# ---------------- Authentication ----------------

@app.route("/api/check-username", methods=["GET"])
def check_username():
    username = request.args.get("username", "").strip()
    if not username:
        return jsonify({"available": False}), 400

    users = read_json(USERS_FILE)
    taken = any(u.get("username", "").lower() == username.lower() for u in users)
    return jsonify({"available": not taken})


@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not name or not username or not email or not password:
        return jsonify({"message": "Name, username, email and password are required"}), 400
    if len(username) < 3:
        return jsonify({"message": "Username must be at least 3 characters"}), 400

    users = read_json(USERS_FILE)
    if any(u.get("username", "").lower() == username.lower() for u in users):
        return jsonify({"message": "This username is already taken"}), 409
    if any(u.get("email", "").lower() == email.lower() for u in users):
        return jsonify({"message": "User already exists with this email"}), 409

    roles = get_roles()
    viewer = next((r for r in roles if r.get("roleName", "").lower() == "viewer"), None)
    default_role_id = viewer.get("id") if viewer else (roles[0].get("id") if roles else None)

    hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    new_user = {
        "id": str(uuid.uuid4()),
        "name": name,
        "username": username,
        "email": email,
        "password": hashed_pw,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "roleId": default_role_id,
        "createdBy": "self-signup",
    }

    users.append(new_user)
    write_json(USERS_FILE, users)
    return jsonify({"message": "User registered successfully"}), 201


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"message": "Username and password are required"}), 400

    users = read_json(USERS_FILE)
    user = next((u for u in users if u.get("username", "").lower() == username.lower()), None)

    if not user or not bcrypt.checkpw(password.encode("utf-8"), user["password"].encode("utf-8")):
        return jsonify({"message": "Invalid user name or password"}), 401

    role = get_user_role(user)
    if user.get("expiryDate"):
        try:
            expiry = datetime.fromisoformat(user["expiryDate"].replace("Z", "+00:00"))
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
            if expiry < datetime.now(timezone.utc):
                return jsonify({"message": "Account has expired"}), 403
        except ValueError:
            pass

    token = create_token(user)
    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": resolved_user(user),
    })


@app.route("/api/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    new_password = data.get("newPassword")

    if not email or not new_password:
        return jsonify({"message": "Email and new password are required"}), 400
    if len(new_password) < 6:
        return jsonify({"message": "Password must be at least 6 characters"}), 400

    users = read_json(USERS_FILE)
    user = next((u for u in users if u["email"] == email), None)
    if not user:
        return jsonify({"message": "No account found with this email"}), 404

    user["password"] = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    write_json(USERS_FILE, users)
    return jsonify({"message": "Password reset successful"})


@app.route("/api/logout", methods=["POST"])
@token_required
def logout():
    blacklist = read_json(BLACKLIST_FILE)
    blacklist.append(request.token)
    write_json(BLACKLIST_FILE, blacklist)
    return jsonify({"message": "Logged out successfully"})


@app.route("/api/me", methods=["GET"])
@token_required
def me():
    users = read_json(USERS_FILE)
    user = next((u for u in users if u.get("id") == request.user.get("id")), None)
    return jsonify({"user": resolved_user(user) if user else request.user})


# ---------------- Dashboard ----------------

@app.route("/api/dashboard", methods=["GET"])
@token_required
def get_dashboard():
    if not has_permission(request.user, "Dashboard", "read"):
        return jsonify({"message": "Dashboard read permission required"}), 403

    try:
        data = read_json(DASHBOARD_FILE)
        if not data:
            return jsonify({"message": "Dashboard data not found"}), 404
        return jsonify(data)
    except Exception as e:
        return jsonify({"message": f"Failed to load dashboard data: {str(e)}"}), 500


# ---------------- Access Control: Roles ----------------

@app.route("/api/roles", methods=["GET"])
@token_required
@permission_required("UserManagement", "read")
def list_roles():
    return jsonify(get_roles())


@app.route("/api/roles/<role_id>", methods=["GET"])
@token_required
@permission_required("UserManagement", "read")
def get_role(role_id):
    role = next((r for r in get_roles() if r.get("id") == role_id), None)
    if not role:
        return jsonify({"message": "Role not found"}), 404
    return jsonify(role)


@app.route("/api/roles", methods=["POST"])
@token_required
@permission_required("UserManagement", "write")
def create_role():
    data = request.get_json(silent=True) or {}
    role_name = (data.get("roleName") or "").strip()
    description = (data.get("description") or "").strip()
    permissions = data.get("permissions") or []

    if not role_name:
        return jsonify({"message": "Role name is required"}), 400

    roles = get_roles()
    if any(r.get("roleName", "").lower() == role_name.lower() for r in roles):
        return jsonify({"message": "A role with this name already exists"}), 409

    role = {
        "id": next_role_id(roles),
        "roleName": role_name,
        "description": description,
        "permissions": permissions,
    }
    roles.append(role)
    write_json(ROLES_FILE, roles)
    return jsonify({"message": "Role created", "role": role}), 201


@app.route("/api/roles/<role_id>", methods=["PUT"])
@token_required
@permission_required("UserManagement", "write")
def update_role(role_id):
    data = request.get_json(silent=True) or {}
    roles = get_roles()
    role = next((r for r in roles if r.get("id") == role_id), None)
    if not role:
        return jsonify({"message": "Role not found"}), 404

    new_name = data.get("roleName")
    if new_name is not None:
        new_name = str(new_name).strip()
        if not new_name:
            return jsonify({"message": "Role name cannot be empty"}), 400
        if any(r.get("id") != role_id and r.get("roleName", "").lower() == new_name.lower() for r in roles):
            return jsonify({"message": "A role with this name already exists"}), 409
        role["roleName"] = new_name

    if "description" in data:
        role["description"] = data["description"]
    if "permissions" in data:
        role["permissions"] = data["permissions"]

    write_json(ROLES_FILE, roles)
    return jsonify({"message": "Role updated", "role": role})


@app.route("/api/roles/<role_id>", methods=["DELETE"])
@token_required
@permission_required("UserManagement", "delete")
def delete_role(role_id):
    roles = get_roles()
    if not any(r.get("id") == role_id for r in roles):
        return jsonify({"message": "Role not found"}), 404

    users = read_json(USERS_FILE)
    if any(u.get("roleId") == role_id for u in users):
        return jsonify({"message": "Role cannot be deleted while users are assigned to it"}), 409

    roles = [r for r in roles if r.get("id") != role_id]
    write_json(ROLES_FILE, roles)
    return jsonify({"message": "Role deleted"})


# ---------------- Access Control: Users ----------------

@app.route("/api/access-users", methods=["GET"])
@token_required
@permission_required("UserManagement", "read")
def list_access_users():
    users = read_json(USERS_FILE)
    return jsonify([public_access_user(u) for u in users])


@app.route("/api/access-users", methods=["POST"])
@token_required
@permission_required("UserManagement", "write")
def create_access_user():
    data = request.get_json(silent=True) or {}
    users = read_json(USERS_FILE)
    roles = get_roles()

    first = (data.get("firstName") or "").strip()
    middle = (data.get("middleName") or "").strip()
    last = (data.get("lastName") or "").strip()
    name = (data.get("name") or " ".join(x for x in [first, middle, last] if x)).strip()
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""
    role_id = data.get("roleId") or data.get("roleName")

    if not name or not email or not password:
        return jsonify({"message": "Name, email and password are required"}), 400
    if len(password) < 6:
        return jsonify({"message": "Password must be at least 6 characters"}), 400
    if any(u.get("email", "").lower() == email.lower() for u in users):
        return jsonify({"message": "A user with this email already exists"}), 409

    if role_id and not any(r.get("id") == role_id or r.get("roleName") == role_id for r in roles):
        return jsonify({"message": "Selected role not found"}), 400

    if role_id and not any(r.get("id") == role_id for r in roles):
        role = next(r for r in roles if r.get("roleName") == role_id)
        role_id = role["id"]

    username = generate_username(data, users)
    hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    new_user = {
        "id": str(uuid.uuid4()),
        "name": name,
        "username": username,
        "email": email,
        "password": hashed_pw,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "firstName": first,
        "middleName": middle,
        "lastName": last,
        "ecId": (data.get("ecId") or f"EC-{uuid.uuid4().hex[:6].upper()}"),
        "mobileNumber": data.get("mobileNumber", ""),
        "roleId": role_id or "RID002",
        "groupName": data.get("groupName", ""),
        "expiryDate": data.get("expiryDate", ""),
        "createdBy": "admin",
    }

    users.append(new_user)
    write_json(USERS_FILE, users)
    return jsonify({"message": "User created", "user": public_access_user(new_user)}), 201


@app.route("/api/access-users/<user_id>", methods=["PUT"])
@token_required
@permission_required("UserManagement", "write")
def update_access_user(user_id):
    data = request.get_json(silent=True) or {}
    users = read_json(USERS_FILE)
    roles = get_roles()
    user = next((u for u in users if u.get("id") == user_id), None)
    if not user:
        return jsonify({"message": "User not found"}), 404

    for field in ["firstName", "middleName", "lastName", "mobileNumber", "groupName", "expiryDate"]:
        if field in data:
            user[field] = data[field]

    if "email" in data and data["email"] != user.get("email"):
        if any(u.get("id") != user_id and u.get("email", "").lower() == str(data["email"]).lower() for u in users):
            return jsonify({"message": "A user with this email already exists"}), 409
        user["email"] = data["email"]

    if "roleId" in data:
        if not any(r.get("id") == data["roleId"] for r in roles):
            return jsonify({"message": "Selected role not found"}), 400
        user["roleId"] = data["roleId"]

    if "password" in data and data["password"]:
        if len(data["password"]) < 6:
            return jsonify({"message": "Password must be at least 6 characters"}), 400
        user["password"] = bcrypt.hashpw(data["password"].encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    if any(user.get(k) for k in ["firstName", "middleName", "lastName"]):
        user["name"] = " ".join(
            x for x in [user.get("firstName", ""), user.get("middleName", ""), user.get("lastName", "")]
            if x
        )

    write_json(USERS_FILE, users)
    return jsonify({"message": "User updated", "user": public_access_user(user)})


@app.route("/api/access-users/<user_id>", methods=["DELETE"])
@token_required
@permission_required("UserManagement", "delete")
def delete_access_user(user_id):
    if request.user.get("id") == user_id:
        return jsonify({"message": "You can't delete your own account while logged in."}), 400
    users = read_json(USERS_FILE)
    remaining = [u for u in users if u.get("id") != user_id]
    if len(remaining) == len(users):
        return jsonify({"message": "User not found"}), 404
    write_json(USERS_FILE, remaining)
    return jsonify({"message": "User deleted"})


# ---------------- Real-time dashboard WebSocket ----------------

def broadcast(event):
    dead = []
    message = json.dumps(event)
    with ws_lock:
        clients = list(ws_clients)

    for ws in clients:
        try:
            ws.send(message)
        except Exception:
            dead.append(ws)

    if dead:
        with ws_lock:
            for ws in dead:
                ws_clients.discard(ws)


@sock.route("/ws")
def websocket(ws):
    # Authenticate using the first WebSocket message instead of putting
    # the JWT in the URL. Browser WebSocket clients cannot set Authorization
    # headers directly.
    try:
        raw = ws.receive()
        if not raw:
            return
        auth_message = json.loads(raw)
        if auth_message.get("type") != "auth" or not auth_message.get("token"):
            ws.send(json.dumps({"type": "error", "message": "Authentication required"}))
            return

        payload, error = decode_token(auth_message["token"])
        if error:
            ws.send(json.dumps({"type": "error", "message": error}))
            return

        if not has_permission(payload, "Dashboard", "read"):
            ws.send(json.dumps({"type": "error", "message": "Dashboard read permission required"}))
            return

        ws.send(json.dumps({"type": "authenticated"}))
        with ws_lock:
            ws_clients.add(ws)

        while True:
            raw = ws.receive()
            if raw is None:
                break
            # Client messages are intentionally ignored after authentication.
    finally:
        with ws_lock:
            ws_clients.discard(ws)


@app.route("/api/simulate-status-change", methods=["POST"])
@token_required
@permission_required("Dashboard", "write")
def simulate_status_change():
    data = request.get_json(silent=True) or {}
    command_id = data.get("commandId") or data.get("nodeId") or data.get("executionId")
    new_status = str(data.get("status", "")).upper()

    if not command_id or new_status not in {"RUNNING", "SUCCESS", "FAILED"}:
        return jsonify({
            "message": "commandId and status (RUNNING, SUCCESS, or FAILED) are required"
        }), 400

    dashboard = read_json(DASHBOARD_FILE)
    history = dashboard.get("executionHistory", [])
    item = next(
        (e for e in history if e.get("executionId") == command_id
         or e.get("nodeId") == command_id
         or e.get("nodeName") == command_id),
        None
    )
    if not item:
        return jsonify({"message": "Execution not found"}), 404

    old_status = item.get("status")
    item["status"] = new_status
    write_json(DASHBOARD_FILE, dashboard)

    total_commands = len(history)
    failed = sum(1 for e in history if e.get("status") == "FAILED")
    success = sum(1 for e in history if e.get("status") == "SUCCESS")
    success_rate = round((success / total_commands) * 100) if total_commands else 0

    event = {
        "type": "COMMAND_STATUS_CHANGED",
        "event": "COMMAND_STATUS_CHANGED",
        "executionId": item.get("executionId"),
        "commandId": item.get("nodeId"),
        "nodeId": item.get("nodeId"),
        "nodeName": item.get("nodeName"),
        "circle": item.get("circle"),
        "status": new_status,
        "previousStatus": old_status,
        "scheduledAt": item.get("scheduledAt"),
        "stats": {
            "commandExecuted": total_commands,
            "totalFailed": failed,
            "totalSuccess": success,
            "successRate": success_rate,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    broadcast(event)

    return jsonify({"message": "Status updated", "event": event})


# ---------------- Existing employee API ----------------

@app.route("/api/employees", methods=["GET"])
@token_required
def get_employees():
    employees = read_json(EMPLOYEES_FILE)
    return jsonify({"employees": employees})


@app.route("/api/employees", methods=["POST"])
@token_required
def create_employee():
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    email = data.get("email")
    department = data.get("department")
    position = data.get("position")
    salary = data.get("salary")

    if not name or not email or not department or not position:
        return jsonify({"message": "name, email, department and position are required"}), 400

    employees = read_json(EMPLOYEES_FILE)
    if any(e["email"] == email for e in employees):
        return jsonify({"message": "An employee with this email already exists"}), 409

    new_employee = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "department": department,
        "position": position,
        "salary": salary,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }

    employees.append(new_employee)
    write_json(EMPLOYEES_FILE, employees)
    return jsonify({"message": "Employee created", "employee": new_employee}), 201


@app.route("/api/employees/<employee_id>", methods=["PUT"])
@token_required
def update_employee(employee_id):
    data = request.get_json(silent=True) or {}
    employees = read_json(EMPLOYEES_FILE)
    employee = next((e for e in employees if e["id"] == employee_id), None)
    if not employee:
        return jsonify({"message": "Employee not found"}), 404

    for field in ["name", "email", "department", "position", "salary"]:
        if field in data:
            employee[field] = data[field]

    write_json(EMPLOYEES_FILE, employees)
    return jsonify({"message": "Employee updated", "employee": employee})


@app.route("/api/employees/<employee_id>", methods=["DELETE"])
@token_required
def delete_employee(employee_id):
    employees = read_json(EMPLOYEES_FILE)
    remaining = [e for e in employees if e["id"] != employee_id]
    if len(remaining) == len(employees):
        return jsonify({"message": "Employee not found"}), 404

    write_json(EMPLOYEES_FILE, remaining)
    return jsonify({"message": "Employee deleted"})


if __name__ == "__main__":
    # Render (and most hosts) give you the port to bind via $PORT and expect
    # 0.0.0.0 rather than localhost. Debug mode stays off unless you
    # explicitly set FLASK_DEBUG=1 locally.
    port = int(os.environ.get("PORT", 5050))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug, threaded=True, use_reloader=False)
