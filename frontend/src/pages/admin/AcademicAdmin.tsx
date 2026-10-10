import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Building2,
} from "lucide-react";
import { api } from "../../lib/api";
import type { Branch, Subject } from "../../lib/types";
import { Modal } from "../../components/Modal";
import { useToast } from "../../context/ToastContext";

export function AcademicAdmin() {
  const toast = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchModal, setBranchModal] = useState(false);
  const [subjectModal, setSubjectModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [branchForm, setBranchForm] = useState({ name: "", code: "" });
  const [subjectForm, setSubjectForm] = useState({
    branch_id: "",
    semester: "1",
    name: "",
    code: "",
  });
  const [subjectFilter, setSubjectFilter] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [br, sub] = await Promise.all([
        api.get<{ data: Branch[] }>("/api/branches"),
        api.get<{ data: Subject[] }>("/api/subjects"),
      ]);
      setBranches(br.data);
      setSubjects(sub.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredSubjects = subjectFilter
    ? subjects.filter((s) => s.branch_id === subjectFilter)
    : subjects;

  /* ---------------- branches ---------------- */

  const openBranchCreate = () => {
    setEditingBranch(null);
    setBranchForm({ name: "", code: "" });
    setErrors({});
    setBranchModal(true);
  };

  const openBranchEdit = (b: Branch) => {
    setEditingBranch(b);
    setBranchForm({ name: b.name, code: b.code || "" });
    setErrors({});
    setBranchModal(true);
  };

  const saveBranch = async () => {
    if (branchForm.name.trim().length < 2) {
      setErrors({ name: "Branch name is required" });
      return;
    }
    setSaving(true);
    try {
      if (editingBranch) {
        await api.patch(`/api/admin/branches/${editingBranch.id}`, {
          name: branchForm.name.trim(),
          code: branchForm.code.trim().toUpperCase() || null,
        });
        toast.success("Branch updated");
      } else {
        await api.post("/api/admin/branches", {
          name: branchForm.name.trim(),
          code: branchForm.code.trim().toUpperCase() || null,
        });
        toast.success("Branch added");
      }
      setBranchModal(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteBranch = async () => {
    if (!deletingBranch) return;
    try {
      await api.del(`/api/admin/branches/${deletingBranch.id}`);
      toast.success("Branch deleted");
      setDeletingBranch(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  /* ---------------- subjects ---------------- */

  const openSubjectCreate = () => {
    setEditingSubject(null);
    setSubjectForm({
      branch_id: subjectFilter || branches[0]?.id || "",
      semester: "1",
      name: "",
      code: "",
    });
    setErrors({});
    setSubjectModal(true);
  };

  const openSubjectEdit = (s: Subject) => {
    setEditingSubject(s);
    setSubjectForm({
      branch_id: s.branch_id,
      semester: String(s.semester),
      name: s.name,
      code: s.code || "",
    });
    setErrors({});
    setSubjectModal(true);
  };

  const saveSubject = async () => {
    const next: Record<string, string> = {};
    if (!subjectForm.branch_id) next.branch_id = "Select a branch";
    if (subjectForm.name.trim().length < 2)
      next.name = "Subject name is required";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    const payload = {
      branch_id: subjectForm.branch_id,
      semester: parseInt(subjectForm.semester, 10),
      name: subjectForm.name.trim(),
      code: subjectForm.code.trim().toUpperCase() || null,
    };
    try {
      if (editingSubject) {
        await api.patch(
          `/api/admin/subjects/${editingSubject.id}`,
          payload
        );
        toast.success("Subject updated");
      } else {
        await api.post("/api/admin/subjects", payload);
        toast.success("Subject added");
      }
      setSubjectModal(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteSubject = async () => {
    if (!deletingSubject) return;
    try {
      await api.del(`/api/admin/subjects/${deletingSubject.id}`);
      toast.success("Subject deleted");
      setDeletingSubject(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const inputClass = (hasError: boolean) =>
    `mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm transition focus:outline-none ${
      hasError
        ? "border-rose-300 bg-rose-50"
        : "border-navy-200 bg-white focus:border-brand-400"
    }`;
  const labelClass = "text-sm font-semibold text-navy-900";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-950 sm:text-3xl">
            Branches & Subjects
          </h1>
          <p className="mt-1 text-sm text-navy-600">
            {branches.length} branches · {subjects.length} subjects in
            the catalog
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openBranchCreate}
            className="flex items-center gap-2 rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-sm font-bold text-navy-800 shadow-soft transition hover:bg-navy-50"
          >
            <Plus className="h-4 w-4" />
            Branch
          </button>
          <button
            onClick={openSubjectCreate}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Subject
          </button>
        </div>
      </div>

      {/* Branches */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-6 rounded-2xl border border-navy-100 bg-white shadow-soft"
      >
        <div className="flex items-center gap-2 border-b border-navy-100 px-5 py-4">
          <Building2 className="h-5 w-5 text-brand-600" />
          <h2 className="font-display text-base font-semibold text-navy-950">
            Branches
          </h2>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl bg-navy-50"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((b) => (
              <div
                key={b.id}
                className="group flex items-center justify-between rounded-xl border border-navy-100 bg-navy-50/50 px-4 py-3.5 transition hover:border-brand-300"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 font-display text-xs font-bold text-brand-700">
                    {(b.code || b.name.slice(0, 2)).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-navy-900">
                      {b.name}
                    </p>
                    <p className="text-xs text-navy-500">
                      {subjects.filter((s) => s.branch_id === b.id).length}{" "}
                      subjects
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => openBranchEdit(b)}
                    className="rounded-lg p-1.5 text-navy-500 transition hover:bg-brand-50 hover:text-brand-700"
                    aria-label={`Edit ${b.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeletingBranch(b)}
                    className="rounded-lg p-1.5 text-navy-500 transition hover:bg-rose-50 hover:text-rose-700"
                    aria-label={`Delete ${b.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.section>

      {/* Subjects */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mt-6 rounded-2xl border border-navy-100 bg-white shadow-soft"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-navy-950">
            <BookOpen className="h-5 w-5 text-brand-600" />
            Subjects
          </h2>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            aria-label="Filter subjects by branch"
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-xl bg-navy-50"
              />
            ))}
          </div>
        ) : filteredSubjects.length === 0 ? (
          <p className="p-8 text-center text-sm text-navy-500">
            No subjects found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-xs uppercase tracking-wider text-navy-400">
                  <th className="px-5 py-3 font-semibold">Subject</th>
                  <th className="px-5 py-3 font-semibold">Branch</th>
                  <th className="px-5 py-3 font-semibold">Sem</th>
                  <th className="px-5 py-3 font-semibold">Code</th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {filteredSubjects.map((s) => (
                  <tr key={s.id} className="transition hover:bg-navy-50/60">
                    <td className="px-5 py-3 font-medium text-navy-900">
                      {s.name}
                    </td>
                    <td className="px-5 py-3 text-navy-700">
                      {branches.find((b) => b.id === s.branch_id)?.name || "—"}
                    </td>
                    <td className="px-5 py-3 text-navy-700">{s.semester}</td>
                    <td className="px-5 py-3 text-navy-500">{s.code || "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openSubjectEdit(s)}
                          className="rounded-lg p-2 text-navy-500 transition hover:bg-brand-50 hover:text-brand-700"
                          aria-label={`Edit ${s.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingSubject(s)}
                          className="rounded-lg p-2 text-navy-500 transition hover:bg-rose-50 hover:text-rose-700"
                          aria-label={`Delete ${s.name}`}
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
      </motion.section>

      {/* Branch modal */}
      <Modal
        open={branchModal}
        onClose={() => setBranchModal(false)}
        title={editingBranch ? "Edit branch" : "Add branch"}
      >
        <label className={labelClass}>Branch name</label>
        <input
          value={branchForm.name}
          onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
          className={inputClass(Boolean(errors.name))}
          placeholder="e.g. Computer Science and Engineering"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-rose-600">{errors.name}</p>
        )}
        <div className="mt-4">
          <label className={labelClass}>
            Code <span className="font-normal text-navy-400">(optional)</span>
          </label>
          <input
            value={branchForm.code}
            onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
            placeholder="e.g. CSE"
            className={inputClass(false)}
          />
        </div>
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setBranchModal(false)}
            className="flex-1 rounded-xl border border-navy-200 px-4 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-navy-50"
          >
            Cancel
          </button>
          <button
            onClick={saveBranch}
            disabled={saving}
            className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : editingBranch ? "Save" : "Add branch"}
          </button>
        </div>
      </Modal>

      {/* Subject modal */}
      <Modal
        open={subjectModal}
        onClose={() => setSubjectModal(false)}
        title={editingSubject ? "Edit subject" : "Add subject"}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Branch</label>
            <select
              value={subjectForm.branch_id}
              onChange={(e) => setSubjectForm({ ...subjectForm, branch_id: e.target.value })}
              className={inputClass(Boolean(errors.branch_id))}
            >
              <option value="">Select branch…</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {errors.branch_id && (
              <p className="mt-1 text-xs text-rose-600">{errors.branch_id}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Semester</label>
            <select
              value={subjectForm.semester}
              onChange={(e) => setSubjectForm({ ...subjectForm, semester: e.target.value })}
              className={inputClass(false)}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className={labelClass}>Subject name</label>
          <input
            value={subjectForm.name}
            onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
            className={inputClass(Boolean(errors.name))}
            placeholder="e.g. Operating Systems"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-rose-600">{errors.name}</p>
          )}
        </div>
        <div className="mt-4">
          <label className={labelClass}>
            Code <span className="font-normal text-navy-400">(optional)</span>
          </label>
          <input
            value={subjectForm.code}
            onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
            placeholder="e.g. CS-301"
            className={inputClass(false)}
          />
        </div>
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setSubjectModal(false)}
            className="flex-1 rounded-xl border border-navy-200 px-4 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-navy-50"
          >
            Cancel
          </button>
          <button
            onClick={saveSubject}
            disabled={saving}
            className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : editingSubject ? "Save" : "Add subject"}
          </button>
        </div>
      </Modal>

      {/* Delete modals */}
      <Modal
        open={!!deletingBranch}
        onClose={() => setDeletingBranch(null)}
        title="Delete branch"
      >
        <p className="text-sm text-navy-700">
          Delete <strong>{deletingBranch?.name}</strong>? Its subjects
          will also be removed. Blocked while papers reference it.
        </p>
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setDeletingBranch(null)}
            className="flex-1 rounded-xl border border-navy-200 px-4 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-navy-50"
          >
            Cancel
          </button>
          <button
            onClick={deleteBranch}
            className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700"
          >
            Delete
          </button>
        </div>
      </Modal>

      <Modal
        open={!!deletingSubject}
        onClose={() => setDeletingSubject(null)}
        title="Delete subject"
      >
        <p className="text-sm text-navy-700">
          Delete <strong>{deletingSubject?.name}</strong>? Blocked while
          papers reference it.
        </p>
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setDeletingSubject(null)}
            className="flex-1 rounded-xl border border-navy-200 px-4 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-navy-50"
          >
            Cancel
          </button>
          <button
            onClick={deleteSubject}
            className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
