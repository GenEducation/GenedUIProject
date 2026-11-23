import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { InviteForm } from "../InviteForm";
import { GOOGLE_FORM_ACTION, toFormBody } from "@/features/webapp-campaign/googleForm";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(new Response(null));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const submit = () => fireEvent.click(screen.getByRole("button", { name: "Request my invite" }));
const pick = (name: string) => fireEvent.click(screen.getByRole("radio", { name }));

describe("InviteForm", () => {
  it("asks for every required answer before sending anything", () => {
    render(<InviteForm />);
    submit();
    for (const msg of [
      "Please enter your full name.",
      "Enter a 10-digit WhatsApp number.",
      "Choose your child's class.",
      "Choose a school board.",
      "Pick at least one subject.",
      "Let us know how you found us.",
      "We need this to send your invite.",
    ]) {
      expect(screen.getByText(msg)).toBeInTheDocument();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("wants the Other text when Other is picked", () => {
    render(<InviteForm />);
    // "Other" appears for both board and heard-from; heard-from is the last group.
    fireEvent.click(screen.getAllByRole("radio", { name: "Other" }).at(-1)!);
    submit();
    expect(screen.getByText("Where did you hear about us?")).toBeInTheDocument();
  });

  it("posts the parent's own answers to the Google Form and thanks them", async () => {
    render(<InviteForm />);
    fireEvent.change(screen.getByLabelText("Your full name"), { target: { value: "  Test Parent " } });
    fireEvent.change(screen.getByLabelText("WhatsApp number"), { target: { value: "+91 98765 43210" } });
    pick("Class 7");
    pick("ICSE");
    fireEvent.click(screen.getByRole("checkbox", { name: "Science" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Maths" }));
    // "Other" appears for both board and heard-from; heard-from is the last group.
    fireEvent.click(screen.getAllByRole("radio", { name: "Other" }).at(-1)!);
    fireEvent.change(screen.getByLabelText("Where did you hear about us"), { target: { value: "A podcast" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /contact me on WhatsApp/ }));
    submit();

    expect(await screen.findByText("You're on the list!")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(GOOGLE_FORM_ACTION);
    const body = init.body as URLSearchParams;
    expect(body.get("entry.624039706")).toBe("Test Parent");
    expect(body.get("entry.1705327254")).toBe("+91 9876543210");
    expect(body.get("entry.408290889")).toBe("Grade 7");
    expect(body.get("entry.1917441760")).toBe("ICSE");
    expect(body.getAll("entry.1367073796")).toEqual(["Maths", "Science"]);
    expect(body.get("entry.1639274391")).toBe("__other_option__");
    expect(body.get("entry.1639274391.other_option_response")).toBe("A podcast");
    expect(body.get("entry.1989914263")).toBe("Yes, contact me on WhatsApp");
  });

  it("keeps the parent's details for another child", async () => {
    render(<InviteForm />);
    fireEvent.change(screen.getByLabelText("Your full name"), { target: { value: "Test Parent" } });
    fireEvent.change(screen.getByLabelText("WhatsApp number"), { target: { value: "9876543210" } });
    pick("Class 6");
    pick("IB");
    fireEvent.click(screen.getByRole("checkbox", { name: "English" }));
    pick("School");
    fireEvent.click(screen.getByRole("checkbox", { name: /contact me on WhatsApp/ }));
    submit();
    fireEvent.click(await screen.findByRole("button", { name: "+ Add another child" }));
    expect(screen.getByLabelText("Your full name")).toHaveValue("Test Parent");
    expect(screen.getByRole("radio", { name: "Class 6" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "School" })).toBeChecked();
  });

  it("says so when the send fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("offline"));
    render(<InviteForm />);
    fireEvent.change(screen.getByLabelText("Your full name"), { target: { value: "Test Parent" } });
    fireEvent.change(screen.getByLabelText("WhatsApp number"), { target: { value: "9876543210" } });
    pick("Class 8");
    pick("State Board");
    fireEvent.click(screen.getByRole("checkbox", { name: "Maths" }));
    pick("LinkedIn");
    fireEvent.click(screen.getByRole("checkbox", { name: /contact me on WhatsApp/ }));
    submit();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Couldn't send"));
  });
});

describe("toFormBody", () => {
  it("still sends the ad page's fixed answers when the page doesn't ask", () => {
    const body = toFormBody({ name: "P", whatsapp: "9876543210", grade: "Grade 9", board: "NCERT / CBSE" });
    expect(body.getAll("entry.1367073796")).toEqual(["Maths", "English", "Science"]);
    expect(body.get("entry.1639274391")).toBe("Instagram / Facebook ad");
    expect(body.has("entry.1639274391.other_option_response")).toBe(false);
  });
});
