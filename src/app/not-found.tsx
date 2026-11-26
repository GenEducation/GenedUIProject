import Link from "next/link";
import { MomentPage } from "@/components/shared/MomentPage";
import { NOT_FOUND_ART } from "@/features/student/theme/momentArt";

/** 404: a door standing alone, open onto nothing. */
export default function NotFound() {
  return (
    <MomentPage
      art={NOT_FOUND_ART}
      title="This page isn’t here"
      body="The door opens, but there’s nothing behind it. The link may be old, or the page may have moved."
    >
      <Link
        href="/"
        className="rounded-full bg-[var(--primary)] px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-[var(--primary-hover)]"
      >
        Back to home
      </Link>
    </MomentPage>
  );
}
