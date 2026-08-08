import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { setSentryUser, clearSentryUser, captureError } from '@/lib/sentry';
import type { Agency, AgencyMember } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  membership: (AgencyMember & { agencies: Agency }) | null;
  loading: boolean;
  isAdmin: boolean;
  tokenExpired: boolean;
  signOut: () => Promise<void>;
  refreshMembership: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [membership, setMembership] = useState<(AgencyMember & { agencies: Agency }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenExpired, setTokenExpired] = useState(false);

  async function loadMembership(uid: string) {
    const { data, error } = await supabase
      .from('agency_members')
      .select('*, agencies(*)')
      .eq('user_id', uid)
      .maybeSingle();
    if (error) captureError(error, { context: 'loadMembership' });
    setMembership(data as (AgencyMember & { agencies: Agency }) | null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadMembership(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setTokenExpired(false);
      if (newSession?.user) {
        setSentryUser(newSession.user.id, newSession.user.email);
        (async () => {
          await loadMembership(newSession.user.id);
          setLoading(false);
        })();
      } else if (event === 'TOKEN_REFRESHED') {
        setTokenExpired(false);
      } else if (event === 'SIGNED_OUT') {
        clearSentryUser();
        setMembership(null);
        setTokenExpired(false);
        setLoading(false);
      } else {
        setMembership(null);
        setLoading(false);
      }
    });

    let refreshTimer: ReturnType<typeof setTimeout>;
    function scheduleRefresh() {
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) return;
        const expiresAt = data.session.expires_at ?? 0;
        const msUntilExpiry = expiresAt * 1000 - Date.now();
        const refreshAt = msUntilExpiry - 60_000;
        if (refreshAt <= 0) {
          supabase.auth.refreshSession().catch(() => setTokenExpired(true));
        } else {
          refreshTimer = setTimeout(() => {
            supabase.auth.refreshSession().catch(() => setTokenExpired(true));
          }, refreshAt);
        }
      });
    }
    scheduleRefresh();

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(refreshTimer);
    };
  }, []);

  async function refreshMembership() {
    if (user) await loadMembership(user.id);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setMembership(null);
  }

  return (
    <AuthContext.Provider value={{ session, user, membership, loading, isAdmin: membership?.role === 'agency_admin', tokenExpired, signOut, refreshMembership }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
