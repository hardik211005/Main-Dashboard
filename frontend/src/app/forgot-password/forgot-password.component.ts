import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../auth.service';

type Step = 'email' | 'otp' | 'reset';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  // All state that changes async (HTTP callbacks, setInterval/setTimeout)
  // MUST be a signal in a zoneless app, otherwise the view never repaints.
  step = signal<Step>('email');
  loading = signal(false);
  hidePassword = signal(true);
  resendCooldown = signal(0);
  currentSlide = signal(0);
  slideVisible = signal(true);
  verifiedEmail = signal('');

  private resendTimer: any;
  private resetToken = '';

  emailForm: FormGroup;
  otpForm: FormGroup;
  resetForm: FormGroup;

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
  private slideInterval: any;

  currentSlideData = computed(() => this.slides[this.currentSlide()]);

  stepSubheading = computed(() => {
    const step = this.step();
    if (step === 'email') return `${this.greeting}! Enter your email to receive a verification code`;
    if (step === 'otp') return `We've sent a 6-digit code to ${this.verifiedEmail()}`;
    return 'Choose a new password for your account';
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });

    this.resetForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get email() { return this.emailForm.get('email'); }
  get otp() { return this.otpForm.get('otp'); }
  get newPassword() { return this.resetForm.get('newPassword'); }

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  ngOnInit(): void {
    this.startAutoRotate();
  }

  ngOnDestroy(): void {
    clearInterval(this.slideInterval);
    clearInterval(this.resendTimer);
  }

  private startAutoRotate(): void {
    this.slideInterval = setInterval(() => {
      this.slideVisible.set(false);
      setTimeout(() => {
        this.currentSlide.set((this.currentSlide() + 1) % this.slides.length);
        this.slideVisible.set(true);
      }, 300);
    }, 3500);
  }

  goToSlide(index: number): void {
    if (index === this.currentSlide()) return;

    clearInterval(this.slideInterval);

    this.slideVisible.set(false);
    setTimeout(() => {
      this.currentSlide.set(index);
      this.slideVisible.set(true);
    }, 300);

    this.startAutoRotate();
  }

  private startResendCooldown(): void {
    this.resendCooldown.set(30);
    clearInterval(this.resendTimer);
    this.resendTimer = setInterval(() => {
      this.resendCooldown.update((v) => v - 1);
      if (this.resendCooldown() <= 0) clearInterval(this.resendTimer);
    }, 1000);
  }

  sendOtp(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { email } = this.emailForm.value;

    this.authService.sendForgotPasswordOtp(email).subscribe({
      next: () => {
        this.loading.set(false);
        this.verifiedEmail.set(email);
        this.step.set('otp');
        this.otpForm.reset();
        this.startResendCooldown();
        this.snackBar.open('OTP sent to your email', 'Close', { duration: 3000 });
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message || 'Could not send OTP. Please try again.';
        this.snackBar.open(msg, 'Close', { duration: 3000 });
      }
    });
  }

  resendOtp(): void {
    if (this.resendCooldown() > 0 || this.loading()) return;
    this.sendOtp();
  }

  verifyOtp(): void {
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { otp } = this.otpForm.value;

    this.authService.verifyForgotPasswordOtp(this.verifiedEmail(), otp).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.resetToken = res.resetToken;
        this.step.set('reset');
        this.resetForm.reset();
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message || 'Invalid OTP. Please try again.';
        this.snackBar.open(msg, 'Close', { duration: 3000 });
      }
    });
  }

  changeEmail(): void {
    clearInterval(this.resendTimer);
    this.resendCooldown.set(0);
    this.step.set('email');
  }

  togglePasswordVisibility(): void {
    this.hidePassword.update((v) => !v);
  }

  onSubmit(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { newPassword } = this.resetForm.value;

    this.authService.resetPasswordWithToken(this.resetToken, newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.snackBar.open('Password reset! Please log in.', 'Close', { duration: 3000 });
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message || 'Could not reset password. Please try again.';
        this.snackBar.open(msg, 'Close', { duration: 3000 });
      }
    });
  }
}