import type { PuzzleState } from "./engine";
import type { Renderer } from "./renderer";
import { DEFAULT_LIGHT_THEME } from "./theme";

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
      },
    });
    this.cells = [];
    this.element.append(this.container);
  }

  resize() {}
  destroy() {}

  paint(state: PuzzleState) {
    const theme = state.puzzle.theme || DEFAULT_LIGHT_THEME;

    const gridFragment = document.createDocumentFragment();

    this.grid.style.borderRight = `1px solid ${theme.border}`;
    this.grid.style.borderBottom = `1px solid ${theme.border}`;

    let gCount = 0;
    for (const [i, cell] of state.puzzle.cells.entries()) {
      const cellStyle: Partial<CSSStyleDeclaration> = {
        backgroundColor: theme.background,
        borderTop: `1px solid ${theme.border}`,
        borderLeft: `1px solid ${theme.border}`,
        boxSizing: "border-box",
        minWidth: "0",
        minHeight: "0",
        position: "relative",
        display: "flex",
        justifyContent: "flex-end",
        flexDirection: "column",
        alignItems: "center",
      };
      if (cell.kind === "block") {
        const cellElem = el("div", {
          className: "cross-cell cross-block",
          style: {
            ...cellStyle,
            backgroundColor: theme.border,
          },
        });
        this.cells.push(cellElem);
        this.grid.append(cellElem);
      } else if (state.puzzle.gridIndex[gCount] === i) {
        const cellElem = el(
          "div",
          {
            className: "cross-cell",
            style: cellStyle,
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

type ElProps<K extends keyof HTMLElementTagNameMap> = Partial<
  Omit<HTMLElementTagNameMap[K], "style">
> & {
  style?: Partial<CSSStyleDeclaration>;
  dataset?: Record<string, string>;
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElProps<K> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const { style, dataset, ...rest } = props;
  const node = document.createElement(tag);
  Object.assign(node, rest);
  if (style) Object.assign(node.style, style);
  if (dataset) Object.assign(node.dataset, dataset);
  node.append(...children);
  return node;
}
