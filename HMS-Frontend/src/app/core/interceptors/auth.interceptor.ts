import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const toastService = inject(ToastService);
  const router = inject(Router);

  //Token Injection to headers
  const token = authService.getToken();
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      switch (error.status) {

        case 401:
          toastService.error('Session expired. Please login again.');
          authService.logout();
          break;

        case 403:
          toastService.error('Access denied. You do not have permission.');
          router.navigate(['/dashboard']);
          break;

        case 500:
          toastService.error('Server error. Please try again later.');
          break;

        case 0:
          toastService.error('Cannot reach server. Check your connection.');
          break;
      }
      return throwError(() => error);
    })
  );
};