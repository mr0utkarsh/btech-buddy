import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  FileText,
  GraduationCap,
  Building2,
  Download,
  Clock,
} from "lucide-react";
import { api } from "../lib/api";
import type { Paper, FilterOptions } from "../lib/types";
import { PaperCard } from "../components/PaperCard";
import { GridSkeleton } from "../components/Skeleton";
import { useToast } from "../context/ToastContext";
import { formatNumber } from "../lib/format";

interface Summary {
  published_papers: number;
  total_downloads: number;
  institutions: number;
  universities: number;
  colleges_and_institutes: number;
  branches: number;
}

const STEPS = [
  {
    icon: Search,
    title: "Search & filter",
    text: "Find papers by university, branch, semester, subject, exam type or year.",
  },
  {
    icon: EyeIcon,
    title: "Preview instantly",
    text: "Preview any paper in the browser — no sign-up, no waiting.",
  },
  {
    icon: Download,
    title: "Download safely",
    text: "Every PDF carries a light BTech Buddy watermark so sources stay protected.",
  },
];

function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

const FAQ_TEASER = [
  {
    q: "Are the papers free?",
    a: "Yes — preview and download are completely free, no account required.",
  },
  {
    q: "Which universities are covered?",
    a: "CSJMU, HBTU, AKTU-affiliated colleges (PSIT, AITH, UPTTI, NSI), Rama University, CSA University and IIT Kanpur.",
  },
  {
    q: "Why is there a watermark?",
    a: "A light diagonal watermark protects the papers so they can be shared freely without losing attribution.",
  },
];

