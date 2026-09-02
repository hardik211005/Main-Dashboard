export interface AccessUser {
  id: string;
  name: string;
  username: string;
  email: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  ecId?: string;
  mobileNumber?: string;
  roleId?: string;
  roleName?: string;
  groupName?: string;
  expiryDate?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface CreateUserPayload {
  firstName: string;
  middleName: string;
  lastName: string;
  name?: string;
  email: string;
  password: string;
  roleId: string;
  groupName: string;
  mobileNumber: string;
  ecId?: string;
  expiryDate: string;
}
