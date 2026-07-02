import { vi } from "vitest";

/**
 * Client components call `useRouter()` from next/navigation, which throws outside an
 * App Router context. Use these factories inside a `vi.mock("next/navigation", ...)`
 * so components render and route calls become assertable spies.
 */
export function createRouterMock() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  };
}

export interface NextNavigationMockOptions {
  pathname?: string;
  searchParams?: string;
  router?: ReturnType<typeof createRouterMock>;
}

export function createNextNavigationMock(options: NextNavigationMockOptions = {}) {
  const router = options.router ?? createRouterMock();
  return {
    router,
    useRouter: () => router,
    usePathname: () => options.pathname ?? "/",
    useSearchParams: () => new URLSearchParams(options.searchParams ?? ""),
    redirect: vi.fn(),
    notFound: vi.fn(),
  };
}
