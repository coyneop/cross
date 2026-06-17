import type { PuzzleState } from "./engine";
import type { Renderer } from "./renderer";
import { DEFAULT_LIGHT_THEME } from "./theme";
import { el } from "./utils";

export class HtmlRenderer implements Renderer {
  element: HTMLElement;
  container: HTMLDivElement;
  grid: HTMLDivElement;
  cells: HTMLDivElement[];

  constructor(element: HTMLElement) {
    this.element = element;
    this.container = el("div", {
      className: "cross-content",
      style: {
        containerType: "size",
        display: "flex",
        height: "100%",
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
      },
    });
    this.grid = el("div", {
      className: "cross-table",
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(15, minmax(0, 1fr))",
        width: "min(100cqw, 100cqh)",
        aspectRatio: "1 / 1",
        boxSizing: "border-box",
        fontFamily: "arial, sans-serif",
        userSelect: "none",
      },
    });
    this.cells = [];
    this.element.append(this.container);
  }

  resize() {}
  destroy() {
    this.container.remove();
  }

  hitTest(e: PointerEvent) {
    const target = e.target as Element | null;
    const cell = target?.closest<HTMLElement>("[data-position]");
    if (!cell) return null;
    return Number(cell.dataset.position);
  }

  paint(state: PuzzleState) {
    const theme = state.puzzle.theme || DEFAULT_LIGHT_THEME;

    const gridFragment = document.createDocumentFragment();

    this.grid.style.border = `min(1cqw, 1cqh) solid ${theme.border}`;
    this.grid.innerHTML = "";
    this.cells = [];

    let gCount = 0;
    for (const [i, cell] of state.puzzle.cells.entries()) {
      const cellStyle: Partial<CSSStyleDeclaration> = {
        backgroundColor: theme.background,
        borderTop: i < state.puzzle.width ? undefined : `1px solid`,
        borderLeft: i % state.puzzle.width === 0 ? undefined : `1px solid`,
        borderColor: theme.borderSecondary,
        boxSizing: "border-box",
        minWidth: "0",
        minHeight: "0",
        position: "relative",
        display: "flex",
        justifyContent: "flex-end",
        flexDirection: "column",
        alignItems: "center",
        color: theme.text,
      };
      if (cell.kind === "block") {
        const cellElem = el("div", {
          className: "cross-cell cross-block",
          style: {
            ...cellStyle,
            backgroundColor: theme.border,
          },
          dataset: { position: i.toString() },
        });
        this.cells.push(cellElem);
        this.grid.append(cellElem);
      } else if (state.puzzle.gridIndex[gCount] === i) {
        const cellElem = el(
          "div",
          {
            className: "cross-cell",
            style: cellStyle,
            dataset: { position: i.toString() },
          },
          el(
            "span",
            {
              className: "num",
              style: {
                fontSize: "calc(min(100cqw, 100cqh) / 15 * 0.3)",
                position: "absolute",
                top: "0",
                left: "5%",
                color: theme.textSecondary,
              },
            },
            gCount.toString(),
          ),
          el(
            "span",
            {
              className: "letter",
              style: { fontSize: "calc(min(100cqw, 100cqh) / 15 * 0.6)" },
            },
            cell.value,
          ),
        );
        gCount++;
        this.cells.push(cellElem);
        this.grid.append(cellElem);
      } else {
        const cellElem = el(
          "div",
          {
            className: "cross-cell",
            style: cellStyle,
            dataset: { position: i.toString() },
          },
          el(
            "span",
            {
              className: "letter",
              style: { fontSize: "calc(min(100cqw, 100cqh) / 15 * 0.6)" },
            },
            cell.value,
          ),
        );
        this.cells.push(cellElem);
        this.grid.append(cellElem);
      }
    }

    gridFragment.append(this.grid);
    this.container.append(gridFragment);
  }
}
