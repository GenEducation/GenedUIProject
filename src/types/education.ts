export const EDUCATION_BOARDS = ["CBSE", "ICSE"] as const;

export type EducationBoard = (typeof EDUCATION_BOARDS)[number];

export function isEducationBoard(value: unknown): value is EducationBoard {
  return EDUCATION_BOARDS.some((board) => board === value);
}
