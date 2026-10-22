import type { ReactNode } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { PlayProvider } from "@/components/wortwerk/PlayProvider";
import { loadWortwerkContent } from "@/lib/wortwerk/content.server";
import "@/components/wortwerk/wortwerk.css";
import "@/components/wortwerk/daily.css";

export default function PlayLayout({ children }: { children: ReactNode }) {
  return <ShellLayout current="play"><PlayProvider content={loadWortwerkContent()}>{children}</PlayProvider></ShellLayout>;
}
