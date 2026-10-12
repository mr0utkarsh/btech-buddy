import { useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { useToast } from "../context/ToastContext";

interface Props {
  /** Called after the password is successfully changed. */
  onSuccess?: () => void;
  /** Rendered inside a compact card (Settings) vs a full page (first login). */
  variant?: "page" | "card";
}

const RULES: { test: (v: string) => boolean; label: string }[] = [
  { test: (v) => v.length >= 12, label: "At least 12 characters" },
  { test: (v) => /[A-Z]/.test(v), label: "One uppercase letter" },
  { test: (v) => /[a-z]/.test(v), label: "One lowercase letter" },
  { test: (v) => /[0-9]/.test(v), label: "One number" },
  { test: (v) => /[^A-Za-z0-9]/.test(v), label: "One symbol" },
];

export function ChangePasswordForm({ onSuccess, variant = "page" }: Props) {
  const toast = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const allValid = RULES.every((r) => r.test(newPassword));
  const matches = confirm.length > 0 && newPassword === confirm;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!allValid) {
      setError("Please meet all password requirements.");
      return;
    }
    if (newPassword !== confirm) {
      setError("New password and confirmation do not match.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/admin/admins/change-password", {
        new_password: newPassword,
        confirm_password: confirm,
      });
      setDone(true);
      toast.success("Password updated successfully");
      setNewPassword("");
      setConfirm("");
      onSuccess?.();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not update password";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (hasError: boolean) =>
    `mt-1.5 w-full rounded-xl border bg-surface px-4 py-3 text-sm transition focus:outline-none ${
      hasError
        ? "border-rose-300 focus:border-rose-400"
        : "border-line focus:border-accent"
    }`;

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={
        variant === "card"
          ? "rounded-2xl border border-line bg-surface p-5 shadow-soft"
          : "w-full max-w-md rounded-3xl border border-line bg-surface p-8 shadow-lift"
      }
      noValidate
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <KeyRound className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold text-fg">
            Set a new password
          </h2>
          <p className="text-sm text-fg-muted">
            Choose a strong password you have not used before.
          </p>
        </div>
      </div>

      {done && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Password updated. You can now use the dashboard.
        </div>
      )}

      <div className="mt-5">
        <label htmlFor="cp-new" className="text-sm font-semibold text-fg">
          New password
        </label>
        <div className="relative">
          <input
            id="cp-new"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass(false)}
            placeholder="Enter new password"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {RULES.map((r) => {
            const ok = r.test(newPassword);
            return (
              <li
                key={r.label}
                className={`flex items-center gap-1.5 text-xs ${
                  ok ? "text-emerald-600" : "text-fg-subtle"
                }`}
              >
                <CheckCircle2
                  className={`h-3.5 w-3.5 ${ok ? "opacity-100" : "opacity-30"}`}
                />
                {r.label}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-4">
        <label htmlFor="cp-confirm" className="text-sm font-semibold text-fg">
          Confirm new password
        </label>
        <input
          id="cp-confirm"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass(confirm.length > 0 && !matches)}
          placeholder="Repeat new password"
        />
        {confirm.length > 0 && !matches && (
          <p className="mt-1 text-xs text-rose-600">Passwords do not match</p>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !allValid || !matches}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-bold text-accent-fg shadow-soft transition hover:bg-accent-hover disabled:opacity-60"
      >
        <KeyRound className="h-4 w-4" />
        {loading ? "Updating…" : "Update password"}
      </button>
    </motion.form>
  );
}
