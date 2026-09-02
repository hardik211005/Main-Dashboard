import { Component, OnDestroy, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit, OnDestroy, AfterViewInit {
  loginForm: FormGroup;
  hidePassword = true;
  loading = false;
  loginError: string | null = null;

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
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
      rememberMe: [true]
    });
  }

  get username() { return this.loginForm.get('username'); }
  get password() { return this.loginForm.get('password'); }

  ngOnInit(): void {
  this.startAutoRotate();
}

  ngOnDestroy(): void {
    clearInterval(this.slideInterval);
  }

  ngAfterViewInit(): void {
  setTimeout(() => {
    this.loginForm.updateValueAndValidity();
  });
}

    private startAutoRotate(): void {
    this.slideInterval = setInterval(() => {
      this.currentSlide = (this.currentSlide + 1) % this.slides.length;
    }, 3500);
  }

  goToSlide(index: number): void {
    if (index === this.currentSlide) return;

    clearInterval(this.slideInterval);
    this.currentSlide = index;
    this.startAutoRotate();
  }
  

  onSubmit(): void {
  if (this.loginForm.invalid) {
    this.loginForm.markAllAsTouched();
    return;
  }

  this.loading = true;
  this.loginError = null;

  const { username, password, rememberMe } = this.loginForm.value;

  this.authService.login(username, password, rememberMe).subscribe({
    next: async () => {
      await this.router.navigateByUrl('/dashboard', {
        replaceUrl: true
      });

      this.loading = false;
    },

    error: (err) => {
      this.loading = false;

      const msg =
        err?.error?.message || 'Invalid user name or password.';

      this.loginError = msg;

      this.snackBar.open(msg, 'Close', {
        duration: 3000
      });
    }
  });
}
}