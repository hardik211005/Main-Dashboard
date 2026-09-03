import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { timeout } from 'rxjs/operators';
import { RolesService } from '../../services/roles.service';
import { Role } from '../../models/role.model';
import { HasPermissionDirective } from '../../directives/has-permission.directive';

const REQUEST_TIMEOUT_MS = 15000;

@Component({
  selector: 'app-role-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatSnackBarModule,
    HasPermissionDirective
  ],
  templateUrl: './role-details.component.html',
  styleUrl: './role-details.component.scss'
})
export class RoleDetailsComponent implements OnInit {
  roles = signal<Role[]>([]);
  loading = signal(true);
  loadError = signal<string | null>(null);
  searchTerm = signal('');

  filteredRoles = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const roles = this.roles();
    if (!term) return roles;
    return roles.filter(role =>
      role.id.toLowerCase().includes(term) ||
      role.roleName.toLowerCase().includes(term) ||
      (role.description || '').toLowerCase().includes(term)
    );
  });

  constructor(
    private rolesService: RolesService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.load();
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.rolesService.getRoles().pipe(timeout(REQUEST_TIMEOUT_MS)).subscribe({
      next: roles => { this.roles.set(roles); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        const message = err?.name === 'TimeoutError'
          ? 'The server took too long to respond. Confirm the backend is running on port 5050 and try again.'
          : (err?.error?.message || err?.message || 'Unable to load roles. Check that the backend server is running.');
        this.loadError.set(message);
        this.snackBar.open(message, 'Close', { duration: 4000 });
      }
    });
  }

  edit(role: Role): void {
    this.router.navigate(['/access-control/roles/create'], { queryParams: { id: role.id } });
  }

  delete(role: Role): void {
    if (!confirm(`Delete role "${role.roleName}"?`)) return;
    this.rolesService.deleteRole(role.id).subscribe({
      next: () => { this.snackBar.open('Role deleted', 'Close', { duration: 2500 }); this.load(); },
      error: err => this.snackBar.open(err?.error?.message || 'Unable to delete role', 'Close', { duration: 3000 })
    });
  }
}
