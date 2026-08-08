import { AppShell, type ShellNavCurrent } from "@/components/shell/AppShell";
import type { ReactNode } from "react";

export function ShellLayout({
  current,
  children,
}: {
  current: ShellNavCurrent;
  children: ReactNode;
}) {
  return <AppShell current={current}>{children}</AppShell>;
}
