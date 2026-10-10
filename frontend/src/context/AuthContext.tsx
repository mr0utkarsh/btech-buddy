import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { api, setAdminToken } from "../lib/api";

export type AdminRole = "super_admin" | "admin" | null;

interface User {
  id: string;
  email: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: { access_token: string } | null;
  role: AdminRole;
  adminLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<{ access_token: string } | null>(
    null
  );
  const [role, setRole] = useState<AdminRole>(null);
  const [adminLoading, setAdminLoading] = useState(true);

  const refreshRole = useCallback(async () => {
    const token = session?.access_token ?? null;
    if (!token) {
      setRole(null);
      setAdminToken(null);
      return;
    }
    setAdminToken(token);
    try {
      const res = await api.get<{ role: string }>("/api/admin/admins/me");
      if (res.role === "super_admin" || res.role === "admin") {
        setRole(res.role);
      } else {
        setRole(null);
      }
    } catch {
      setRole(null);
    }
  }, [session]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isSupabaseConfigured) {
        setAdminLoading(false);
        return;
      }
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const s = data.session;
        if (s) {
          setSession({ access_token: s.access_token });
          setUser({ id: s.user.id, email: s.user.email ?? null });
        }
      } catch {
        /* ignore */
      } finally {
        if (mounted) setAdminLoading(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, sess) => {
        if (sess) {
          setSession({ access_token: sess.access_token });
          setUser({ id: sess.user.id, email: sess.user.email ?? null });
        } else {
          setSession(null);
          setUser(null);
          setRole(null);
          setAdminToken(null);
        }
      }
    );
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) refreshRole();
    else setRole(null);
  }, [session, refreshRole]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.message);
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
    setAdminToken(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      role,
      adminLoading,
      signIn,
      signOut,
      refreshRole,
    }),
    [user, session, role, adminLoading, signIn, signOut, refreshRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
