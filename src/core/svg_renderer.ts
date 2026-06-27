import type { Puzzle } from "./engine.ts";
import { gridHash, rowcol } from "./grid.ts";
import type { Renderer } from "./renderer.ts";
import { DEFAULT_LIGHT_THEME, type Theme } from "./theme.ts";
import { svgEl } from "./utils.ts";

const SVG_CSS = `
  .cross-svg {
    user-select: none;
    -webkit-user-select: none;
  }
  .cross-svg .cell  { fill: var(--cross-bg); }
  .cross-svg .block { fill: var(--cross-border); }
  .cross-svg .lines { stroke: var(--cross-line); stroke-width: var(--cross-line-w); vector-effect: non-scaling-stroke; fill: none; }
  .cross-svg .select { fill: var(--cross-select); }
  .cross-svg .highlight { fill: var(--cross-highlight); }
  .cross-svg .num {
    fill: var(--cross-text-2);
    font-family: arial, sans-serif;
    font-size: 0.3px;
  }
  .cross-svg .letter {
    fill: var(--cross-text);
    font-family: arial, sans-serif;
    font-size: 0.6px;
    text-anchor: bottom;
  }
  .cross-svg .border {
    fill: none;
    stroke: var(--cross-border);
    stroke-width: 0.15;
  }
  .cross-svg .num,
  .cross-svg .letter,
  .cross-svg .lines,
  .cross-svg .border,
  .cross-svg .select,
  .cross-svg .highlight { pointer-events: none; }
  .cross-svg .letter.on-highlight { fill: var(--cross-hl-text); }
  .cross-svg .num.on-highlight    { fill: var(--cross-hl-text-2); }
  .cross-svg .letter.on-select    { fill: var(--cross-select-text); }
  .cross-svg .num.on-select       { fill: var(--cross-select-text-2); }
`;
const BORDER_W = 0.1;

export class SvgRenderer implements Renderer {
  #element: HTMLElement;
  #svg: SVGElement;
  #cellsG: SVGGElement;
  #textG: SVGGElement;
  #linesPath: SVGPathElement;
  #borderRect: SVGRectElement;
  #highlightsG: SVGGElement;
  #selectRect: SVGRectElement;
  #highlightRect: SVGRectElement;
  #puzzleHash?: string;
  #letters: SVGTextElement[] = [];
  #numbers: SVGTextElement[] = [];
  #selectedText: Element[] = [];
  #highlightedText: Element[] = [];

