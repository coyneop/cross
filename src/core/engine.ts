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

type Modifiers = { shift: boolean; ctrl: boolean; alt: boolean; meta: boolean };

type EngineEvents = {
  select: { position: number; row: number; col: number; modifiers: Modifiers };
  navigate: { direction: "up" | "down" | "left" | "right" };
  input: { key: string };
  erase: { backward: boolean };
};

type Handler<T> = (payload: T) => void;

class Emitter<E extends Record<string, unknown>> {
  #handlers: { [K in keyof E]?: Set<Handler<E[K]>> } = {};

  on<K extends keyof E>(type: K, cb: Handler<E[K]>): () => void {
    this.#handlers[type] ??= new Set();
    this.#handlers[type]?.add(cb);
    return () => this.#handlers[type]?.delete(cb); // unsubscribe
  }

  protected emit<K extends keyof E>(type: K, payload: E[K]): void {
    this.#handlers[type]?.forEach((cb) => {
      cb(payload);
    });
  }
}

export class Engine extends Emitter<EngineEvents> {
  element: HTMLElement;
  resizeObserver: ResizeObserver;
  renderer!: Renderer;
  state: PuzzleState;
  frameId: number | null = null;

  constructor(
    element: HTMLElement,
    state?: PuzzleState,
    type: RenderType = RenderType.Html,
  ) {
    super();
    this.element = element;
    this.renderer = this.buildRenderer(type);
    this.state = state || DEFAULT_STATE;
    this.buildNumbers();

    if (this.element.tabIndex < 0) this.element.tabIndex = 0; // make host focusable
    this.element.addEventListener("pointerdown", this.onPointerDown);
    this.element.addEventListener("keydown", this.onKeyDown);

    // setup resize event handling
    this.resizeObserver = new ResizeObserver(this.onResize);
    this.resizeObserver.observe(this.element);
    this.renderer.resize(); // size the buffer to the container before the first paint
    this.setState(this.state);
  }

  destroy = () => {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    this.element.removeEventListener("pointerdown", this.onPointerDown);
    this.element.removeEventListener("keydown", this.onKeyDown);
    this.renderer.destroy();
  };

  setState = (state: PuzzleState) => {
    this.state = state;
    this.buildNumbers();
    this.renderer.paint(state);
  };

  setRenderer = (type: RenderType) => {
    if (this.renderer) this.renderer.destroy();
    this.renderer = this.buildRenderer(type);
    this.renderer.resize();
    this.renderer.paint(this.state);
  };

  private buildRenderer = (type: RenderType): Renderer => {
    switch (type) {
      case RenderType.Canvas:
        return new CanvasRenderer(this.element, window.devicePixelRatio);
      case RenderType.Html:
        return new HtmlRenderer(this.element);
      case RenderType.Svg:
        return new HtmlRenderer(this.element);
    }
  };

  onResize = (_: ResizeObserverEntry[]) => {
    if (this.frameId !== null) return;
    this.frameId = requestAnimationFrame(() => {
      this.frameId = null;
      this.renderer.resize();
      this.renderer.paint(this.state);
    });
  };

  private readModifiers = (e: MouseEvent | KeyboardEvent): Modifiers => ({
    shift: e.shiftKey,
    ctrl: e.ctrlKey,
    alt: e.altKey,
    meta: e.metaKey,
  });

  onPointerDown = (e: PointerEvent) => {
    const position = this.renderer.hitTest(e);
    if (position == null) return; // clicked the margin/border
    const { width } = this.state.puzzle;
    this.emit("select", {
      position,
      row: Math.floor(position / width),
      col: position % width,
      modifiers: this.readModifiers(e),
    });
  };

  onKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        return this.emit("navigate", { direction: "up" });
      case "ArrowDown":
        e.preventDefault();
        return this.emit("navigate", { direction: "down" });
      case "ArrowLeft":
        e.preventDefault();
        return this.emit("navigate", { direction: "left" });
      case "ArrowRight":
        e.preventDefault();
        return this.emit("navigate", { direction: "right" });
      case "Backspace":
        e.preventDefault();
        return this.emit("erase", { backward: true });
      case "Delete":
        e.preventDefault();
        return this.emit("erase", { backward: false });
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      this.emit("input", { key: e.key });
    }
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
