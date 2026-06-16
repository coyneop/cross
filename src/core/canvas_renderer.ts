import type { PuzzleState } from "./engine.ts";
import type { Renderer } from "./renderer.ts";
import { DEFAULT_LIGHT_THEME, type Theme } from "./theme.ts";

export class CanvasRenderer implements Renderer {
  buffer: OffscreenCanvas;
  ctx: OffscreenCanvasRenderingContext2D;
  element: HTMLElement;
  output: ImageBitmapRenderingContext;
  canvas: HTMLCanvasElement;
  pixelRatio: number;

  constructor(element: HTMLElement, pixelRatio: number) {
    this.element = element;
    this.canvas = document.createElement("canvas");
    this.canvas.style.display = "block";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.element.appendChild(this.canvas);
    this.buffer = new OffscreenCanvas(this.canvas.width, this.canvas.height);
    const renderer = this.canvas.getContext("bitmaprenderer");
    const ctx = this.buffer.getContext("2d");
    if (!ctx || !renderer) {
      throw new Error("Cannont get canvas context");
    }
    this.ctx = ctx;
    this.output = renderer;
    this.pixelRatio = pixelRatio;
  }
  resize() {
    const w = Math.max(1, this.canvas.clientWidth * this.pixelRatio);
    const h = Math.max(1, this.canvas.clientHeight * this.pixelRatio);
    if (this.buffer.width === w && this.buffer.height === h) return;
    this.buffer.width = this.canvas.width = w;
    this.buffer.height = this.canvas.height = h;
  }
  paint(state: PuzzleState) {
    const w = this.buffer.width;
    const h = this.buffer.height;
    const cols = state.puzzle.width;
    const rows = state.puzzle.height;

    const theme = state.puzzle.theme || DEFAULT_LIGHT_THEME;
    const border = theme.borderWidth * this.pixelRatio;
    const cellSize = Math.min((w - 2 * border) / cols, (h - 2 * border) / rows);
    const gridW = cols * cellSize;
    const gridH = rows * cellSize;
    const ox = (w - gridW) / 2;
    const oy = (h - gridH) / 2;

    this.ctx.fillStyle = theme.background;
    this.ctx.fillRect(ox, oy, gridW, gridH);

    // border around grid
    this.ctx.lineWidth = border;
    this.ctx.strokeStyle = theme.border;
    this.ctx.strokeRect(
      ox - border / 2,
      oy - border / 2,
      gridW + border,
      gridH + border,
    );

    for (const [i, cell] of state.puzzle.cells.entries()) {
      const x = i % state.puzzle.width;
      const y = Math.floor(i / state.puzzle.width);

      if (cell.kind === "block") {
        this.ctx.fillStyle = theme.border;
        this.ctx.fillRect(
          ox + x * cellSize,
          oy + y * cellSize,
          cellSize,
          cellSize,
        );
      }
    }

    // draw numbers
    const numberPad = cellSize * 0.08;
    const numberSize = Math.max(8, Math.round(cellSize * 0.3));
    this.ctx.fillStyle = theme.textSecondary;
    this.ctx.font = `${numberSize}px Arial`;
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "top";
    for (const [num, pos] of state.puzzle.gridIndex.entries()) {
      const x = pos % state.puzzle.width;
      const y = Math.floor(pos / state.puzzle.width);
      // Clue number
      this.ctx.fillText(
        num.toString(),
        ox + x * cellSize + numberPad,
        oy + y * cellSize + numberPad,
      );
    }

    // draw letters
    const letterSize = Math.max(8, cellSize * 0.6);
    this.ctx.fillStyle = theme.text;
    this.ctx.font = `${letterSize}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "bottom";
    for (const [i, cell] of state.puzzle.cells.entries()) {
      if (cell.kind === "block" || !cell.value) continue;
      const x = i % state.puzzle.width;
      const y = Math.floor(i / state.puzzle.width);
      const cx = ox + x * cellSize + cellSize / 2;
      const cy = oy + y * cellSize + cellSize;
      this.ctx.fillText(cell.value, cx, cy);
    }

    this.drawGrid(theme, cols, rows, cellSize, gridW, gridH, ox, oy);

    const bitmap: ImageBitmap = this.buffer.transferToImageBitmap();
    this.output.transferFromImageBitmap(bitmap);
  }

  drawGrid(
    theme: Theme,
    cols: number,
    rows: number,
    cellSize: number,
    gridW: number,
    gridH: number,
    ox: number,
    oy: number,
  ) {
    this.ctx.lineWidth = theme.lineWidth * this.pixelRatio;
    this.ctx.strokeStyle = theme.borderSecondary;
    this.ctx.beginPath();
    for (let c = 1; c <= cols - 1; c++) {
      this.ctx.moveTo(ox + c * cellSize, oy);
      this.ctx.lineTo(ox + c * cellSize, oy + gridH);
    }
    for (let r = 1; r <= rows - 1; r++) {
      this.ctx.moveTo(ox, oy + r * cellSize);
      this.ctx.lineTo(ox + gridW, oy + r * cellSize);
    }
    this.ctx.stroke();
  }

  destroy() {}
}
