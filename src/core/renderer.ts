import type { PuzzleState } from "./engine";

export interface Renderer {
  resize(): void;
  paint(state: PuzzleState): void;
  hitTest(e: PointerEvent): number | null;
  toBuffer?(type: "png" | "pdf"): Promise<Uint8Array>;
  destroy(): void;
}
