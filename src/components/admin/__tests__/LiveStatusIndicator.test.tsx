import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { LiveStatusIndicator } from "../LiveStatusIndicator";
import { expectNoA11yViolations, checkAccessibility } from "@/test/a11y";

describe("LiveStatusIndicator", () => {
  const FIXED_NOW = new Date("2026-04-22T10:00:00Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("exposes role=status with descriptive aria-label when connected", () => {
    render(
      <LiveStatusIndicator
        status="connected"
        lastEventAt={new Date(FIXED_NOW - 5_000)}
      />
    );
    const pill = screen.getAllByRole("status")[0];
    const label = pill.getAttribute("aria-label") ?? "";
    expect(label).toContain("Realtime status: Live");
    expect(label).toContain("5s ago");
  });

  it("renders a polite live region with sr-only styling", () => {
    render(<LiveStatusIndicator status="connecting" lastEventAt={null} />);
    const announcer = screen.getByTestId("live-status-sr-announcer");
    expect(announcer).toHaveAttribute("aria-live", "polite");
    expect(announcer).toHaveAttribute("aria-atomic", "true");
    expect(announcer).toHaveClass("sr-only");
    expect(announcer.textContent).toMatch(/connecting/i);
  });

  it("announces disconnected state with fallback guidance", () => {
    render(<LiveStatusIndicator status="disconnected" lastEventAt={null} />);
    const announcer = screen.getByTestId("live-status-sr-announcer");
    expect(announcer.textContent).toMatch(/disconnected/i);
    expect(announcer.textContent).toMatch(/periodic refresh/i);
  });

  it("announces idle state when connection healthy but stale", () => {
    render(
      <LiveStatusIndicator
        status="connected"
        lastEventAt={new Date(FIXED_NOW - 200_000)}
      />
    );
    const announcer = screen.getByTestId("live-status-sr-announcer");
    expect(announcer.textContent).toMatch(/idle/i);
  });

  it("hides decorative icons and visual labels from assistive tech", () => {
    const { container } = render(
      <LiveStatusIndicator
        status="connected"
        lastEventAt={new Date(FIXED_NOW - 1_000)}
      />
    );
    const ariaHidden = container.querySelectorAll('[aria-hidden="true"]');
    expect(ariaHidden.length).toBeGreaterThanOrEqual(4);
  });

  it("can suppress the SR live region when announce=false", () => {
    render(
      <LiveStatusIndicator
        status="connected"
        lastEventAt={new Date(FIXED_NOW)}
        announce={false}
      />
    );
    expect(
      screen.queryByTestId("live-status-sr-announcer")
    ).not.toBeInTheDocument();
  });

  it.each(["connecting", "connected", "disconnected"] as const)(
    "passes structural accessibility checks when status=%s",
    (status) => {
      const { container } = render(
        <LiveStatusIndicator
          status={status}
          lastEventAt={
            status === "connecting" ? null : new Date(FIXED_NOW - 2_000)
          }
        />
      );
      expectNoA11yViolations(container);
    }
  );

  it("passes accessibility checks in stale (idle) state", () => {
    const { container } = render(
      <LiveStatusIndicator
        status="connected"
        lastEventAt={new Date(FIXED_NOW - 300_000)}
      />
    );
    const violations = checkAccessibility(container);
    expect(violations).toEqual([]);
  });
});
