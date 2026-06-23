import { ApiResponse } from './api-response.model';

// Role-aware overview stats. The backend returns only the subset relevant to
// the caller's designation (admin/owner, receptionist, or doctor), so every
// field is optional and the component reads the ones for its role.
export interface DashboardStats {
  // Admin / Owner
  activeEmployees?: number;
  pendingApprovals?: number;
  // Admin / Owner / Receptionist
  totalPatients?: number;
  bookedAppointments?: number;
  // Doctor
  today?: number;
  upcoming?: number;
  pastDue?: number;
}

export type DashboardStatsResponse = ApiResponse<{ stats: DashboardStats }>;
