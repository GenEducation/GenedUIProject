import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useStudentStore } from "../../store/useStudentStore";
import { VoiceStage } from "../VoiceStage";

describe("VoiceStage token fallbacks", () => {
  it("keeps the tutor orb and start action colored without global CSS tokens", () => {
    act(() => {
      useStudentStore.setState({
        voiceSessionStatus: "idle",
        isAITyping: false,
        isMuted: false,
        pttHeld: false,
      });
    });

    const { container } = render(
      <VoiceStage caption="" reactive={false} onTap={() => undefined} agentName="Nia" />,
    );

    expect(screen.getByText("Nia")).toHaveStyle({ color: "var(--tutor, #5B4DC7)" });
    const start = screen.getByRole("button", { name: "Tap to start" });
    expect(start.style.background.toLowerCase()).toBe("var(--tutor, #5b4dc7)");
    expect(start.style.borderRadius).toBe("999px");

    const orb = container.querySelector<HTMLElement>(".absolute.inset-4");
    expect(orb?.style.background.toLowerCase()).toContain("var(--tutor, #5b4dc7)");
    expect(orb?.style.background.toLowerCase()).toContain("var(--tutor-soft, #4a90d9)");
    expect(orb?.style.background.toLowerCase()).toContain("var(--tutor-light, #8b7fe8)");
  });
});
