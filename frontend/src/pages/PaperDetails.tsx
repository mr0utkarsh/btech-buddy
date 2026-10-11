import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Download,
  Eye,
  FileText,
  GraduationCap,
  Building2,
  Calendar,
  Layers,
  Hash,
  Clock,
  ArrowLeft,
  Share2,
  CheckCircle,
  Pencil,
  Trash2,
  Send,
} from "lucide-react";
import { api, API_BASE } from "../lib/api";
import type { Paper } from "../lib/types";
import { PaperCard } from "../components/PaperCard";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  formatBytes,
  formatDate,
  formatNumber,
  examTypeLabel,
} from "../lib/format";

export function PaperDetails() {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<Paper>(`/api/papers/${id}`)
      .then((data) => !cancelled && setPaper(data))
      .catch((e) => {
        if (!cancelled) toastError(e instanceof Error ? e.message : "Failed to load paper");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, toastError]);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toastSuccess("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toastError("Could not copy the link");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl animate-pulse px-4 py-10 sm:px-6">
        <div className="h-4 w-40 rounded bg-navy-100" />
        <div className="mt-6 rounded-3xl border border-navy-100 p-8 shadow-soft">
          <div className="h-8 w-2/3 rounded bg-navy-100" />
          <div className="mt-4 h-5 w-1/3 rounded bg-navy-100" />
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-navy-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <FileText className="mx-auto h-14 w-14 text-navy-200" />
        <h1 className="mt-4 font-display text-2xl font-bold text-navy-950">
          Paper not found
        </h1>
        <p className="mt-2 text-navy-600">
          It may have been removed or is not published yet.
        </p>
        <Link
          to="/browse"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to browse
        </Link>
      </div>
    );
  }

  const meta = [
    {
      icon: Building2,
      label: "Institution",
      value: paper.institutions?.name || "—",
      sub: paper.institutions?.type
        ? `${paper.institutions.type}${paper.institutions.verified ? " · verified" : ""}`
        : undefined,
    },
    {
      icon: GraduationCap,
      label: "Branch",
      value: paper.branches?.name || "—",
      sub: `Semester ${paper.semester}`,
    },
    {
      icon: FileText,
      label: "Subject",
      value: paper.subject_name,
      sub: paper.subject_code || paper.paper_code || undefined,
    },
    {
      icon: Calendar,
      label: "Exam",
      value: `${examTypeLabel(paper.exam_type)} · ${paper.exam_year}`,
    },
    {
      icon: Layers,
      label: "Pages",
      value: String(paper.page_count),
      sub: formatBytes(paper.file_size_bytes),
    },
    {
      icon: Download,
      label: "Downloads",
      value: formatNumber(paper.download_count),
    },
    {
      icon: Clock,
      label: "Uploaded",
      value: formatDate(paper.created_at),
    },
    {
      icon: Hash,
      label: "Paper code",
      value: paper.paper_code || "—",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/browse"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 transition hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to browse
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mt-4 rounded-3xl border border-navy-100 bg-white p-6 shadow-lift sm:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                {examTypeLabel(paper.exam_type)}
              </span>
              <span className="rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-700">
                {paper.exam_year}
              </span>
              {paper.institutions?.verified && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Verified institution
                </span>
              )}
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold text-navy-950 sm:text-3xl">
              {paper.subject_name}
            </h1>
            <p className="mt-1.5 text-navy-600">
              {paper.institutions?.short_name} ·{" "}
              {paper.branches?.name} · Semester {paper.semester}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={share}
              className="flex items-center justify-center gap-2 rounded-xl border border-navy-200 px-4 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-navy-50"
            >
              {copied ? (
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              Share
            </button>
            <Link
              to={`/papers/${paper.id}/preview`}
              className="flex items-center justify-center gap-2 rounded-xl border border-navy-200 px-4 py-2.5 text-sm font-semibold text-navy-700 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
            >
              <Eye className="h-4 w-4" />
              Preview
            </Link>
            <a
              href={`${API_BASE}/api/papers/${paper.id}/download`}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-brand-700"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          </div>
        </div>

        {/* Meta grid */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {meta.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-navy-100 bg-navy-50/60 p-4"
            >
              <item.icon className="h-5 w-5 text-brand-600" />
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-navy-400">
                {item.label}
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-navy-900">
                {item.value}
              </p>
              {item.sub && (
                <p className="truncate text-xs text-navy-500">
                  {item.sub}
                </p>
              )}
            </div>
          ))}
        </div>

        {role && (
          <div className="mt-6 flex flex-wrap gap-2 border-t border-navy-100 pt-5">
            <Link
              to={`/admin/papers/${paper.id}/edit`}
              className="flex items-center gap-1.5 rounded-lg border border-navy-200 px-3 py-2 text-xs font-semibold text-navy-700 transition hover:bg-navy-50"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit (admin)
            </Link>
          </div>
        )}
      </motion.div>

      {/* Related */}
      {paper.related && paper.related.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold text-navy-950 sm:text-2xl">
            Related papers
          </h2>
          <p className="mt-1 text-sm text-navy-600">
            Same branch and semester — students also downloaded
            these.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {paper.related.map((related, i) => (
              <PaperCard key={related.id} paper={related} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Download CTA */}
      <section className="mt-12 rounded-3xl bg-gradient-to-br from-navy-900 to-brand-900 p-8 text-center text-white sm:p-10">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">
          Download {paper.subject_name}
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-navy-200">
          Watermarked PDF · {paper.page_count} pages ·{" "}
          {formatBytes(paper.file_size_bytes)} · already downloaded{" "}
          {formatNumber(paper.download_count)} times
        </p>
        <a
          href={`${API_BASE}/api/papers/${paper.id}/download`}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-bold text-navy-900 shadow-lift transition hover:bg-brand-50"
        >
          <Send className="h-4 w-4 rotate-[-45deg]" />
          Download now
        </a>
      </section>
    </div>
  );
}
