/**
 * Tiny accessibility assertion helpers for unit tests.
 *
 * We intentionally avoid `axe-core` here: pulling it in cascades a `canvas`
 * native dep that breaks jsdom on this stack. Instead we run a focused set of
 * structural a11y checks that cover the rules we care about for status pills:
 *   • interactive/landmark-ish roles must have an accessible name
 *   • `aria-live` regions must have a sensible politeness setting
 *   • `aria-hidden` ancestors must not contain focusable descendants
 *   • images / svgs must either have alt/title or be aria-hidden
 *   • elements with `role="status"` must not be empty when aria-label missing
 */

export interface A11yViolation {
  rule: string;
  message: string;
  element: string;
}

const FOCUSABLE = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function describe(el: Element): string {
  const id = el.id ? `#${el.id}` : "";
  const cls = el.className && typeof el.className === "string"
    ? `.${el.className.split(/\s+/).slice(0, 2).join(".")}`
    : "";
  return `<${el.tagName.toLowerCase()}${id}${cls}>`;
}

function accessibleName(el: Element): string {
  const aria = el.getAttribute("aria-label");
  if (aria && aria.trim()) return aria.trim();
  const labelledby = el.getAttribute("aria-labelledby");
  if (labelledby) {
    const ref = el.ownerDocument?.getElementById(labelledby);
    if (ref?.textContent?.trim()) return ref.textContent.trim();
  }
  return el.textContent?.trim() ?? "";
}

export function checkAccessibility(root: HTMLElement): A11yViolation[] {
  const violations: A11yViolation[] = [];

  // 1. role="status" / role="alert" must convey *some* information.
  root.querySelectorAll('[role="status"], [role="alert"]').forEach((el) => {
    if (!accessibleName(el)) {
      violations.push({
        rule: "status-needs-name",
        message: `${el.getAttribute("role")} region has no accessible name or text content`,
        element: describe(el),
      });
    }
  });

  // 2. aria-live values must be valid.
  root.querySelectorAll("[aria-live]").forEach((el) => {
    const v = el.getAttribute("aria-live");
    if (v !== "polite" && v !== "assertive" && v !== "off") {
      violations.push({
        rule: "aria-live-valid",
        message: `aria-live="${v}" is not a valid value`,
        element: describe(el),
      });
    }
  });

  // 3. aria-hidden subtrees must not contain focusable elements.
  root.querySelectorAll('[aria-hidden="true"]').forEach((el) => {
    const focusable = el.querySelector(FOCUSABLE);
    if (focusable) {
      violations.push({
        rule: "aria-hidden-focus",
        message: "aria-hidden ancestor contains focusable element",
        element: describe(focusable),
      });
    }
  });

  // 4. Images and SVGs must have alt text OR be marked aria-hidden.
  root.querySelectorAll("img").forEach((img) => {
    if (
      img.getAttribute("aria-hidden") !== "true" &&
      img.getAttribute("alt") === null
    ) {
      violations.push({
        rule: "img-alt",
        message: "img element missing alt attribute",
        element: describe(img),
      });
    }
  });
  root.querySelectorAll("svg").forEach((svg) => {
    const hidden = svg.getAttribute("aria-hidden") === "true";
    const labelled = svg.getAttribute("aria-label") || svg.querySelector("title");
    const role = svg.getAttribute("role");
    // Decorative svgs need aria-hidden; meaningful svgs need a name + role="img".
    if (!hidden && !labelled) {
      violations.push({
        rule: "svg-name",
        message: "svg without aria-hidden must have aria-label or <title>",
        element: describe(svg),
      });
    }
    if (!hidden && labelled && role !== "img") {
      violations.push({
        rule: "svg-role",
        message: "Named svg should have role=\"img\"",
        element: describe(svg),
      });
    }
  });

  // 5. Buttons must have an accessible name.
  root.querySelectorAll("button").forEach((btn) => {
    if (!accessibleName(btn) && !btn.querySelector("[aria-label]")) {
      violations.push({
        rule: "button-name",
        message: "button has no accessible name",
        element: describe(btn),
      });
    }
  });

  return violations;
}

export function expectNoA11yViolations(root: HTMLElement): void {
  const violations = checkAccessibility(root);
  if (violations.length > 0) {
    const summary = violations
      .map((v) => `  • [${v.rule}] ${v.message} ${v.element}`)
      .join("\n");
    throw new Error(`Accessibility violations found:\n${summary}`);
  }
}
