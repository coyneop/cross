import type { Puzzle } from "./engine";

export interface Renderer {
  resize(): void;
  paint(state: Puzzle): void;
  hitTest(e: PointerEvent): number | null;
  toBuffer?(type: "png" | "pdf"): Promise<Uint8Array>;
  destroy(): void;
}
