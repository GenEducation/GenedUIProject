import { authHandlers } from "./auth";
import { testHandlers } from "./test";
import { teacherHandlers } from "./teacher";
import { parentHandlers } from "./parent";
import { subjectHandlers } from "./subjects";
import { preorderHandlers } from "./preorder";

export const handlers = [
  ...authHandlers,
  ...testHandlers,
  ...teacherHandlers,
  ...parentHandlers,
  ...subjectHandlers,
  ...preorderHandlers,
];
