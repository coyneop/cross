import { describe, expect, test } from "bun:test";
import { cancelable, el, svgEl } from "./utils";

describe("cancelable", () => {
  test("spreads the wrapped data onto the result", () => {
    const ev = cancelable({ position: 5, letter: "A" });
    expect(ev.position).toBe(5);
    expect(ev.letter).toBe("A");
  });

  test("is not prevented by default", () => {
    expect(cancelable({}).defaultPrevented).toBe(false);
  });

  test("preventDefault() flips defaultPrevented to true", () => {
    const ev = cancelable({});
    ev.preventDefault();
    expect(ev.defaultPrevented).toBe(true);
  });

  test("preventDefault() is idempotent", () => {
    const ev = cancelable({});
    ev.preventDefault();
    ev.preventDefault();
    expect(ev.defaultPrevented).toBe(true);
  });

  test("each wrapper holds independent state", () => {
    const a = cancelable({});
    const b = cancelable({});
    a.preventDefault();
    expect(a.defaultPrevented).toBe(true);
    expect(b.defaultPrevented).toBe(false);
  });
});

describe("el", () => {
  test("creates an element of the given tag", () => {
    expect(el("div").tagName).toBe("DIV");
  });

  test("assigns plain properties", () => {
    const node = el("div", { className: "cell", id: "x" });
    expect(node.className).toBe("cell");
    expect(node.id).toBe("x");
  });

  test("applies style properties", () => {
    const node = el("div", { style: { color: "red" } });
    expect(node.style.color).toBe("red");
  });

  test("sets dataset as data-* attributes", () => {
    const node = el("div", { dataset: { position: "5" } });
    expect(node.dataset.position).toBe("5");
    expect(node.getAttribute("data-position")).toBe("5");
  });

  test("appends string and node children", () => {
    const child = el("span");
    const node = el("div", {}, "hi", child);
    expect(node.textContent).toContain("hi");
    expect(node.contains(child)).toBe(true);
  });
});

describe("svgEl", () => {
  test("creates the element in the SVG namespace", () => {
    const rect = svgEl("rect");
    expect(rect.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(rect.localName).toBe("rect");
  });

  test("sets attributes, coercing numbers to strings", () => {
    const rect = svgEl("rect", { x: 1, width: 2, class: "cell" });
    expect(rect.getAttribute("x")).toBe("1");
    expect(rect.getAttribute("width")).toBe("2");
    expect(rect.getAttribute("class")).toBe("cell");
  });
});
