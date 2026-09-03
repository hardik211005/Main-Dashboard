import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { timeout } from 'rxjs/operators';
import { UsersService } from '../../services/users.service';
import { AccessUser } from '../../models/user.model';
import { HasPermissionDirective } from '../../directives/has-permission.directive';

const REQUEST_TIMEOUT_MS = 15000;

@Component({
  selector: 'app-user-details',
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
  templateUrl: './user-details.component.html',
  styleUrl: './user-details.component.scss'
})
export class UserDetailsComponent implements OnInit {
  users = signal<AccessUser[]>([]);
  loading = signal(true);
  loadError = signal<string | null>(null);
  searchTerm = signal('');

  filteredUsers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const users = this.users();
    if (!term) return users;
    return users.filter(user =>
      user.name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      (user.ecId || '').toLowerCase().includes(term) ||
      (user.mobileNumber || '').toLowerCase().includes(term)
    );
  });

  constructor(private usersService: UsersService, private router: Router, private snackBar: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.usersService.getUsers().pipe(timeout(REQUEST_TIMEOUT_MS)).subscribe({
      next: users => { this.users.set(users); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        const message = err?.name === 'TimeoutError'
          ? 'The server took too long to respond. Confirm the backend is running on port 5050 and try again.'
          : (err?.error?.message || err?.message || 'Unable to load users. Check that the backend server is running.');
        this.loadError.set(message);
        this.snackBar.open(message, 'Close', { duration: 4000 });
      }
    });
  }

  edit(user: AccessUser): void {
    this.router.navigate(['/access-control/users/create'], { queryParams: { id: user.id } });
  }

  delete(user: AccessUser): void {
    if (!confirm(`Delete user "${user.name}"?`)) return;
    this.usersService.deleteUser(user.id).subscribe({
      next: () => { this.snackBar.open('User deleted', 'Close', { duration: 2500 }); this.load(); },
      error: err => this.snackBar.open(err?.error?.message || 'Unable to delete user', 'Close', { duration: 3000 })
    });
  }
}
