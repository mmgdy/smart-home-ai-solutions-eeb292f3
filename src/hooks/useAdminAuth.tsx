import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminUser {
  id: string;
  username: string;
}

export function useAdminAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const storedToken = localStorage.getItem('admin_token');
    
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { action: 'verify', token: storedToken },
      });

      if (error || !data?.success) {
        localStorage.removeItem('admin_token');
        setIsLoading(false);
        return;
      }

      setToken(storedToken);
      setAdmin(data.admin);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('admin_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = (newToken: string, adminUser: AdminUser) => {
    setToken(newToken);
    setAdmin(adminUser);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
    setAdmin(null);
    setIsAuthenticated(false);
  };

  return {
    isLoading,
    isAuthenticated,
    admin,
    token,
    login,
    logout,
    checkAuth,
  };
}
