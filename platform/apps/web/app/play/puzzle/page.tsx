import { Suspense } from "react";
import type { Metadata } from "next";
import { RunPlayer } from "@/components/wortwerk/RunPlayer";
export const metadata: Metadata = { title: "Wortwerk · Daily puzzle" };
export default function PuzzlePage() { return <Suspense fallback={<p>Preparing today&apos;s puzzle…</p>}><RunPlayer modeOverride="puzzle" /></Suspense>; }
