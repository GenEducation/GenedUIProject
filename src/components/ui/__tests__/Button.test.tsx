import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "../Button";

describe("Button", () => {
  it("keeps a primary action visible when the global primary token is unavailable", () => {
    render(<Button>Voice</Button>);

    const button = screen.getByRole("button", { name: "Voice" });
    expect(button).toHaveStyle({
      background: "var(--primary, #059f6d)",
      color: "#FFFFFF",
      borderRadius: "var(--radius-control, 10px)",
    });
  });
});
