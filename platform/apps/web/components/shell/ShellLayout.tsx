import { AppShell, type ShellNavCurrent } from "@/components/shell/AppShell";
import type { Role } from "@/lib/content/nav";
import type { ReactNode } from "react";

export function ShellLayout({
  current,
  children,
  role,
}: {
  current: ShellNavCurrent;
  children: ReactNode;
  role?: Role | undefined;
}) {
  return <AppShell current={current} role={role}>{children}</AppShell>;
}
