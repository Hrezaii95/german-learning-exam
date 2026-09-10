import { ShellLayout } from "@/components/shell/ShellLayout";
import { SavedReview } from "@/components/study/SavedReview";
export const metadata = { title: "My review", description: "Your saved words, concepts and book lines, with personal notes and recall practice." };
export default function SavedPage() { return <ShellLayout current="saved"><SavedReview /></ShellLayout>; }
