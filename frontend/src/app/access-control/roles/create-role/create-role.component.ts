import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RolesService } from '../../services/roles.service';
import { ModulePermission, Role } from '../../models/role.model';

const MODULES = ['CNOC', 'Dashboard', 'UCEM', 'SON', 'EMS', 'Help', 'UserManagement'];
const MODULE_LABELS: Record<string, string> = {
  CNOC: 'CNOC',
  Dashboard: 'Dashboard',
  UCEM: 'Ucem',
  SON: 'SON',
  EMS: 'EMS',
  Help: 'Help',
  UserManagement: 'User Management'
};

@Component({
  selector: 'app-create-role',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule, MatButtonModule, MatSnackBarModule],
  templateUrl: './create-role.component.html',
  styleUrl: './create-role.component.scss'
})
export class CreateRoleComponent implements OnInit {
  readonly modules = MODULES;
  form: FormGroup;
  editingId: string | null = null;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private rolesService: RolesService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      roleName: ['', Validators.required],
      description: [''],
      permissions: this.fb.array(MODULES.map(module => this.permissionGroup(module)))
    });
  }

  get permissions(): FormArray<FormGroup> {
    return this.form.get('permissions') as FormArray<FormGroup>;
  }

  moduleLabel(module: string): string {
    return MODULE_LABELS[module] || module;
  }

  private permissionGroup(module: string, value?: ModulePermission): FormGroup {
    return this.fb.group({
      module: [module],
      read: [value?.read ?? false],
      write: [value?.write ?? false],
      delete: [value?.delete ?? false]
    });
  }

  ngOnInit(): void {
    this.editingId = this.route.snapshot.queryParamMap.get('id');
    if (this.editingId) {
      this.loading = true;
      this.rolesService.getRole(this.editingId).subscribe({
        next: role => { this.patchRole(role); this.loading = false; this.cdr.markForCheck(); },
        error: err => { this.loading = false; this.snackBar.open(err?.error?.message || 'Unable to load role', 'Close', { duration: 3000 }); this.cdr.markForCheck(); }
      });
    }
  }

  private patchRole(role: Role): void {
    this.form.patchValue({ roleName: role.roleName, description: role.description });
    this.permissions.clear();
    this.modules.forEach(module => {
      const existing = role.permissions?.find(p => p.module === module);
      this.permissions.push(this.permissionGroup(module, existing));
    });
  }

  toggleAll(checked: boolean): void {
    this.permissions.controls.forEach(group => group.patchValue({ read: checked, write: checked, delete: checked }));
  }

  allChecked(): boolean {
    return this.permissions.controls.every(g => g.value.read && g.value.write && g.value.delete);
  }

  isModuleFullyChecked(group: FormGroup): boolean {
    return !!(group.value.read && group.value.write && group.value.delete);
  }

  toggleModule(group: FormGroup, checked: boolean): void {
    group.patchValue({ read: checked, write: checked, delete: checked });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Please enter a role name before submitting.', 'Close', { duration: 3500 });
      this.cdr.markForCheck();
      return;
    }
    const payload = {
      roleName: this.form.value.roleName,
      description: this.form.value.description,
      permissions: this.permissions.getRawValue() as ModulePermission[]
    };
    this.loading = true;
    const request$ = this.editingId
      ? this.rolesService.updateRole(this.editingId, payload)
      : this.rolesService.createRole(payload);

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open(this.editingId ? 'Role updated' : 'Role created', 'Close', { duration: 2500 });
        this.router.navigate(['/access-control/roles']);
        this.cdr.markForCheck();
      },
      error: err => {
        this.loading = false;
        this.snackBar.open(err?.error?.message || 'Unable to save role', 'Close', { duration: 3000 });
        this.cdr.markForCheck();
      }
    });
  }
}
