import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  X,
} from "lucide-react";
import { api, uploadWithProgress, getAdminToken } from "../../lib/api";
import type {
  Institution,
  Branch,
  Subject,
} from "../../lib/types";
import { useToast } from "../../context/ToastContext";

const EXAM_TYPES = [
  { value: "regular", label: "Regular" },
  { value: "supply", label: "Supply" },
  { value: "improvement", label: "Improvement" },
  { value: "mid_sem", label: "Mid-Sem" },
  { value: "end_sem", label: "End-Sem" },
  { value: "preparatory", label: "Preparatory" },
  { value: "other", label: "Other" },
];

interface PaperForm {
  institution_id: string;
  branch_id: string;
  semester: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  paper_code: string;
  exam_type: string;
  exam_year: string;
  publish: boolean;
}

const initialForm: PaperForm = {
  institution_id: "",
  branch_id: "",
  semester: "",
  subject_id: "",
  subject_name: "",
  subject_code: "",
  paper_code: "",
  exam_type: "regular",
  exam_year: String(new Date().getFullYear()),
  publish: true,
};

export function UploadPaper() {
  const navigate = useNavigate();
  const { error: toastError, success: toastSuccess } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [form, setForm] = useState<PaperForm>(initialForm);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [inst, br] = await Promise.all([
          api.get<{ data?: Institution[] }>("/api/institutions"),
          api.get<{ data?: Branch[] }>("/api/branches"),
        ]);
        setInstitutions(Array.isArray(inst?.data) ? inst.data : []);
        setBranches(Array.isArray(br?.data) ? br.data : []);
      } catch (e) {
        setInstitutions([]);
        setBranches([]);
        toastError(e instanceof Error ? e.message : "Failed to load catalog");
      }
    })();
  }, [toastError]);

  // Load subjects when branch changes.
  useEffect(() => {
    if (!form.branch_id) {
      setSubjects([]);
      return;
    }
    api
      .get<{ data?: Subject[] }>(
        `/api/subjects?branch_id=${form.branch_id}`
      )
      .then((res) => setSubjects(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setSubjects([]));
  }, [form.branch_id]);

  const update = (patch: Partial<PaperForm>) =>
    setForm((f) => ({ ...f, ...patch }));

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.institution_id) next.institution_id = "Select an institution";
    if (!form.branch_id) next.branch_id = "Select a branch";
    if (!form.semester) next.semester = "Select a semester";
    if (!form.subject_id && !form.subject_name.trim())
      next.subject_name = "Pick a subject or type its name";
    if (!form.exam_year || !/^\d{4}$/.test(form.exam_year))
      next.exam_year = "Enter a valid year";
    else if (
      parseInt(form.exam_year, 10) < 1990 ||
      parseInt(form.exam_year, 10) > 2100
    )
      next.exam_year = "Year must be 1990–2100";
    if (!file) next.file = "Choose a PDF file";
    else if (file.type && file.type !== "application/pdf")
      next.file = "Only PDF files are allowed";
    else if (file.size > 50 * 1024 * 1024)
      next.file = "File must be under 50 MB";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toastError("Please fix the highlighted fields");
      return;
    }
    setSubmitting(true);
    setUploading(true);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append("institution_id", form.institution_id);
      formData.append("branch_id", form.branch_id);
      formData.append("semester", form.semester);
      if (form.subject_id) formData.append("subject_id", form.subject_id);
      if (form.subject_name.trim())
        formData.append("subject_name", form.subject_name.trim());
      if (form.subject_code.trim())
        formData.append("subject_code", form.subject_code.trim());
      if (form.paper_code.trim())
        formData.append("paper_code", form.paper_code.trim());
      formData.append("exam_type", form.exam_type);
      formData.append("exam_year", form.exam_year);
      formData.append("publish", String(form.publish));
      formData.append("file", file!);

      await uploadWithProgress(
        "/api/admin/papers",
        formData,
        getAdminToken(),
        setProgress
      );
      toastSuccess(
        form.publish
          ? "Paper uploaded and published"
          : "Paper uploaded as draft"
      );
      navigate("/admin/papers");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const selectClass = (hasError: boolean) =>
    `mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm transition focus:outline-none ${
      hasError
        ? "border-rose-300 bg-rose-50"
        : "border-line bg-surface focus:border-accent"
    }`;

  const labelClass = "text-sm font-semibold text-fg";

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/admin/papers"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" /> Back to papers
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold text-fg sm:text-3xl">
        Upload question paper
      </h1>
      <p className="mt-1 text-sm text-fg-muted">
        The PDF is validated, watermarked with "BTech Buddy"
        on every page, and stored securely.
      </p>

      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mt-6 rounded-3xl border border-line bg-surface p-6 shadow-lift sm:p-8"
        noValidate
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="up-inst" className={labelClass}>
              Institution / University
            </label>
            <select
              id="up-inst"
              value={form.institution_id}
              onChange={(e) => update({ institution_id: e.target.value })}
              className={selectClass(Boolean(errors.institution_id))}
              aria-invalid={Boolean(errors.institution_id)}
            >
              <option value="">Select institution…</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({inst.type}
                  {inst.verified ? ", verified" : ""})
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
            <label htmlFor="up-branch" className={labelClass}>
              Branch
            </label>
            <select
              id="up-branch"
              value={form.branch_id}
              onChange={(e) =>
                update({ branch_id: e.target.value, subject_id: "" })
              }
              className={selectClass(Boolean(errors.branch_id))}
              aria-invalid={Boolean(errors.branch_id)}
            >
              <option value="">Select branch…</option>
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
            <label htmlFor="up-sem" className={labelClass}>
              Semester
            </label>
            <select
              id="up-sem"
              value={form.semester}
              onChange={(e) => update({ semester: e.target.value })}
              className={selectClass(Boolean(errors.semester))}
              aria-invalid={Boolean(errors.semester)}
            >
              <option value="">Select semester…</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
            {errors.semester && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.semester}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="up-exam" className={labelClass}>
              Exam type
            </label>
            <select
              id="up-exam"
              value={form.exam_type}
              onChange={(e) => update({ exam_type: e.target.value })}
              className={selectClass(false)}
            >
              {EXAM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="up-year" className={labelClass}>
              Exam year
            </label>
            <input
              id="up-year"
              type="number"
              min={1990}
              max={2100}
              value={form.exam_year}
              onChange={(e) => update({ exam_year: e.target.value })}
              className={selectClass(Boolean(errors.exam_year))}
              aria-invalid={Boolean(errors.exam_year)}
            />
            {errors.exam_year && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.exam_year}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="up-papercode" className={labelClass}>
              Paper code <span className="font-normal text-fg-subtle">(optional)</span>
            </label>
            <input
              id="up-papercode"
              type="text"
              value={form.paper_code}
              onChange={(e) => update({ paper_code: e.target.value })}
              placeholder="e.g. CS-301"
              className={selectClass(false)}
            />
          </div>
        </div>

        {/* Subject */}
        <div className="mt-5">
          <label htmlFor="up-subject" className={labelClass}>
            Subject <span className="font-normal text-fg-subtle">(from catalog)</span>
          </label>
          <select
            id="up-subject"
            value={form.subject_id}
            onChange={(e) => update({ subject_id: e.target.value })}
            className={selectClass(false)}
          >
            <option value="">
              {form.branch_id
                ? "Select subject (or type below)…"
                : "Select a branch first…"}
            </option>
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
            <label htmlFor="up-subjectname" className={labelClass}>
              Or type subject name
            </label>
            <input
              id="up-subjectname"
              type="text"
              value={form.subject_name}
              onChange={(e) => update({ subject_name: e.target.value })}
              placeholder="e.g. Advanced Operating Systems"
              className={selectClass(Boolean(errors.subject_name))}
              aria-invalid={Boolean(errors.subject_name)}
            />
            {errors.subject_name && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.subject_name}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="up-subjectcode" className={labelClass}>
              Subject code <span className="font-normal text-fg-subtle">(optional)</span>
            </label>
            <input
              id="up-subjectcode"
              type="text"
              value={form.subject_code}
              onChange={(e) => update({ subject_code: e.target.value })}
              placeholder="e.g. BCA-302"
              className={selectClass(false)}
            />
          </div>
        </div>

        {/* File dropzone */}
        <div className="mt-5">
          <label className={labelClass}>PDF file</label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) setFile(f);
            }}
            onClick={() => fileInput.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") fileInput.current?.click();
            }}
            role="button"
            tabIndex={0}
            aria-label="Upload PDF"
            className={`mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
              dragOver
                ? "border-accent bg-accent-soft"
                : errors.file
                  ? "border-rose-300 bg-rose-50"
                  : "border-line bg-surface-2/50 hover:border-accent hover:bg-accent-soft/40"
            }`}
          >
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file ? (
              <>
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </span>
                <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-fg">
                  <FileText className="h-4 w-4" />
                  {file.name}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="rounded-full p-1 hover:bg-surface"
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </p>
                <p className="mt-1 text-xs text-fg-subtle">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </>
            ) : (
              <>
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <UploadCloud className="h-6 w-6" />
                </span>
                <p className="mt-3 text-sm font-semibold text-fg">
                  Drop your PDF here or{" "}
                  <span className="text-accent underline">
                    browse files
                  </span>
                </p>
                <p className="mt-1 text-xs text-fg-subtle">
                  PDF only · up to 50 MB · up to 300 pages
                </p>
              </>
            )}
          </div>
          {errors.file && (
            <p className="mt-1 flex items-center gap-1 text-xs text-rose-600">
              <AlertCircle className="h-3.5 w-3.5" />
              {errors.file}
            </p>
          )}
        </div>

        {/* Publish toggle */}
        <label className="mt-5 flex cursor-pointer items-center justify-between rounded-xl border border-line bg-surface-2 px-4 py-3.5">
          <span>
            <span className="block text-sm font-semibold text-fg">
              Publish immediately
            </span>
            <span className="block text-xs text-fg-subtle">
              Uncheck to save as draft for later review
            </span>
          </span>
          <span className="relative">
            <input
              type="checkbox"
              checked={form.publish}
              onChange={(e) => update({ publish: e.target.checked })}
              className="peer sr-only"
              aria-label="Publish immediately"
            />
            <span className="block h-6 w-11 rounded-full bg-line-strong transition peer-checked:bg-accent" />
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface shadow transition peer-checked:translate-x-5" />
          </span>
        </label>

        {/* Progress */}
        {uploading && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs font-semibold text-fg-muted">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 animate-ping rounded-full bg-accent" />
                Uploading & watermarking…
              </span>
              <span>{progress}%</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-accent to-sky-400"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
            <p className="mt-1.5 text-xs text-fg-subtle">
              After upload, every page is stamped with the
              BTech Buddy watermark automatically.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-accent-fg shadow-soft transition hover:bg-accent-hover disabled:opacity-60"
        >
          <UploadCloud className="h-4 w-4" />
          {submitting ? "Uploading…" : "Upload & process PDF"}
        </button>
      </motion.form>
    </div>
  );
}
