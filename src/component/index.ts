import { Engine, type Puzzle, RenderType } from "../core";

export class CrossElement extends HTMLElement {
  #engine: Engine | null = null;
  #puzzle: Puzzle | null = null;
  #events: Array<() => void> = [];

  static observedAttributes = ["renderer"];

  get puzzle(): Puzzle | null {
    return this.#puzzle;
  }
  set puzzle(value: Puzzle | null) {
    this.#puzzle = value;
    if (this.#engine && value) this.#engine.setState(value); // live update
  }

  connectedCallback() {
    // Custom elements default to display:inline with no intrinsic size, which
    // would give the engine's ResizeObserver a zero box. Make it a sized block
    // by default (consumers can still override via more specific CSS).
    if (!this.style.display) this.style.display = "block";

    const renderer =
      (this.getAttribute("renderer") as RenderType) ?? RenderType.Html;
    this.#engine = new Engine(this, this.#puzzle ?? undefined, renderer);

    this.#events.push(
      this.#engine.on("select", (detail) => {
        const evt = new CustomEvent("cross-select", {
          detail,
          cancelable: true,
        });
        const notCanceled = this.dispatchEvent(evt);
        if (!notCanceled) detail.preventDefault();
      }),
      this.#engine.on("keydown", (detail) => {
        const evt = new CustomEvent("cross-keydown", {
          detail,
          cancelable: true,
        });
        const notCanceled = this.dispatchEvent(evt);
        if (!notCanceled) detail.preventDefault();
      }),
    );
  }

  disconnectedCallback() {
    for (const unsubscribe of this.#events) unsubscribe();
    this.#events = [];
    this.#engine?.destroy();
    this.#engine = null;
  }

  attributeChangedCallback(
    name: string,
    _old: string | null,
    value: string | null,
  ) {
    if (name === "renderer" && value && this.#engine) {
      this.#engine.setRenderer(value as RenderType);
    }
  }
}

export const DEFAULT_TAG = "cross-word";

export function defineCross(tag: string = DEFAULT_TAG): typeof CrossElement {
  if (typeof customElements === "undefined") return CrossElement;

  const existing = customElements.get(tag);
  if (!existing) {
    customElements.define(tag, CrossElement);
  } else if (existing !== CrossElement) {
    console.warn(
      `<${tag}> is already registered by a different class; skipping.`,
    );
  }
  return CrossElement;
}
