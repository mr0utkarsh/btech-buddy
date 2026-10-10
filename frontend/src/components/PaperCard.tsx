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
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="h-1.5 w-full bg-gradient-to-r from-brand-600 via-brand-400 to-navy-700 opacity-80 transition group-hover:opacity-100" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-600 group-hover:text-white">
            <FileText className="h-5 w-5" />
          </div>
          <span className="rounded-full bg-navy-50 px-2.5 py-1 text-[11px] font-semibold text-navy-700">
            {examTypeLabel(paper.exam_type)}
          </span>
        </div>

        <h3 className="mt-3 line-clamp-2 font-display text-base font-semibold leading-snug text-navy-950">
          {paper.subject_name}
        </h3>

        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-navy-600">
          <GraduationCap className="h-4 w-4 shrink-0 text-navy-400" />
          <span className="line-clamp-1">
            {inst}
            {paper.institutions?.verified ? " ✓" : ""}
          </span>
        </p>

        <p className="text-sm text-navy-600">
          {branch} · Sem {paper.semester} · {paper.exam_year}
        </p>

        <div className="mt-auto flex items-center justify-between border-t border-navy-100 pt-3 text-xs text-navy-500">
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
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-navy-200 px-3 py-2 text-sm font-medium text-navy-700 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
          >
            <Eye className="h-4 w-4" />
            Preview
          </Link>
          <Link
            to={`/papers/${paper.id}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-navy-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-navy-800"
          >
            Details
          </Link>
        </div>
        <p className="mt-2 text-[11px] text-navy-400">
          {formatDate(paper.created_at)}
        </p>
      </div>
    </motion.div>
  );
}
