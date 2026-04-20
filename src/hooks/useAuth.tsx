import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Fire-and-forget welcome email on first sign-in (server enforces idempotency)
      if (event === 'SIGNED_IN' && session?.user?.email) {
        const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
        setTimeout(() => {
          supabase.functions.invoke('send-welcome-email', {
            body: {
              email: session.user.email,
              name: session.user.user_metadata?.full_name,
              language: lang,
            },
          }).catch(() => {});
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { session, user, loading, signOut };
};
