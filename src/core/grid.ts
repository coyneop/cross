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

export const Direction = {
  Across: "across",
  Down: "down",
} as const;

export type Direction = (typeof Direction)[keyof typeof Direction];
export const toggleDirection = (dir: Direction) =>
  dir === Direction.Across ? Direction.Down : Direction.Across;

export type Move = { direction: Direction; sign: -1 | 1 };

export const ARROW_MOVES: Record<string, Move> = {
  ArrowUp: { direction: Direction.Down, sign: -1 },
  ArrowDown: { direction: Direction.Down, sign: 1 },
  ArrowLeft: { direction: Direction.Across, sign: -1 },
  ArrowRight: { direction: Direction.Across, sign: 1 },
};

export const row = (p: number, w: number) => Math.floor(p / w);
export const col = (p: number, w: number) => p % w;
export const rowcol = (p: number, w: number): { row: number; col: number } => {
  return { row: Math.floor(p / w), col: p % w };
};
export function step(
  pos: number,
  dir: Direction,
  sign: -1 | 1,
  width: number,
  height: number,
): number | null {
  if (dir === Direction.Across) {
    const nextCell = col(pos, width) + sign;
    if (nextCell < 0 || nextCell >= width) return null;
    return pos + sign;
  }
  const nextCell = row(pos, width) + sign;
  if (nextCell < 0 || nextCell >= height) return null;
  return pos + sign * width;
}

export function wordCells(
  cells: Cell[],
  selected: number,
  dir: Direction,
  width: number,
  height: number,
): number[] {
  if (cells[selected]?.kind === "block") return [];
  const step = dir === Direction.Across ? 1 : width;
  const isMin = (pos: number): boolean => {
    if (dir === Direction.Across) {
      return pos % width === 0;
    } else {
      return pos - width < 0;
    }
  };
  const isMax = (pos: number): boolean => {
    if (dir === Direction.Across) {
      return pos % width === width - 1;
    } else {
      return pos + width >= width * height;
    }
  };
  let start = selected;
  const highlighted: number[] = [];
  while (!isMin(start) && cells[start - step]?.kind !== "block") {
    start -= step;
  }
  let i = start;
  while (true) {
    highlighted.push(i);
    if (isMax(i) || cells[i + step]?.kind === "block") break;
    i += step;
  }
  return highlighted;
}

export function gridIndex(
  cells: Cell[],
  width: number,
  height: number,
): number[] {
  const indexes: number[] = [];
  for (let i = 0; i < width * height; i++) {
    if (cells[i]?.kind === "block") continue;
    const above = step(i, Direction.Down, -1, width, height);
    const before = step(i, Direction.Across, -1, width, height);
    const startsDown = above === null || cells[above]?.kind === "block";
    const startsAcross = before === null || cells[before]?.kind === "block";
    if (startsDown || startsAcross) indexes.push(i);
  }
  return indexes;
}
