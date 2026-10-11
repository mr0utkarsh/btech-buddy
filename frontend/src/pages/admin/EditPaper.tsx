import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Save,
  UploadCloud,
  X,
} from "lucide-react";
import {
  api,
  uploadWithProgress,
  getAdminToken,
} from "../../lib/api";
import type {
  Paper,
  Institution,
  Branch,
  Subject,
} from "../../lib/types";
import { useToast } from "../../context/ToastContext";

const EXAM_TYPES = [
  "regular",
  "supply",
  "improvement",
  "mid_sem",
  "end_sem",
  "preparatory",
  "other",
];

export function EditPaper() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { error: toastError, success: toastSuccess } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [paper, setPaper] = useState<Paper | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [form, setForm] = useState({
    institution_id: "",
    branch_id: "",
    semester: "",
    subject_id: "",
    subject_name: "",
    subject_code: "",
    paper_code: "",
    exam_type: "regular",
    exam_year: "",
  });
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [p, inst, br] = await Promise.all([
          api.get<Paper>(`/api/admin/papers/${id}`),
          api.get<{ data?: Institution[] }>("/api/institutions"),
          api.get<{ data?: Branch[] }>("/api/branches"),
        ]);
        setPaper(p);
        setInstitutions(Array.isArray(inst?.data) ? inst.data : []);
        setBranches(Array.isArray(br?.data) ? br.data : []);
        setForm({
          institution_id: p.institution_id,
          branch_id: p.branch_id,
          semester: String(p.semester),
          subject_id: p.subject_id || "",
          subject_name: p.subject_name,
          subject_code: p.subject_code || "",
          paper_code: p.paper_code || "",
          exam_type: p.exam_type,
          exam_year: String(p.exam_year),
        });
      } catch (e) {
        toastError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
  }, [id, toastError]);

  useEffect(() => {
    if (!form.branch_id) return;
    api
      .get<{ data?: Subject[] }>(
        `/api/subjects?branch_id=${form.branch_id}`
      )
      .then((res) => setSubjects(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setSubjects([]));
  }, [form.branch_id]);

  const update = (patch: Partial<typeof form>) =>
    setForm((f) => ({ ...f, ...patch }));

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.institution_id) next.institution_id = "Select an institution";
    if (!form.branch_id) next.branch_id = "Select a branch";
    if (!form.semester) next.semester = "Select a semester";
    if (!form.subject_name.trim())
      next.subject_name = "Subject name is required";
    if (!/^\d{4}$/.test(form.exam_year))
      next.exam_year = "Enter a valid year";
    if (replaceFile && replaceFile.type !== "application/pdf")
      next.file = "Only PDF files are allowed";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toastError("Please fix the highlighted fields");
      return;
    }
    setSaving(true);
    setReplacing(Boolean(replaceFile));
    try {
      await api.patch(`/api/admin/papers/${id}`, {
        institution_id: form.institution_id,
        branch_id: form.branch_id,
        semester: parseInt(form.semester, 10),
        subject_id: form.subject_id || null,
        subject_name: form.subject_name.trim(),
        subject_code: form.subject_code.trim() || null,
        paper_code: form.paper_code.trim() || null,
        exam_type: form.exam_type,
        exam_year: parseInt(form.exam_year, 10),
      });
      if (replaceFile) {
        const formData = new FormData();
        formData.append("file", replaceFile);
        await uploadWithProgress(
          `/api/admin/papers/${id}/replace`,
          formData,
          getAdminToken(),
          setProgress
        );
      }
      toastSuccess("Paper saved");
      navigate("/admin/papers");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
      setReplacing(false);
    }
  };

  const selectClass = (hasError: boolean) =>
    `mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm transition focus:outline-none ${
      hasError
        ? "border-rose-300 bg-rose-50"
        : "border-navy-200 bg-white focus:border-brand-400"
    }`;
  const labelClass = "text-sm font-semibold text-navy-900";

  if (!paper) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/admin/papers"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 transition hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to papers
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold text-navy-950 sm:text-3xl">
        Edit paper
      </h1>
      <p className="mt-1 text-sm text-navy-600">
        {paper.subject_name} · uploaded{" "}
        {new Date(paper.created_at).toLocaleDateString("en-IN")}
      </p>

      <motion.form
        onSubmit={save}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mt-6 rounded-3xl border border-navy-100 bg-white p-6 shadow-lift sm:p-8"
        noValidate
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Institution</label>
            <select
              value={form.institution_id}
              onChange={(e) => update({ institution_id: e.target.value })}
              className={selectClass(Boolean(errors.institution_id))}
            >
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({inst.type})
                </option>
              ))}
            </select>
            {errors.institution_id && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.institution_id}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Branch</label>
            <select
              value={form.branch_id}
              onChange={(e) => update({ branch_id: e.target.value, subject_id: "" })}
              className={selectClass(Boolean(errors.branch_id))}
            >
              {branches.map((br) => (
                <option key={br.id} value={br.id}>
                  {br.name}
                </option>
              ))}
            </select>
            {errors.branch_id && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.branch_id}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Semester</label>
            <select
              value={form.semester}
              onChange={(e) => update({ semester: e.target.value })}
              className={selectClass(Boolean(errors.semester))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Exam type</label>
            <select
              value={form.exam_type}
              onChange={(e) => update({ exam_type: e.target.value })}
              className={selectClass(false)}
            >
              {EXAM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t[0].toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Exam year</label>
            <input
              type="number"
              min={1990}
              max={2100}
              value={form.exam_year}
              onChange={(e) => update({ exam_year: e.target.value })}
              className={selectClass(Boolean(errors.exam_year))}
            />
            {errors.exam_year && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.exam_year}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>
              Paper code <span className="font-normal text-navy-400">(optional)</span>
            </label>
            <input
              type="text"
              value={form.paper_code}
              onChange={(e) => update({ paper_code: e.target.value })}
              className={selectClass(false)}
            />
          </div>
        </div>

        <div className="mt-5">
          <label className={labelClass}>
            Subject <span className="font-normal text-navy-400">(catalog)</span>
          </label>
          <select
            value={form.subject_id}
            onChange={(e) => update({ subject_id: e.target.value })}
            className={selectClass(false)}
          >
            <option value="">None — use typed name</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
                {sub.code ? ` (${sub.code})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Subject name</label>
            <input
              type="text"
              value={form.subject_name}
              onChange={(e) => update({ subject_name: e.target.value })}
              className={selectClass(Boolean(errors.subject_name))}
            />
            {errors.subject_name && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.subject_name}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>
              Subject code <span className="font-normal text-navy-400">(optional)</span>
            </label>
            <input
              type="text"
              value={form.subject_code}
              onChange={(e) => update({ subject_code: e.target.value })}
              className={selectClass(false)}
            />
          </div>
        </div>

        {/* Replace file */}
        <div className="mt-5">
          <label className={labelClass}>
            Replace PDF <span className="font-normal text-navy-400">(optional)</span>
          </label>
          <div
            onClick={() => fileInput.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") fileInput.current?.click();
            }}
            role="button"
            tabIndex={0}
            aria-label="Replace PDF"
            className="mt-1.5 flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-navy-200 bg-navy-50/50 px-6 py-6 transition hover:border-brand-400 hover:bg-brand-50/40"
          >
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
            />
            {replaceFile ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-semibold text-navy-900">
                  {replaceFile.name}
                </span>
                <span className="text-xs text-navy-500">
                  ({(replaceFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setReplaceFile(null);
                  }}
                  className="rounded-full p-1 hover:bg-white"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <UploadCloud className="h-5 w-5 text-brand-600" />
                <span className="text-sm font-medium text-navy-700">
                  Choose a new PDF to re-watermark and replace
                </span>
              </>
            )}
          </div>
          {errors.file && (
            <p className="mt-1 flex items-center gap-1 text-xs text-rose-600">
              <AlertCircle className="h-3.5 w-3.5" />
              {errors.file}
            </p>
          )}
          {replacing && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs font-semibold text-navy-700">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-ping rounded-full bg-brand-500" />
                  Re-processing…
                </span>
                <span>{progress}%</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-navy-100">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-brand-600 to-sky-400"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </div>
          )}
          <p className="mt-2 flex items-center gap-1.5 text-xs text-navy-500">
            <FileText className="h-3.5 w-3.5" />
            Current file: {paper.page_count} pages ·{" "}
            {(paper.file_size_bytes / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>

        <div className="mt-6 flex gap-2">
          <Link
            to="/admin/papers"
            className="flex-1 rounded-xl border border-navy-200 px-4 py-3 text-sm font-semibold text-navy-700 transition hover:bg-navy-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-brand-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
