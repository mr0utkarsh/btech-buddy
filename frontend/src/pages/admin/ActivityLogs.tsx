import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ScrollText,
  Search,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  Send,
  Undo2,
  Trash2,
  Pencil,
  UserPlus,
  Ban,
  CheckCircle,
  Crown,
  Building2,
  GraduationCap,
  BookOpen,
  Mail,
  KeyRound,
  Activity,
} from "lucide-react";
import { api } from "../../lib/api";
import type { ActivityLog } from "../../lib/types";
import { useToast } from "../../context/ToastContext";
import { formatDate, timeAgo } from "../../lib/format";

const ACTION_META: Record<
  string,
  { icon: typeof Activity; color: string }
> = {
  "paper.upload": { icon: UploadCloud, color: "bg-brand-50 text-brand-700" },
  "paper.update": { icon: Pencil, color: "bg-navy-50 text-navy-700" },
  "paper.publish": { icon: Send, color: "bg-emerald-50 text-emerald-700" },
  "paper.unpublish": { icon: Undo2, color: "bg-amber-50 text-amber-700" },
  "paper.delete": { icon: Trash2, color: "bg-rose-50 text-rose-700" },
  "paper.replace": { icon: UploadCloud, color: "bg-brand-50 text-brand-700" },
  "institution.create": { icon: Building2, color: "bg-brand-50 text-brand-700" },
  "institution.update": { icon: Building2, color: "bg-navy-50 text-navy-700" },
  "institution.delete": { icon: Building2, color: "bg-rose-50 text-rose-700" },
  "branch.create": { icon: GraduationCap, color: "bg-brand-50 text-brand-700" },
  "branch.update": { icon: GraduationCap, color: "bg-navy-50 text-navy-700" },
  "branch.delete": { icon: GraduationCap, color: "bg-rose-50 text-rose-700" },
  "subject.create": { icon: BookOpen, color: "bg-brand-50 text-brand-700" },
  "subject.update": { icon: BookOpen, color: "bg-navy-50 text-navy-700" },
  "subject.delete": { icon: BookOpen, color: "bg-rose-50 text-rose-700" },
  "admin.invite": { icon: UserPlus, color: "bg-brand-50 text-brand-700" },
  "admin.revoke": { icon: Ban, color: "bg-amber-50 text-amber-700" },
  "admin.restore": { icon: CheckCircle, color: "bg-emerald-50 text-emerald-700" },
  "admin.delete": { icon: Trash2, color: "bg-rose-50 text-rose-700" },
  "admin.role.change": { icon: Crown, color: "bg-amber-50 text-amber-700" },
  "setup.initial_super_admin": { icon: KeyRound, color: "bg-brand-50 text-brand-700" },
};

const ACTION_FILTERS = [
  { value: "", label: "All actions" },
  { value: "paper", label: "Paper events" },
  { value: "institution", label: "Institution events" },
  { value: "branch", label: "Branch events" },
  { value: "subject", label: "Subject events" },
  { value: "admin", label: "Admin events" },
];

