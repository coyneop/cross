import { CanvasRenderer } from "./canvas_renderer";
import { HtmlRenderer } from "./html_renderer";
import type { Renderer } from "./renderer";
import type { Theme } from "./theme";

export type Cell =
  | { kind: "block"; position: number }
  | {
      kind: "value";
      position: number;
      value: string;
      solution?: string;
      given?: boolean;
      circle?: boolean;
      shade?: string;
    };

export type Puzzle = {
  height: number;
  width: number;
  cells: Cell[];
  gridIndex: number[];
  selected?: number;
  highlighted?: number[];
  theme?: Theme;
};

export type PuzzleState = {
  puzzle: Puzzle;
};

export enum RenderType {
  Html,
  Svg,
  Canvas,
}

const DEFAULT_STATE = {
  puzzle: {
    height: 15,
    width: 15,
    cells: [],
    gridIndex: [],
  },
};

export class Engine {
  element: HTMLElement;
  resizeObserver: ResizeObserver;
  renderer: Renderer;
  state: PuzzleState;
  frameId: number | null = null;

  constructor(
    element: HTMLElement,
    state?: PuzzleState,
    type: RenderType = RenderType.Html,
  ) {
    this.element = element;
    switch (type) {
      case RenderType.Canvas:
        this.renderer = new CanvasRenderer(
          this.element,
          window.devicePixelRatio,
        );
        break;
      case RenderType.Html:
        this.renderer = new HtmlRenderer(this.element);
        break;
      case RenderType.Svg:
        this.renderer = new HtmlRenderer(this.element);
    }
    this.state = state || DEFAULT_STATE;
    this.buildNumbers();

    // setup resize event handling
    this.resizeObserver = new ResizeObserver(this.onResize);
    this.resizeObserver.observe(this.element);
    this.renderer.paint(this.state);
  }

  destroy = () => {
    this.resizeObserver.disconnect();
  };

  update = (state: PuzzleState) => {
    this.state = state;
    this.buildNumbers();
    this.renderer.paint(state);
  };

  onResize = (_: ResizeObserverEntry[]) => {
    if (this.frameId !== null) return;
    this.frameId = requestAnimationFrame(() => {
      this.frameId = null;
      this.renderer.resize();
      //this.renderer.paint(this.state);
    });
  };

  buildNumbers = () => {
    const blockAbove = (position: number): boolean => {
      return (
        position - this.state.puzzle.width < 0 ||
        this.state.puzzle.cells[position - this.state.puzzle.width]?.kind ===
          "block"
      );
    };

    const blockBehind = (position: number): boolean => {
      return (
        position % this.state.puzzle.width === 0 ||
        this.state.puzzle.cells[position - 1]?.kind === "block"
      );
    };

    this.state.puzzle.gridIndex = [];
    let count = 1;
    for (
      let i = 0;
      i < this.state.puzzle.width * this.state.puzzle.height;
      i++
    ) {
      if (
        this.state.puzzle.cells[i]?.kind !== "block" &&
        (blockAbove(i) || blockBehind(i))
      ) {
        this.state.puzzle.gridIndex[count - 1] = i;
        count++;
      }
    }
  };
}

// function debounce<T extends (...args: any[]) => any>(
//   fn: T,
//   delay: number,
// ): (...args: Parameters<T>) => void {
//   let timeout: ReturnType<typeof setTimeout> | undefined;

//   return (...args: Parameters<T>) => {
//     clearTimeout(timeout);
//     timeout = setTimeout(() => fn(...args), delay);
//   };
// }
