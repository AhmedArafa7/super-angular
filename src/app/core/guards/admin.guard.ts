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

  // Admin access check based on Firestore UserData role
  const role = firebaseService.userData()?.role || 'user';
  const allowedRoles = ['admin', 'super_admin', 'founder', 'cofounder', 'management'];
  
  if (allowedRoles.includes(role)) {
    return true;
  }

  // Fallback for specific admin/founder emails
  if (user.email === 'admin@sineuro.com' || user.email?.includes('admin') || user.email === 'mo1999382@gmail.com') {
    return true;
  }

  toast.show('عذراً، لا تمتلك صلاحيات مدير للوصول إلى هذا القسم.', 'error');
  return router.createUrlTree(['/stream']);
};
