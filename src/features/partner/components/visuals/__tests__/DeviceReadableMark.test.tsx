import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { VisualDetail } from "../../../types/visuals";
import { DeviceReadableMark } from "../DeviceReadableMark";

const mark = vi.fn();
vi.mock("../../../services/visualsService", () => ({
  visualsService: {
    imageSrc: (u: string | null) => u,
    markDeviceReadable: (id: string) => mark(id),
  },
}));

/** SYNTHETIC: just the fields the mark reads. */
function detail(over: Partial<VisualDetail> = {}): VisualDetail {
  return {
    id: "v1",
    origin: "textbook_crop",
    state: "accepted",
    image_url: "/synthetic.png",
    device_readable: false,
    ...over,
  } as VisualDetail;
}

beforeEach(() => mark.mockReset());

describe("readable on the device", () => {
  it("marks an accepted crop and says it will become a device picture", async () => {
    mark.mockResolvedValue(undefined);
    const onMarked = vi.fn();
    render(<DeviceReadableMark detail={detail()} onMarked={onMarked} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Readable on the device/ }),
    );
    await waitFor(() => expect(onMarked).toHaveBeenCalled());
    expect(mark).toHaveBeenCalledWith("v1");
    expect(screen.getByText(/made into a device picture/)).toBeInTheDocument();
  });

  it("shows an already marked crop as marked, with no button", () => {
    render(
      <DeviceReadableMark
        detail={detail({ device_readable: true })}
        onMarked={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText(/Readable on the device:/)).toBeInTheDocument();
  });

  it("is absent for a drawn picture and for a crop not yet accepted", () => {
    const { container: drawn } = render(
      <DeviceReadableMark
        detail={detail({ origin: "drawn" })}
        onMarked={vi.fn()}
      />,
    );
    expect(drawn).toBeEmptyDOMElement();
    const { container: pending } = render(
      <DeviceReadableMark
        detail={detail({ state: "pending" })}
        onMarked={vi.fn()}
      />,
    );
    expect(pending).toBeEmptyDOMElement();
  });
});
