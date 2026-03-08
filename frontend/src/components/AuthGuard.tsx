"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthGuard({ children, requiredRole, adminOnly }:
  { children: React.ReactNode; requiredRole?: string; adminOnly?: boolean }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const role = localStorage.getItem('role');
    // if adminOnly is requested, only "admin" may access
    if (adminOnly) {
      if (role === 'admin') setAllowed(true);
      else setAllowed(false);
      return;
    }
    if (!requiredRole) {
      setAllowed(true);
      return;
    }
    // requiredRole "friend" means friend or admin or global
    if (requiredRole === 'friend') {
      if (role === 'friend' || role === 'admin' || role === 'global') setAllowed(true);
      else setAllowed(false);
      return;
    }
    // otherwise require exact role or admin override
    if (role === requiredRole || role === 'admin') setAllowed(true);
    else setAllowed(false);
  }, [requiredRole, adminOnly]);

  useEffect(() => {
    if (allowed === null) return;
    if (!allowed) {
      // if no role at all, send to login; otherwise to home
      const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
      if (!role) router.replace('/login');
      else router.replace('/');
    }
  }, [allowed, router]);

  if (allowed === null) return null;
  if (!allowed) return null;
  return <>{children}</>;
}
