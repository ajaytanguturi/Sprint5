import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardStatsResponse } from '../models/dashboard.model';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/dashboard`;

  // Role-aware overview stats in a single call (replaces the ~6 list calls the
  // overview previously made). The backend returns the subset for the caller's
  // designation.
  getStats(): Observable<DashboardStatsResponse> {
    return this.http.get<DashboardStatsResponse>(`${this.apiUrl}/stats`);
  }
}
