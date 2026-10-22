import { Suspense } from "react";
import type { Metadata } from "next";
import { RunPlayer } from "@/components/wortwerk/RunPlayer";
export const metadata: Metadata = { title: "Wortwerk · Blitz" };
export default function BlitzPage() { return <Suspense fallback={<p>Preparing your challenge…</p>}><RunPlayer modeOverride="blitz" /></Suspense>; }
