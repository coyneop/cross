import { type CrossElement, defineCross } from "../src/component";
import type { Cell } from "../src/core/grid.ts";
import { type Puzzle, RenderType } from "../src/core/index.ts";

defineCross();

// 15×15 sample grid (every 4th square a block, just to see something)
const width = 15,
  height = 15;
const cells: Cell[] = Array.from({ length: width * height }, (_, i) =>
  i % 4 === 0
    ? { kind: "block", position: i }
    : { kind: "value", position: i, value: "W" },
);
const puzzle: Puzzle = { width, height, cells, gridIndex: [] };

const board = document.getElementById("grid") as CrossElement;

board.puzzle = puzzle;

// Engine events surface as DOM CustomEvents; the payload is on `detail`.
board.addEventListener("cross-select", (e) =>
  console.log((e as CustomEvent).detail),
);
board.addEventListener("cross-keydown", (e) =>
  console.log((e as CustomEvent).detail),
);

// renderer is a primitive, so it rides on an ATTRIBUTE — toggling it swaps renderers
const renderers = [
  { label: "HTML", type: RenderType.Html },
  { label: "Canvas", type: RenderType.Canvas },
  { label: "SVG", type: RenderType.Svg },
] as const;

let active: RenderType = RenderType.Html;

const bar = document.createElement("div");
bar.style.cssText =
  "position:fixed;top:8px;left:8px;display:flex;gap:8px;z-index:10";

const buttons = renderers.map(({ label, type }) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;
  btn.onclick = () => {
    active = type;
    board.setAttribute("renderer", type);
    sync();
  };
  bar.append(btn);
  return { btn, type };
});

function sync() {
  for (const { btn, type } of buttons) {
    btn.style.fontWeight = type === active ? "bold" : "normal";
  }
}

sync();
document.body.append(bar);
