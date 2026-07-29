import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "@/test/msw/server";
import { PreorderModal } from "../components/PreorderModal";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

// Fake Razorpay checkout: `open()` synchronously invokes the `handler`
// callback that was passed in, as if the buyer completed payment.
function installFakeRazorpay() {
  const RazorpayMock = vi.fn().mockImplementation(function (this: any, options: any) {
    this.open = () => {
      options.handler({
        razorpay_order_id: options.order_id,
        razorpay_payment_id: "pay_test123",
        razorpay_signature: "sig_test123",
      });
    };
  });
  (window as any).Razorpay = RazorpayMock;
  return RazorpayMock;
}

function fillForm() {
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Jane Sharma" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "jane@email.com" } });
  fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "+91 98765 43210" } });
  fireEvent.change(screen.getByLabelText("City / region"), { target: { value: "Mumbai" } });
  fireEvent.change(screen.getByLabelText("Country"), { target: { value: "India" } });
  fireEvent.click(screen.getByRole("checkbox"));
}

beforeEach(() => {
  installFakeRazorpay();
  (window as any).Razorpay.mockClear?.();
});

describe("pre-order deposit flow (integration)", () => {
  it("submits, opens Razorpay checkout, verifies, and shows the backend reference", async () => {
    let createBody: any = null;
    let verifyBody: any = null;
    server.use(
      http.post(`${BASE}/preorders`, async ({ request }) => {
        createBody = await request.json();
        return HttpResponse.json({
          reference: "GENED-REAL01",
          razorpay_order_id: "order_real123",
          amount: 50000,
          currency: "INR",
          key_id: "rzp_test_key",
        });
      }),
      http.post(`${BASE}/preorders/verify`, async ({ request }) => {
        verifyBody = await request.json();
        return HttpResponse.json({ ok: true, reference: "GENED-REAL01" });
      }),
    );

    render(<PreorderModal isOpen={true} onClose={() => {}} />);

    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /Reserve for/i }));

    await waitFor(() => expect(screen.getByText(/on the list/i)).toBeInTheDocument());

    expect(screen.getByText("GENED-REAL01")).toBeInTheDocument();
    expect(createBody).toMatchObject({
      full_name: "Jane Sharma",
      email: "jane@email.com",
      phone: "+91 98765 43210",
      city: "Mumbai",
      country: "India",
      buyer_type: "parent",
      consent: true,
    });
    expect(verifyBody).toMatchObject({
      reference: "GENED-REAL01",
      razorpay_order_id: "order_real123",
      razorpay_payment_id: "pay_test123",
      razorpay_signature: "sig_test123",
    });
  });

  it("shows a specific message on a PREORD_1103 conflict", async () => {
    server.use(
      http.post(`${BASE}/preorders`, () =>
        HttpResponse.json(
          {
            error_code: "PREORD_1103",
            message: "Conflict",
            request_id: "r1",
            retryable: false,
            details: {},
          },
          { status: 409 },
        ),
      ),
    );

    render(<PreorderModal isOpen={true} onClose={() => {}} />);

    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /Reserve for/i }));

    await waitFor(() =>
      expect(
        screen.getByText("This reservation is already paid or can no longer be changed."),
      ).toBeInTheDocument(),
    );
  });
});
