import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

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
  it("renders headers, rows, and the count summary", () => {
    renderTable();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("3 of 3 users")).toBeInTheDocument();
  });

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

  it("Clear resets both search and filters", () => {
    renderTable();
    fireEvent.change(screen.getByPlaceholderText(/search any field/i), { target: { value: "ada" } });
    expect(screen.getByText("1 of 3 users")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(screen.getByText("3 of 3 users")).toBeInTheDocument();
  });

  it("uses a custom cell renderer for display while the search still works", () => {
    renderTable();
    // Plan column uses a render() badge
    expect(screen.getAllByTestId("plan-badge").length).toBe(3);
    // Searching by the plan text (its accessor defaults to row.plan) still filters
    fireEvent.change(screen.getByPlaceholderText(/search any field/i), { target: { value: "FREE" } });
    expect(screen.getByText("Bob Stone")).toBeInTheDocument();
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
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

  it("renders an actions cell when an actions renderer is provided", () => {
    renderTable({ actions: (r) => <button>Edit {r.name}</button> });
    expect(screen.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Ada Lovelace" })).toBeInTheDocument();
  });
});
