import { http, HttpResponse } from "msw";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

/**
 * Default paired-bot handlers (backend ADR 0043): nobody has a bot yet, and removing one succeeds. Suites that show
 * bots override the list with server.use().
 */
export const devicesHandlers = [
  http.get(`${BASE}/v1/devices/bots`, () => HttpResponse.json([])),
  http.delete(`${BASE}/v1/devices/bots/:botId`, () => new HttpResponse(null, { status: 204 })),
  http.get(`${BASE}/v1/devices/children/:studentId/bots`, () => HttpResponse.json([])),
  http.delete(`${BASE}/v1/devices/children/:studentId/bots/:botId`, () => new HttpResponse(null, { status: 204 })),
];
