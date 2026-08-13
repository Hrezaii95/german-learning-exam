import { ShellLayout } from "@/components/shell/ShellLayout";
import { ReviewSession } from "@/components/review/ReviewViews";

export default function TodayReviewSessionPage() {
  return <ShellLayout current="review"><ReviewSession /></ShellLayout>;
}
