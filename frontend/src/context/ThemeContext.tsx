import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Centralized theme system.
 *
 * Three fully-implemented themes:
 *  - "dark"   -> Dark Futuristic (dark navy, cyan/neon-blue, glow + glass)
 *  - "clean"  -> Clean Premium (white, royal-blue, minimal, crisp)
 *  - "hybrid" -> Hybrid (dark navy hero, light content, blue-purple gradients)
 *
 * The active theme is applied as `data-theme` on <html> (CSS variables in
 * index.css do the rest). Guest preference persists in localStorage; for a
 * signed-in user we additionally mirror it to Supabase user metadata so the
 * choice can follow the account. No Supabase service-role credentials are
 * ever used here — only the public anon client + the user's own JWT.
 */

export type ThemeName = "dark" | "clean" | "hybrid";

export interface ThemeMeta {
  name: ThemeName;
  label: string;
  tagline: string;
  /** CSS used to render a small live preview swatch on the selector cards. */
  swatch: { bg: string; surface: string; accent: string; hero: string; fg: string };
}

export const THEMES: ThemeMeta[] = [
  {
    name: "dark",
    label: "Dark Futuristic",
    tagline: "Deep navy with cyan glow and glass surfaces",
    swatch: {
      bg: "#070d1a",
      surface: "#0d1830",
      accent: "#22d3ee",
      hero: "#0b1a33",
      fg: "#e9f1ff",
    },
  },
  {
    name: "clean",
    label: "Clean Premium",
    tagline: "White canvas with royal-blue accents and crisp type",
    swatch: {
      bg: "#f5f8fd",
      surface: "#ffffff",
      accent: "#1d4ed8",
      hero: "#ffffff",
      fg: "#0b1b33",
    },
  },
  {
    name: "hybrid",
    label: "Hybrid",
    tagline: "Dark hero sections with light content and violet gradients",
    swatch: {
      bg: "#f4f6fb",
      surface: "#ffffff",
      accent: "#4f46e5",
      hero: "#0a1024",
      fg: "#101a2e",
    },
  },
];

const STORAGE_KEY = "btechbuddy:theme";

function isTheme(value: unknown): value is ThemeName {
  return value === "dark" || value === "clean" || value === "hybrid";
}

/** Read the persisted theme without assuming React is ready. */
export function getStoredTheme(): ThemeName {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (isTheme(raw)) return raw;
  } catch {
    /* localStorage unavailable (SSR / privacy mode) */
  }
  return "clean";
}

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  themes: ThemeMeta[];
  /** The CSS `theme-color` meta value to advertise to the browser UI. */
  metaColor: string;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const META_COLORS: Record<ThemeName, string> = {
  dark: "#070d1a",
  clean: "#ffffff",
  hybrid: "#0a1024",
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => getStoredTheme());

  // Apply the theme to <html> as early as the provider mounts, and keep the
  // browser theme-color meta in sync so mobile browser chrome matches.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore quota / privacy errors */
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", META_COLORS[theme]);
  }, [theme]);

  // Optional account sync: if a Supabase access token is available in
  // localStorage (written by the auth flow), mirror the preference to the
  // user's metadata so it can follow them across devices. Best-effort and
  // never blocks the UI. Uses the public anon key only.
  const syncToProfile = useCallback(async (next: ThemeName) => {
    try {
      const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
      if (!url || !anon) return;
      // Find the stored session the same way supabase-js persists it.
      const ref = new URL(url).hostname.split(".")[0];
      const sessionRaw = localStorage.getItem(`sb-${ref}-auth-token`);
      if (!sessionRaw) return;
      const token = JSON.parse(sessionRaw)?.access_token as string | undefined;
      if (!token) return;
      await fetch(`${url}/auth/v1/user`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          apikey: anon,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data: { theme: next } }),
      });
    } catch {
      /* account sync is optional — never surface errors to the user */
    }
  }, []);

  const setTheme = useCallback(
    (next: ThemeName) => {
      if (!isTheme(next)) return;
      setThemeState(next);
      void syncToProfile(next);
    },
    [syncToProfile]
  );

  // If the signed-in user already stored a theme on their profile and has no
  // local choice yet, adopt it once.
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
      const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      if (!url) return;
      const ref = new URL(url).hostname.split(".")[0];
      const sessionRaw = localStorage.getItem(`sb-${ref}-auth-token`);
      if (!sessionRaw) return;
      const meta = JSON.parse(sessionRaw)?.user?.user_metadata;
      if (isTheme(meta?.theme)) {
        setThemeState(meta.theme);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, themes: THEMES, metaColor: META_COLORS[theme] }),
    [theme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
