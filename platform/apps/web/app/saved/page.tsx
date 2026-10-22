import { ShellLayout } from "@/components/shell/ShellLayout";
import { ReviewHome } from "@/components/study/ReviewHome";
export const metadata = { title: "My review", description: "Your saved words, concepts and book lines, personal notes and self-rated recall, plus guided missions with checked exercises." };
export default function SavedPage() { return <ShellLayout current="saved"><ReviewHome /></ShellLayout>; }
