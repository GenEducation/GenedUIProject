/** Parent portal types — mirrors the web src/features/parent/ types. */

export interface LinkedChild {
  id: string;
  name: string;
  grade: string;
  initials: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}
