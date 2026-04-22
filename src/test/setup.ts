import "@testing-library/jest-dom";
import { vi } from "vitest";

// jsdom optionally pulls in `canvas` for native rendering. axe-core triggers
// that path. We don't need real canvas rendering for our a11y assertions, so
// stub the binding to a no-op to avoid the missing native module error.
vi.mock("canvas", () => ({
  createCanvas: () => ({ getContext: () => null }),
  Image: class {},
  default: {},
}));

if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
}
