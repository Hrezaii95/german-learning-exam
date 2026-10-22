import type { Metadata } from "next";
import { StoryPanel } from "@/components/wortwerk/StoryPanel";
export const metadata: Metadata = { title: "Wortwerk · Story" };
export default function Page() { return <StoryPanel />; }
