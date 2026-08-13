import { ShellLayout } from "@/components/shell/ShellLayout";
import { ReviewSetup } from "@/components/review/ReviewViews";

export default function ReviewPage() {
  return <ShellLayout current="review"><ReviewSetup /></ShellLayout>;
}

