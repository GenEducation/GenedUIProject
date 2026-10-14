import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { FEATURES } from "@/constants/features";

// Server-side gate: while this section is switched off, typing its URL
// lands on student home instead.
export default function Layout({ children }: { children: ReactNode }) {
  if (!FEATURES.practice) redirect("/student");
  return children;
}
