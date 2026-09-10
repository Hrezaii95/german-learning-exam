import { Suspense } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { BookReader } from "@/components/study/BookReader";
import { loadBook, loadStudySpeech } from "@/lib/study/catalog";
export const metadata = { title: "Interactive book", description: "Read Momente Lessons 1–4 with original audio, word lookup and your personal review collection." };
export default function BookPage() {
  return <ShellLayout current="book"><Suspense fallback={<p role="status">Opening your book…</p>}><BookReader book={loadBook()} speech={loadStudySpeech()} /></Suspense></ShellLayout>;
}
