import React, { useState } from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LearningOutcomePicker } from "../LearningOutcomePicker";

beforeEach(() => localStorage.setItem("gened_auth_token", "token-synthetic"));

function Harness({ initial = [] as string[] }) {
  const [selected, setSelected] = useState<string[]>(initial);
  const [strand, setStrand] = useState("");
  return (
    <>
      <LearningOutcomePicker board="CBSE" subject="Mathematics" grade={6} selected={selected} onSelectedChange={setSelected} strand={strand} onStrandChange={setStrand} />
      <output data-testid="picked">{selected.join(",")}</output>
    </>
  );
}

describe("learning outcomes: select all", () => {
  it("picks every outcome, keeping the first pick first, then clears them all", async () => {
    render(<Harness initial={["G6-MATH-LO1.2.1"]} />);
    const all = (await screen.findByRole("checkbox", { name: /Select all/ })) as HTMLInputElement;
    expect(screen.getByText("1 of 2 selected")).toBeInTheDocument();
    expect(all.indeterminate).toBe(true);

    fireEvent.click(all);
    expect(screen.getByTestId("picked")).toHaveTextContent("G6-MATH-LO1.2.1,G6-MATH-LO1.1.1"); // the first pick still names the strand
    expect(screen.getByText("2 of 2 selected")).toBeInTheDocument();
    expect(all.checked).toBe(true);

    fireEvent.click(all);
    expect(screen.getByTestId("picked")).toHaveTextContent("");
    expect(screen.getByText("0 of 2 selected")).toBeInTheDocument();
  });
});
