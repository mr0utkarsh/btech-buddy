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
  /** True when the signed-in admin must change a temporary password first. */
  mustChangePassword: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
  /** Clears the local must-change-password flag after a successful change. */
  passwordChanged: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<{ access_token: string } | null>(
    null
  );
  const [role, setRole] = useState<AdminRole>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const refreshRole = useCallback(async () => {
    const token = session?.access_token ?? null;
    if (!token) {
      setRole(null);
      setMustChangePassword(false);
      setAdminToken(null);
      return;
    }
    setAdminToken(token);
    try {
      const res = await api.get<{
        role: string;
        must_change_password?: boolean;
      }>("/api/admin/admins/me");
      if (res.role === "super_admin" || res.role === "admin") {
        setRole(res.role);
        setMustChangePassword(Boolean(res.must_change_password));
      } else {
        setRole(null);
        setMustChangePassword(false);
      }
    } catch {
      setRole(null);
      setMustChangePassword(false);
    }
  }, [session]);

  const passwordChanged = useCallback(() => setMustChangePassword(false), []);

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
          setMustChangePassword(false);
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
    else {
      setRole(null);
      setMustChangePassword(false);
    }
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
    setMustChangePassword(false);
    setAdminToken(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      role,
      adminLoading,
      mustChangePassword,
      signIn,
      signOut,
      refreshRole,
      passwordChanged,
    }),
    [
      user,
      session,
      role,
      adminLoading,
      mustChangePassword,
      signIn,
      signOut,
      refreshRole,
      passwordChanged,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
