import { NavLink, Outlet, Navigate, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  UploadCloud,
  Building2,
  GraduationCap,
  Users,
  ScrollText,
  LogOut,
  Menu,
  X,
  BookOpenCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Logo } from "../../components/Logo";
import { Unauthorized } from "../../pages/Auth";

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/papers", label: "Papers", icon: FileText },
  { to: "/admin/papers/upload", label: "Upload Paper", icon: UploadCloud },
  { to: "/admin/institutions", label: "Institutions", icon: Building2 },
  { to: "/admin/academic", label: "Branches & Subjects", icon: GraduationCap },
  { to: "/admin/admins", label: "Admins", icon: Users },
  { to: "/admin/logs", label: "Activity Logs", icon: ScrollText },
];

export function AdminLayout() {
  const { user, role, adminLoading, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-50/60">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!role) return <Unauthorized />;

  const handleSignOut = async () => {
    await signOut();
    toast.info("Signed out");
    navigate("/login");
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-5">
        <Logo size="sm" />
        <button
          className="rounded-lg p-1.5 text-navy-500 hover:bg-navy-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Admin">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-gradient-to-r from-brand-600 to-navy-700 text-white shadow-soft"
                  : "text-navy-700 hover:bg-navy-50 hover:text-navy-950"
              }`
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-navy-100 p-3">
        <div className="mb-2 rounded-xl bg-navy-50 px-3.5 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold capitalize text-navy-800">
            <BookOpenCheck className="h-3.5 w-3.5 text-brand-600" />
            {role === "super_admin" ? "Super Admin" : "Admin"}
          </p>
          <p className="truncate text-xs text-navy-500">
            {user.email}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-navy-700 transition hover:bg-rose-50 hover:text-rose-700"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-navy-50/60">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-navy-100 bg-white shadow-soft lg:block">
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-navy-950/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="h-full w-72 max-w-[85vw] bg-white shadow-lift"
            >
              {sidebar}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-navy-100 bg-white/90 px-4 backdrop-blur-xl sm:px-6">
          <button
            className="rounded-lg p-2 text-navy-700 hover:bg-navy-50 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open admin menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <p className="font-display text-sm font-semibold text-navy-950 sm:text-base">
            Admin Panel
          </p>
          <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live
          </span>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
