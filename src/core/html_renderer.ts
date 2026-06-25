import type { Puzzle } from "./engine";
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

  paint(state: Puzzle) {
    const theme = state.theme || DEFAULT_LIGHT_THEME;

    const gridFragment = document.createDocumentFragment();

    this.grid.style.border = `min(1cqw, 1cqh) solid ${theme.border}`;
    this.grid.innerHTML = "";
    this.cells = [];

    let gCount = 0;
    for (const [i, cell] of state.cells.entries()) {
      const cellStyle: Partial<CSSStyleDeclaration> = {
        backgroundColor: theme.background,
        borderTop: i < state.width ? undefined : `1px solid`,
        borderLeft: i % state.width === 0 ? undefined : `1px solid`,
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
      const isHighlighted = state.highlighted?.includes(i) ?? false;
      const isSelected = i === state.selected;

      const stateStyle: Partial<CSSStyleDeclaration> = {
        ...(isHighlighted
          ? { backgroundColor: theme.highlight, color: theme.highlightText }
          : {}),
        ...(isSelected
          ? { backgroundColor: theme.select, color: theme.selectText }
          : {}),
      };
      if (cell.kind === "block") {
        const cellElem = el("div", {
          className: "cross-cell cross-block",
          style: {
            ...cellStyle,
            backgroundColor: theme.border,
            ...stateStyle,
          },
          dataset: { position: i.toString() },
        });
        this.cells.push(cellElem);
        this.grid.append(cellElem);
      } else if (state.gridIndex[gCount] === i) {
        const cellElem = el(
          "div",
          {
            className: "cross-cell",
            style: { ...cellStyle, ...stateStyle },
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
                color: isSelected
                  ? theme.selectTextSecondary
                  : theme.textSecondary,
              },
            },
            (gCount + 1).toString(),
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
            style: { ...cellStyle, ...stateStyle },
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
