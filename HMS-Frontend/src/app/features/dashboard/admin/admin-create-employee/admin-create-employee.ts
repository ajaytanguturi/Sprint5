import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { DashboardLayoutComponent } from '../../../../shared/ui/dashboard-layout/dashboard-layout';
import { AdminService } from '../../../../core/services/admin.service';
import { ADMIN_SIDEBAR, ROLES, DEPARTMENTS } from '../../../../core/models/user.model';

@Component({
  selector: 'app-admin-create-employee',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DashboardLayoutComponent],
  templateUrl: './admin-create-employee.html',
  styleUrl: './admin-create-employee.scss',
})
export class AdminCreateEmployeeComponent {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);

  sidebarItems = ADMIN_SIDEBAR;
  roles = ROLES;
  departments = DEPARTMENTS;

  createForm: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';

  // Role-conditional state
  selectedRole: string = '';
  showDoctorFields = false;

  qualificationChips: string[] = [];
  newQualification = '';
  qualificationError = '';

  availabilityChips: string[] = [];
  newAvailabilitySlot = '';

  commonTimeSlots = [
    '09:00-12:00', '09:00-13:00', '10:00-13:00',
    '14:00-17:00', '14:00-18:00', '18:00-21:00',
  ];

  constructor() {
    this.createForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[A-Za-z\s]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\d+$/), Validators.minLength(10), Validators.maxLength(10)]],
      department: ['', [Validators.required]],
      designation: ['', [Validators.required, Validators.pattern(/^[A-Za-z\s]+$/)]],
      roles: ['', Validators.required],
      medicalRegistrationNo: [''],
      specialization: [''],
      consultationFee: [null],
    });
  }

  onRoleChange(): void {
    const role = this.createForm.get('roles')?.value;
    this.selectedRole = role;
    this.showDoctorFields = role === 'DOCTOR';

    if (!this.showDoctorFields) {
      this.qualificationChips = [];
      this.availabilityChips = [];
      this.newQualification = '';
      this.newAvailabilitySlot = '';
    }
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
    if (this.createForm.invalid) return;

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formData = { ...this.createForm.value };
    formData.roles = [formData.roles];

    if (this.showDoctorFields) {
      formData.qualification = this.qualificationChips;
      formData.availabilitySlots = this.availabilityChips;
    }

    this.adminService.createEmployee(formData).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.successMessage = res.message;
          this.createForm.reset();
          this.qualificationChips = [];
          this.availabilityChips = [];
          this.selectedRole = '';
          this.showDoctorFields = false;
          setTimeout(() => (this.successMessage = ''), 5000);
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.errorMessage = err.error?.message || 'Failed to create employee';
        this.loading = false;
      },
    });
  }
}