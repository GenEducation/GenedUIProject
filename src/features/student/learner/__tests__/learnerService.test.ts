import { describe, it, expect, beforeEach } from "vitest";
import { learnerFixture, lastOpenedChapter } from "@/test/msw/handlers/learner";
import { learnerService } from "../learnerService";
import { paletteFor } from "../cardPalettes";

beforeEach(() => {
  learnerFixture.reset();
  localStorage.setItem("gened_auth_token", "token-synthetic");
});

describe("learnerService", () => {
  it("lists a subject's chapters, scoped by the exact subject name", async () => {
    const out = await learnerService.chapters("Mathematics");
    expect(out.grade).toBe(6);
    expect(out.chapters.map((c) => c.title)).toEqual(["SYNTHETIC chapter 1", "SYNTHETIC chapter 2", "SYNTHETIC chapter 3"]);
    expect((await learnerService.chapters("Social & Political Science")).chapters).toEqual([]);
  });

  it("opens a chapter's lesson and reads it back", async () => {
    const [chapter] = (await learnerService.chapters("Mathematics")).chapters;
    const opened = await learnerService.openChapter(chapter.chapter_id);
    expect(lastOpenedChapter).toBe(chapter.chapter_id);
    expect(await learnerService.instance(opened.id)).toEqual(opened);
  });

  it("throws the server's reason for a chapter the student can't open", async () => {
    await expect(learnerService.openChapter("00000000-0000-4000-8000-000000000999")).rejects.toThrow(/isn't available/);
  });

  it("resolves a card's signed path against the API", () => {
    expect(learnerService.cardSrc("/v1/visual-images/x?sig=s")).toMatch(/\/v1\/visual-images\/x\?sig=s$/);
  });
});

describe("paletteFor", () => {
  it("picks the subject family's palette by index, like the card kit", () => {
    expect(paletteFor("mathematics:0").a).toBe(paletteFor("maths:0").a);
    expect(paletteFor("mathematics:1")).not.toEqual(paletteFor("mathematics:0"));
    expect(paletteFor("history:2")).toEqual(paletteFor("social_science:2"));
  });

  it("falls back to the default family and wraps a bad index", () => {
    expect(paletteFor("unknown_subject:0")).toEqual(paletteFor("default:0"));
    expect(paletteFor("mathematics:7")).toEqual(paletteFor("mathematics:1"));
    expect(paletteFor(null)).toEqual(paletteFor("default:0"));
  });
});
