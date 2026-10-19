import { describe, it, expect } from "vitest";
import { PERCH_SIZE, perchGait, perchOffset } from "../PlacementPerchPet";

describe("perchOffset", () => {
  const width = 1000;
  // The ledge minus the pet itself and the flag's room at the far end.
  const end = perchOffset(1, width);

  it("starts at the left end and stops short of the flag", () => {
    expect(perchOffset(0, width)).toBe(0);
    expect(end).toBeGreaterThan(0);
    expect(end + PERCH_SIZE).toBeLessThan(width);
  });

  it("is proportional to progress", () => {
    expect(perchOffset(0.5, width)).toBe(Math.round(end / 2));
    expect(perchOffset(0.25, width)).toBeLessThan(perchOffset(0.75, width));
  });

  it("clamps out-of-range progress and a ledge too narrow to walk", () => {
    expect(perchOffset(-1, width)).toBe(0);
    expect(perchOffset(3, width)).toBe(end);
    expect(perchOffset(0.5, 10)).toBe(0);
  });
});

describe("perchGait", () => {
  it("walks a short way and runs a long way, in either direction", () => {
    expect(perchGait(0, 60)).toBe("walk");
    expect(perchGait(0, 400)).toBe("run");
    expect(perchGait(400, 0)).toBe("run");
  });
});
