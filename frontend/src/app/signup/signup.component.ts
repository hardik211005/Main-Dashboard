import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject, of, timer } from 'rxjs';
import { catchError, map, switchMap, takeUntil } from 'rxjs/operators';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss'
})
export class SignupComponent implements OnInit, OnDestroy {
  signupForm: FormGroup;
  hidePassword = true;
  loading = false;

  formInvalid = true;
  usernameChecking = false;

  private destroy$ = new Subject<void>();

  slides = [
    {
      title: 'Effortlessly achieve your goals.',
      description:
        'We can automate tasks, retrieve data, or perform complex operations with ease, even with little technical knowledge.'
    },
    {
      title: 'Complete network visibility.',
      description: 'Monitor RAN performance and health across every site, in real time, from one dashboard.'
    },
    {
      title: 'Built for operations teams.',
      description: 'Secure access, fast insights, zero guesswork.'
    }
  ];
  currentSlide = 0;
  slideVisible = true;
  private slideInterval: any;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.signupForm = this.fb.group({
      name: ['', [Validators.required]],
      username: [
        '',
        [Validators.required, Validators.minLength(3)],
        [this.usernameTakenValidator()]
      ],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get name() { return this.signupForm.get('name'); }
  get username() { return this.signupForm.get('username'); }
  get email() { return this.signupForm.get('email'); }
  get password() { return this.signupForm.get('password'); }

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  ngOnInit(): void {
    this.startAutoRotate();

    this.signupForm.statusChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.deferUpdate(() => {
          this.formInvalid = status !== 'VALID';
          this.usernameChecking = this.username?.pending ?? false;
        });
      });

    this.deferUpdate(() => {
      this.formInvalid = this.signupForm.invalid;
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.slideInterval);
    this.destroy$.next();
    this.destroy$.complete();
  }

  private deferUpdate(fn: () => void): void {
    setTimeout(() => {
      fn();
      this.cdr.markForCheck();
    }, 0);
  }

  private startAutoRotate(): void {
    this.slideInterval = setInterval(() => {
      this.deferUpdate(() => { this.slideVisible = false; });
      setTimeout(() => {
        this.deferUpdate(() => {
          this.currentSlide = (this.currentSlide + 1) % this.slides.length;
          this.slideVisible = true;
        });
      }, 300);
    }, 3500);
  }

  goToSlide(index: number): void {
    if (index === this.currentSlide) return;

    clearInterval(this.slideInterval);

    this.deferUpdate(() => { this.slideVisible = false; });
    setTimeout(() => {
      this.deferUpdate(() => {
        this.currentSlide = index;
        this.slideVisible = true;
      });
    }, 300);

    this.startAutoRotate();
  }

  private usernameTakenValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value || control.value.length < 3) {
        return of(null);
      }
      return timer(500).pipe(
        switchMap(() => this.authService.checkUsernameAvailable(control.value)),
        map(isAvailable => (isAvailable ? null : { taken: true })),
        catchError(() => of(null))
      );
    };
  }

  onSubmit(): void {
    if (this.signupForm.invalid || this.signupForm.pending) {
      this.signupForm.markAllAsTouched();
      return;
    }

    this.deferUpdate(() => { this.loading = true; });

    const { name, username, email, password } = this.signupForm.value;

    this.authService.signup(name, username, email, password).subscribe({
      next: () => {
        this.deferUpdate(() => { this.loading = false; });
        this.snackBar.open('Account created! Please log in.', 'Close', { duration: 3000 });
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.deferUpdate(() => { this.loading = false; });
        const msg = err?.error?.message || 'Signup failed. Please try again.';
        this.snackBar.open(msg, 'Close', { duration: 3000 });
      }
    });
  }
}