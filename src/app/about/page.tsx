import type { Metadata } from "next";
import { AboutPage } from "@/features/marketing/AboutPage";

export const metadata: Metadata = {
  title: "About GenEd and Zoovi",
  description:
    "With Zoovi, GenEd is creating a learning experience where children can ask questions freely, explore their interests, and build the confidence to learn independently, while keeping parents and educators connected to their progress.",
};

export default function Page() {
  return <AboutPage />;
}
