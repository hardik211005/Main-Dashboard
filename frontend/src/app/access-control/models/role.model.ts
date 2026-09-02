export interface ModulePermission {
  module: string;
  read: boolean;
  write: boolean;
  delete: boolean;
}

export interface Role {
  id: string;
  roleName: string;
  description: string;
  permissions: ModulePermission[];
}

export type PermissionAction = 'read' | 'write' | 'delete';
export type ModuleKey =
  | 'CNOC'
  | 'Dashboard'
  | 'UCEM'
  | 'SON'
  | 'EMS'
  | 'Help'
  | 'UserManagement';

export interface RolePayload {
  roleName: string;
  description: string;
  permissions: ModulePermission[];
}
