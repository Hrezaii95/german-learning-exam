import type { Metadata } from "next";
import { ExamPanel } from "@/components/wortwerk/ExamPanel";
export const metadata: Metadata = { title: "Wortwerk · Exam" };
export default function Page() { return <ExamPanel />; }
