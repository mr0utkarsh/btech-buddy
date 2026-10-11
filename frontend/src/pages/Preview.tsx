import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Download,
  FileWarning,
  Loader2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { api, API_BASE } from "../lib/api";
import type { Paper } from "../lib/types";
import { useToast } from "../context/ToastContext";
import { examTypeLabel, formatBytes } from "../lib/format";

export function Preview() {
  const { id } = useParams<{ id: string }>();
  const { error: toastError } = useToast();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [frameError, setFrameError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Paper>(`/api/papers/${id}`)
      .then((data) => !cancelled && setPaper(data))
      .catch((e) => {
        if (!cancelled) toastError(e instanceof Error ? e.message : "Failed to load paper");
      });
    return () => {
      cancelled = true;
    };
  }, [id, toastError]);

  const previewUrl = `${API_BASE}/api/papers/${id}/preview`;

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-[95] flex flex-col bg-white"
          : "mx-auto flex max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8"
      }
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between gap-3 ${
          fullscreen ? "border-b border-navy-100 px-4 py-3" : "mb-4"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={`/papers/${id}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-navy-200 text-navy-700 transition hover:bg-navy-50"
            aria-label="Back to paper details"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-display text-base font-semibold text-navy-950 sm:text-lg">
              {paper
                ? `${paper.subject_name} — ${paper.institutions?.short_name}, Sem ${paper.semester} (${paper.exam_year})`
                : "Loading preview…"}
            </h1>
            {paper && (
              <p className="truncate text-xs text-navy-500">
                {examTypeLabel(paper.exam_type)} · {paper.page_count}{" "}
                pages · {formatBytes(paper.file_size_bytes)} ·
                Watermarked preview
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setFullscreen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-navy-200 text-navy-700 transition hover:bg-navy-50"
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
          <a
            href={`${API_BASE}/api/papers/${id}/download`}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-brand-700"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
          </a>
        </div>
      </div>

      {/* PDF frame */}
      <motion.div
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="pdf-frame relative flex-1 overflow-hidden rounded-2xl border border-navy-200 shadow-lift"
      >
        {!frameError ? (
          <iframe
            title={`Preview of ${paper?.subject_name || "question paper"}`}
            src={previewUrl}
            className="absolute inset-0 h-full w-full rounded-2xl bg-white"
            onError={() => setFrameError(true)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <FileWarning className="h-12 w-12 text-navy-300" />
            <h2 className="mt-4 font-display text-lg font-semibold text-navy-900">
              Preview unavailable
            </h2>
            <p className="mt-1 max-w-sm text-sm text-navy-500">
              Your browser could not render the PDF inline. You can
              still download it instead.
            </p>
            <a
              href={`${API_BASE}/api/papers/${id}/download`}
              className="mt-5 flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          </div>
        )}
        <div
          className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-navy-950/80 px-3 py-1 text-[11px] font-medium text-white"
          aria-hidden
        >
          <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
          BTech Buddy watermarked copy
        </div>
      </motion.div>
    </div>
  );
}
