import type { Metadata } from "next";
import { HomePage } from "@/features/marketing/HomePage";
import { HomeGate } from "./HomeGate";

export const metadata: Metadata = {
  title: "Zoovi: a companion for curious minds",
  description:
    "Zoovi is an AI-powered, voice-led learning companion that helps children explore ideas and understand concepts, while giving parents a better window into their child’s learning journey.",
};

export default function Home() {
  return (
    <HomeGate>
      <HomePage />
    </HomeGate>
  );
}
