- **backend/** — Python (Flask) server. Users are stored in `data/users.json`
  (a plain JSON file, no database). Logout works by pushing the JWT token into
  `data/blacklist.json`, so a logged-out token can't be reused even if someone
  still has it.
- **frontend/** — Angular standalone components using Angular Material
  (`MatCard`, `MatFormField`, `MatButton`, `MatToolbar`, etc.)

Make sure Python 3.9+ is installed. Then:

```bash
cd backend
pip install -r requirements.txt
python server.py
```

Server runs on `http://localhost:5000`. Endpoints:
- `POST /api/signup` — { name, email, password }
- `POST /api/login` — { email, password } → returns JWT token
- `POST /api/logout` — requires `Authorization: Bearer <token>` header
- `GET /api/me` — protected route example

**Important:** change `JWT_SECRET` at the top of `server.py` before deploying
anywhere real — right now it's a placeholder string. You can set it via
environment variable instead:
```bash
export JWT_SECRET="something-long-and-random"
python server.py
```

Already tested end-to-end (signup → login → protected route → logout →
blacklisted token correctly rejected), so this works out of the box.

If you don't have an Angular project yet:

```bash
npm install -g @angular/cli
ng new frontend --standalone --routing --style=scss
cd frontend
ng add @angular/material
```

When `ng add @angular/material` asks, pick any theme, say Yes to typography,
and Yes to browser animations.

Then copy the files from this `frontend/src/app/` folder into your project's
`src/app/` folder (overwrite `app.routes.ts`, and add the `login/`,
`navbar/`, `dashboard/` folders, plus `auth.service.ts` and `auth.guard.ts`).

Make sure `src/app/app.config.ts` provides `HttpClient`:

```ts
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimationsAsync() // added automatically by `ng add @angular/material`
  ]
};
```

Run it:

```bash
ng serve
```

Visit `http://localhost:4200` → you'll land on `/login`.
1. Signup via `POST /api/signup` (you can build a similar signup component
   using `authService.signup()` — same pattern as login, just build a
   `signup.component.ts` copying `login.component.ts` and swap the call).
2. Login → JWT saved in `localStorage`, user redirected to `/dashboard`.
3. `/dashboard` is protected by `authGuard` — no token, no entry.
4. Logout button in the navbar calls `authService.logout()` → backend
   blacklists the token in `blacklist.json`, localStorage is cleared, and
   you're redirected back to `/login`.
- No database used anywhere — `users.json` and `blacklist.json` are the
  entire storage layer.
- Passwords are hashed with `bcrypt` before being written to the file —
  never store plain text passwords, even in a file-based system.
- This pattern works fine for small apps/prototypes. For anything with real
  concurrent users, flag to your boss that file-based storage isn't safe for
  concurrent writes (race conditions) — a proper DB (even SQLite) would be
  the next step.
