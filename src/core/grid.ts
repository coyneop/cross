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
