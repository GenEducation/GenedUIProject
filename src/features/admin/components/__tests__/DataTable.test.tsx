import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { DataTable, type Column } from "../DataTable";
import { chooseSelectOption, getSelectOptionLabels } from "@/test/helpers/select";

interface Row {
  id: string;
  name: string;
  role: string;
  plan: string;
}

const rows: Row[] = [
  { id: "1", name: "Ada Lovelace", role: "TEACHER", plan: "PRO" },
  { id: "2", name: "Bob Stone", role: "STUDENT", plan: "FREE" },
  { id: "3", name: "Cara Diaz", role: "STUDENT", plan: "PRO" },
];

const columns: Column<Row>[] = [
  { key: "name", header: "Name" },
  { key: "role", header: "Role", filterable: true },
  { key: "plan", header: "Plan", filterable: true, render: (r) => <span data-testid="plan-badge">{r.plan}</span> },
];

function renderTable(overrides: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) {
  return render(
    <DataTable<Row> title="Users" noun="users" rows={rows} columns={columns} getRowKey={(r) => r.id} {...overrides} />,
  );
}

describe("DataTable", () => {
  it("global search matches any column's text, case-insensitively", () => {
    renderTable();
    fireEvent.change(screen.getByPlaceholderText(/search any field/i), { target: { value: "lovelace" } });
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.queryByText("Bob Stone")).not.toBeInTheDocument();
    expect(screen.getByText("1 of 3 users")).toBeInTheDocument();
  });

  it("a filterable column offers distinct sorted values and filters on selection", () => {
    renderTable();
    // The Role filter dropdown — the first combobox in the toolbar
    const roleSelect = screen.getAllByRole("combobox")[0];
    expect(getSelectOptionLabels(roleSelect)).toEqual(["Role: All", "STUDENT", "TEACHER"]); // distinct + sorted

    chooseSelectOption(roleSelect, "STUDENT");
    expect(screen.getByText("Bob Stone")).toBeInTheDocument();
    expect(screen.getByText("Cara Diaz")).toBeInTheDocument();
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    expect(screen.getByText("2 of 3 users")).toBeInTheDocument();
  });

  it("shows the loading, empty, and error states", () => {
    const { rerender } = renderTable({ loading: true });
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    rerender(<DataTable<Row> title="Users" noun="users" rows={[]} columns={columns} getRowKey={(r) => r.id} />);
    expect(screen.getByText(/no users found/i)).toBeInTheDocument();

    rerender(
      <DataTable<Row> title="Users" noun="users" rows={rows} columns={columns} getRowKey={(r) => r.id} error="Boom" />,
    );
    expect(screen.getByText("Boom")).toBeInTheDocument();
  });

  it("sorts by a column header, ascending then descending then off", () => {
    // Headers exist only in the desktop table; the setup's matchMedia says phone.
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({ ...original(query), matches: true })) as typeof window.matchMedia;
    try {
      sortByHeader();
    } finally {
      window.matchMedia = original;
    }
  });

  function sortByHeader() {
    renderTable();
    const names = () => screen.getAllByText(/Lovelace|Stone|Diaz/).map((el) => el.textContent);
    const header = screen.getByRole("button", { name: /^Name/ });

    fireEvent.click(header);
    expect(names()).toEqual(["Ada Lovelace", "Bob Stone", "Cara Diaz"]);
    fireEvent.click(header);
    expect(names()).toEqual(["Cara Diaz", "Bob Stone", "Ada Lovelace"]);
    fireEvent.click(header);
    expect(names()).toEqual(["Ada Lovelace", "Bob Stone", "Cara Diaz"]);
  }

  it("pages long lists, 25 rows at a time", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      id: String(i),
      name: `Person ${String(i).padStart(2, "0")}`,
      role: "STUDENT",
      plan: "FREE",
    }));
    renderTable({ rows: many });
    expect(screen.getByText("Person 24")).toBeInTheDocument();
    expect(screen.queryByText("Person 25")).not.toBeInTheDocument();
    expect(screen.getByText("1–25 of 30")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Person 25")).toBeInTheDocument();
    expect(screen.queryByText("Person 24")).not.toBeInTheDocument();
  });

  it("splits the list with counted tabs", () => {
    renderTable({ tabs: { label: "Role", accessor: (r) => r.role } });
    fireEvent.click(screen.getByRole("tab", { name: /STUDENT/ }));
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    expect(screen.getByText("2 of 3 users")).toBeInTheDocument();
  });

  it("reports a non-list answer instead of crashing", () => {
    renderTable({ rows: { items: [] } as unknown as Row[] });
    expect(screen.getByRole("alert")).toHaveTextContent(/unexpected format/i);
  });

  // Citron is rationed to the one thing on a screen that asks for action.
  it("draws the call-to-action tab's count in citron, and only while it has rows", () => {
    renderTable({ tabs: { label: "Role", accessor: (r) => r.role, highlight: "STUDENT" } });
    const count = screen.getByRole("tab", { name: /STUDENT/ }).querySelector("span")!;
    expect(count.className).toContain("bg-accent");
    expect(screen.getByRole("tab", { name: /TEACHER/ }).querySelector("span")!.className).not.toContain("bg-accent");
  });
});
