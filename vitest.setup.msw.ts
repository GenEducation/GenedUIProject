import { beforeAll, afterEach, afterAll } from "vitest";
import { server } from "./src/test/msw/server";

// "warn" (not "error") for now: the pre-existing suites never hit the network, so an
// unhandled request there is harmless. Tighten to "error" once integration coverage grows.
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
