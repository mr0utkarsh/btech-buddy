import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Download, FileText, Eye, GraduationCap } from "lucide-react";
import type { Paper } from "../lib/types";
import {
  formatBytes,
  formatNumber,
  formatDate,
  examTypeLabel,
} from "../lib/format";

export function PaperCard({
  paper,
  index = 0,
}: {
  paper: Paper;
  index?: number;
}) {
  const inst = paper.institutions?.short_name || "Unknown";
  const branch = paper.branches?.name || "";
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3) }}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="h-1.5 w-full bg-gradient-to-r from-accent via-accent to-fg opacity-80 transition group-hover:opacity-100" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition group-hover:bg-accent group-hover:text-accent-fg">
            <FileText className="h-5 w-5" />
          </div>
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-fg-muted">
            {examTypeLabel(paper.exam_type)}
          </span>
        </div>

        <h3 className="mt-3 line-clamp-2 font-display text-base font-semibold leading-snug text-fg">
          {paper.subject_name}
        </h3>

        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-fg-muted">
          <GraduationCap className="h-4 w-4 shrink-0 text-fg-subtle" />
          <span className="line-clamp-1">
            {inst}
            {paper.institutions?.verified ? " ✓" : ""}
          </span>
        </p>

        <p className="text-sm text-fg-muted">
          {branch} · Sem {paper.semester} · {paper.exam_year}
        </p>

        <div className="mt-auto flex items-center justify-between border-t border-line pt-3 text-xs text-fg-subtle">
          <span className="flex items-center gap-1">
            <Download className="h-3.5 w-3.5" />
            {formatNumber(paper.download_count)}
          </span>
          <span>{formatBytes(paper.file_size_bytes)}</span>
          <span>{paper.page_count} pages</span>
        </div>

        <div className="mt-4 flex gap-2">
          <Link
            to={`/papers/${paper.id}/preview`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium text-fg-muted transition hover:border-accent hover:bg-accent-soft hover:text-accent"
          >
            <Eye className="h-4 w-4" />
            Preview
          </Link>
          <Link
            to={`/papers/${paper.id}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover"
          >
            Details
          </Link>
        </div>
        <p className="mt-2 text-[11px] text-fg-subtle">
          {formatDate(paper.created_at)}
        </p>
      </div>
    </motion.div>
  );
}
