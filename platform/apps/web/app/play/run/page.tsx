import { Suspense } from "react";
import type { Metadata } from "next";
import { RunPlayer } from "@/components/wortwerk/RunPlayer";
export const metadata: Metadata = { title: "Wortwerk · Practice" };
export default function RunPage() { return <Suspense fallback={<p>Preparing your practice…</p>}><RunPlayer /></Suspense>; }
