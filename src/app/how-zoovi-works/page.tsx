import type { Metadata } from "next";
import { HowZooviWorksPage } from "@/features/marketing/HowZooviWorksPage";

export const metadata: Metadata = {
  title: "How Zoovi Works",
  description:
    "From clearing doubts about a school lesson to exploring a topic that sparks their curiosity, children can talk to Zoovi, get clear explanations, ask follow-up questions, and learn at their own pace.",
};

export default function Page() {
  return <HowZooviWorksPage />;
}
