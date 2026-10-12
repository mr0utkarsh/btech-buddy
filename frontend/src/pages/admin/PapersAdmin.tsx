import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  UploadCloud,
  Eye,
  Pencil,
  Trash2,
  Send,
  Undo2,
  FileText,
  MoreVertical,
} from "lucide-react";
import { api } from "../../lib/api";
import type { Paper, PaperListResponse } from "../../lib/types";
import { PaperCardSkeleton } from "../../components/Skeleton";
import { Modal } from "../../components/Modal";
import { useToast } from "../../context/ToastContext";
import {
  formatBytes,
  formatDate,
  examTypeLabel,
} from "../../lib/format";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

export function PapersAdmin() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Paper | null>(
    null
  );
  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    try {
      const res = await api.get<PaperListResponse>(
        `/api/admin/papers?${params.toString()}`
      );
      setPapers(Array.isArray(res?.data) ? res.data : []);
      setTotal(typeof res?.total === "number" ? res.total : 0);
    } catch (e) {
      setPapers([]);
      setTotal(0);
      toastError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, q, status, toastError]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / limit);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.del(`/api/admin/papers/${deleteTarget.id}`);
      toastSuccess("Paper deleted");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const togglePublish = async (paper: Paper) => {
    const isPublished = paper.status === "published";
    try {
      await api.post(
        `/api/admin/papers/${paper.id}/${
          isPublished ? "unpublish" : "publish"
        }`
      );
      toastSuccess(
        isPublished ? "Paper unpublished" : "Paper published"
      );
      load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Action failed");
    }
  };

  const statusBadge = (s: string) =>
    s === "published"
      ? "bg-emerald-50 text-emerald-700"
      : s === "draft"
        ? "bg-amber-50 text-amber-700"
        : "bg-surface-2 text-fg-muted";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg sm:text-3xl">
            Papers
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            {total} total · {papers.filter((p) => p.status === "published").length} on this page published
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

      {/* Toolbar */}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            load();
          }}
          className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-surface p-1.5 shadow-soft focus-within:border-accent"
          role="search"
        >
          <Search className="ml-2 h-4.5 w-4.5 shrink-0 text-fg-subtle" />
          <input
            defaultValue={q}
            placeholder="Search subject, paper code, institution…"
            className="w-full bg-transparent px-1 py-2 text-sm outline-none placeholder:text-fg-subtle"
            aria-label="Search papers"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover"
          >
            Search
          </button>
        </form>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm shadow-soft focus:border-accent focus:outline-none"
          aria-label="Filter by status"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface shadow-soft"
      >
        {loading ? (
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <PaperCardSkeleton key={i} />
            ))}
          </div>
        ) : papers.length === 0 ? (
          <div className="p-14 text-center">
            <FileText className="mx-auto h-12 w-12 text-fg-muted" />
            <h3 className="mt-4 font-display text-lg font-semibold text-fg">
              No papers found
            </h3>
            <p className="mt-1 text-sm text-fg-subtle">
              Upload your first question paper to get started.
            </p>
            <Link
              to="/admin/papers/upload"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-fg transition hover:bg-accent-hover"
            >
              <UploadCloud className="h-4 w-4" />
              Upload paper
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wider text-fg-subtle">
                  <th className="px-5 py-3.5 font-semibold">Paper</th>
                  <th className="px-5 py-3.5 font-semibold">Institution</th>
                  <th className="px-5 py-3.5 font-semibold">Sem</th>
                  <th className="px-5 py-3.5 font-semibold">Exam</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Downloads</th>
                  <th className="px-5 py-3.5 font-semibold">Uploaded</th>
                  <th className="px-5 py-3.5 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {papers.map((paper) => (
                  <tr
                    key={paper.id}
                    className="transition hover:bg-surface-2/60"
                  >
                    <td className="max-w-[220px] px-5 py-3.5">
                      <p className="truncate font-medium text-fg">
                        {paper.subject_name}
                      </p>
                      <p className="truncate text-xs text-fg-subtle">
                        {paper.branches?.name} ·{" "}
                        {paper.page_count} pages ·{" "}
                        {formatBytes(paper.file_size_bytes)}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-fg-muted">
                      {paper.institutions?.short_name}
                    </td>
                    <td className="px-5 py-3.5 text-fg-muted">
                      {paper.semester}
                    </td>
                    <td className="px-5 py-3.5 text-fg-muted">
                      {examTypeLabel(paper.exam_type)}{" "}
                      <span className="text-fg-subtle">
                        {paper.exam_year}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusBadge(paper.status)}`}
                      >
                        {paper.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-fg">
                      {paper.download_count}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-fg-subtle">
                      {formatDate(paper.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/papers/${paper.id}/preview`}
                          className="rounded-lg p-2 text-fg-subtle transition hover:bg-accent-soft hover:text-accent"
                          aria-label="Preview paper"
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          to={`/admin/papers/${paper.id}/edit`}
                          className="rounded-lg p-2 text-fg-subtle transition hover:bg-accent-soft hover:text-accent"
                          aria-label="Edit paper"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => togglePublish(paper)}
                          className={`rounded-lg p-2 transition ${
                            paper.status === "published"
                              ? "hover:bg-amber-50 hover:text-amber-700"
                              : "hover:bg-emerald-50 hover:text-emerald-700"
                          }`}
                          aria-label={
                            paper.status === "published"
                              ? "Unpublish paper"
                              : "Publish paper"
                          }
                          title={
                            paper.status === "published"
                              ? "Unpublish"
                              : "Publish"
                          }
                        >
                          {paper.status === "published" ? (
                            <Undo2 className="h-4 w-4" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(paper)}
                          className="rounded-lg p-2 text-fg-subtle transition hover:bg-rose-50 hover:text-rose-700"
                          aria-label="Delete paper"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-fg-muted transition hover:bg-surface-2 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-sm text-fg-muted">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-fg-muted transition hover:bg-surface-2 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete paper"
      >
        <p className="text-sm text-fg-muted">
          Delete{" "}
          <strong>{deleteTarget?.subject_name}</strong> (
          {deleteTarget?.institutions?.short_name}, Sem{" "}
          {deleteTarget?.semester}, {deleteTarget?.exam_year})?
        </p>
        <p className="mt-2 text-sm text-fg-subtle">
          Both the original and the watermarked PDF will be
          removed from storage. This cannot be undone.
        </p>
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setDeleteTarget(null)}
            className="flex-1 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-fg-muted transition hover:bg-surface-2"
          >
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-accent-fg transition hover:bg-rose-700"
          >
            <Trash2 className="h-4 w-4" />
            Delete permanently
          </button>
        </div>
      </Modal>
    </div>
  );
}
