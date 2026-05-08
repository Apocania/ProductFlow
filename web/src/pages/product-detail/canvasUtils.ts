import type { CanvasPoint, CanvasRect } from "./types";

const PANE_PAN_BLOCKED_SELECTORS = [
  "[data-workflow-node-id]",
  "[data-node-action]",
  "[data-workflow-target-node-id]",
  "[data-canvas-control]",
  "button",
  "a",
  "input",
  "textarea",
  "select",
  "label",
  "[role='button']",
].join(",");

const CANVAS_WHEEL_ZOOM_BLOCKED_SELECTORS = [
  "[data-node-action]",
  "[data-workflow-target-node-id]",
  "[data-canvas-control]",
  "button",
  "a",
  "input",
  "textarea",
  "select",
  "label",
  "[role='button']",
].join(",");

export function buildEdgePath(start: CanvasPoint, end: CanvasPoint): string {
  const mid = Math.max(50, Math.abs(end.x - start.x) / 2);
  return `M ${start.x} ${start.y} C ${start.x + mid} ${start.y}, ${end.x - mid} ${end.y}, ${end.x} ${end.y}`;
}

export function buildCanvasRect(start: CanvasPoint, end: CanvasPoint): CanvasRect {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return {
    x,
    y,
    width: Math.max(start.x, end.x) - x,
    height: Math.max(start.y, end.y) - y,
  };
}

export function canvasRectsIntersect(a: CanvasRect, b: CanvasRect): boolean {
  return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
}

export function isPanePanBlockedTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) {
    return false;
  }
  return Boolean(target.closest(PANE_PAN_BLOCKED_SELECTORS));
}

export function isCanvasWheelZoomBlockedTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) {
    return false;
  }
  return Boolean(target.closest(CANVAS_WHEEL_ZOOM_BLOCKED_SELECTORS));
}
