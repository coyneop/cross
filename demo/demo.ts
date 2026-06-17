import {
  type Cell,
  Engine,
  type Puzzle,
  RenderType,
} from "../src/core/index.ts";

// 15×15 sample grid (every 4th square a block, just to see something)
const width = 15,
  height = 15;
const cells: Cell[] = Array.from({ length: width * height }, (_, i) =>
  i % 4 === 0
    ? { kind: "block", position: i }
    : { kind: "value", position: i, value: "W" },
);

const puzzle: Puzzle = { width, height, cells, gridIndex: [] };
const elem = document.getElementById("grid") as HTMLDivElement;

const engine = new Engine(elem, { puzzle });

const renderers = [
  { label: "HTML", type: RenderType.Html },
  { label: "Canvas", type: RenderType.Canvas },
] as const;

let active: RenderType = RenderType.Html;

const bar = document.createElement("div");
bar.style.cssText =
  "position:fixed;top:8px;left:8px;display:flex;gap:8px;z-index:10";

const buttons = renderers.map(({ label, type }) => {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.onclick = () => {
    active = type;
    engine.setRenderer(type);
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
