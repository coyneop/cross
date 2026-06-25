import { CanvasRenderer } from "./canvas_renderer";
import { type Cell, Direction, wordCells } from "./grid";
import { HtmlRenderer } from "./html_renderer";
import type { Renderer } from "./renderer";
import type { Theme } from "./theme";

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
  symmetric?: boolean;
};

export enum PuzzleMode {
  Solve = "solve",
  Build = "build",
}

export const RenderType = {
  Html: "html",
  Svg: "svg",
  Canvas: "canvas",
} as const;

export type RenderType = (typeof RenderType)[keyof typeof RenderType];

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
  keydown: { letter: string; position: number; row: number; col: number };
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
  renderer: Renderer;
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
      default: {
        const _exhaustive: never = type;
        throw new Error(`Unhandled render type: ${_exhaustive}`);
      }
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

  onLetter = (letter: string, position: number) => {
    const ev = cancelable({
      letter,
      position: position,
      row: Math.floor(position / this.state.width),
      col: position % this.state.width,
    });
    this.emit("keydown", ev);
    if (!ev.defaultPrevented) this.applyLetter(letter, position);
    if (letter === "") {
      if (
        this.state.selectedDirection === Direction.Across &&
        position % this.state.width > 0
      ) {
        this.onSelect(position - 1);
      } else if (
        this.state.selectedDirection === Direction.Down &&
        position - this.state.width >= 0
      ) {
        this.onSelect(position - this.state.width);
      }
    } else {
      if (
        this.state.selectedDirection === Direction.Across &&
        position % this.state.width !== this.state.width - 1
      ) {
        this.onSelect(position + 1);
      } else if (
        this.state.selectedDirection === Direction.Down &&
        position + this.state.width <= this.state.width * this.state.height
      ) {
        this.onSelect(position + this.state.width);
      }
    }
  };

  applySelection = (position: number, direction?: Direction) => {
    this.state.selected = position;
    this.state.selectedDirection = direction;
    this.buildHighlights();
    this.renderer.paint(this.state);
  };

  applyLetter = (letter: string, position: number) => {
    const cell = this.state.cells[position];
    if (cell?.kind === "value") {
      cell.value = letter;
      this.renderer.paint(this.state);
    }
  };

  onKeyDown = (e: KeyboardEvent) => {
    const position = this.state.selected;
    if (position == null) return;
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        if (this.state.selectedDirection === Direction.Across) {
          return this.onSelect(position);
        } else if (position - this.state.width >= 0) {
          return this.onSelect(position - this.state.width);
        }
        return;
      case "ArrowDown":
        e.preventDefault();
        if (this.state.selectedDirection === Direction.Across) {
          return this.onSelect(position);
        } else if (
          position + this.state.width <=
          this.state.width * this.state.height
        ) {
          return this.onSelect(position + this.state.width);
        }
        return;
      case "ArrowLeft":
        e.preventDefault();
        if (this.state.selectedDirection === Direction.Down) {
          this.onSelect(position);
        } else if (position % this.state.width !== 0) {
          this.onSelect(position - 1);
        }
        return;
      case "ArrowRight":
        e.preventDefault();
        if (this.state.selectedDirection === Direction.Down) {
          this.onSelect(position);
        } else if (position % this.state.width !== this.state.width - 1) {
          this.onSelect(position + 1);
        }
        return;
      case "Backspace":
      case "Delete":
        e.preventDefault();
        return this.onLetter("", position);
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      this.onLetter(e.key.toUpperCase(), position);
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
    const { selected, selectedDirection, width, height, cells } = this.state;
    this.state.highlighted =
      selected == null
        ? []
        : wordCells(
            cells,
            selected,
            selectedDirection ?? Direction.Across,
            width,
            height,
          );
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
