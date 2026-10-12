import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";

const FAQS = [
  {
    category: "General",
    items: [
      {
        q: "What is BTech Buddy?",
        a: "BTech Buddy is a free library of previous-year question papers for Computer Science & Engineering students at Shri Mata Vaishno Devi University (SMVDU), Katra — focused on the AI & Robotics specialization.",
      },
      {
        q: "Do I need an account to download papers?",
        a: "No. Previewing and downloading published papers is completely open — no signup, no login, no fees.",
      },
      {
        q: "Why do downloaded PDFs have a watermark?",
        a: "A light diagonal 'BTech Buddy' watermark is applied automatically to every page. It keeps the library free and attribution intact while letting papers circulate freely.",
      },
      {
        q: "How often is new content added?",
        a: "Verified admins upload papers regularly. Recent uploads appear on the homepage and can be sorted by newest in the Browse section.",
      },
    ],
  },
  {
    category: "Searching",
    items: [
      {
        q: "How do I filter papers?",
        a: "Use the Browse page filters: branch (CSE), specialization (AI & Robotics), semester, exam type (regular, supply, improvement, preparatory) and year. Filters combine, and you can also search by subject name or paper code.",
      },
      {
        q: "Which program is covered?",
        a: "The library covers SMVDU Katra, Computer Science & Engineering, in the AI & Robotics specialization. Papers are organized by semester so you can jump straight to your current term.",
      },
      {
        q: "Can other universities or branches be added?",
        a: "BTech Buddy is purpose-built for the SMVDU CSE AI & Robotics program, so only those options are available. If you need papers outside this scope, please reach out via the Contact page.",
      },
    ],
  },
  {
    category: "Downloads & files",
    items: [
      {
        q: "The preview is blank. What should I do?",
        a: "Some browsers block inline PDF rendering for proxied files. Use the Download button instead — the file is identical.",
      },
      {
        q: "Download limits?",
        a: "Downloads are rate-limited per network to keep the service fast for everyone. If you hit a limit, wait a minute and retry.",
      },
      {
        q: "Are the PDFs safe?",
        a: "Every upload is validated server-side (file type, size, page count, encryption check) before it is processed and published.",
      },
    ],
  },
  {
    category: "Admin",
    items: [
      {
        q: "How do I become an admin?",
        a: "Admins are invited by existing admins. Only the super admin can grant or revoke the super-admin role. Reach out if you represent an institution and want to contribute.",
      },
      {
        q: "I uploaded a paper by mistake. Can it be removed?",
        a: "Yes — admins can unpublish or delete papers at any time from the dashboard. Students can also report incorrect content via the contact form.",
      },
    ],
  },
];

export function FAQ() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? FAQS.map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.q.toLowerCase().includes(q) ||
            item.a.toLowerCase().includes(q)
        ),
      })).filter((cat) => cat.items.length > 0)
    : FAQS;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">
          FAQ
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-fg sm:text-4xl">
          Frequently asked questions
        </h1>
      </div>

      <form
        onSubmit={(e) => e.preventDefault()}
        className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-2xl border border-line bg-surface p-2 shadow-soft focus-within:border-accent"
        role="search"
      >
        <Search className="ml-2 h-5 w-5 shrink-0 text-fg-subtle" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search answers…"
          className="w-full bg-transparent px-1 py-2 text-sm outline-none placeholder:text-fg-subtle"
          aria-label="Search FAQ"
        />
      </form>

      <div className="mt-10 space-y-10">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
            <p className="font-medium text-fg-muted">
              No answers match &ldquo;{query}&rdquo;
            </p>
            <p className="mt-1 text-sm text-fg-subtle">
              Try different keywords or contact us directly.
            </p>
          </div>
        )}
        {filtered.map((category) => (
          <section key={category.category}>
            <h2 className="font-display text-lg font-semibold text-fg">
              {category.category}
            </h2>
            <div className="mt-3 space-y-2">
              {category.items.map((item, i) => {
                const key = `${category.category}-${i}`;
                const isOpen = open === key;
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.25, delay: i * 0.04 }}
                    className={`overflow-hidden rounded-xl border transition ${
                      isOpen
                        ? "border-accent bg-accent-soft/50 shadow-soft"
                        : "border-line bg-surface hover:border-line"
                    }`}
                  >
                    <button
                      onClick={() =>
                        setOpen(isOpen ? null : key)
                      }
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="text-sm font-semibold text-fg">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-fg-subtle transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    <motion.div
                      initial={false}
                      animate={{
                        height: isOpen ? "auto" : 0,
                        opacity: isOpen ? 1 : 0,
                      }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-4 text-sm leading-relaxed text-fg-muted">
                        {item.a}
                      </p>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-3xl bg-gradient-to-br from-fg to-accent p-8 text-center text-accent-fg">
        <h2 className="font-display text-xl font-bold">
          Still have questions?
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          We usually reply within 48 hours.
        </p>
        <a
          href="/contact"
          className="mt-5 inline-block rounded-xl bg-surface px-6 py-3 text-sm font-bold text-fg transition hover:bg-accent-soft"
        >
          Contact us
        </a>
      </div>
    </div>
  );
}
