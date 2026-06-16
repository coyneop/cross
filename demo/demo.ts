import { type Cell, Engine, type Puzzle } from "../src/core/index.ts";

// 15×15 sample grid (every 4th square a block, just to see something)
const width = 15,
  height = 15;
const cells: Cell[] = Array.from({ length: width * height }, (_, i) =>
  i % 4 === 0
    ? { kind: "block", position: i } // ← needs string-union (crit #4)
    : { kind: "value", position: i, value: "W" },
);

const puzzle: Puzzle = { width, height, cells, gridIndex: [] };
const elem = document.getElementById("grid") as HTMLDivElement;

const _engine = new Engine(elem, { puzzle });
