import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  BadgeCheck,
  BadgeX,
  University,
  GraduationCap,
  Landmark,
} from "lucide-react";
import { api } from "../../lib/api";
import type { Institution, InstitutionType } from "../../lib/types";
import { Modal } from "../../components/Modal";
import { useToast } from "../../context/ToastContext";

const TYPE_META: Record<
  InstitutionType,
  { label: string; icon: typeof University; color: string }
> = {
  university: {
    label: "University",
    icon: University,
    color: "bg-brand-50 text-brand-700",
  },
  college: {
    label: "College",
    icon: GraduationCap,
    color: "bg-navy-50 text-navy-700",
  },
  institute: {
    label: "Institute",
    icon: Landmark,
    color: "bg-sky-50 text-sky-700",
  },
};

interface InstitutionForm {
  name: string;
  short_name: string;
  type: InstitutionType;
  city: string;
  state: string;
  website: string;
  established_year: string;
  affiliated_to: string;
  verified: boolean;
}

const emptyForm: InstitutionForm = {
  name: "",
  short_name: "",
  type: "college",
  city: "Kanpur",
  state: "Uttar Pradesh",
  website: "",
  established_year: "",
  affiliated_to: "",
  verified: false,
};

export function InstitutionsAdmin() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Institution | null>(null);
  const [deleting, setDeleting] = useState<Institution | null>(null);
  const [form, setForm] = useState<InstitutionForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"" | InstitutionType>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data?: Institution[] }>(
        "/api/institutions"
      );
      setInstitutions(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setInstitutions([]);
      toastError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    load();
  }, [load]);

  const universities = institutions.filter(
    (i) => i.type === "university"
  );
  const filtered = filter
    ? institutions.filter((i) => i.type === filter)
    : institutions;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (inst: Institution) => {
    setEditing(inst);
    setForm({
      name: inst.name,
      short_name: inst.short_name,
      type: inst.type,
      city: inst.city,
      state: inst.state,
      website: inst.website || "",
      established_year: inst.established_year
        ? String(inst.established_year)
        : "",
      affiliated_to: inst.affiliated_to || "",
      verified: inst.verified,
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Name is required";
    if (form.short_name.trim().length < 2)
      next.short_name = "Short name is required";
    if (form.type !== "university" && !form.affiliated_to)
      next.affiliated_to =
        "Colleges/institutes must affiliate to a university";
    if (
      form.established_year &&
      !/^\d{4}$/.test(form.established_year)
    )
      next.established_year = "Enter a valid year";
    if (form.website && !/^https?:\/\/.+/.test(form.website))
      next.website = "Must start with http:// or https://";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      short_name: form.short_name.trim(),
      type: form.type,
      city: form.city.trim() || "Kanpur",
      state: form.state.trim() || "Uttar Pradesh",
      website: form.website.trim() || null,
      established_year: form.established_year
        ? parseInt(form.established_year, 10)
        : null,
      affiliated_to:
        form.type === "university" ? null : form.affiliated_to || null,
      verified: form.verified,
    };
    try {
      if (editing) {
        await api.patch(
          `/api/admin/institutions/${editing.id}`,
          payload
        );
        toastSuccess("Institution updated");
      } else {
        await api.post("/api/admin/institutions", payload);
        toastSuccess("Institution added");
      }
      setModalOpen(false);
      load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await api.del(`/api/admin/institutions/${deleting.id}`);
      toastSuccess("Institution deleted");
      setDeleting(null);
      load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Delete failed");
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
            Institutions
          </h1>
          <p className="mt-1 text-sm text-navy-600">
            {institutions.length} institutions ·{" "}
            {universities.length} universities ·{" "}
            {institutions.length - universities.length} colleges
            & institutes
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Add institution
        </button>
      </div>

      {/* Type filter */}
      <div className="mt-5 flex flex-wrap gap-2">
        {[
          { value: "", label: "All" },
          { value: "university", label: "Universities" },
          { value: "college", label: "Colleges" },
          { value: "institute", label: "Institutes" },
        ].map((t) => (
          <button
            key={t.value}
            onClick={() => setFilter(t.value as "" | InstitutionType)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === t.value
                ? "bg-navy-900 text-white"
                : "border border-navy-200 bg-white text-navy-700 hover:bg-navy-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-2xl border border-navy-100 bg-white shadow-soft"
              />
            ))
          : filtered.map((inst, i) => {
              const meta = TYPE_META[inst.type];
              const affiliation = institutions.find(
                (u) => u.id === inst.affiliated_to
              );
              return (
                <motion.div
                  key={inst.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3) }}
                  className="group flex flex-col rounded-2xl border border-navy-100 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${meta.color}`}
                    >
                      <meta.icon className="h-5.5 w-5.5" />
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${meta.color}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-base font-semibold leading-snug text-navy-950">
                    {inst.name}
                  </h3>
                  <p className="mt-1 text-xs text-navy-500">
                    {inst.city}, {inst.state}
                    {inst.established_year
                      ? ` · est. ${inst.established_year}`
                      : ""}
                  </p>
                  {inst.type !== "university" && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-navy-600">
                      <University className="h-3.5 w-3.5 text-brand-600" />
                      Affiliated to:{" "}
                      <span className="font-medium">
                        {affiliation?.short_name || "—"}
                      </span>
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <span
                      className={`flex items-center gap-1 text-xs font-semibold ${
                        inst.verified
                          ? "text-emerald-600"
                          : "text-navy-400"
                      }`}
                    >
                      {inst.verified ? (
                        <>
                          <BadgeCheck className="h-4 w-4" />
                          Verified
                        </>
                      ) : (
                        <>
                          <BadgeX className="h-4 w-4" />
                          Unverified
                        </>
                      )}
                    </span>
                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={() => openEdit(inst)}
                        className="rounded-lg p-2 text-navy-500 transition hover:bg-brand-50 hover:text-brand-700"
                        aria-label={`Edit ${inst.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(inst)}
                        className="rounded-lg p-2 text-navy-500 transition hover:bg-rose-50 hover:text-rose-700"
                        aria-label={`Delete ${inst.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
      </div>

      {/* Add / edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit institution" : "Add institution"}
        wide
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Full name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass(Boolean(errors.name))}
              placeholder="e.g. Pranveer Singh Institute of Technology"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-600">{errors.name}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Short name</label>
            <input
              value={form.short_name}
              onChange={(e) => setForm({ ...form, short_name: e.target.value })}
              className={inputClass(Boolean(errors.short_name))}
              placeholder="e.g. PSIT"
            />
            {errors.short_name && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.short_name}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm({
                  ...form,
                  type: e.target.value as InstitutionType,
                  affiliated_to:
                    e.target.value === "university" ? "" : form.affiliated_to,
                })
              }
              className={inputClass(false)}
            >
              <option value="university">University</option>
              <option value="college">College</option>
              <option value="institute">Institute</option>
            </select>
            <p className="mt-1 text-xs text-navy-400">
              Universities award degrees; colleges/institutes are
              affiliated to a university.
            </p>
          </div>
          {form.type !== "university" && (
            <div className="sm:col-span-2">
              <label className={labelClass}>Affiliated to (university)</label>
              <select
                value={form.affiliated_to}
                onChange={(e) => setForm({ ...form, affiliated_to: e.target.value })}
                className={inputClass(Boolean(errors.affiliated_to))}
              >
                <option value="">Select university…</option>
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              {errors.affiliated_to && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.affiliated_to}
                </p>
              )}
              <p className="mt-1 text-xs text-navy-400">
                Verify the affiliation with the university before marking
                verified.
              </p>
            </div>
          )}
          <div>
            <label className={labelClass}>City</label>
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className={inputClass(false)}
            />
          </div>
          <div>
            <label className={labelClass}>State</label>
            <input
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className={inputClass(false)}
            />
          </div>
          <div>
            <label className={labelClass}>
              Website <span className="font-normal text-navy-400">(optional)</span>
            </label>
            <input
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://…"
              className={inputClass(Boolean(errors.website))}
            />
            {errors.website && (
              <p className="mt-1 text-xs text-rose-600">{errors.website}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>
              Established <span className="font-normal text-navy-400">(optional)</span>
            </label>
            <input
              value={form.established_year}
              onChange={(e) => setForm({ ...form, established_year: e.target.value })}
              placeholder="e.g. 2006"
              className={inputClass(Boolean(errors.established_year))}
            />
            {errors.established_year && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.established_year}
              </p>
            )}
          </div>
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-navy-100 bg-navy-50/60 px-4 py-3.5 sm:col-span-2">
            <span>
              <span className="block text-sm font-semibold text-navy-900">
                Verified institution
              </span>
              <span className="block text-xs text-navy-500">
                Only mark verified after confirming authenticity
              </span>
            </span>
            <span className="relative">
              <input
                type="checkbox"
                checked={form.verified}
                onChange={(e) => setForm({ ...form, verified: e.target.checked })}
                className="peer sr-only"
                aria-label="Verified institution"
              />
              <span className="block h-6 w-11 rounded-full bg-navy-300 transition peer-checked:bg-brand-600" />
              <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
            </span>
          </label>
        </div>
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setModalOpen(false)}
            className="flex-1 rounded-xl border border-navy-200 px-4 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-navy-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : editing ? "Save changes" : "Add institution"}
          </button>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete institution"
      >
        <p className="text-sm text-navy-700">
          Delete <strong>{deleting?.name}</strong>?
        </p>
        <p className="mt-2 text-sm text-navy-500">
          Deletion is blocked while question papers belong to
          this institution. Affiliated colleges will be
          unlinked.
        </p>
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setDeleting(null)}
            className="flex-1 rounded-xl border border-navy-200 px-4 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-navy-50"
          >
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