  constructor(element: HTMLElement) {
    this.#element = element;
    this.#svg = svgEl("svg", {
      class: "cross-svg",
      width: "100%",
      height: "100%",
    });

    const style = svgEl("style");
    style.textContent = SVG_CSS;
    this.#svg.append(style);

    this.#cellsG = svgEl("g");
    this.#textG = svgEl("g");
    this.#linesPath = svgEl("path", { class: "lines" });
    this.#highlightsG = svgEl("g");
    this.#borderRect = svgEl("rect", {
      class: "border",
      x: String(-BORDER_W / 2),
      y: String(-BORDER_W / 2),
    });
    this.#selectRect = svgEl("rect", {
      class: "select",
      width: 1,
      height: 1,
      visibility: "hidden",
    });
    this.#highlightRect = svgEl("rect", {
      class: "highlight",
      width: 1,
      height: 1,
      visibility: "hidden",
    });
    this.#highlightsG.append(this.#highlightRect, this.#selectRect);
    this.#svg.append(
      this.#cellsG,
      this.#highlightsG,
      this.#textG,
      this.#linesPath,
      this.#borderRect,
    );
    this.#element.append(this.#svg);
  }

  hitTest(e: PointerEvent): number | null {
    const target = e.target as Element | null;
    const cell = target?.closest<SVGElement>("[data-position]");
    if (!cell) return null;
    return Number(cell.dataset.position);
  }

  resize() {}

  #build(state: Puzzle) {
    const { width: cols, height: rows } = state;
    const key = gridHash(state.cells, cols, rows);
    if (this.#puzzleHash && key === this.#puzzleHash) return;
    this.#puzzleHash = key;

    this.#cellsG.replaceChildren();
    this.#textG.replaceChildren();
    this.#svg.setAttribute(
      "viewBox",
      `${-BORDER_W} ${-BORDER_W} ${cols + 2 * BORDER_W} ${rows + 2 * BORDER_W}`,
    );

    let g = 0;
    for (const [i, cell] of state.cells.entries()) {
      const { row, col } = rowcol(i, cols);

      // immutable cell rect — also the hit-test target
      this.#cellsG.append(
        svgEl("rect", {
          x: col,
          y: row,
          width: 1,
          height: 1,
          class: cell.kind === "block" ? "block" : "cell",
          "data-position": i,
        }),
      );

      // clue number (static) — drawn once
      if (state.gridIndex[g] === i) {
        const num = svgEl("text", {
          x: col + 0.08,
          y: row + 0.3,
          class: "num",
        });
        num.textContent = String(g + 1);
        this.#numbers[i] = num;
        this.#textG.append(num);
        g++;
      }

      // letter (mutable) — keep the reference for updates
      if (cell.kind === "value") {
        const t = svgEl("text", {
          x: col + 0.5,
          y: row + 0.82,
          class: "letter",
          "text-anchor": "middle",
        });
        t.textContent = cell.value;
        this.#letters[i] = t;
        this.#textG.append(t);
      }
    }

    this.#linesPath.setAttribute("d", gridPath(state.width, state.height));
    this.#borderRect.setAttribute("width", String(state.width + BORDER_W));
    this.#borderRect.setAttribute("height", String(state.height + BORDER_W));
  }

  #applyStateClass(
    prev: Element[],
    positions: number[],
    cls: string,
  ): Element[] {
    for (const node of prev) node.classList.remove(cls);
    const next: Element[] = [];
    for (const pos of positions) {
      const letter = this.#letters[pos];
      const num = this.#numbers[pos];
      if (letter) {
        letter.classList.add(cls);
        next.push(letter);
      }
      if (num) {
        num.classList.add(cls);
        next.push(num);
      }
    }
    return next;
  }

  #applyTheme(t: Theme) {
    const s = this.#svg.style;
    s.setProperty("--cross-bg", t.background);
    s.setProperty("--cross-border", t.border);
    s.setProperty("--cross-line", t.borderSecondary);
    s.setProperty("--cross-highlight", t.highlight);
    s.setProperty("--cross-select", t.select);
    s.setProperty("--cross-text", t.text);
    s.setProperty("--cross-text-2", t.textSecondary);
    // empty-string fields fall back (see gotcha #1)
    s.setProperty("--cross-select-text", t.selectText || t.text);
    s.setProperty(
      "--cross-select-text-2",
      t.selectTextSecondary || t.textSecondary,
    );
    s.setProperty("--cross-hl-text", t.highlightText || t.text);
    s.setProperty(
      "--cross-hl-text-2",
      t.highlightTextSecondary || t.textSecondary,
    );
    // widths (see gotcha #2)
    s.setProperty("--cross-line-w", String(t.lineWidth));
    s.setProperty("--cross-border-w", String(t.borderWidth));
  }

  paint(state: Puzzle) {
    this.#applyTheme({ ...DEFAULT_LIGHT_THEME, ...state.theme });
    this.#build(state);

    if (state.selected) {
      const { row, col } = rowcol(state.selected, state.width);
      this.#selectRect.setAttribute("x", String(col));
      this.#selectRect.setAttribute("y", String(row));
      this.#selectRect.setAttribute("visibility", "visible");

      // TODO: also add selected class on number and letter at this cell location
      // must remove any selected classes on other cells too
    } else {
      this.#selectRect.setAttribute("visibility", "hidden");
    }

    if (state.selected !== null && state.highlighted?.length) {
      const first = state.highlighted?.[0];
      const last = state.highlighted?.at(-1);
      if (first != null && last != null) {
        const a = rowcol(first, state.width);
        const b = rowcol(last, state.width);
        this.#highlightRect.setAttribute("x", String(Math.min(a.col, b.col)));
        this.#highlightRect.setAttribute("y", String(Math.min(a.row, b.row)));
        this.#highlightRect.setAttribute(
          "width",
          String(Math.abs(b.col - a.col) + 1),
        );
        this.#highlightRect.setAttribute(
          "height",
          String(Math.abs(b.row - a.row) + 1),
        );
        this.#highlightRect.setAttribute("visibility", "visible");
      }

      // TODO: also add highlighted class on number and letter at this cell location
      // must remove any highlighted classes on other cells too
    } else {
      this.#highlightRect.setAttribute("visibility", "hidden");
    }

    this.#selectedText = this.#applyStateClass(
      this.#selectedText,
      state.selected != null ? [state.selected] : [],
      "on-select",
    );
    this.#highlightedText = this.#applyStateClass(
      this.#highlightedText,
      state.highlighted ?? [],
      "on-highlight",
    );
  }

  destroy() {
    this.#svg.remove();
  }
}

function gridPath(cols: number, rows: number): string {
  let d = "";
  for (let x = 1; x < cols; x++) d += `M${x} 0 V${rows} `;
  for (let y = 1; y < rows; y++) d += `M0 ${y} H${cols} `;
  return d.trim();
}
