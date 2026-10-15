import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { learnerFixture, makeRecentChapter } from "@/test/msw/handlers/learner";
import { useLessonLaunch } from "../useLessonLaunch";
import { useFreshChapterCard } from "../useFreshChapterCard";

const INSTANCE = "00000000-0000-4000-8000-0000000000aa";
const STALE = "/v1/visual-images/card-1?exp=1&sig=expired";
const FRESH = "/v1/visual-images/card-1?exp=9999999999&sig=fresh";

beforeEach(() => {
  learnerFixture.reset();
  localStorage.setItem("gened_auth_token", "token-synthetic");
});

describe("useFreshChapterCard", () => {
  it("replaces a card restored after a reload, whose signed URL may have expired, with a freshly signed one", async () => {
    const recent = makeRecentChapter(1, { card: { image_url: FRESH, width: 1600, height: 1000 } });
    learnerFixture.setRecent([recent]);
    useLessonLaunch.setState({
      instanceId: INSTANCE,
      subject: "Mathematics",
      chapter: { chapter_id: recent.chapter_id, source_id: "src-1", number: 1, title: "SYNTHETIC", book_title: "B", palette: "mathematics:0", card: { image_url: STALE, width: 1600, height: 1000 } },
    });

    renderHook(() => useFreshChapterCard(INSTANCE, recent.chapter_id));

    await waitFor(() => expect(useLessonLaunch.getState().chapter?.card?.image_url).toBe(FRESH));
    // What the launch already knew stays: the subject's name and the chapter's source.
    expect(useLessonLaunch.getState()).toMatchObject({ subject: "Mathematics", chapter: { source_id: "src-1" } });
  });

  it("gives a lesson opened from a bare link its chapter and subject", async () => {
    const recent = makeRecentChapter(2, { subject: "social_science" });
    learnerFixture.setRecent([recent]);
    useLessonLaunch.setState({ instanceId: null, chapter: null, subject: null });

    renderHook(() => useFreshChapterCard(INSTANCE, recent.chapter_id));

    await waitFor(() => expect(useLessonLaunch.getState().chapter?.title).toBe(recent.chapter_title));
    expect(useLessonLaunch.getState()).toMatchObject({ instanceId: INSTANCE, subject: "Social Science" });
  });
});
