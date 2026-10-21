import { describe, it, expect } from "vitest";

import { stageLines } from "../loaderMessages";

describe("loaderMessages", () => {
  it("gives each stage honest status lines, naming the family on entry", () => {
    expect(stageLines("signup")).toEqual(["Creating your family account", "Setting up your parent space"]);
    expect(stageLines("signin-handoff")).toEqual(["Signed in securely", "Opening your parent portal"]);
    expect(stageLines("entry")).toEqual(["Opening your parent portal", "Finding your children"]);
    expect(stageLines("entry", ["Aarav"]).at(-1)).toBe("Gathering Aarav's progress");
    expect(stageLines("signup", ["Aarav"])).not.toContain("Gathering Aarav's progress");
  });
});
