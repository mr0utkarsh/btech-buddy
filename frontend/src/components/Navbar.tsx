import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Menu,
  X,
  Search,
  LogIn,
  LayoutDashboard,
  BookOpen,
  HelpCircle,
  PhoneCall,
  LogOut,
  Settings2,
} from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const navLinks = [
  { to: "/browse", label: "Browse Papers", icon: BookOpen },
  { to: "/faq", label: "FAQ", icon: HelpCircle },
  { to: "/contact", label: "Contact", icon: PhoneCall },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { user, role, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (q) navigate(`/browse?q=${encodeURIComponent(q)}`);
    setSearchOpen(false);
    setSearch("");
  };

  const handleSignOut = async () => {
    await signOut();
    toast.info("Signed out");
    navigate("/");
  };

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "border-line theme-glass shadow-soft"
          : "border-transparent theme-glass"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Logo />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-accent-soft text-accent"
                    : "text-fg-muted hover:bg-surface-2 hover:text-fg"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Search toggle */}
          <AnimatePresence>
            {searchOpen && (
              <motion.form
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                onSubmit={submitSearch}
                className="hidden overflow-hidden sm:block"
              >
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search papers…"
                  className="w-56 rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none placeholder:text-fg-subtle focus:border-accent"
                  aria-label="Search question papers"
                />
              </motion.form>
            )}
          </AnimatePresence>
          <button
            onClick={() => setSearchOpen((v) => !v)}
            className="rounded-lg p-2 text-fg-muted transition hover:bg-surface-2"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Appearance / theme settings */}
          <Link
            to="/settings"
            className="hidden rounded-lg p-2 text-fg-muted transition hover:bg-surface-2 hover:text-fg sm:flex"
            aria-label="Appearance settings"
            title="Appearance & themes"
          >
            <Settings2 className="h-5 w-5" />
          </Link>

          {user && role ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                to="/admin"
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium text-fg-muted transition hover:bg-surface-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">Sign out</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg shadow-soft transition hover:bg-accent-hover md:flex"
            >
              <LogIn className="h-4 w-4" />
              Admin Login
            </Link>
          )}

          {/* Mobile menu button */}
          <button
            className="rounded-lg p-2 text-fg-muted hover:bg-surface-2 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-line bg-surface md:hidden"
            aria-label="Mobile"
          >
            <div className="space-y-1 px-4 py-3">
              <form onSubmit={submitSearch} className="mb-2 sm:hidden">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search papers…"
                  className="w-full rounded-lg border border-line px-3 py-2.5 text-sm"
                  aria-label="Search question papers"
                />
              </form>
              <NavLink
                to="/settings"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                    isActive
                      ? "bg-accent-soft text-accent"
                      : "text-fg-muted hover:bg-surface-2"
                  }`
                }
              >
                <Settings2 className="h-5 w-5" />
                Appearance
              </NavLink>
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                      isActive
                        ? "bg-accent-soft text-accent"
                        : "text-fg-muted hover:bg-surface-2"
                    }`
                  }
                >
                  <link.icon className="h-5 w-5" />
                  {link.label}
                </NavLink>
              ))}
              {user && role ? (
                <>
                  <NavLink
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-accent-fg"
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    Dashboard
                  </NavLink>
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm font-medium text-fg-muted"
                  >
                    <LogOut className="h-5 w-5" />
                    Sign out
                  </button>
                </>
              ) : (
                <NavLink
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-accent-fg"
                >
                  <LogIn className="h-5 w-5" />
                  Admin Login
                </NavLink>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