export function Home() {
  const navigate = useNavigate();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recent, setRecent] = useState<Paper[]>([]);
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sumRes, recentRes, filterRes] = await Promise.all([
          api.get<Summary>("/api/stats/summary"),
          api.get<{ data: Paper[] }>(
            "/api/papers?limit=8&sort=newest"
          ),
          api.get<FilterOptions>("/api/papers/filters"),
        ]);
        if (cancelled) return;
        setSummary(sumRes);
        setRecent(recentRes.data);
        setFilters(filterRes);
      } catch (e) {
        if (!cancelled) {
          toast.error(
            e instanceof Error ? e.message : "Failed to load data"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/browse?q=${encodeURIComponent(query.trim())}`);
  };

  const popularSubjects = (recent || [])
    .filter((p) => p.download_count > 0)
    .slice(0, 4);

  return (
    <div>
      {/* ------------------------------------------------ hero */}
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(59,130,246,0.35), transparent 60%), radial-gradient(ellipse 60% 50% at 85% 90%, rgba(14,165,233,0.25), transparent 60%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pb-28">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/40 bg-brand-500/10 px-4 py-1.5 text-sm font-medium text-brand-200"
            >
              <Sparkles className="h-4 w-4" />
              Kanpur&apos;s largest question paper library
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
            >
              Previous Year Question Papers,
              <span className="bg-gradient-to-r from-brand-400 via-sky-400 to-brand-300 bg-clip-text text-transparent">
                {" "}
                Zero Hassle
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16 }}
              className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-navy-200"
            >
              Search thousands of papers from CSJMU, HBTU, AKTU colleges,
              Rama University, CSA University and IIT Kanpur. Preview
              instantly and download watermarked PDFs — free, forever.
            </motion.p>

            <motion.form
              onSubmit={submitSearch}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24 }}
              className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-2xl bg-white p-2 shadow-lift"
              role="search"
            >
              <Search className="ml-3 h-5 w-5 shrink-0 text-navy-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by subject, paper code, university…"
                className="w-full bg-transparent px-2 py-2.5 text-navy-950 outline-none placeholder:text-navy-400"
                aria-label="Search question papers"
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus-ring"
              >
                Search
              </button>
            </motion.form>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-navy-300"
            >
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                No login required
              </span>
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-brand-400" />
                Watermarked PDFs
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-sky-400" />
                Updated by verified admins
              </span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ stats */}
      <section className="relative z-10 mx-auto -mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 gap-4 rounded-3xl border border-navy-100 bg-white p-6 shadow-lift sm:grid-cols-4 sm:p-8"
        >
          {[
            {
              icon: FileText,
              value: formatNumber(summary?.published_papers ?? 0),
              label: "Question Papers",
            },
            {
              icon: Download,
              value: formatNumber(summary?.total_downloads ?? 0),
              label: "Total Downloads",
            },
            {
              icon: Building2,
              value: formatNumber(summary?.institutions ?? 0),
              label: "Institutions",
            },
            {
              icon: GraduationCap,
              value: formatNumber(summary?.branches ?? 0),
              label: "Branches",
            },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <stat.icon className="mx-auto h-6 w-6 text-brand-600" />
              <p className="mt-2 font-display text-3xl font-bold text-navy-950 sm:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-navy-500">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ------------------------------------------------ institutions */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            Institutions we cover
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy-950 sm:text-4xl">
            Trusted across Kanpur&apos;s colleges
          </h2>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
        >
          {(filters?.institutions || []).slice(0, 10).map((inst) => (
            <Link
              key={inst.id}
              to={`/browse?institution=${inst.id}`}
              className="group flex flex-col items-center rounded-2xl border border-navy-100 bg-white px-4 py-5 text-center shadow-soft transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-navy-50 font-display text-lg font-bold text-brand-700 transition group-hover:from-brand-600 group-hover:to-navy-700 group-hover:text-white">
                {inst.short_name.slice(0, 2).toUpperCase()}
              </span>
              <span className="mt-3 text-sm font-semibold text-navy-900">
                {inst.short_name}
              </span>
              <span className="mt-0.5 text-xs capitalize text-navy-500">
                {inst.type}
                {inst.verified ? " · verified" : ""}
              </span>
            </Link>
          ))}
        </motion.div>
        <div className="mt-6 text-center">
          <Link
            to="/browse"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition hover:text-brand-800"
          >
            View all institutions <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ------------------------------------------------ Browse by year */}
      <section aria-labelledby="years-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
              Past papers
            </p>
            <h2
              id="years-heading"
              className="mt-2 font-display text-3xl font-bold text-navy-950 sm:text-4xl"
            >
              Browse by year
            </h2>
            <p className="mt-2 max-w-xl text-sm text-navy-600">
              Pick an exam year to see only the papers published for it.
            </p>
          </div>
          <Link
            to="/browse"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition hover:text-brand-800"
          >
            All years <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {filters && filters.years.length > 0 ? (
          <div className="mt-8 flex flex-wrap gap-3">
            {filters.years.map((y, i) => (
              <motion.div
                key={y}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
              >
                <Link
                  to={`/browse?year=${y}`}
                  className="group flex h-20 w-24 flex-col items-center justify-center rounded-2xl border border-navy-100 bg-white shadow-soft transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift"
                >
                  <span className="font-display text-xl font-bold text-navy-950 group-hover:text-brand-700">
                    {y}
                  </span>
                  <span className="mt-0.5 text-[11px] font-medium text-navy-400">
                    View papers
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          !loading && (
            <p className="mt-6 text-sm text-navy-500">
              No published papers yet — years will appear here once papers are
              uploaded.
            </p>
          )
        )}
      </section>

      {/* -------------------------------------- Mid-Sem / End-Sem quick links */}
      <section aria-labelledby="exam-heading">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
            Exam categories
          </p>
          <h2
            id="exam-heading"
            className="mt-2 font-display text-3xl font-bold text-navy-950 sm:text-4xl"
          >
            Mid-Sem &amp; End-Sem papers
          </h2>
          <p className="mt-2 max-w-xl text-sm text-navy-600">
            Jump straight to the papers that match your upcoming exam.
          </p>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {[
            {
              value: "mid_sem",
              title: "Mid-Sem Papers",
              text: "In-semester assessment papers across every branch and semester.",
              icon: Clock,
            },
            {
              value: "end_sem",
              title: "End-Sem Papers",
              text: "Full end-semester examination papers, watermarked and ready to download.",
              icon: FileText,
            },
          ].map((card, i) => (
            <motion.div
              key={card.value}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Link
                to={`/browse?exam=${card.value}`}
                className="group flex h-full items-start gap-4 rounded-3xl border border-navy-100 bg-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                  <card.icon className="h-6 w-6" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-display text-lg font-semibold text-navy-950">
                    {card.title}
                    <ArrowRight className="h-4 w-4 text-brand-600 transition group-hover:translate-x-0.5" />
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-navy-600">
                    {card.text}
                  </span>
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>



      {/* ------------------------------------------------ recent uploads */}
      <section className="bg-navy-50/60 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
                <TrendingUp className="mr-1 inline h-4 w-4" />
                Fresh on the shelf
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold text-navy-950 sm:text-4xl">
                Recent uploads
              </h2>
            </div>
            <Link
              to="/browse?sort=newest"
              className="inline-flex items-center gap-1.5 rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-800 shadow-soft transition hover:border-brand-400 hover:text-brand-700"
            >
              Browse all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8">
            {loading ? (
              <GridSkeleton count={8} />
            ) : recent.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-navy-200 bg-white p-12 text-center">
                <FileText className="mx-auto h-10 w-10 text-navy-300" />
                <p className="mt-3 font-medium text-navy-700">
                  No papers yet — check back soon!
                </p>
                <p className="mt-1 text-sm text-navy-500">
                  Admins upload new papers every week.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {recent.map((paper, i) => (
                  <PaperCard key={paper.id} paper={paper} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ how it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            How it works
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy-950 sm:text-4xl">
            Three steps to exam readiness
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.12 }}
              className="relative rounded-3xl border border-navy-100 bg-white p-7 shadow-soft"
            >
              <span className="absolute -top-3 left-7 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 font-display text-sm font-bold text-white">
                {i + 1}
              </span>
              <step.icon className="h-8 w-8 text-brand-600" />
              <h3 className="mt-4 font-display text-lg font-semibold text-navy-950">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-600">
                {step.text}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ FAQ teaser + CTA */}
      <section className="bg-gradient-to-br from-navy-900 via-navy-950 to-brand-900 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                Questions? We have answers.
              </h2>
              <div className="mt-6 space-y-4">
                {FAQ_TEASER.map((item) => (
                  <details
                    key={item.q}
                    className="group rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <summary className="cursor-pointer font-medium text-white transition hover:text-brand-300">
                      {item.q}
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-navy-200">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
              <Link
                to="/faq"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-300 transition hover:text-brand-200"
              >
                Read full FAQ <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="rounded-3xl bg-white/10 p-8 text-center backdrop-blur">
              <h3 className="font-display text-2xl font-bold">
                Ready for your exams?
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-navy-200">
                Search the complete library — papers from every semester,
                branch and university we cover.
              </p>
              <Link
                to="/browse"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-navy-900 shadow-lift transition hover:bg-brand-50"
              >
                Browse papers <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
