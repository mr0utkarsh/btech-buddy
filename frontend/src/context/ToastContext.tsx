import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import type { ToastMessage } from "../lib/types";

interface ToastContextValue {
  toasts: ToastMessage[];
  push: (type: ToastMessage["type"], message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef<Map<number, number>>(new Map());
  // Mirror of toasts for synchronous duplicate checks (state updater
  // functions must stay pure — no side effects inside them).
  const toastsRef = useRef<ToastMessage[]>([]);
  toastsRef.current = toasts;

  const dismiss = useCallback((id: number) => {
    toastsRef.current = toastsRef.current.filter((x) => x.id !== id);
    setToasts(toastsRef.current);
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const push = useCallback(
    (type: ToastMessage["type"], message: string) => {
      const clean = (message || "").trim() || "Something went wrong";
      // De-duplicate: don't stack the same message repeatedly (e.g. an
      // effect that re-runs while the backend is unreachable).
      if (
        toastsRef.current.some((t) => t.type === type && t.message === clean)
      ) {
        return;
      }
      const id = ++toastId;
      const next = [
        ...toastsRef.current.slice(-4),
        { id, type, message: clean },
      ];
      toastsRef.current = next;
      setToasts(next);
      const timer = window.setTimeout(() => dismiss(id), 4500);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  const success = useCallback((m: string) => push("success", m), [push]);
  const error = useCallback((m: string) => push("error", m), [push]);
  const info = useCallback((m: string) => push("info", m), [push]);

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      push,
      success,
      error,
      info,
      dismiss,
    }),
    [toasts, push, success, error, info, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lift backdrop-blur ${
                toast.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : toast.type === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-900"
                    : "border-line bg-surface-2 text-fg"
              }`}
              role="alert"
            >
              {toast.type === "success" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              ) : toast.type === "error" ? (
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              ) : (
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-fg-muted" />
              )}
              <p className="flex-1 text-sm font-medium">{toast.message}</p>
              <button
                onClick={() => dismiss(toast.id)}
                className="rounded p-0.5 opacity-60 transition hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
