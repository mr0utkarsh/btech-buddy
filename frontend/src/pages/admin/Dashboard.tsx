import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  Download,
  Building2,
  GraduationCap,
  Users,
  TrendingUp,
  UploadCloud,
  ArrowUpRight,
  Eye,
  Clock,
} from "lucide-react";
import { api } from "../../lib/api";
import type { DashboardStats } from "../../lib/types";
import { StatCardSkeleton } from "../../components/Skeleton";
import { useToast } from "../../context/ToastContext";
import {
  formatBytes,
  formatDate,
  formatNumber,
  timeAgo,
} from "../../lib/format";

const MAX_BAR = 100;

export function Dashboard() {
  const { error: toastError } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get<DashboardStats>("/api/admin/stats")
      .then((data) => !cancelled && setStats(data))
      .catch((e) => !cancelled && toastError(e instanceof Error ? e.message : "Failed to load stats"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [toastError]);

  const maxDayDownloads = Math.max(
    1,
    ...(stats?.downloads_by_day.map((d) => d.downloads) || [1])
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Real-time overview of your paper library
          </p>
        </div>
        <Link
          to="/admin/papers/upload"
          className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-fg shadow-soft transition hover:bg-accent-hover"
        >
          <UploadCloud className="h-4 w-4" />
          Upload paper
        </Link>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))
          : [
              {
                icon: FileText,
                label: "Published papers",
                value: formatNumber(
                  stats?.overview.published_papers ?? 0
                ),
                sub: `${formatNumber(stats?.overview.draft_papers ?? 0)} in draft`,
                to: "/admin/papers",
              },
              {
                icon: Download,
                label: "Total downloads",
                value: formatNumber(
                  stats?.overview.total_downloads ?? 0
                ),
                sub: `${formatNumber(stats?.overview.downloads_last_7_days ?? 0)} this week`,
                to: "/admin/logs",
              },
              {
                icon: Building2,
                label: "Institutions",
                value: formatNumber(stats?.catalog.institutions ?? 0),
                sub: `${stats?.catalog.universities ?? 0} universities · ${stats?.catalog.colleges_and_institutes ?? 0} colleges/institutes`,
                to: "/admin/institutions",
              },
              {
                icon: Users,
                label: "Active admins",
                value: formatNumber(stats?.catalog.active_admins ?? 0),
                sub: `${stats?.catalog.branches ?? 0} branches · ${stats?.catalog.subjects ?? 0} subjects`,
                to: "/admin/admins",
              },
            ].map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <card.icon className="h-5 w-5" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-fg-muted transition group-hover:text-accent" />
                </div>
                <p className="mt-3 font-display text-2xl font-bold text-fg sm:text-3xl">
                  {card.value}
                </p>
                <p className="mt-0.5 text-sm font-medium text-fg-muted">
                  {card.label}
                </p>
                <p className="mt-1 text-xs text-fg-subtle">
                  {card.sub}
                </p>
                <Link
                  to={card.to}
                  className="absolute inset-0"
                  aria-label={`View ${card.label}`}
                />
              </motion.div>
            ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Downloads chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="rounded-2xl border border-line bg-surface p-5 shadow-soft lg:col-span-2"
        >
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold text-fg">
              <TrendingUp className="h-5 w-5 text-accent" />
              Downloads — last 7 days
            </h2>
            <span className="text-xs text-fg-subtle">
              {stats?.overview.downloads_last_7_days ?? 0} total
            </span>
          </div>
          <div className="mt-5 flex h-44 items-end gap-2 sm:gap-3">
            {(stats?.downloads_by_day || []).map((day, i) => {
              const height =
                day.downloads === 0
                  ? 4
                  : Math.max(
                      8,
                      (day.downloads / maxDayDownloads) * MAX_BAR
                    );
              return (
                <div
                  key={day.date}
                  className="group flex flex-1 flex-col items-center gap-1.5"
                >
                  <span className="text-[11px] font-semibold text-fg-muted opacity-0 transition group-hover:opacity-100">
                    {day.downloads}
                  </span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.5, delay: 0.2 + i * 0.05 }}
                    className="w-full max-w-12 rounded-t-lg bg-gradient-to-t from-accent to-sky-400"
                  />
                  <span className="text-[10px] text-fg-subtle sm:text-[11px]">
                    {new Date(day.date + "T00:00:00").toLocaleDateString(
                      "en-IN",
                      { day: "numeric", month: "short" }
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Recent activity summary */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="rounded-2xl border border-line bg-surface p-5 shadow-soft"
        >
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-fg">
            <Clock className="h-5 w-5 text-accent" />
            Recent uploads
          </h2>
          <ul className="mt-4 space-y-3">
            {(stats?.recent_uploads || []).map((paper) => (
              <li key={paper.id}>
                <Link
                  to={`/papers/${paper.id}`}
                  className="group flex items-start gap-3"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-fg group-hover:text-accent">
                      {paper.subject_name}
                    </span>
                    <span className="block truncate text-xs text-fg-subtle">
                      {paper.institutions?.short_name} · Sem{" "}
                      {paper.semester} · {timeAgo(paper.created_at)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
            {(!stats?.recent_uploads || stats.recent_uploads.length === 0) && !loading && (
              <li className="rounded-xl bg-surface-2 px-4 py-3 text-center text-xs text-fg-subtle">
                No uploads yet
              </li>
            )}
          </ul>
        </motion.div>
      </div>

      {/* Top papers */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface shadow-soft"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-fg">
            <GraduationCap className="h-5 w-5 text-accent" />
            Most downloaded papers
          </h2>
          <Link
            to="/admin/papers"
            className="text-xs font-semibold text-accent hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-fg-subtle">
                <th className="px-5 py-3 font-semibold">#</th>
                <th className="px-5 py-3 font-semibold">Paper</th>
                <th className="px-5 py-3 font-semibold">Institution</th>
                <th className="px-5 py-3 font-semibold">Sem</th>
                <th className="px-5 py-3 font-semibold">Size</th>
                <th className="px-5 py-3 text-right font-semibold">
                  Downloads
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(stats?.top_papers || []).map((paper, i) => (
                <tr
                  key={paper.id}
                  className="transition hover:bg-surface-2/60"
                >
                  <td className="px-5 py-3.5 font-display font-bold text-fg-muted">
                    {i + 1}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-fg">
                      {paper.subject_name}
                    </p>
                    <p className="text-xs text-fg-subtle">
                      {paper.branches?.name} · {paper.exam_year}
                    </p>
                  </td>
                  <td className="px-5 py-3.5 text-fg-muted">
                    {paper.institutions?.short_name}
                  </td>
                  <td className="px-5 py-3.5 text-fg-muted">
                    {paper.semester}
                  </td>
                  <td className="px-5 py-3.5 text-fg-muted">
                    {formatBytes(paper.file_size_bytes)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-fg">
                    {formatNumber(paper.download_count)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      to={`/papers/${paper.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-fg-muted transition hover:border-accent hover:text-accent"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {(!stats?.top_papers || stats.top_papers.length === 0) && !loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-8 text-center text-sm text-fg-subtle"
                  >
                    No papers yet — upload the first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-fg-subtle">
        <Clock className="h-3.5 w-3.5" />
        Last refreshed:{" "}
        {formatDate(new Date().toISOString())}{" "}
        {loading ? "(loading…)" : ""}
      </p>
    </div>
  );
}
