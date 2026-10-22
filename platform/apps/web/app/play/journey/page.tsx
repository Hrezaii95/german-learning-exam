import type { Metadata } from "next";
import { ExplorePanel } from "@/components/wortwerk/ExplorePanel";
export const metadata: Metadata = { title: "Wortwerk · Journey" };
export default function Page() { return <ExplorePanel view="journey" />; }
