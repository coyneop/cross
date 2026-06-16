import { createRoot } from "react-dom/client";
import { type Cell, RenderType } from "../src/core";
import { Crossword } from "../src/react"; // import source, not dist, while developing

const width = 15,
  height = 15;
const cells: Cell[] = Array.from({ length: width * height }, (_, i) =>
  i % 4 === 0
    ? { kind: "block", position: i } // ← needs string-union (crit #4)
    : { kind: "value", position: i, value: "W" },
);
const state = { puzzle: { width, height, cells: cells, gridIndex: [] } };

const root = document.getElementById("root");
if (!root) throw new Error("#root element not found");
createRoot(root).render(<Crossword state={state} renderer={RenderType.Html} />);
