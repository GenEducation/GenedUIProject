import { describe, expect, it } from "vitest";

import { assignStudentToDevice } from "../PreActivationSeating";

describe("pre-activation seating assignment rules", () => {
  it("places an unassigned student on an empty device", () => {
    expect(assignStudentToDevice({}, "student-1", "device-1")).toEqual({
      "student-1": "device-1",
    });
  });

  it("returns the previous occupant to automatic allocation", () => {
    expect(
      assignStudentToDevice({ "student-1": "device-1" }, "student-2", "device-1"),
    ).toEqual({ "student-2": "device-1" });
  });

  it("swaps occupants when a seated student moves to an occupied device", () => {
    expect(
      assignStudentToDevice(
        { "student-1": "device-1", "student-2": "device-2" },
        "student-1",
        "device-2",
      ),
    ).toEqual({ "student-1": "device-2", "student-2": "device-1" });
  });
});
