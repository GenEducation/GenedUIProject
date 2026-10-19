import { describe, it, expect } from "vitest";

import { gatheringLine, namesLine, stageLines } from "../loaderMessages";

describe("loaderMessages", () => {
  it("names children briefly, by first name", () => {
    expect(namesLine(["Aarav Sharma"])).toBe("Aarav");
    expect(namesLine(["Aarav Sharma", "Priya Mehta"])).toBe("Aarav & Priya");
    expect(namesLine(["Aarav", "Priya", "Rohan", "Meera"])).toBe("Aarav, Priya & 2 more");
    expect(namesLine([])).toBe("");
  });

  it("phrases the gathering line naturally for any family size", () => {
    expect(gatheringLine(["Aarav"])).toBe("Gathering Aarav's progress");
    expect(gatheringLine(["Aarav", "Priya"])).toBe("Gathering Aarav & Priya's progress");
    expect(gatheringLine(["Aarav", "Priya", "Rohan"])).toBe("Gathering progress for Aarav, Priya & 1 more");
    expect(gatheringLine([])).toBeNull();
  });

  it("gives each stage honest status lines, naming the family on entry", () => {
    expect(stageLines("signup")).toEqual(["Creating your family account", "Setting up your parent space"]);
    expect(stageLines("signin-handoff")).toEqual(["Signed in securely", "Opening your parent portal"]);
    expect(stageLines("entry")).toEqual(["Opening your parent portal", "Finding your children"]);
    expect(stageLines("entry", ["Aarav"]).at(-1)).toBe("Gathering Aarav's progress");
    expect(stageLines("signup", ["Aarav"])).not.toContain("Gathering Aarav's progress");
  });
});
