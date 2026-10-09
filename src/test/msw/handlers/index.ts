import { authHandlers } from "./auth";
import { testHandlers } from "./test";
import { teacherHandlers } from "./teacher";
import { parentHandlers } from "./parent";
import { subjectHandlers } from "./subjects";
import { preorderHandlers } from "./preorder";
import { placementHandlers } from "./placement";
import { analyticsHandlers } from "./analytics";
import { visualsHandlers } from "./visuals";
import { sourcesHandlers } from "./sources";
import { learnerHandlers } from "./learner";

export const handlers = [
  ...authHandlers,
  ...testHandlers,
  ...teacherHandlers,
  ...parentHandlers,
  ...subjectHandlers,
  ...preorderHandlers,
  ...placementHandlers,
  ...analyticsHandlers,
  ...visualsHandlers,
  ...sourcesHandlers,
  ...learnerHandlers,
];
