import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import axe from "axe-core";
import { LiveStatusIndicator } from "../LiveStatusIndicator";

async function expectNoA11yViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    // Color-contrast requires real layout/painting which jsdom can't do.
    rules: { "color-contrast": { enabled: false } },
  });
  if (results.violations.length > 0) {
    const summary = results.violations
      .map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`)
      .join("\n");
    throw new Error(`Accessibility violations:\n${summary}`);
  }
  expect(results.violations).toEqual([]);
}

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

  it("exposes an accessible status role with descriptive aria-label when connected", () => {
    render(
      <LiveStatusIndicator
        status="connected"
        lastEventAt={new Date(FIXED_NOW - 5_000)}
      />
    );
    const statuses = screen.getAllByRole("status");
    // First status is the visible pill
    expect(statuses[0]).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Realtime status: Live")
    );
    expect(statuses[0].getAttribute("aria-label")).toContain("5s ago");
  });

  it("renders a polite live region for SR announcements", () => {
    render(
      <LiveStatusIndicator status="connecting" lastEventAt={null} />
    );
    const announcer = screen.getByTestId("live-status-sr-announcer");
    expect(announcer).toHaveAttribute("aria-live", "polite");
    expect(announcer).toHaveAttribute("aria-atomic", "true");
    expect(announcer).toHaveClass("sr-only");
    expect(announcer.textContent).toMatch(/connecting/i);
  });

  it("announces the disconnected state with fallback guidance", () => {
    render(
      <LiveStatusIndicator status="disconnected" lastEventAt={null} />
    );
    const announcer = screen.getByTestId("live-status-sr-announcer");
    expect(announcer.textContent).toMatch(/disconnected/i);
    expect(announcer.textContent).toMatch(/periodic refresh/i);
  });

  it("announces idle state when connection is healthy but stale", () => {
    render(
      <LiveStatusIndicator
        status="connected"
        lastEventAt={new Date(FIXED_NOW - 200_000)}
      />
    );
    const announcer = screen.getByTestId("live-status-sr-announcer");
    expect(announcer.textContent).toMatch(/idle/i);
  });

  it("hides decorative icons and visual labels from screen readers", () => {
    const { container } = render(
      <LiveStatusIndicator
        status="connected"
        lastEventAt={new Date(FIXED_NOW - 1_000)}
      />
    );
    const ariaHidden = container.querySelectorAll('[aria-hidden="true"]');
    // ping span + icon + label + age = at least 4 decorative nodes
    expect(ariaHidden.length).toBeGreaterThanOrEqual(4);
  });

  it("can suppress the live region when announce=false", () => {
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
    "has no axe-core accessibility violations when status=%s",
    async (status) => {
      const { container } = render(
        <LiveStatusIndicator
          status={status}
          lastEventAt={status === "connecting" ? null : new Date(FIXED_NOW - 2_000)}
        />
      );
      await expectNoA11yViolations(container);
    }
  );

  it("has no axe-core violations in stale (idle) state", async () => {
    const { container } = render(
      <LiveStatusIndicator
        status="connected"
        lastEventAt={new Date(FIXED_NOW - 300_000)}
      />
    );
    await expectNoA11yViolations(container);
  });
});
