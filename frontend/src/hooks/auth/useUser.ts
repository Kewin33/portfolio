import { useEffect, useState } from 'react';

interface UserData {
  sub?: string;
  email?: string;
  name?: string;
  role?: string;
}

const USER_CACHE_KEY = 'user_cache';
const USER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useUser() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const normalizeUserData = (raw: unknown): UserData | null => {
      if (!raw || typeof raw !== 'object') return null;
      const candidate = raw as Record<string, unknown>;
      const sub = typeof candidate.sub === 'string' ? candidate.sub : undefined;
      const email = typeof candidate.email === 'string' ? candidate.email : undefined;
      const name = typeof candidate.name === 'string' ? candidate.name : undefined;
      const role = typeof candidate.role === 'string' ? candidate.role : undefined;
      if (!sub && !email && !name) return null;
      return { sub, email, name, role };
    };

    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setUser(null);
          setLoading(false);
          return;
        }

        // Check cache first
        const cached = localStorage.getItem(USER_CACHE_KEY);
        if (cached) {
          try {
            const { data, timestamp } = JSON.parse(cached);
            const normalizedCachedData = normalizeUserData(data);
            if (Date.now() - timestamp < USER_CACHE_TTL && normalizedCachedData) {
              setUser(normalizedCachedData);
              setLoading(false);
              return;
            }
          } catch {
            localStorage.removeItem(USER_CACHE_KEY);
          }
        }

        const API_BASE =
          (process.env.NEXT_PUBLIC_API_BASE as string) ||
          (process.env.NEXT_PUBLIC_BACKEND_URL as string) ||
          '';

        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          const normalizedData = normalizeUserData(data);
          if (!normalizedData) {
            setUser(null);
            localStorage.removeItem(USER_CACHE_KEY);
            return;
          }
          setUser(normalizedData);
          // Cache the user data
          localStorage.setItem(
            USER_CACHE_KEY,
            JSON.stringify({ data: normalizedData, timestamp: Date.now() })
          );
        } else {
          setUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem(USER_CACHE_KEY);
        }
      } catch (err) {
        setError(String(err));
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, loading, error };
}
