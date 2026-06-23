import type { Puzzle } from "./engine.ts";
import type { Renderer } from "./renderer.ts";
import { DEFAULT_LIGHT_THEME, type Theme } from "./theme.ts";
import { el } from "./utils.ts";

export class CanvasRenderer implements Renderer {
  buffer: OffscreenCanvas;
  ctx: OffscreenCanvasRenderingContext2D;
  element: HTMLElement;
  output: ImageBitmapRenderingContext;
  canvas: HTMLCanvasElement;
  pixelRatio: number;
  state: Puzzle | null;

  constructor(element: HTMLElement, pixelRatio: number) {
    this.element = element;
    this.canvas = el("canvas", {
      style: { display: "block", width: "100%", height: "100%" },
    });
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
    this.state = null;
  }

  hitTest(e: PointerEvent) {
    const w = this.buffer.width;
    const h = this.buffer.height;
    const cols = this.state?.width || 1;
    const rows = this.state?.height || 1;
    // match HTML renderer: border = min(1cqw, 1cqh) = 1% of the buffer's smaller side
    const border = Math.min(w, h) / 100;

    const cellSize = Math.min((w - 2 * border) / cols, (h - 2 * border) / rows);

    const gridW = cols * cellSize;
    const gridH = rows * cellSize;
    const ox = (w - gridW) / 2;
    const oy = (h - gridH) / 2;

    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (w / rect.width);
    const y = (e.clientY - rect.top) * (h / rect.height);
    const col = Math.floor((x - ox) / cellSize);
    const row = Math.floor((y - oy) / cellSize);

    if (col < 0 || row < 0 || col >= cols || row >= rows) return null;
    return row * cols + col;
  }

  resize() {
    const w = Math.max(1, this.canvas.clientWidth * this.pixelRatio);
    const h = Math.max(1, this.canvas.clientHeight * this.pixelRatio);
    if (this.buffer.width === w && this.buffer.height === h) return;
    this.buffer.width = this.canvas.width = w;
    this.buffer.height = this.canvas.height = h;
  }
  paint(state: Puzzle) {
    this.state = state; // persist for hitTest (reads this.state for cols/rows)
    const w = this.buffer.width;
    const h = this.buffer.height;
    const cols = state.width;
    const rows = state.height;

    const theme = state.theme || DEFAULT_LIGHT_THEME;
    // match HTML renderer: border = min(1cqw, 1cqh) = 1% of the buffer's smaller side
    const border = Math.min(w, h) / 100;
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

    for (const [i, cell] of state.cells.entries()) {
      const x = i % state.width;
      const y = Math.floor(i / state.width);

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

    if (this.state.selected) {
      const x = this.state.selected % state.width;
      const y = Math.floor(this.state.selected / state.width);
      this.ctx.fillStyle = theme.select;
      this.ctx.fillRect(
        ox + x * cellSize,
        oy + y * cellSize,
        cellSize,
        cellSize,
      );
    }

    // draw numbers
    const numberPad = cellSize * 0.05;
    const numberSize = Math.max(8, Math.round(cellSize * 0.3));
    this.ctx.fillStyle = theme.textSecondary;
    this.ctx.font = `${numberSize}px Arial`;
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "top";
    for (const [num, pos] of state.gridIndex.entries()) {
      const x = pos % state.width;
      const y = Math.floor(pos / state.width);
      // Clue number
      this.ctx.fillText(
        (num + 1).toString(),
        ox + x * cellSize + numberPad,
        oy + y * cellSize + numberPad,
      );
    }

    // Draw selected number
    if (
      state.selected &&
      theme.selectTextSecondary &&
      theme.selectTextSecondary !== theme.textSecondary &&
      state.gridIndex.includes(state.selected)
    ) {
      this.ctx.fillStyle = theme.selectTextSecondary;
      const x = state.selected % state.width;
      const y = Math.floor(state.selected / state.width);
      this.ctx.fillText(
        (state.gridIndex.indexOf(state.selected) + 1).toString(),
        ox + x * cellSize + numberPad,
        oy + y * cellSize + numberPad,
      );
    }

    // draw letters — match HTML: min(100cqw, 100cqh) / cols * 0.6
    // (grid side over columns, NOT the border-subtracted cellSize)
    const letterSize = (Math.min(w, h) / cols) * 0.6;
    this.ctx.fillStyle = theme.text;
    this.ctx.font = `${letterSize}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "bottom";
    for (const [i, cell] of state.cells.entries()) {
      if (cell.kind === "block" || !cell.value) continue;
      const x = i % state.width;
      const y = Math.floor(i / state.width);
      const cx = ox + x * cellSize + cellSize / 2;
      const cy = oy + y * cellSize + cellSize;
      this.ctx.fillText(cell.value, cx, cy);
    }

    // draw selected letter
    const selected = state.selected;
    const selectedCell = selected ? state.cells[selected] : undefined;
    if (
      selected &&
      selectedCell &&
      theme.selectText &&
      theme.selectText !== theme.text &&
      selectedCell.kind === "value" &&
      selectedCell.value
    ) {
      this.ctx.fillStyle = theme.selectText;
      const x = selected % state.width;
      const y = Math.floor(selected / state.width);
      const cx = ox + x * cellSize + cellSize / 2;
      const cy = oy + y * cellSize + cellSize;
      this.ctx.fillText(selectedCell.value, cx, cy);
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

  destroy() {
    this.canvas.remove();
  }
}
