/**
 * The backend's password rule for sign-up and reset: at least 8 characters,
 * with an uppercase letter, a lowercase letter, and a digit or symbol.
 * Sign-in stays lenient on purpose; older accounts may predate the rule.
 */
export const PASSWORD_RULE_HINT =
  "Use at least 8 characters, with an uppercase letter, a lowercase letter, and a number or symbol.";

/** The first unmet part of the rule as a message, or null when the password is acceptable. */
export function passwordRuleError(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password needs an uppercase letter";
  if (!/[a-z]/.test(password)) return "Password needs a lowercase letter";
  if (!/[^A-Za-z]/.test(password)) return "Password needs a number or symbol";
  return null;
}
