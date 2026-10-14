import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import RegisterPage from "@/app/register/page";
import { SignIn } from "../SignIn";

describe("sign-up paused", () => {
  it("/register renders the paused page with a way back to log in", () => {
    render(<RegisterPage />);
    expect(screen.getByRole("heading", { name: /building something better/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("SignIn hides the 'Sign up' prompt when no handler is passed", () => {
    render(
      <GoogleOAuthProvider clientId="test">
        <SignIn
          loginData={{ username: "", password: "" }}
          onChange={vi.fn()}
          onSubmit={vi.fn()}
          isSigningIn={false}
          errors={{}}
          onGoogleSuccess={vi.fn()}
        />
      </GoogleOAuthProvider>,
    );
    expect(screen.queryByRole("button", { name: "Sign up" })).not.toBeInTheDocument();
  });
});
