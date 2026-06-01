import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  loginForm: FormGroup;
  loading = false;
  errorMessage = '';

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value; //JSON  response
    this.authService.login(email, password).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const user = response.data;
          if (user.roles.includes('ADMIN') || user.roles.includes('OWNER')) {
            this.router.navigate(['/admin/dashboard']);
          } else if (user.roles.includes('DOCTOR')) {
            this.router.navigate(['/doctor/dashboard']);
          } else if (user.roles.includes('RECEPTIONIST')) {
            this.router.navigate(['/receptionist/dashboard']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        }
      },
      error: (error) => {
        this.loading = false;
        const err = error.error;
        if (err?.requirePasswordReset) {
          this.router.navigate(['/reset-password']);
          return;
        }

        this.errorMessage =
          err?.message || 'Login failed. Please try again.';
        this.errorMessage = error.error?.message || 'Login failed. Please try again.';
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}