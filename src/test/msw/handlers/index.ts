import { authHandlers } from "./auth";
import { testHandlers } from "./test";
import { teacherHandlers } from "./teacher";
import { parentHandlers } from "./parent";
import { subjectHandlers } from "./subjects";

export const handlers = [
  ...authHandlers,
  ...testHandlers,
  ...teacherHandlers,
  ...parentHandlers,
  ...subjectHandlers,
];
