import { useState } from "react";
import { motion } from "framer-motion";
import {
  Send,
  Mail,
  MapPin,
  Clock,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";

const ADMIN_CONTACT_EMAIL = "vishalkumar829987@gmail.com";

interface ContactCard {
  icon: typeof Mail;
  title: string;
  email?: string;
  lines: string[];
}

const CONTACT_CARDS: ContactCard[] = [
  {
    icon: Mail,
    title: "Admin contact",
    email: ADMIN_CONTACT_EMAIL,
    lines: ["Replies within 48 hours"],
  },
  {
    icon: MapPin,
    title: "Coverage",
    lines: [
      "Shri Mata Vaishno Devi University, Katra",
      "CSE · AI & Robotics specialization",
    ],
  },
  {
    icon: Clock,
    title: "Upload requests",
    lines: [
      "Mention subject, semester, year & exam type",
      "Verified admins add papers weekly",
    ],
  },
  {
    icon: MessageSquareText,
    title: "Report an issue",
    lines: [
      "Broken links, wrong metadata",
      "Copyright concerns: see our DMCA page",
    ],
  },
];

export function Contact() {
  const toast = useToast();
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = "Enter a valid email";
    if (form.message.trim().length < 10)
      next.message = "Message must be at least 10 characters";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.post("/api/contact", {
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim() || null,
        message: form.message.trim(),
      });
      toast.success("Message sent! We will get back to you soon.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (hasError: boolean) =>
    `mt-1.5 w-full rounded-xl border px-4 py-3 text-sm transition focus:outline-none ${
      hasError
        ? "border-rose-300 bg-rose-50 focus:border-rose-400"
        : "border-line bg-surface focus:border-accent"
    }`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">
          Contact us
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-fg sm:text-4xl">
          We would love to hear from you
        </h1>
        <p className="mt-3 text-fg-muted">
          Missing a paper? Found a broken link? Want your
          institution added? Send us a message.
        </p>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Form */}
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-line bg-surface p-6 shadow-lift sm:p-8"
          noValidate
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="c-name"
                className="text-sm font-semibold text-fg"
              >
                Full name
              </label>
              <input
                id="c-name"
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                className={inputClass(Boolean(errors.name))}
                placeholder="Your name"
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.name}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="c-email"
                className="text-sm font-semibold text-fg"
              >
                Email address
              </label>
              <input
                id="c-email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                className={inputClass(Boolean(errors.email))}
                placeholder="you@example.com"
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.email}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5">
            <label
              htmlFor="c-subject"
              className="text-sm font-semibold text-fg"
            >
              Subject <span className="font-normal text-fg-subtle">(optional)</span>
            </label>
            <input
              id="c-subject"
              type="text"
              value={form.subject}
              onChange={(e) =>
                setForm({ ...form, subject: e.target.value })
              }
              className={inputClass(false)}
              placeholder="e.g. Missing paper request"
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="c-message"
              className="text-sm font-semibold text-fg"
            >
              Message
            </label>
            <textarea
              id="c-message"
              rows={6}
              value={form.message}
              onChange={(e) =>
                setForm({ ...form, message: e.target.value })
              }
              className={`${inputClass(Boolean(errors.message))} resize-y`}
              placeholder="Tell us what you need…"
              aria-invalid={Boolean(errors.message)}
            />
            {errors.message && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.message}
              </p>
            )}
            <p className="mt-1 text-right text-xs text-fg-subtle">
              {form.message.length}/5000
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-accent-fg shadow-soft transition hover:bg-accent-hover disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Sending…" : "Send message"}
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-fg-subtle">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Responses are handled by verified admins only.
          </p>
        </motion.form>

        {/* Info cards */}
        <div className="space-y-4">
          {CONTACT_CARDS.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: i * 0.08 }}
              className="flex gap-4 rounded-2xl border border-line bg-surface p-5 shadow-soft"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <card.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-sm font-semibold text-fg">
                  {card.title}
                </h3>
                {card.email && (
                  <a
                    href={`mailto:${card.email}`}
                    className="mt-0.5 block break-all text-sm font-medium text-accent underline-offset-2 hover:underline"
                  >
                    {card.email}
                  </a>
                )}
                {card.lines.map((line, j) => (
                  <p
                    key={j}
                    className={`mt-0.5 text-sm ${
                      j === 0 ? "font-medium text-fg" : "text-fg-subtle"
                    }`}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
