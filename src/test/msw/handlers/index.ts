import { authHandlers } from "./auth";
import { testHandlers } from "./test";

export const handlers = [...authHandlers, ...testHandlers];
