import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useTutorialStore } from "@/features/tutorial/store/useTutorialStore";

vi.mock("@/features/auth/authService", () => ({
  updateProfile: vi.fn(async (u: { name: string; ai_name?: string }) => ({ name: u.name, ai_name: u.ai_name ?? null })),
}));

import { CompleteProfileBanner } from "../CompleteProfileBanner";

const profile = { user_id: "u-synthetic", username: "synthetic-kid", email: "kid@example.test", role: "STUDENT" };

/** SYNTHETIC: a newly signed-up student naming themselves and their tutor. */
async function nameAndSave() {
  render(<CompleteProfileBanner studentProfile={profile} />);
  fireEvent.change(screen.getByPlaceholderText("What should we call you?"), { target: { value: "Synthetic Kid" } });
  fireEvent.change(screen.getByLabelText(/Your AI tutor.s name/), { target: { value: "Rocky" } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
}

describe("the quick tour after naming", () => {
  beforeEach(() => {
    localStorage.clear();
    useTutorialStore.setState({ isActive: false });
  });

  it("starts once a new student has named themselves and their tutor", async () => {
    localStorage.setItem("gened_new_user", "true"); // set at sign-up instead of starting the tour there
    await nameAndSave();
    await waitFor(() => expect(useTutorialStore.getState().isActive).toBe(true));
    expect(localStorage.getItem("gened_new_user")).toBeNull();
  });

  it("doesn't start for a student who isn't new", async () => {
    await nameAndSave();
    await waitFor(() => expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled());
    expect(useTutorialStore.getState().isActive).toBe(false);
  });
});
