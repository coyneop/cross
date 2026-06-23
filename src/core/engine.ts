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
  selectedDirection?: Direction;
  highlighted?: number[];
  theme?: Theme;
  mode?: PuzzleMode;
};

export enum Direction {
  Across = "across",
  Down = "down",
}
export enum PuzzleMode {
  Solve = "solve",
  Build = "build",
}

export enum RenderType {
  Html,
  Svg,
  Canvas,
}

const DEFAULT_STATE = {
  height: 15,
  width: 15,
  cells: [],
  gridIndex: [],
  selectedDirection: Direction.Across,
  mode: PuzzleMode.Solve,
};

type EngineEvents = {
  select: { position: number; row: number; col: number };
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
  state: Puzzle;
  frameId: number | null = null;

  constructor(
    element: HTMLElement,
    state?: Puzzle,
    type: RenderType = RenderType.Html,
  ) {
    super();
    this.element = element;
    this.renderer = this.buildRenderer(type);
    this.state = { ...DEFAULT_STATE, ...state };
    console.log(state);
    console.log(DEFAULT_STATE);
    console.log("intitial state", this.state);
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

  setState = (state: Puzzle) => {
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

  onPointerDown = (e: PointerEvent) => {
    const position = this.renderer.hitTest(e);
    if (position == null) return;
    this.onSelect(position);
  };

  onSelect = (position: number) => {
    const { width, selectedDirection, selected } = this.state;
    const direction: Direction | undefined =
      selected === position
        ? selectedDirection === Direction.Across
          ? Direction.Down
          : Direction.Across
        : selectedDirection;
    const ev = cancelable({
      position,
      row: Math.floor(position / width),
      col: position % width,
      direction: direction,
    });
    this.emit("select", ev);
    if (!ev.defaultPrevented) this.applySelection(position, direction);
  };

  applySelection = (position: number, direction?: Direction) => {
    this.state.selected = position;
    this.state.selectedDirection = direction;
    this.buildHighlights();
    this.renderer.paint(this.state);
  };

  onKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        if (typeof this.state.selected === "undefined") return;
        if (this.state.selectedDirection === Direction.Across) {
          return this.onSelect(this.state.selected);
        } else if (this.state.selected - this.state.width >= 0) {
          return this.onSelect(this.state.selected - this.state.width);
        }
        return;
      case "ArrowDown":
        e.preventDefault();
        if (typeof this.state.selected === "undefined") return;
        if (this.state.selectedDirection === Direction.Across) {
          return this.onSelect(this.state.selected);
        } else if (
          this.state.selected + this.state.width <=
          this.state.width * this.state.height
        ) {
          return this.onSelect(this.state.selected + this.state.width);
        }
        return;
      case "ArrowLeft":
        e.preventDefault();
        if (typeof this.state.selected === "undefined") return;
        if (this.state.selectedDirection === Direction.Down) {
          this.onSelect(this.state.selected);
        } else if (this.state.selected % this.state.width !== 0) {
          this.onSelect(this.state.selected - 1);
        }
        return;
      case "ArrowRight":
        e.preventDefault();
        if (typeof this.state.selected === "undefined") return;
        if (this.state.selectedDirection === Direction.Down) {
          this.onSelect(this.state.selected);
        } else if (
          this.state.selected % this.state.width !==
          this.state.width - 1
        ) {
          this.onSelect(this.state.selected + 1);
        }
        return;
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
        position - this.state.width < 0 ||
        this.state.cells[position - this.state.width]?.kind === "block"
      );
    };

    const blockBehind = (position: number): boolean => {
      return (
        position % this.state.width === 0 ||
        this.state.cells[position - 1]?.kind === "block"
      );
    };

    this.state.gridIndex = [];
    let count = 1;
    for (let i = 0; i < this.state.width * this.state.height; i++) {
      if (
        this.state.cells[i]?.kind !== "block" &&
        (blockAbove(i) || blockBehind(i))
      ) {
        this.state.gridIndex[count - 1] = i;
        count++;
      }
    }
  };

  buildHighlights = () => {
    // no highlights if nothing is selected
    if (typeof this.state.selected === "undefined") return;

    const highlightForward = (newGridHighlights: number[]) => {
      if (typeof this.state.selected === "undefined") return newGridHighlights;
      let position = this.state.selected;
      // continue moving forward until you hit the right edge or a block in front of you
      while (this.state.cells[position]?.kind !== "block") {
        newGridHighlights.push(position);
        if ((position + 1) % this.state.width === 0) {
          break;
        }
        position++;
      }
      return newGridHighlights;
    };

    const highlightBackward = (newGridHighlights: number[]) => {
      if (typeof this.state.selected === "undefined") return newGridHighlights;
      let position = this.state.selected;
      // continue moving backward until you hit the left edge or a block in front of you
      while (this.state.cells[position]?.kind !== "block") {
        newGridHighlights.push(position);
        if (
          position - 1 < 0 ||
          (position - 1) % this.state.width === this.state.width - 1
        ) {
          break;
        }
        position--;
      }
      return newGridHighlights;
    };

    const highlightUp = (newGridHighlights: number[]) => {
      if (typeof this.state.selected === "undefined") return newGridHighlights;

      let position = this.state.selected;
      // continue moving up until you hit the top edge or a block in above you
      while (this.state.cells[position]?.kind !== "block") {
        newGridHighlights.push(position);
        if (position - this.state.width < 0) {
          break;
        }
        position -= this.state.width;
      }
      return newGridHighlights;
    };

    const highlightDown = (newGridHighlights: number[]) => {
      if (typeof this.state.selected === "undefined") return newGridHighlights;

      let position = this.state.selected;
      // continue moving down until you hit the bottom edge or a block below you
      while (this.state.cells[position]?.kind !== "block") {
        newGridHighlights.push(position);
        if (
          position + this.state.width >=
          this.state.width * this.state.height
        ) {
          break;
        }
        position += this.state.width;
      }
      return newGridHighlights;
    };

    const gridHighlights: number[] = [];
    if (this.state.cells[this.state.selected]?.kind !== "block") {
      if (this.state.selectedDirection === Direction.Across) {
        highlightForward(gridHighlights);
        highlightBackward(gridHighlights);
      } else {
        highlightUp(gridHighlights);
        highlightDown(gridHighlights);
      }
    }
    this.state.highlighted = gridHighlights;
  };
}

function cancelable<T>(data: T) {
  let prevented = false;
  return {
    ...data,
    preventDefault() {
      prevented = true;
    },
    get defaultPrevented() {
      return prevented;
    },
  };
}
