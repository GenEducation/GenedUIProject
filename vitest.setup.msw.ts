import { beforeAll, afterEach, afterAll } from "vitest";
import { server } from "./src/test/msw/server";

// "error": Phase 3 integration coverage is broad enough that a request with no matching
// handler is almost certainly a missing fixture, not an inert pre-existing suite.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
