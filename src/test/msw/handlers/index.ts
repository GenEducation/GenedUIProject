import { authHandlers } from "./auth";
import { testHandlers } from "./test";
import { teacherHandlers } from "./teacher";
import { parentHandlers } from "./parent";

export const handlers = [...authHandlers, ...testHandlers, ...teacherHandlers, ...parentHandlers];
