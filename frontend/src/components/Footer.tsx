import { Link } from "react-router-dom";
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
  {
    title: "Admin",
    links: [{ label: "Admin Login", to: "/login" }],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-navy-800 bg-navy-950 text-navy-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo dark />
            <p className="mt-4 max-w-md text-sm leading-relaxed text-navy-300">
              Free previous-year question papers for engineering students
              across Kanpur&apos;s universities and affiliated colleges.
              Every PDF is watermarked and served securely.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                "CSJMU",
                "HBTU",
                "AKTU",
                "IIT Kanpur",
                "Rama University",
                "CSA University",
                "PSIT",
                "AITH",
                "UPTTI",
                "NSI",
              ].map((tag) => (
                <Link
                  key={tag}
                  to="/browse"
                  className="rounded-full border border-navy-700 px-3 py-1 text-xs font-medium text-navy-300 transition hover:border-brand-500 hover:text-white"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
          {footerSections.slice(0, 2).map((section) => (
            <div key={section.title}>
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
                {section.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-navy-300 transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
              Admin
            </h3>
            <ul className="mt-4 space-y-2.5">
              {footerSections[2].links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm text-navy-300 transition hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-navy-800 pt-6 sm:flex-row">
          <p className="text-xs text-navy-400">
            © {new Date().getFullYear()} BTech Buddy. Built for students.
          </p>
          <p className="text-xs text-navy-500">
            Papers are shared for educational reference only.
          </p>
        </div>
      </div>
    </footer>
  );
}
