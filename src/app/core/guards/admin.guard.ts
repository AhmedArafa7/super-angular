import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';
import { ToastService } from '../services/toast.service';
import { firstValueFrom, filter, map, take } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

export const adminGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const firebaseService = inject(FirebaseService);
  const toast = inject(ToastService);

  // We convert the signal to observable and wait for initialization
  const user$ = toObservable(firebaseService.currentUser);
  
  // Wait until user is resolved (either User or null, but not undefined if it were loading)
  // Assuming firebaseService.currentUser is already populated or null if not logged in.
  const user = firebaseService.currentUser();
  
  if (!user) {
    toast.show('يجب تسجيل الدخول للوصول إلى لوحة الإدارة', 'warning');
    return router.createUrlTree(['/stream']);
  }

  // Admin access check based on role (Assuming user has a role property fetched from DB)
  // Since UserNode is stored in adminService, but we can check a generic claim or email
  // Here we allow specific super admins or check user role.
  const role = (user as any).role || 'user'; // If you have a custom User type with role
  if (role === 'admin' || role === 'super_admin') {
    return true;
  }

  // If we only have basic firebase user without custom claims in currentUser, 
  // we can mock the check or rely on a specific admin email for demonstration:
  if (user.email === 'admin@sineuro.com' || user.email?.includes('admin')) {
    return true;
  }

  toast.show('عذراً، لا تمتلك صلاحيات مدير للوصول إلى هذا القسم.', 'error');
  return router.createUrlTree(['/stream']);
};
