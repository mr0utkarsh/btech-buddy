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
          ? "fixed inset-0 z-[95] flex flex-col bg-surface"
          : "mx-auto flex max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8"
      }
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between gap-3 ${
          fullscreen ? "border-b border-line px-4 py-3" : "mb-4"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={`/papers/${id}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-fg-muted transition hover:bg-surface-2"
            aria-label="Back to paper details"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-display text-base font-semibold text-fg sm:text-lg">
              {paper
                ? `${paper.subject_name} — ${paper.institutions?.short_name}, Sem ${paper.semester} (${paper.exam_year})`
                : "Loading preview…"}
            </h1>
            {paper && (
              <p className="truncate text-xs text-fg-subtle">
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
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-fg-muted transition hover:bg-surface-2"
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
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-fg shadow-soft transition hover:bg-accent-hover"
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
        className="pdf-frame relative flex-1 overflow-hidden rounded-2xl border border-line shadow-lift"
      >
        {!frameError ? (
          <iframe
            title={`Preview of ${paper?.subject_name || "question paper"}`}
            src={previewUrl}
            className="absolute inset-0 h-full w-full rounded-2xl bg-surface"
            onError={() => setFrameError(true)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <FileWarning className="h-12 w-12 text-fg-muted" />
            <h2 className="mt-4 font-display text-lg font-semibold text-fg">
              Preview unavailable
            </h2>
            <p className="mt-1 max-w-sm text-sm text-fg-subtle">
              Your browser could not render the PDF inline. You can
              still download it instead.
            </p>
            <a
              href={`${API_BASE}/api/papers/${id}/download`}
              className="mt-5 flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-accent-fg transition hover:bg-accent-hover"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          </div>
        )}
        <div
          className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-fg/85 px-3 py-1 text-[11px] font-medium text-app backdrop-blur"
          aria-hidden
        >
          <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
          BTech Buddy watermarked copy
        </div>
      </motion.div>
    </div>
  );
}
