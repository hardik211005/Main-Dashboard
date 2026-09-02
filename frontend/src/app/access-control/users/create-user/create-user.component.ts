import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RolesService } from '../../services/roles.service';
import { UsersService } from '../../services/users.service';
import { Role } from '../../models/role.model';
import { AccessUser } from '../../models/user.model';

// Letters, spaces, apostrophes and hyphens only — blocks numbers/symbols in names.
const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'-]*$/;

@Component({
  selector: 'app-create-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatButtonModule, MatIconModule, MatSnackBarModule],
  templateUrl: './create-user.component.html',
  styleUrl: './create-user.component.scss'
})
export class CreateUserComponent implements OnInit {
  form: FormGroup;
  roles: Role[] = [];
  editingId: string | null = null;
  loading = false;
  showPassword = false;
  showConfirmPassword = false;
  /** Native date input needs 'yyyy-MM-dd'; used as [min] so today/past dates can't even be picked. */
  minExpiryDate = CreateUserComponent.tomorrowIso();

  private static tomorrowIso(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private static minTomorrowValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null; // expiry date is optional; only validated when provided
      return control.value >= CreateUserComponent.tomorrowIso() ? null : { minDate: true };
    };
  }

  private static passwordsMatchValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const confirm = group.get('confirmPassword')?.value;
      if (!confirm) return null; // don't flag mismatch before the user starts typing confirmation
      return group.get('password')?.value === confirm ? null : { mismatch: true };
    };
  }

  constructor(
    private fb: FormBuilder,
    private rolesService: RolesService,
    private usersService: UsersService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(NAME_PATTERN)]],
      middleName: [''],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(NAME_PATTERN)]],
      contactNumber: [''],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(6)]],
      confirmPassword: [''],
      roleId: ['', Validators.required],
      groupName: [''],
      ecId: [''],
      expiryDate: ['', [CreateUserComponent.minTomorrowValidator()]]
    }, { validators: CreateUserComponent.passwordsMatchValidator() });
  }

  ngOnInit(): void {
    this.rolesService.getRoles().subscribe({
      next: roles => { this.roles = roles; this.cdr.markForCheck(); },
      error: err => { this.snackBar.open(err?.error?.message || 'Unable to load roles', 'Close', { duration: 3000 }); this.cdr.markForCheck(); }
    });

    this.editingId = this.route.snapshot.queryParamMap.get('id');
    if (this.editingId) {
      this.loading = true;
      this.usersService.getUsers().subscribe({
        next: users => {
          const user = users.find(u => u.id === this.editingId);
          if (user) this.patchUser(user);
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: err => { this.loading = false; this.snackBar.open(err?.error?.message || 'Unable to load user', 'Close', { duration: 3000 }); this.cdr.markForCheck(); }
      });
    } else {
      this.form.get('password')?.addValidators(Validators.required);
      this.form.get('confirmPassword')?.addValidators(Validators.required);
    }
  }

  private patchUser(user: AccessUser): void {
    this.form.patchValue({
      firstName: user.firstName || user.name?.split(' ')[0] || '',
      middleName: user.middleName || '',
      lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
      contactNumber: user.mobileNumber || '',
      email: user.email,
      roleId: user.roleId || '',
      groupName: user.groupName || '',
      ecId: user.ecId || '',
      expiryDate: user.expiryDate || ''
    });
  }

  /** Hovering the disabled Create/Update button reveals which fields are
   *  still missing/invalid (red borders + messages) instead of only the
   *  tooltip, so the user isn't left guessing why the button won't press. */
  revealMissingFields(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
    }
  }

  save(): void {    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Please fix the highlighted fields before submitting.', 'Close', { duration: 3500 });
      this.cdr.markForCheck();
      return;
    }

    const value = this.form.value;
    if (!this.editingId && value.password !== value.confirmPassword) {
      this.snackBar.open('Passwords do not match', 'Close', { duration: 3000 });
      return;
    }
    if (this.editingId && value.password && value.password !== value.confirmPassword) {
      this.snackBar.open('Passwords do not match', 'Close', { duration: 3000 });
      return;
    }

    const payload: any = {
      firstName: value.firstName,
      middleName: value.middleName,
      lastName: value.lastName,
      mobileNumber: value.contactNumber,
      email: value.email,
      roleId: value.roleId,
      groupName: value.groupName,
      ecId: value.ecId,
      expiryDate: value.expiryDate
    };
    if (value.password) payload.password = value.password;

    this.loading = true;
    const request$ = this.editingId
      ? this.usersService.updateUser(this.editingId, payload)
      : this.usersService.createUser({ ...payload, password: value.password });

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open(this.editingId ? 'User updated' : 'User created', 'Close', { duration: 2500 });
        this.router.navigate(['/access-control/users']);
        this.cdr.markForCheck();
      },
      error: err => {
        this.loading = false;
        this.snackBar.open(err?.error?.message || 'Unable to save user', 'Close', { duration: 3000 });
        this.cdr.markForCheck();
      }
    });
  }
}