import { describe, it, expect } from "vitest";
import { passwordRuleError } from "../passwordRule";

describe("passwordRuleError (the backend's sign-up/reset rule)", () => {
  it.each([
    ["Mangoes7", null],
    ["Mangoes!", null],
    ["Mango7", "Password must be at least 8 characters"],
    ["mangoes7", "Password needs an uppercase letter"],
    ["MANGOES7", "Password needs a lowercase letter"],
    ["Mangoesss", "Password needs a number or symbol"],
  ])("%s → %s", (password, expected) => {
    expect(passwordRuleError(password)).toBe(expected);
  });
});
