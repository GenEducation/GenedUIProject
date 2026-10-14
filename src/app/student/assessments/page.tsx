import { redirect } from "next/navigation";

// The old address for Practice; keep bookmarks working.
export default function OldAssessmentsRoute() {
  redirect("/student/practice");
}
