import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { autoResetStore } from "@/test/helpers/resetStores";
import { useTeacherStore } from "../../store/useTeacherStore";
import { StudentRoster } from "../StudentRoster";
import type { TeacherStudent } from "../../services/teacherService";

autoResetStore(useTeacherStore);

const students: TeacherStudent[] = [
  { student_id: "s1", status: "APPROVED", subject: "Mathematics", name: "Charlie" },
  { student_id: "s2", status: "PENDING", subject: "Science", name: "Alice" },
];

function renderRoster() {
  return render(
    <StudentRoster
      onApprove={vi.fn()}
      onRemove={vi.fn()}
      onViewChats={vi.fn()}
      onViewReport={vi.fn()}
      approvingId={null}
      removingId={null}
    />,
  );
}

beforeEach(() => {
  useTeacherStore.setState({ students, statusFilter: "all", subjectFilter: "all", search: "", sort: "status", isFetchingStudents: false });
});

describe("StudentRoster", () => {
  it("narrows the visible cards when a status filter is active in the store", () => {
    useTeacherStore.setState({ statusFilter: "PENDING" });
    renderRoster();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Charlie")).not.toBeInTheDocument();
  });

  it("typing in search pushes the query into the store", () => {
    renderRoster();
    const search = screen.getByPlaceholderText(/search/i);
    fireEvent.change(search, { target: { value: "Alice" } });
    expect(useTeacherStore.getState().search).toBe("Alice");
  });
});
