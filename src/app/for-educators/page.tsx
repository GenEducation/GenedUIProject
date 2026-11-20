import type { Metadata } from "next";
import { EducatorsPage } from "@/features/marketing/EducatorsPage";

export const metadata: Metadata = {
  title: "Zoovi for Educators",
  description:
    "Zoovi extends learning beyond the classroom, giving students more opportunities to ask, practise and explore, while helping educators stay informed about their progress.",
};

export default function Page() {
  return <EducatorsPage />;
}
