import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EmployeeService } from '../../../../core/services/employee.service';
import { Employee } from '../../../../core/models/employee.model';
import { ConfirmModalService } from '../../../../core/services/confirm-modal.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.scss',
})
export class EmployeeListComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  private readonly router = inject(Router);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly toastService = inject(ToastService);


  employees: Employee[] = [];

  currentPage = 1;
  totalPages = 1;
  totalEmployees = 0;
  limit = 10;

  statusFilter = '';
  departmentFilter = '';

  searchQuery = '';
  searchResults: Employee[] = [];
  isSearching = false;
  showSearchResults = false;
  loading = false;

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.loading = true;
    this.showSearchResults = false;

    const filters: any = {};
    if (this.statusFilter) filters.status = this.statusFilter;
    if (this.departmentFilter) filters.department = this.departmentFilter;

    this.employeeService
      .getEmployees(this.currentPage, this.limit, filters)
      .subscribe({
        next: (res: any) => {
          this.employees = res.data || [];
          this.totalEmployees = res.pagination?.total || 0;
          this.totalPages = res.pagination?.pages || 1;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  onSearch(): void {
    if (!this.searchQuery || this.searchQuery.trim().length < 2) {
      this.showSearchResults = false;
      this.searchResults = [];
      this.loadEmployees();
      return;
    }
    this.isSearching = true;
    this.showSearchResults = true;
    this.employeeService
      .getEmployees(1, 50, undefined, this.searchQuery.trim())
      .subscribe({
        next: (res: any) => {
          this.searchResults = res.data || [];
          this.isSearching = false;
        },
        error: () => {
          this.isSearching = false;
        },
      });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.showSearchResults = false;
    this.searchResults = [];
    this.loadEmployees();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadEmployees();
  }
  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadEmployees();
  }

  createEmployee(): void {
    this.router.navigate(['/admin/employees/create']);
  }

  editEmployee(id: string): void {
    this.router.navigate(['/admin/employees/edit', id]);
  }

  async toggleStatus(employee: Employee): Promise<void> {
    const employeeId = employee._id;
    if (!employeeId) {
      this.toastService.error('Employee ID is missing');
      return;
    }
    const newStatus = employee.status === 'ACTIVE' ? 'deactivate' : 'activate';
    const result = await this.confirmModal.open({
      title: newStatus === 'deactivate' ? 'Deactivate Employee' : 'Activate Employee',
      message:
        newStatus === 'deactivate'
          ? `Are you sure you want to deactivate "${employee.name}"? They will no longer appear in active lists.`
          : `Are you sure you want to activate "${employee.name}"?`,
      confirmText: newStatus === 'deactivate' ? 'Yes, Deactivate' : 'Yes, Activate',
      cancelText: 'Cancel',
      type: newStatus === 'deactivate' ? 'warning' : 'info',
    });

    if (!result.confirmed) return;

    this.employeeService.toggleStatus(employeeId).subscribe({
      next: (res: any) => {
        this.toastService.success(
          res.message || `Employee ${res.data?.status?.toLowerCase()} successfully`
        );
        this.loadEmployees();
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Failed to update status');
      },
    });
  }
}
