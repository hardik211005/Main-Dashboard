import { Routes } from '@angular/router';
import { AccessControlComponent } from './access-control.component';
import { RoleDetailsComponent } from './roles/role-details/role-details.component';
import { CreateRoleComponent } from './roles/create-role/create-role.component';
import { UserDetailsComponent } from './users/user-details/user-details.component';
import { CreateUserComponent } from './users/create-user/create-user.component';
import { modulePermissionGuard } from './guards/module-permission.guard';

export const accessControlRoutes: Routes = [
  {
    path: '',
    component: AccessControlComponent,
    canActivate: [modulePermissionGuard('UserManagement', 'read')],
    children: [
      { path: '', redirectTo: 'roles', pathMatch: 'full' },
      { path: 'roles', component: RoleDetailsComponent },
      {
        path: 'roles/create',
        component: CreateRoleComponent,
        canActivate: [modulePermissionGuard('UserManagement', 'write')]
      },
      { path: 'users', component: UserDetailsComponent },
      {
        path: 'users/create',
        component: CreateUserComponent,
        canActivate: [modulePermissionGuard('UserManagement', 'write')]
      }
    ]
  }
];
