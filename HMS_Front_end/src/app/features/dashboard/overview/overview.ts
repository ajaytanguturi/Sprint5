import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { AuthService } from '../../../core/services/auth.service';
import { AdminService } from '../../../core/services/admin.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { AuditLog } from '../../../core/models/audit.model';

// Audit feed page size on the overview
const AUDIT_PAGE_SIZE = 15;

// Audit actions that record a failed or adverse outcome; shown in red, while
// every successful operation keeps the default green chip
const FAILURE_AUDIT_ACTIONS = new Set<string>([
  'USER_LOGIN_FAILED',
  'REFRESH_REUSE_DETECTED',
]);

// Dashboard landing; renders cards based on the user's designation
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, DashboardLayoutComponent, DatePipe],
  templateUrl: './overview.html',
  styleUrl: './overview.css',
})
export class OverviewComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly adminService = inject(AdminService);
  private readonly dashboardService = inject(DashboardService);

  // Stats
  activeEmployees = signal<number | null>(null);
  pendingApprovals = signal<number | null>(null);
  totalPatients = signal<number | null>(null);
  // All booked appointments (shown to owner/admin/receptionist)
  bookedAppointments = signal<number | null>(null);

  // Recent activity (audit log feed, paginated)
  auditLogs = signal<AuditLog[]>([]);
  loadingAudit = signal(false);
  auditPage = signal(1);
  auditTotalPages = signal(1);
  auditTotal = signal(0);

  // Doctor-specific
  myAppointmentsToday = signal<number | null>(null);
  myAppointmentsUpcoming = signal<number | null>(null);
  // BOOKED appointments whose slot has ended but were never completed/unattended
  myAppointmentsPastDue = signal<number | null>(null);

  loading = signal(true);

  get user() {
    return this.authService.getCurrentUser();
  }

  get designation(): string {
    return this.authService.getDesignation() || '';
  }

  isOwnerOrAdmin = computed(() => this.authService.isSuperUser());
  isReceptionist = computed(() => this.designation === 'RECEPTIONIST');
  isDoctor = computed(() => this.designation === 'DOCTOR');
  hasReceptionAccess = computed(
    () => this.isOwnerOrAdmin() || this.isReceptionist(),
  );

  ngOnInit(): void {
    if (this.isOwnerOrAdmin()) {
      this.loadStats();
      // Audit feed paginates independently of the stat cards
      this.loadAuditLogs(1);
    } else if (this.isReceptionist() || this.isDoctor()) {
      this.loadStats();
    } else {
      this.loading.set(false);
    }
  }

  // One role-aware call to /api/dashboard/stats (replaces the previous ~6 list
  // calls). The backend returns only the fields for the caller's designation.
  private loadStats(): void {
    this.dashboardService.getStats().subscribe({
      next: (res) => {
        const s = res.data.stats;
        this.activeEmployees.set(s.activeEmployees ?? null);
        this.pendingApprovals.set(s.pendingApprovals ?? null);
        this.totalPatients.set(s.totalPatients ?? null);
        this.bookedAppointments.set(s.bookedAppointments ?? null);
        this.myAppointmentsToday.set(s.today ?? null);
        this.myAppointmentsUpcoming.set(s.upcoming ?? null);
        this.myAppointmentsPastDue.set(s.pastDue ?? null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // Loads a page of the audit feed
  private loadAuditLogs(page: number): void {
    this.loadingAudit.set(true);
    this.adminService.getAuditLogs(page, AUDIT_PAGE_SIZE).subscribe({
      next: (res) => {
        this.auditLogs.set(res.data.logs || []);
        this.auditPage.set(res.data.page || page);
        this.auditTotalPages.set(res.data.totalPages || 1);
        this.auditTotal.set(res.data.total || 0);
        this.loadingAudit.set(false);
      },
      error: () => {
        this.auditLogs.set([]);
        this.loadingAudit.set(false);
      },
    });
  }

  prevAuditPage(): void {
    if (this.auditPage() > 1) {
      this.loadAuditLogs(this.auditPage() - 1);
    }
  }

  nextAuditPage(): void {
    if (this.auditPage() < this.auditTotalPages()) {
      this.loadAuditLogs(this.auditPage() + 1);
    }
  }

  trackByAudit = (_: number, log: AuditLog) => log.auditId;

  // Short action label for the activity feed
  actionLabel(action: string): string {
    return action
      .replaceAll('_', ' ')
      .toLowerCase()
      .replaceAll(/\b\w/g, (letter) => letter.toUpperCase());
  }

  // True for failed/adverse events, so the chip can be flagged red instead of green
  isFailureAction(action: string): boolean {
    return FAILURE_AUDIT_ACTIONS.has(action);
  }
}
