import { afterEach, describe, it, expect } from "vitest";
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

/**
 * The table (with its header row) is the desktop layout; the setup's
 * matchMedia answers "phone", where rows render as cards. Tests about headers
 * switch to desktop first.
 */
const realMatchMedia = window.matchMedia;
function asDesktop() {
  window.matchMedia = ((query: string) => ({ ...realMatchMedia(query), matches: true })) as typeof window.matchMedia;
}
afterEach(() => {
  window.matchMedia = realMatchMedia;
});

describe("DataTable", () => {
  it("renders headers, rows, and the count summary", () => {
    asDesktop();
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
    // Exact name: the search box has its own "Clear search" button.
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
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

  it("sorts by a column header, ascending then descending then off", () => {
    asDesktop();
    renderTable();
    const names = () => screen.getAllByText(/Lovelace|Stone|Diaz/).map((el) => el.textContent);
    const header = screen.getByRole("button", { name: /^Name/ });

    fireEvent.click(header);
    expect(names()).toEqual(["Ada Lovelace", "Bob Stone", "Cara Diaz"]);
    fireEvent.click(header);
    expect(names()).toEqual(["Cara Diaz", "Bob Stone", "Ada Lovelace"]);
    fireEvent.click(header);
    expect(names()).toEqual(["Ada Lovelace", "Bob Stone", "Cara Diaz"]);
  });

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

  it("renders an actions cell when an actions renderer is provided", () => {
    asDesktop();
    renderTable({ actions: (r) => <button>Edit {r.name}</button> });
    expect(screen.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Ada Lovelace" })).toBeInTheDocument();
  });

  it("keeps blank cells last in either sort direction", () => {
    asDesktop();
    const withBlank = [...rows, { id: "4", name: "Dan", role: "STUDENT", plan: "" }, { id: "5", name: "Eve", role: "STUDENT", plan: "" }];
    renderTable({ rows: withBlank, columns: [{ key: "name", header: "Name" }, { key: "plan", header: "Plan" }] });
    const order = () => screen.getAllByText(/^(Ada Lovelace|Bob Stone|Cara Diaz|Dan|Eve)$/).map((el) => el.textContent);
    const header = screen.getByRole("button", { name: /^Plan/ });

    fireEvent.click(header);
    expect(order().slice(-2)).toEqual(["Dan", "Eve"]);
    fireEvent.click(header);
    expect(order().slice(-2)).toEqual(["Dan", "Eve"]);
  });

  it("orders tabs as asked, with unlisted values after", () => {
    renderTable({ tabs: { label: "Role", accessor: (r) => r.role, order: ["TEACHER"] } });
    expect(screen.getAllByRole("tab").map((t) => t.textContent?.replace(/\d+$/, ""))).toEqual(["All", "TEACHER", "STUDENT"]);
  });

  it("clears the search from the box's own button", () => {
    renderTable();
    fireEvent.change(screen.getByPlaceholderText(/search any field/i), { target: { value: "ada" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByText("3 of 3 users")).toBeInTheDocument();
  });

  // Phone layout: no headers to click, so sorting has its own dropdown.
  it("sorts from the phone's sort control, and back to the default", () => {
    renderTable();
    const sort = screen.getByRole("combobox", { name: "Sort" });
    const names = () => screen.getAllByText(/Lovelace|Stone|Diaz/).map((el) => el.textContent);

    chooseSelectOption(sort, "Name ↓");
    expect(names()).toEqual(["Cara Diaz", "Bob Stone", "Ada Lovelace"]);
    chooseSelectOption(sort, "Sort: Default");
    expect(names()).toEqual(["Ada Lovelace", "Bob Stone", "Cara Diaz"]);
  });

  it("offers a way back from a search that matches nothing", () => {
    renderTable();
    fireEvent.change(screen.getByPlaceholderText(/search any field/i), { target: { value: "zzz" } });
    expect(screen.getByText(/no users found/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear search and filters" }));
    expect(screen.getByText("3 of 3 users")).toBeInTheDocument();
  });

  it("changes page size and steps back a page", () => {
    const many = Array.from({ length: 60 }, (_, i) => ({
      id: String(i),
      name: `Person ${String(i).padStart(2, "0")}`,
      role: "STUDENT",
      plan: "FREE",
    }));
    renderTable({ rows: many });
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("26–50 of 60")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(screen.getByText("1–25 of 60")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Rows" }), { target: { value: "50" } });
    expect(screen.getByText("1–50 of 60")).toBeInTheDocument();
  });
});
