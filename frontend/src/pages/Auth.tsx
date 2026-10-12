import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LogIn,
  Mail,
  Lock,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import { useEffect } from "react";

// Loads the real logo (drop the file at frontend/public/logo.png). Falls back
// to the shield mark if the asset is missing so the UI never breaks.
const LOGO_SRC = `${import.meta.env.BASE_URL || "/"}logo.png`;

function AuthLogoMark() {
  const [failed, setFailed] = useState(false);
  if (!failed) {
    return (
      <img
        src={LOGO_SRC}
        alt=""
        className="h-full w-full object-contain"
        onError={() => setFailed(true)}
      />
    );
  }
  return <ShieldCheck className="h-6 w-6 text-accent-fg" />;
}

export function Login() {
  const navigate = useNavigate();
  const { signIn, user, role } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [setupEnabled, setSetupEnabled] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    api
      .get<{ super_admin_exists: boolean; setup_enabled: boolean }>(
        "/api/setup-status"
      )
      .then((res) =>
        setSetupEnabled(
          res.setup_enabled && !res.super_admin_exists
        )
      )
      .catch(() => setSetupEnabled(null));
  }, []);

  // Redirect if already an admin.
  useEffect(() => {
    if (user && role) navigate("/admin", { replace: true });
  }, [user, role, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success("Signed in");
      navigate("/admin", { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Sign-in failed";
      setError(
        message.includes("Invalid login credentials")
          ? "Incorrect email or password"
          : message
      );
      toast.error("Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-hero px-4 py-12">
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 55% at 30% 15%, rgba(59,130,246,0.4), transparent 60%), radial-gradient(ellipse 55% 45% at 80% 90%, rgba(14,165,233,0.28), transparent 60%)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative w-full max-w-md rounded-3xl border border-hero-line bg-surface p-8 shadow-lift backdrop-blur"
      >
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" /> Back to site
        </Link>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-accent-soft0 to-fg shadow-soft">
            <AuthLogoMark />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold text-fg">
              Admin sign in
            </h1>
            <p className="text-sm text-fg-subtle">
              BTech Buddy dashboard
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="li-email"
              className="text-sm font-semibold text-fg"
            >
              Email
            </label>
            <div className="relative mt-1.5">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-fg-subtle" />
              <input
                id="li-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full rounded-xl border border-line bg-surface py-3 pl-10 pr-4 text-sm transition focus:border-accent focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="li-password"
              className="text-sm font-semibold text-fg"
            >
              Password
            </label>
            <div className="relative mt-1.5">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-fg-subtle" />
              <input
                id="li-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-line bg-surface py-3 pl-10 pr-4 text-sm transition focus:border-accent focus:outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-bold text-accent-fg shadow-soft transition hover:bg-accent-hover disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {setupEnabled && (
          <div className="mt-5 rounded-xl border border-accent-soft bg-accent-soft px-4 py-3 text-sm">
            <p className="font-medium text-accent">
              First time here?
            </p>
            <p className="mt-0.5 text-accent">
              No super admin exists yet. Complete the one-time
              setup to create the first account.
            </p>
            <Link
              to="/setup"
              className="mt-2 inline-flex items-center gap-1.5 font-semibold text-accent underline-offset-2 hover:underline"
            >
              <KeyRound className="h-4 w-4" />
              Run initial setup
            </Link>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-fg-subtle">
          Protected by Supabase Auth · server-side authorization ·
          audit logged
        </p>
      </motion.div>
    </div>
  );
}

export function SetupAdmin() {
  const navigate = useNavigate();
  const { error: toastError, success: toastSuccess, info: toastInfo } = useToast();
  const [setupToken, setSetupToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<
    | { super_admin_exists: boolean; setup_enabled: boolean }
    | null
  >(null);

  useEffect(() => {
    api
      .get<{
        super_admin_exists: boolean;
        setup_enabled: boolean;
        initial_admin_configured: boolean;
      }>("/api/setup-status")
      .then((res) => {
        setStatus(res);
        if (res.super_admin_exists) {
          toastInfo("A super admin already exists.");
        }
      })
      .catch(() => setStatus(null));
  }, [toastInfo]);

  const strongEnough =
    password.length >= 12 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (!strongEnough) {
      setError(
        "Password must be 12+ characters with uppercase, a number and a symbol"
      );
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/setup", {
        email,
        password,
        setup_token: setupToken,
      });
      toastSuccess(
        "Super admin created! You can sign in now."
      );
      navigate("/login");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Setup failed";
      setError(message);
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  if (status?.super_admin_exists) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-hero px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-hero-line bg-surface p-8 text-center shadow-lift">
          <ShieldCheck className="mx-auto h-12 w-12 text-emerald-600" />
          <h1 className="mt-4 font-display text-xl font-bold text-fg">
            Setup already completed
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            A super admin account already exists. Use the sign-in
            page instead.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-accent-fg transition hover:bg-accent-hover"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  if (status && !status.setup_enabled) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-hero px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-hero-line bg-surface p-8 text-center shadow-lift">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="mt-4 font-display text-xl font-bold text-fg">
            Setup disabled
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            The one-time setup flow is not enabled on this server.
            Set <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">SETUP_TOKEN</code> in
            the backend environment, or configure the initial
            super admin via <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">INITIAL_SUPER_ADMIN_EMAIL</code>{" "}
            and <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">INITIAL_SUPER_ADMIN_PASSWORD</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-hero px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative w-full max-w-md rounded-3xl border border-hero-line bg-surface p-8 shadow-lift backdrop-blur"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-soft0 to-fg shadow-soft">
            <KeyRound className="h-6 w-6 text-accent-fg" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold text-fg">
              One-time setup
            </h1>
            <p className="text-sm text-fg-subtle">
              Create the super admin account
            </p>
          </div>
        </div>

        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
          This flow is protected by a setup token stored on the
          server and can only be used while no super admin exists.
          The password you choose is transmitted over HTTPS and
          stored in Supabase Auth — never in source code.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="su-token" className="text-sm font-semibold text-fg">
              Setup token
            </label>
            <input
              id="su-token"
              type="password"
              required
              value={setupToken}
              onChange={(e) => setSetupToken(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm transition focus:border-accent focus:outline-none"
              placeholder="Server-provided token"
            />
          </div>
          <div>
            <label htmlFor="su-email" className="text-sm font-semibold text-fg">
              Email
            </label>
            <input
              id="su-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm transition focus:border-accent focus:outline-none"
              placeholder="superadmin@example.com"
            />
          </div>
          <div>
            <label htmlFor="su-password" className="text-sm font-semibold text-fg">
              Password
            </label>
            <input
              id="su-password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm transition focus:border-accent focus:outline-none"
              placeholder="12+ characters"
            />
            <p className="mt-1.5 text-xs">
              <span className="font-medium text-fg-muted">
                Strength:
              </span>{" "}
              <span
                className={
                  strongEnough
                    ? "font-semibold text-emerald-600"
                    : "text-fg-subtle"
                }
              >
                {strongEnough
                  ? "Strong"
                  : "Needs uppercase, number, symbol, 12+ chars"}
              </span>
            </p>
          </div>
          <div>
            <label htmlFor="su-confirm" className="text-sm font-semibold text-fg">
              Confirm password
            </label>
            <input
              id="su-confirm"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm transition focus:border-accent focus:outline-none"
              placeholder="Repeat password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-bold text-accent-fg shadow-soft transition hover:bg-accent-hover disabled:opacity-60"
          >
            <KeyRound className="h-4 w-4" />
            {loading ? "Creating…" : "Create super admin"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-surface-2 px-4 py-12">
      <div className="text-center">
        <p className="font-display text-8xl font-extrabold text-accent">
          404
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold text-fg">
          Page not found
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-fg-muted">
          The page you are looking for does not exist or has been
          moved.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-accent-fg transition hover:bg-accent-hover"
        >
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>
      </div>
    </div>
  );
}

export function Unauthorized() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-surface-2 px-4 py-12">
      <div className="max-w-md text-center">
        <ShieldCheck className="mx-auto h-14 w-14 text-rose-400" />
        <h1 className="mt-4 font-display text-2xl font-bold text-fg">
          Access restricted
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          You need an active admin account to view this page. If
          you were just invited, sign out and sign back in to
          refresh your permissions.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/"
            className="rounded-xl border border-line bg-surface px-5 py-3 text-sm font-semibold text-fg transition hover:bg-surface-2"
          >
            Home
          </Link>
          <Link
            to="/login"
            className="rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-fg transition hover:bg-accent-hover"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
