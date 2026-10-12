import { useState } from "react";
import { Shield, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

// Drop the real logo file at frontend/public/logo.png to use it everywhere.
// If it is missing, the original gradient mark below is shown as a fallback,
// so the app never renders a broken image.
const LOGO_SRC = `${import.meta.env.BASE_URL || "/"}logo.png`;

export function Logo({
  dark = false,
  size = "md",
}: {
  dark?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const sizes = {
    sm: { icon: "h-8 w-8", text: "text-lg" },
    md: { icon: "h-10 w-10", text: "text-xl" },
    lg: { icon: "h-12 w-12", text: "text-2xl" },
  }[size];
  return (
    <Link
      to="/"
      className="flex items-center gap-2.5 focus-ring rounded-lg"
      aria-label="BTech Buddy home"
    >
      <span
        className={`relative flex ${sizes.icon} items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-accent to-fg shadow-soft`}
      >
        {!imgFailed ? (
          <img
            src={LOGO_SRC}
            alt=""
            className="h-full w-full object-contain"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <>
            <GraduationCap className="h-1/2 w-1/2 text-white" strokeWidth={2.2} />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 ring-2 ring-white">
              <Shield className="h-2.5 w-2.5 text-fg" strokeWidth={3} />
            </span>
          </>
        )}
      </span>
      <span className={`font-display font-bold tracking-tight ${sizes.text}`}>
        <span className={dark ? "text-footer-fg" : "text-fg"}>BTech</span>{" "}
        <span className="text-accent">Buddy</span>
      </span>
    </Link>
  );
}
