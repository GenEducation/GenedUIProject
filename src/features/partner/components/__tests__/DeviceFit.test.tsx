import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type {
  BankConcept,
  BankQuestion,
  ConceptPoolSurface,
} from "@/features/partner/types/sources";
import {
  DEVICE_PROFILE,
  DeviceReadiness,
  LiveReadinessChips,
  DeviceRefusalNote,
  QuestionDeviceChips,
  ReadyForStudents,
  conceptName,
  devicesNeeded,
} from "../DeviceFit";

/** SYNTHETIC: a bank question as the review payload sends it, with the device fields. */
function question(over: Partial<BankQuestion> = {}): BankQuestion {
  return {
    question_id: "q1",
    section_key: "s1",
    concept_key: "s1:c1",
    state: "draft",
    version: 1,
    revision: 1,
    origin: "ai",
    verification: "solver_agreed",
    concept_in_chapter: true,
    question: {
      body: {
        id: "q1",
        section_key: "s1",
        concept_key: "s1:c1",
        prompt: "SYNTHETIC: which is next?",
        answer_kind: "mcq",
        origin: "ai_assisted",
      } as BankQuestion["question"]["body"],
      meta: {} as BankQuestion["question"]["meta"],
    },
    tier: "weak",
    requested_strength: "weak",
    device: { [DEVICE_PROFILE]: { eligible: true, refusal: null } },
    ...over,
  };
}

function pool(over: Partial<ConceptPoolSurface> = {}): ConceptPoolSurface {
  return {
    units: 3,
    clean_path: true,
    families: 3,
    strong_families: 0,
    alternate: "resilient",
    ...over,
  };
}

function concept(
  device: ConceptPoolSurface,
  title = "SYNTHETIC concept",
): BankConcept {
  return {
    concept_key: title,
    title,
    status: "planned",
    why: null,
    understanding: null,
    misconceptions: [],
    obligations: [],
    open_slots: [],
    pool: { web: pool(), [DEVICE_PROFILE]: device },
  };
}

describe("question device chips", () => {
  it("say a question fits the device", () => {
    render(<QuestionDeviceChips q={question()} />);
    expect(screen.getByText(/Fits the device/)).toBeInTheDocument();
    expect(screen.getByText("Ordinary evidence")).toBeInTheDocument();
  });

  it("say app only, and why, when the device refuses it", () => {
    const q = question({
      device: {
        [DEVICE_PROFILE]: { eligible: false, refusal: "too_many_blanks" },
      },
    });
    render(
      <>
        <QuestionDeviceChips q={q} />
        <DeviceRefusalNote q={q} />
      </>,
    );
    expect(screen.getByText(/App only/)).toBeInTheDocument();
    expect(
      screen.getByText(/too many blanks \(at most 2\)/),
    ).toBeInTheDocument();
  });

  it("flag a question proposed strong that the finished version makes ordinary", () => {
    render(
      <QuestionDeviceChips q={question({ requested_strength: "strong" })} />,
    );
    expect(screen.getByText(/was strong/)).toBeInTheDocument();
  });

  it("render nothing for an older backend without the fields", () => {
    const { container } = render(
      <QuestionDeviceChips
        q={question({ tier: undefined, device: undefined })}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("device readiness per concept", () => {
  it("counts what each concept still needs", () => {
    expect(devicesNeeded(pool())).toBe(0);
    expect(
      devicesNeeded(
        pool({ alternate: "needs_alternate", strong_families: 1, families: 1 }),
      ),
    ).toBe(1);
    expect(
      devicesNeeded(pool({ alternate: "needs_alternate", families: 2 })),
    ).toBe(1);
    expect(
      devicesNeeded(
        pool({ alternate: "not_completable", families: 0, units: 0 }),
      ),
    ).toBe(3);
  });

  it("lists the concepts that are short on the device", () => {
    render(
      <DeviceReadiness
        concepts={[
          concept(pool(), "SYNTHETIC ready"),
          concept(
            pool({
              alternate: "needs_alternate",
              families: 1,
              strong_families: 1,
              units: 2,
            }),
            "SYNTHETIC short",
          ),
        ]}
      />,
    );
    expect(screen.getByText("1 of 2 ready")).toBeInTheDocument();
    expect(
      screen.getByText(/add 1 more question the device can show/),
    ).toBeInTheDocument();
  });

  it("shows nothing without pool data", () => {
    const c = { ...concept(pool()), pool: null };
    const { container } = render(<DeviceReadiness concepts={[c]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("ready for students", () => {
  it("counts ready steps per surface and says what a short step needs", () => {
    render(
      <ReadyForStudents
        readiness={[
          {
            surface: "web",
            ready: true,
            steps: [
              {
                section_key: "1.1",
                title: "SYNTHETIC a",
                ready: true,
                gaps: [],
              },
              {
                section_key: "1.2",
                title: "SYNTHETIC b",
                ready: true,
                gaps: [],
              },
            ],
          },
          {
            surface: DEVICE_PROFILE,
            ready: false,
            steps: [
              {
                section_key: "1.1",
                title: "SYNTHETIC a",
                ready: true,
                gaps: [],
              },
              {
                section_key: "1.2",
                title: "SYNTHETIC b",
                ready: false,
                gaps: [
                  {
                    concept_key: "1.2:synthetic-concept",
                    alternate: "needs_alternate",
                    families: 2,
                    strong_families: 0,
                  },
                ],
              },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByText("2 of 2 steps ready")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 steps ready")).toBeInTheDocument();
    expect(
      screen.getByText(/synthetic concept needs 1 more accepted question/),
    ).toBeInTheDocument();
    expect(screen.getByText(/You can still publish/)).toBeInTheDocument();
  });

  it("shows nothing for an older backend or a chapter with no bank", () => {
    const { container } = render(<ReadyForStudents readiness={[]} />);
    expect(container).toBeEmptyDOMElement();
    expect(conceptName("s1:c1")).toBe("c1");
  });
});

describe("accepted-only device counts", () => {
  it("counts a concept ready only from accepted questions, and says drafts would fix it", () => {
    const c = {
      ...concept(pool(), "SYNTHETIC drafts fix it"),
      pool_accepted: {
        web: pool(),
        [DEVICE_PROFILE]: pool({
          alternate: "needs_alternate",
          families: 2,
        }),
      },
    };
    render(<DeviceReadiness concepts={[c]} />);
    expect(
      screen.getByText("0 of 1 ready · 1 once you accept the drafts"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Ready once you accept its draft questions/),
    ).toBeInTheDocument();
  });
});

describe("live readiness chips", () => {
  it("show each surface the live chapter works on", () => {
    render(
      <LiveReadinessChips
        live={[
          {
            surface: "web",
            ready: true,
            steps_ready: 11,
            steps_total: 11,
            short_steps: [],
          },
          {
            surface: DEVICE_PROFILE,
            ready: false,
            steps_ready: 7,
            steps_total: 11,
            short_steps: ["SYNTHETIC step"],
          },
        ]}
      />,
    );
    expect(screen.getByText(/Web app/)).toHaveTextContent("Web app ✓");
    expect(screen.getByText(/GenEd device/)).toHaveTextContent(
      "GenEd device: 7 of 11 steps",
    );
  });
});