export function ActivityLogs() {
  const { error: toastError } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [actor, setActor] = useState("");
  const limit = 25;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (actionFilter) params.set("action", actionFilter);
    if (actor) params.set("actor", actor);
    try {
      const res = await api.get<{
        data: ActivityLog[];
        total: number;
      }>(`/api/admin/activity-logs?${params.toString()}`);
      setLogs(res.data);
      setTotal(res.total);
    } catch (e) {
      setLogs([]);
      setTotal(0);
      toastError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, actor, toastError]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-950 sm:text-3xl">
            Activity logs
          </h1>
          <p className="mt-1 text-sm text-navy-600">
            {total} recorded admin actions (audit trail)
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            load();
          }}
          className="flex flex-1 items-center gap-2 rounded-xl border border-navy-200 bg-white p-1.5 shadow-soft focus-within:border-brand-400"
          role="search"
        >
          <Search className="ml-2 h-4 w-4 shrink-0 text-navy-400" />
          <input
            key={actor}
            defaultValue={actor}
            placeholder="Filter by admin email…"
            className="w-full bg-transparent px-1 py-2 text-sm outline-none placeholder:text-navy-400"
            aria-label="Filter by actor"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800"
          >
            Filter
          </button>
        </form>
        <div className="flex flex-wrap gap-1.5">
          {ACTION_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setActionFilter(f.value);
                setPage(1);
              }}
              className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                actionFilter === f.value
                  ? "bg-navy-900 text-white"
                  : "border border-navy-200 bg-white text-navy-700 hover:bg-navy-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-5 overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-soft"
      >
        {loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-navy-50"
              />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <ScrollText className="mx-auto h-12 w-12 text-navy-200" />
            <h3 className="mt-4 font-display text-lg font-semibold text-navy-900">
              No activity yet
            </h3>
            <p className="mt-1 text-sm text-navy-500">
              Admin actions will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-navy-50">
            {logs.map((log) => {
              const meta = ACTION_META[log.action] || {
                icon: Activity,
                color: "bg-navy-50 text-navy-700",
              };
              return (
                <li
                  key={log.id}
                  className="flex items-start gap-4 px-5 py-4 transition hover:bg-navy-50/60"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.color}`}
                  >
                    <meta.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-navy-900">
                      <span className="font-semibold">
                        {log.actor_email || "System"}
                      </span>{" "}
                      <span className="text-navy-500">
                        {describeAction(log.action)}
                      </span>{" "}
                      {describeEntity(log)}
                    </p>
                    {log.details &&
                      Object.keys(log.details).length > 0 && (
                        <p className="mt-0.5 truncate text-xs text-navy-500">
                          {JSON.stringify(log.details)}
                        </p>
                      )}
                    <p className="mt-0.5 text-xs text-navy-400">
                      {timeAgo(log.created_at)} ·{" "}
                      {formatDate(log.created_at)}
                      {log.ip_hash ? ` · IP ${log.ip_hash}` : ""}
                    </p>
                  </div>
                  <span className="hidden shrink-0 rounded-full bg-navy-50 px-2.5 py-1 font-mono text-[10px] font-semibold text-navy-600 sm:block">
                    {log.action}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </motion.div>

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm font-medium text-navy-700 transition hover:bg-navy-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-navy-600">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm font-medium text-navy-700 transition hover:bg-navy-50 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function describeAction(action: string): string {
  const map: Record<string, string> = {
    "paper.upload": "uploaded a paper",
    "paper.update": "updated a paper",
    "paper.publish": "published",
    "paper.unpublish": "unpublished",
    "paper.delete": "deleted a paper",
    "paper.replace": "replaced the PDF of",
    "institution.create": "added institution",
    "institution.update": "updated institution",
    "institution.delete": "deleted institution",
    "branch.create": "added branch",
    "branch.update": "updated branch",
    "branch.delete": "deleted branch",
    "subject.create": "added subject",
    "subject.update": "updated subject",
    "subject.delete": "deleted subject",
    "admin.invite": "invited admin",
    "admin.revoke": "revoked access of",
    "admin.restore": "restored access of",
    "admin.delete": "removed admin",
    "admin.role.change": "changed role of",
    "setup.initial_super_admin": "completed initial setup for",
  };
  return map[action] || action;
}

function describeEntity(log: ActivityLog): React.ReactNode {
  const d = (log.details || {}) as Record<string, unknown>;
  if (d.subject) return <span className="font-medium text-navy-800">“{String(d.subject)}”</span>;
  if (d.name) return <span className="font-medium text-navy-800">“{String(d.name)}”</span>;
  if (d.invited_email)
    return (
      <span className="font-medium text-navy-800">
        “{String(d.invited_email)}”
      </span>
    );
  if (d.email)
    return (
      <span className="font-medium text-navy-800">
        “{String(d.email)}”
      </span>
    );
  return "";
}
