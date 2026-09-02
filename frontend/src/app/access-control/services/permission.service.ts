import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ModulePermission, PermissionAction } from '../models/role.model';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private permissionsSubject = new BehaviorSubject<ModulePermission[]>(this.readStoredPermissions());
  permissions$ = this.permissionsSubject.asObservable();

  setPermissions(permissions: ModulePermission[] = []): void {
    this.permissionsSubject.next(permissions);
    localStorage.setItem('auth_permissions', JSON.stringify(permissions));
  }

  clear(): void {
    this.permissionsSubject.next([]);
    localStorage.removeItem('auth_permissions');
  }

  can(module: string, action: PermissionAction): boolean {
    return this.permissionsSubject.value.some(
      p => p.module === module && Boolean(p[action])
    );
  }

  private readStoredPermissions(): ModulePermission[] {
    const raw = localStorage.getItem('auth_permissions');
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
}
