import { CanvasRenderer } from "./canvas_renderer";
import {
  ARROW_MOVES,
  type Cell,
  col,
  Direction,
  gridIndex,
  row,
  step,
  toggleDirection,
  wordCells,
} from "./grid";
import { HtmlRenderer } from "./html_renderer";
import type { Renderer } from "./renderer";
import { SvgRenderer } from "./svg_renderer";
import type { Theme } from "./theme";
import { cancelable } from "./utils";

export type Puzzle = {
  height: number;
  width: number;
  cells: Cell[];
  gridIndex: number[];
  selected?: number;
  selectedDirection?: Direction;
  highlighted?: number[];
  theme?: Theme;
  mode?: Mode;
  symmetric?: boolean;
};

export const Mode = {
  Solve: "solve",
  Build: "build",
} as const;
export type Mode = (typeof Mode)[keyof typeof Mode];

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
  mode: Mode.Solve,
};

type Cancelable<T> = T & {
  preventDefault(): void;
  readonly defaultPrevented: boolean;
};
type EngineEvents = {
  select: Cancelable<{
    position: number;
    row: number;
    col: number;
    direction: Direction;
  }>;
  keydown: Cancelable<{
    letter: string;
    position: number;
    row: number;
    col: number;
  }>;
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
  #resizeObserver: ResizeObserver;
  renderer: Renderer;
  state: Puzzle;
  #frameId: number | null = null;

  constructor(
    element: HTMLElement,
    state?: Puzzle,
    type: RenderType = RenderType.Html,
  ) {
    super();
    this.element = element;
    this.renderer = this.#buildRenderer(type);
    this.state = { ...DEFAULT_STATE, ...state };
    this.#buildNumbers();

    if (this.element.tabIndex < 0) this.element.tabIndex = 0; // make host focusable
    this.element.addEventListener("pointerdown", this.onPointerDown);
    this.element.addEventListener("keydown", this.onKeyDown);

    // setup resize event handling
    this.#resizeObserver = new ResizeObserver(this.onResize);
    this.#resizeObserver.observe(this.element);
    this.renderer.resize(); // size the buffer to the container before the first paint
    this.setState(this.state);
  }

  destroy = () => {
    if (this.#frameId !== null) cancelAnimationFrame(this.#frameId);
    this.#resizeObserver.disconnect();
    this.element.removeEventListener("pointerdown", this.onPointerDown);
    this.element.removeEventListener("keydown", this.onKeyDown);
    this.renderer.destroy();
  };

  setState = (state: Puzzle) => {
    this.state = state;
    this.#buildNumbers();
    this.#handlePaint();
  };

  setRenderer = (type: RenderType) => {
    this.renderer.destroy();
    this.renderer = this.#buildRenderer(type);
    this.#handlePaint(true);
  };

  #buildRenderer(type: RenderType): Renderer {
    switch (type) {
      case RenderType.Canvas:
        return new CanvasRenderer(this.element, window.devicePixelRatio);
      case RenderType.Html:
        return new HtmlRenderer(this.element);
      case RenderType.Svg:
        return new SvgRenderer(this.element);
      default: {
        const _exhaustive: never = type;
        throw new Error(`Unhandled render type: ${_exhaustive}`);
      }
    }
  }

  onResize = (_: ResizeObserverEntry[]) => {
    this.#handlePaint(true);
  };

  onPointerDown = (e: PointerEvent) => {
    const position = this.renderer.hitTest(e);
    if (position == null) return;
    this.onSelect(position);
  };

  onSelect = (position: number) => {
    const { width, selected } = this.state;
    const selectedDirection = this.state.selectedDirection ?? Direction.Across;
    const direction: Direction =
      selected === position
        ? toggleDirection(selectedDirection)
        : selectedDirection;
    const ev = cancelable({
      position,
      row: row(position, width),
      col: col(position, width),
      direction,
    });
    this.emit("select", ev);
    if (!ev.defaultPrevented) this.#applySelection(position, direction);
  };

  onLetter = (letter: string, position: number) => {
    const { width, height } = this.state;
    const ev = cancelable({
      letter,
      position,
      row: row(position, width),
      col: col(position, width),
    });
    this.emit("keydown", ev);
    if (!ev.defaultPrevented) this.#applyLetter(letter, position);

    // Potentially move selected cursor to next cell
    const dir = this.state.selectedDirection ?? Direction.Across;
    const sign = letter === "" ? -1 : 1;
    const next = step(position, dir, sign, width, height);
    if (next != null) this.onSelect(next);
  };

  onKeyDown = (e: KeyboardEvent) => {
    const { selected: position, width, height } = this.state;
    if (position == null) return;

    const move = ARROW_MOVES[e.key];
    if (move) {
      e.preventDefault();
      if (this.state.selectedDirection !== move.direction) {
        this.onSelect(position); // perpendicular → rotate
      } else {
        const next = step(position, move.direction, move.sign, width, height);
        if (next != null) this.onSelect(next);
      }
      return;
    }
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      return this.onLetter("", position);
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      this.onLetter(e.key.toUpperCase(), position);
    }
  };

  #handlePaint(resize: boolean = false) {
    if (this.#frameId !== null) return;
    this.#frameId = requestAnimationFrame(() => {
      this.#frameId = null;
      if (resize) this.renderer.resize();
      this.renderer.paint(this.state);
    });
  }

  #applySelection(position: number, direction: Direction) {
    this.state.selected = position;
    this.state.selectedDirection = direction;
    this.#buildHighlights();
    this.#handlePaint();
  }

  #applyLetter(letter: string, position: number) {
    const cell = this.state.cells[position];
    if (cell?.kind === "value") {
      cell.value = letter;
      this.#handlePaint();
    }
  }

  #buildNumbers() {
    this.state.gridIndex = gridIndex(
      this.state.cells,
      this.state.width,
      this.state.height,
    );
  }

  #buildHighlights() {
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
  }
}
