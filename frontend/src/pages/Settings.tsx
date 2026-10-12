import { motion } from "framer-motion";
import { Check, Monitor, Moon, Sun, Sparkles } from "lucide-react";
import { useTheme, THEMES, type ThemeMeta, type ThemeName } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

// A tiny icon per theme for the card header.
const THEME_ICONS: Record<ThemeName, typeof Moon> = {
  dark: Moon,
  clean: Sun,
  hybrid: Sparkles,
};

/** Live mini-preview of a theme rendered purely from its swatch tokens. */
function ThemePreviewCard({
  meta,
  active,
  onSelect,
}: {
  meta: ThemeMeta;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = THEME_ICONS[meta.name];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`group focus-ring relative flex flex-col overflow-hidden rounded-2xl border p-3 text-left transition ${
        active
          ? "border-accent shadow-lift"
          : "border-line hover:border-line-strong hover:shadow-soft"
      }`}
    >
      {active && (
        <span className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-fg">
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
      )}

      {/* Preview canvas */}
      <div
        className="relative flex h-32 flex-col overflow-hidden rounded-xl p-3"
        style={{ backgroundColor: meta.swatch.bg }}
      >
        {/* hero strip */}
        <div
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5"
          style={{ backgroundColor: meta.swatch.hero }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: meta.swatch.accent }}
          />
          <span
            className="h-1.5 w-16 rounded-full"
            style={{ backgroundColor: meta.swatch.fg, opacity: 0.5 }}
          />
        </div>
        {/* content lines */}
        <div className="mt-2 space-y-1.5">
          <span
            className="block h-1.5 w-3/4 rounded-full"
            style={{ backgroundColor: meta.swatch.fg, opacity: 0.6 }}
          />
          <span
            className="block h-1.5 w-1/2 rounded-full"
            style={{ backgroundColor: meta.swatch.fg, opacity: 0.35 }}
          />
        </div>
        {/* floating surface card */}
        <div
          className="mt-auto flex items-center gap-1.5 rounded-md px-2 py-1.5 shadow-soft"
          style={{ backgroundColor: meta.swatch.surface }}
        >
          <span
            className="h-2.5 w-2.5 rounded"
            style={{ backgroundColor: meta.swatch.accent }}
          />
          <span
            className="h-1.5 w-10 rounded-full"
            style={{ backgroundColor: meta.swatch.fg, opacity: 0.4 }}
          />
        </div>
      </div>

      {/* Label */}
      <div className="mt-3 flex items-center gap-2 px-1">
        <Icon className="h-4 w-4 text-accent" />
        <span className="font-display text-sm font-bold text-fg">
          {meta.label}
        </span>
      </div>
      <p className="mt-1 px-1 text-xs leading-relaxed text-fg-muted">
        {meta.tagline}
      </p>
      <span
        className={`mt-3 rounded-lg px-3 py-2 text-center text-xs font-bold transition ${
          active
            ? "bg-accent text-accent-fg"
            : "bg-surface-2 text-fg-muted group-hover:bg-accent-soft group-hover:text-accent-soft-fg"
        }`}
      >
        {active ? "Currently active" : "Use this theme"}
      </span>
    </button>
  );
}

export function Settings() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Monitor className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-bold text-fg sm:text-4xl">
              Appearance
            </h1>
            <p className="mt-1 text-fg-muted">
              Choose how BTech Buddy looks. Your choice is applied instantly
              across the whole site.
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {THEMES.map((meta) => (
            <ThemePreviewCard
              key={meta.name}
              meta={meta}
              active={theme === meta.name}
              onSelect={() => setTheme(meta.name)}
            />
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-line bg-surface p-5 shadow-soft">
          <h2 className="font-display text-sm font-semibold text-fg">
            About your selection
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-fg-muted">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              Active theme:{" "}
              <span className="font-semibold text-fg">
                {THEMES.find((t) => t.name === theme)?.label}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              {user
                ? "Saved to your account and this device, so it follows you when you sign in."
                : "Saved on this device. Sign in later to sync it across devices."}
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              Contrast, keyboard focus and reduced-motion are respected in
              every theme.
            </li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
