import Link from "next/link";
import { isSafeNavigationPath } from "@/lib/content/navigation-context";

/** Canonical Back control — never relies only on browser history. */
export function BackLink({
  href,
  label = "Back",
}: {
  href: string;
  label?: string;
}) {
  const pathOnly = href.split("?")[0] ?? href;
  if (!isSafeNavigationPath(pathOnly)) {
    // Fail closed: never render a hostile or off-allowlist href.
    return null;
  }

  return (
    <p className="back-link-row">
      <Link className="back-link" href={href}>
        ← {label}
      </Link>
    </p>
  );
}
