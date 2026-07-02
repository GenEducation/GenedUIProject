/**
 * jsdom throws "Not implemented: navigation" when code assigns `window.location.href`
 * (authFetch does exactly this on 401/403). Replace `window.location` with a writable
 * stub so tests can trigger and assert on those redirects.
 */
export interface LocationStub {
  href: string;
  assign: (url: string) => void;
  replace: (url: string) => void;
  reload: () => void;
}

export function installLocationStub(initialHref = "http://localhost/"): LocationStub {
  const stub: LocationStub = {
    href: initialHref,
    assign() {},
    replace() {},
    reload() {},
  };
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: stub,
  });
  return stub;
}
