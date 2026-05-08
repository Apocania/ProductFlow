import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  buildEdgePath,
  buildCanvasRect,
  canvasRectsIntersect,
  isCanvasWheelZoomBlockedTarget,
  isPanePanBlockedTarget,
} from "./canvasUtils";

class MockHTMLElement extends EventTarget {
  constructor(private readonly selectorToMatch: string | null) {
    super();
  }

  closest(selectors: string): MockHTMLElement | null {
    if (!this.selectorToMatch) {
      return null;
    }
    return selectors.includes(this.selectorToMatch) ? this : null;
  }
}

type GlobalWithHTMLElement = typeof globalThis & {
  HTMLElement?: typeof HTMLElement;
};

const globalWithHTMLElement = globalThis as GlobalWithHTMLElement;
const originalHTMLElement = globalWithHTMLElement.HTMLElement;

describe("canvas utils", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "HTMLElement", {
      value: MockHTMLElement as unknown as typeof HTMLElement,
      configurable: true,
    });
  });

  afterEach(() => {
    if (originalHTMLElement) {
      Object.defineProperty(globalThis, "HTMLElement", {
        value: originalHTMLElement,
        configurable: true,
      });
      return;
    }
    Reflect.deleteProperty(globalThis, "HTMLElement");
  });

  it("builds cubic edge paths with the minimum midpoint distance", () => {
    expect(buildEdgePath({ x: 10, y: 20 }, { x: 40, y: 80 })).toBe(
      "M 10 20 C 60 20, -10 80, 40 80",
    );
  });

  it("builds cubic edge paths with half horizontal distance when wider than the minimum", () => {
    expect(buildEdgePath({ x: 0, y: 5 }, { x: 180, y: 25 })).toBe(
      "M 0 5 C 90 5, 90 25, 180 25",
    );
  });

  it("normalizes canvas rectangles from any drag direction", () => {
    expect(buildCanvasRect({ x: 80, y: 100 }, { x: 20, y: 40 })).toEqual({
      x: 20,
      y: 40,
      width: 60,
      height: 60,
    });
  });

  it("detects canvas rectangle intersection including touching edges", () => {
    expect(
      canvasRectsIntersect(
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 100, y: 20, width: 50, height: 50 },
      ),
    ).toBe(true);
    expect(
      canvasRectsIntersect(
        { x: 0, y: 0, width: 80, height: 80 },
        { x: 90, y: 20, width: 50, height: 50 },
      ),
    ).toBe(false);
  });

  it("blocks pane panning on nodes and shared canvas controls", () => {
    expect(isPanePanBlockedTarget(new MockHTMLElement("[data-workflow-node-id]"))).toBe(true);
    expect(isPanePanBlockedTarget(new MockHTMLElement("[data-node-action]"))).toBe(true);
    expect(isPanePanBlockedTarget(new MockHTMLElement(null))).toBe(false);
    expect(isPanePanBlockedTarget(new EventTarget())).toBe(false);
  });

  it("does not block wheel zoom on the node shell but blocks node actions", () => {
    expect(isCanvasWheelZoomBlockedTarget(new MockHTMLElement("[data-workflow-node-id]"))).toBe(false);
    expect(isCanvasWheelZoomBlockedTarget(new MockHTMLElement("[data-node-action]"))).toBe(true);
  });
});
