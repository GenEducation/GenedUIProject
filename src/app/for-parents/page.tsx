import type { Metadata } from "next";
import { ParentsPage } from "@/features/marketing/ParentsPage";

export const metadata: Metadata = {
  title: "Zoovi for Parents",
  description:
    "Go beyond marks and periodic school updates. Follow your child’s daily learning, see what they’re understanding, discover their interests, and identify where they may need more practice.",
};

export default function Page() {
  return <ParentsPage />;
}
