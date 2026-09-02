import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';

export const modulePermissionGuard = (module: string, action: 'read' | 'write' | 'delete'): CanActivateFn => {
  return () => {
    const permissions = inject(PermissionService);
    const router = inject(Router);
    return permissions.can(module, action) || router.parseUrl('/dashboard');
  };
};
