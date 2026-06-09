import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ROLES, Role, DEPARTMENTS } from '../../../core/models/user.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  registerForm: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';

  roles = ROLES;
  departments = DEPARTMENTS;
  selectedRole: Role | null = null;
  showMedicalFields = false;

  qualificationChips: string[] = [];
  newQualification = '';
  qualificationError = '';

  availabilityChips: string[] = [];
  newAvailabilitySlot = '';

  Strength = '';
  strengthColor = 'red';

  commonTimeSlots = [
    '09:00-12:00',
    '09:00-13:00',
    '10:00-13:00',
    '14:00-17:00',
    '14:00-18:00',
    '18:00-21:00',
  ];

  constructor() {

    this.registerForm = this.fb.group(
      {
        name: ['', [Validators.required, Validators.pattern(/^[A-Za-z\s]+$/)]],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', [Validators.required, Validators.pattern(/^\d+$/), Validators.minLength(10), Validators.maxLength(10)]],
        department: ['', Validators.required],
        designation: ['', [Validators.required, Validators.pattern(/^[A-Za-z\s]+$/)]],
        roles: ['', Validators.required],
        medicalRegistrationNo: [''],
        specialization: [''],
        consultationFee: [null],
        password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  checkPasswordStrength(): void {

    const password = this.registerForm.get('password')?.value || '';

    let score = 0;

    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[@$!%*?&]/.test(password)) score++;

    switch (score) {
      case 0:
      case 1:
      case 2:
        this.Strength = 'Weak';
        this.strengthColor = 'red';
        break;

      case 3:
      case 4:
        this.Strength = 'Medium';
        this.strengthColor = 'orange';
        break;

      case 5:
        this.Strength = 'Strong';
        this.strengthColor = 'green';
        break;

      default:
        this.Strength = '';
    }
  }
  passwordMatchValidator(control: AbstractControl) {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  onRoleChange(): void {
    const role = this.registerForm.get('roles')?.value as Role;
    this.selectedRole = role;
    this.showMedicalFields = ['DOCTOR', 'NURSE', 'LAB_TECH', 'PHARMACIST'].includes(role);
  }
  addQualification(): void {
    const qualification = this.newQualification.trim();
    if (!qualification) {
      return;
    }
    const qualificationPattern = /^[A-Za-z\s,.]+$/;
    if (!qualificationPattern.test(qualification)) {
      this.qualificationError =
        'Qualification should contain only letters';
      return;
    }
    this.qualificationError = '';
    this.qualificationChips.push(qualification);
    this.newQualification = '';
  }

  removeQualification(index: number): void {
    this.qualificationChips = this.qualificationChips.filter((_, i) => i !== index);
  }

  addAvailabilitySlot(): void {
    const trimmed = this.newAvailabilitySlot.trim();
    const regex = /^\d{2}:\d{2}-\d{2}:\d{2}$/;

    if (!trimmed) return;

    if (!regex.test(trimmed)) {
      this.errorMessage = 'Time slot must be in HH:MM-HH:MM format (e.g. 09:00-12:00)';
      setTimeout(() => (this.errorMessage = ''), 4000);
      return;
    }

    if (!this.availabilityChips.includes(trimmed)) {
      this.availabilityChips = [...this.availabilityChips, trimmed];
    }
    this.newAvailabilitySlot = '';
  }

  addCommonSlot(slot: string): void {
    if (!this.availabilityChips.includes(slot)) {
      this.availabilityChips = [...this.availabilityChips, slot];
    }
  }

  removeAvailabilitySlot(index: number): void {
    this.availabilityChips = this.availabilityChips.filter((_, i) => i !== index);
  }
  onSubmit(): void {
    if (this.registerForm.invalid) return;
    if (this.qualificationChips.length === 0) {
      this.errorMessage = 'At least one qualification is required';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formData = { ...this.registerForm.value };
    delete formData.confirmPassword;

    formData.roles = [formData.roles];
    formData.qualification =
      this.qualificationChips.length > 0 ? this.qualificationChips : [];
    formData.availabilitySlots =
      this.availabilityChips.length > 0 ? this.availabilityChips : [];

    this.authService.selfRegister(formData).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = response.message;
          this.registerForm.reset();
          this.qualificationChips = [];
          this.availabilityChips = [];
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        }
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
}