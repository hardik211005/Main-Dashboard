import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { PermissionService } from '../services/permission.service';
import { PermissionAction } from '../models/role.model';

@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective {
  private current: [string, PermissionAction] | null = null;

  constructor(
    private templateRef: TemplateRef<unknown>,
    private viewContainer: ViewContainerRef,
    private permissionService: PermissionService
  ) {}

  @Input()
  set appHasPermission(value: [string, PermissionAction] | string[]) {
    if (value.length < 2) return;
    this.current = [value[0], value[1] as PermissionAction];
    this.update();
  }

  private update(): void {
    this.viewContainer.clear();
    if (this.current && this.permissionService.can(this.current[0], this.current[1])) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
