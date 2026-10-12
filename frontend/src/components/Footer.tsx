import { Link } from "react-router-dom";
import { Settings2 } from "lucide-react";
import { Logo } from "./Logo";

const footerSections = [
  {
    title: "Explore",
    links: [
      { label: "Home", to: "/" },
      { label: "Browse Papers", to: "/browse" },
      { label: "FAQ", to: "/faq" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Service", to: "/terms" },
      { label: "Copyright & DMCA", to: "/copyright" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-footer-line bg-footer text-footer-fg">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo dark />
            <p className="mt-4 max-w-md text-sm leading-relaxed text-footer-muted">
              Free previous-year question papers for CSE students at Shri Mata
              Vaishno Devi University (SMVDU), Katra — AI &amp; Robotics
              specialization. Every PDF is watermarked and served securely.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["SMVDU", "CSE", "AI & Robotics"].map((tag) => (
                <Link
                  key={tag}
                  to="/browse"
                  className="rounded-full border border-footer-line px-3 py-1 text-xs font-medium text-footer-muted transition hover:border-accent hover:text-footer-fg"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-footer-fg">
                {section.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-footer-muted transition hover:text-footer-fg"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-footer-fg">
              Preferences
            </h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  to="/settings"
                  className="flex items-center gap-2 text-sm text-footer-muted transition hover:text-footer-fg"
                >
                  <Settings2 className="h-4 w-4" />
                  Appearance &amp; themes
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="text-sm text-footer-muted transition hover:text-footer-fg"
                >
                  Admin Login
                </Link>
              </li>
              <li>
                <span className="block text-xs text-footer-muted">
                  Help &amp; Support
                </span>
                <a
                  href="mailto:vishalkumar829987@gmail.com"
                  className="break-all text-sm text-footer-muted transition hover:text-footer-fg"
                >
                  vishalkumar829987@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-footer-line pt-6 sm:flex-row">
          <p className="text-xs text-footer-muted">
            © {new Date().getFullYear()} BTech Buddy. Built for students.
          </p>
          <p className="text-xs text-footer-muted">
            Papers are shared for educational reference only.
          </p>
        </div>
      </div>
    </footer>
  );
}
