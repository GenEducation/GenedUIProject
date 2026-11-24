import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { EducatorInviteForm } from "../EducatorInviteForm";
import { EDUCATOR_FORM_ACTION } from "../educatorForm";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(new Response(null));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const submit = () => fireEvent.click(screen.getByRole("button", { name: "Request my educator invite" }));
const pick = (name: string) => fireEvent.click(screen.getByRole("radio", { name }));
const tick = (name: string | RegExp) => fireEvent.click(screen.getByRole("checkbox", { name }));
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

function fillValid() {
  type("Your full name", " Anita Rao ");
  type("WhatsApp number", "+91 98765 43210");
  type("Email address", "anita@school.edu.in");
  pick("Teacher");
  type("School / institution", "Delhi Public School");
  type("City", "Pune");
  pick("ICSE");
  tick("Class 7");
  tick("Class 3");
  tick("Science");
  pick("DIDAC");
  tick(/contact me on WhatsApp/);
}

describe("EducatorInviteForm", () => {
  it("asks for every required answer before sending anything", () => {
    render(<EducatorInviteForm />);
    submit();
    for (const msg of [
      "Please enter your full name.",
      "Enter a 10-digit WhatsApp number.",
      "Enter a valid email address.",
      "Choose your role.",
      "Enter your school or institution.",
      "Enter your city.",
      "Choose a school board.",
      "Pick at least one class.",
      "Pick at least one subject.",
      "Let us know how you found us.",
      "We need this to send your invite.",
    ]) {
      expect(screen.getByText(msg)).toBeInTheDocument();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("wants the text when Other is picked for role", () => {
    render(<EducatorInviteForm />);
    // "Other" appears for role, board and heard-from; role is the first group.
    fireEvent.click(screen.getAllByRole("radio", { name: "Other" })[0]);
    submit();
    expect(screen.getByText("What's your role?")).toBeInTheDocument();
  });

  it("posts the educator's answers to their Google Form", async () => {
    render(<EducatorInviteForm />);
    fillValid();
    submit();

    expect(await screen.findByText("You're on the list!")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(EDUCATOR_FORM_ACTION);
    expect(init.mode).toBe("no-cors");
    const body = init.body as URLSearchParams;
    expect(body.get("entry.1947303286")).toBe("Anita Rao");
    expect(body.get("entry.737773296")).toBe("+91 9876543210");
    expect(body.get("entry.1522013125")).toBe("anita@school.edu.in");
    expect(body.get("entry.1078625606")).toBe("Delhi Public School");
    expect(body.get("entry.946656613")).toBe("Pune");
    expect(body.get("entry.103157093")).toBe("Teacher");
    expect(body.get("entry.558547876")).toBe("ICSE");
    // In the form's own order, whatever order they were ticked in.
    expect(body.getAll("entry.1024343567")).toEqual(["Class 3", "Class 7"]);
    expect(body.getAll("entry.2096216895")).toEqual(["Science"]);
    expect(body.get("entry.1415375585")).toBe("DIDAC");
    expect(body.get("entry.688595184")).toBe("Yes, contact me on WhatsApp");
  });

  it("sends an Other role as Google's Other answer", async () => {
    render(<EducatorInviteForm />);
    fillValid();
    fireEvent.click(screen.getAllByRole("radio", { name: "Other" })[0]);
    type("Other role", "Counsellor");
    submit();
    await screen.findByText("You're on the list!");
    const body = fetchMock.mock.calls[0][1].body as URLSearchParams;
    expect(body.get("entry.103157093")).toBe("__other_option__");
    expect(body.get("entry.103157093.other_option_response")).toBe("Counsellor");
  });

  it("says so when the send fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("offline"));
    render(<EducatorInviteForm />);
    fillValid();
    submit();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Couldn't send"));
  });
});
