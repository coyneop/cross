import { useState } from "react";
import { createRoot } from "react-dom/client";
import { RenderType } from "../src/core";
import type { Cell } from "../src/core/grid";
import { Crossword } from "../src/react"; // import source, not dist, while developing

const width = 15,
  height = 15;
const cells: Cell[] = Array.from({ length: width * height }, (_, i) =>
  i % 4 === 0
    ? { kind: "block", position: i }
    : { kind: "value", position: i, value: "W" },
);
const state = { width, height, cells: cells, gridIndex: [] };

const renderers = [
  { label: "HTML", type: RenderType.Html },
  { label: "Canvas", type: RenderType.Canvas },
] as const;

function App() {
  const [active, setActive] = useState<RenderType>(RenderType.Html);
  return (
    <div style={{ height: "100%" }}>
      <div
        style={{
          position: "fixed",
          top: 8,
          left: 8,
          display: "flex",
          gap: 8,
          zIndex: 10,
        }}
      >
        {renderers.map(({ label, type }) => (
          <button
            key={label}
            type="button"
            onClick={() => setActive(type)}
            style={{ fontWeight: active === type ? "bold" : "normal" }}
          >
            {label}
          </button>
        ))}
      </div>
      <Crossword state={state} renderer={active} />
    </div>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("#root element not found");
createRoot(root).render(<App />);
