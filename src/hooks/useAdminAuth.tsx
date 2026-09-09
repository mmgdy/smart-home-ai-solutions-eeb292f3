// Admin authentication hook.
//
// Reads the stored `admin_token` from localStorage on mount, verifies it
// against the `admin-auth` edge function, and exposes `{ isLoading,
// isAuthenticated, admin, token, login, logout }` to the Admin page.
//
// `login` is called by AdminLogin with the freshly-issued token; it only
// updates local state (the token is already written to localStorage by
// AdminLogin). `logout` clears storage and resets state.
//
// `checkAuth` is fire-and-forget on mount and can be called manually
// (e.g. from a Settings tab) to refresh validation.
//
// NOTE: the Authorization header for admin-write calls is set per-call in
// OrdersManagement / ProductEditor / etc., not here. This hook only
// handles the auth lifecycle.
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAdminAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState<{ username: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const stored = localStorage.getItem('admin_token');
      if (!stored) {
        setIsAuthenticated(false);
        setToken(null);
        return;
      }
      const { data, error: verifyErr } = await supabase.functions.invoke('admin-auth', {
        body: { action: 'verify', token: stored },
        headers: { Authorization: `Bearer ${stored}` },
      });
      if (verifyErr) throw verifyErr;
      if (data?.admin) {
        setIsAuthenticated(true);
        setAdmin(data.admin);
        setToken(stored);
      } else {
        setIsAuthenticated(false);
        setToken(null);
      }
    } catch {
      setIsAuthenticated(false);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, adminData?: { username: string }) => {
    setToken(newToken);
    setIsAuthenticated(true);
    if (adminData) setAdmin(adminData);
    localStorage.setItem('admin_token', newToken);
  };

  const logout = () => {
    setToken(null);
    setIsAuthenticated(false);
    setAdmin(null);
    localStorage.removeItem('admin_token');
  };

  useEffect(() => { checkAuth(); }, [checkAuth]);

  return { isLoading, isAuthenticated, admin, token, login, logout };
}
