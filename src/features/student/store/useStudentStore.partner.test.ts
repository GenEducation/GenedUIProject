import { describe, expect, it } from "vitest";

import { selectEffectiveLearningPartner } from "./useStudentStore";

describe("selectEffectiveLearningPartner", () => {
  it("selects the real school from the reported legacy sentinel-first response", () => {
    const response = [
      {
        partner_id: "00000000-0000-0000-0000-000000000000",
        organization: "Gen-Ed",
        board: "CBSE",
        subjects: [],
      },
      {
        partner_id: "57790897-2abb-4575-b295-2f0f3c111e51",
        organization: "Modern Academy",
        board: "ICSE",
        subjects: [{ subject: "Mathematics" }],
      },
    ];

    expect(selectEffectiveLearningPartner(response)).toMatchObject({
      organization: "Modern Academy",
      board: "ICSE",
    });
  });

  it("rejects multiple real schools instead of depending on array order", () => {
    expect(() =>
      selectEffectiveLearningPartner([
        { partner_id: "11111111-1111-1111-1111-111111111111", board: "CBSE" },
        { partner_id: "22222222-2222-2222-2222-222222222222", board: "ICSE" },
      ]),
    ).toThrow("more than one effective learning partner");
  });
});
