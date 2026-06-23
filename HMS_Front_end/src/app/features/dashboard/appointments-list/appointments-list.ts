import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { AppointmentService } from '../../../core/services/appointment.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorHandlerService } from '../../../core/services/api-error-handler.service';
import { APP_MESSAGES } from '../../../core/constants/messages';
import { ConfirmModalService } from '../../../core/services/confirm-modal.service';
import {
  Appointment,
  APPOINTMENT_STATUSES,
} from '../../../core/models/appointment.model';
import { todayIsoDate } from '../../../core/validators/app-validators';

type DoctorTab = 'today' | 'upcoming' | 'past' | 'completed';

// Role-aware appointments list (reception sees all; doctor sees own by tab)
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-appointments-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DashboardLayoutComponent,
    DatePipe,
  ],
  templateUrl: './appointments-list.html',
  styleUrl: './appointments-list.css',
})
export class AppointmentsListComponent implements OnInit {
  private readonly appointmentService = inject(AppointmentService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly apiError = inject(ApiErrorHandlerService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  loading = signal(true);
  appointments = signal<Appointment[]>([]);

  // Row action in flight; all row buttons disable while set
  busyId = signal<string | null>(null);
  busyAction = signal<'cancel' | null>(null);

  statuses = APPOINTMENT_STATUSES;
  statusFilter = signal<string>('');
  dateFilter = signal<string>('');

  // Doctor tabs
  doctorTab = signal<DoctorTab>('today');
  todayIso = todayIsoDate();

  // Pagination (reception view)
  page = signal(1);
  limit = 10;
  totalPages = signal(1);
  total = signal(0);

  isDoctor = computed(() => this.authService.getDesignation() === 'DOCTOR');
  hasReceptionAccess = computed(() => {
    const d = this.authService.getDesignation();
    return (
      d === 'OWNER' || d === 'ADMIN' || d === 'RECEPTIONIST'
    );
  });

  // For the doctor view, slice the fetched list by tab
  visibleAppointments = computed<Appointment[]>(() => {
    if (!this.isDoctor()) {
      return this.appointments();
    }
    return this.appointments().filter((a) =>
      this.matchesDoctorTab(a, this.doctorTab()),
    );
  });

  doctorTabCount(tab: DoctorTab): number {
    return this.appointments().filter((a) => this.matchesDoctorTab(a, tab))
      .length;
  }

  // True once the appointment's slot end time has passed (hospital local time)
  private hasEnded(a: Appointment): boolean {
    const end = (a.timeSlot || '').split('-')[1];
    if (!end) {
      return false;
    }
    const [hh, mm] = end.split(':').map(Number);
    const endAt = new Date(a.appointmentDate);
    endAt.setHours(hh || 0, mm || 0, 0, 0);
    return endAt.getTime() < Date.now();
  }

  // True once the slot start time has passed (mirrors detail view + backend guard)
  startTimePassed(a: Appointment): boolean {
    const start = (a.timeSlot || '').split('-')[0];
    const [hh, mm] = (start || '').split(':').map(Number);
    const startAt = new Date(a.appointmentDate);
    if (!Number.isNaN(hh) && !Number.isNaN(mm)) {
      startAt.setHours(hh, mm, 0, 0);
    }
    return startAt.getTime() <= Date.now();
  }

  // Single source of truth for which doctor tab an appointment belongs to.
  // Tabs are mutually exclusive: a BOOKED slot moves to "Past Due" once it ends.
  private matchesDoctorTab(a: Appointment, tab: DoctorTab): boolean {
    const apptDate = new Date(a.appointmentDate);
    apptDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = apptDate.getTime() === today.getTime();
    const isFuture = apptDate.getTime() > today.getTime();
    const isPastDay = apptDate.getTime() < today.getTime();

    switch (tab) {
      case 'today':
        return isToday && a.status === 'BOOKED' && !this.hasEnded(a);
      case 'upcoming':
        return isFuture && a.status === 'BOOKED';
      case 'past':
        return a.status === 'BOOKED' && (isPastDay || this.hasEnded(a));
      case 'completed':
        return a.status === 'COMPLETED';
    }
  }

  ngOnInit(): void {
    // Preselect a doctor tab from ?tab=today|upcoming|completed
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (
      tab === 'today' ||
      tab === 'upcoming' ||
      tab === 'past' ||
      tab === 'completed'
    ) {
      this.doctorTab.set(tab);
    }
    // Reception/admin status filter deep link via ?status=BOOKED etc
    const status = this.route.snapshot.queryParamMap.get('status');
    if (status) {
      this.statusFilter.set(status);
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);

    if (this.isDoctor()) {
      // Pull a large window of the doctor's appointments and slice client-side
      this.appointmentService.getMyAppointments(1, 200).subscribe({
        next: (res) => {
          this.appointments.set(res.data.appointments || []);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error(APP_MESSAGES.LOAD_APPOINTMENTS_FAILED);
        },
      });
      return;
    }

    this.appointmentService
      .getAppointments(this.page(), this.limit, {
        status: this.statusFilter() || undefined,
        date: this.dateFilter() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.appointments.set(res.data.appointments || []);
          this.totalPages.set(res.data.totalPages || 1);
          this.total.set(res.data.total || 0);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error(APP_MESSAGES.LOAD_APPOINTMENTS_FAILED);
        },
      });
  }

  switchTab(tab: DoctorTab): void {
    this.doctorTab.set(tab);
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value);
    this.page.set(1);
    this.load();
  }

  onDateChange(value: string): void {
    this.dateFilter.set(value);
    this.page.set(1);
    this.load();
  }

  clearDate(): void {
    this.dateFilter.set('');
    this.page.set(1);
    this.load();
  }

  prevPage(): void {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
      this.load();
    }
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) {
      this.page.update((p) => p + 1);
      this.load();
    }
  }

  open(a: Appointment): void {
    this.router.navigate(['/dashboard/appointments', a.appointmentId]);
  }

  async cancel(a: Appointment, event: Event): Promise<void> {
    event.stopPropagation();
    const result = await this.confirmModal.open({
      title: 'Cancel Appointment',
      message: `Cancel appointment ${a.appointmentId}? The slot will become available again.`,
      confirmText: 'Cancel It',
      cancelText: 'Keep',
      type: 'danger',
      showInput: true,
      inputLabel: 'Cancellation Reason',
      inputPlaceholder: 'Reason for cancelling this appointment',
    });
    if (!result.confirmed) {
      return;
    }
    const reason = (result.inputValue ?? '').trim();
    this.busyId.set(a.appointmentId);
    this.busyAction.set('cancel');
    this.appointmentService.cancelAppointment(a.appointmentId, reason).subscribe({
      next: (res) => {
        this.clearBusy();
        this.toast.success(res.message || APP_MESSAGES.APPOINTMENT_CANCELLED);
        this.load();
      },
      error: (err) => {
        this.clearBusy();
        this.toast.error(this.apiError.message(err, APP_MESSAGES.APPOINTMENT_CANCEL_FAILED));
      },
    });
  }

  private clearBusy(): void {
    this.busyId.set(null);
    this.busyAction.set(null);
  }

  trackById = (_: number, a: Appointment) => a.appointmentId;
}
