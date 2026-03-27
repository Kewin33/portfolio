"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthGuard({ children, requiredRole, adminOnly }:
  { children: React.ReactNode; requiredRole?: string; adminOnly?: boolean }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkRole = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setAllowed(false);
        return;
      }
      
      try {
        const API_BASE = (process.env.NEXT_PUBLIC_API_BASE as string) || (process.env.NEXT_PUBLIC_BACKEND_URL as string) || '';
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        });
        
        if (!res.ok) {
          localStorage.removeItem('token');
          setAllowed(false);
          return;
        }
        
        const data = await res.json();
        const role = data.role;
        
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
      } catch (err) {
        setAllowed(false);
      }
    };
    
    checkRole();
  }, [requiredRole, adminOnly]);

  useEffect(() => {
    if (allowed === null) return;
    if (!allowed) {
      router.replace('/login');
    }
  }, [allowed, router]);

  if (allowed === null) return null;
  if (!allowed) return null;
  return <>{children}</>;
}
