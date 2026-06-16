import type { PuzzleState } from "./engine";

export interface Renderer {
  resize(): void;
  paint(state: PuzzleState): void;
  toBuffer?(type: "png" | "pdf"): Promise<Uint8Array>;
  destroy(): void;
}
