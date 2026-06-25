import { describe, expect, test } from "bun:test";
import {
  type Cell,
  Direction,
  gridIndex,
  toggleDirection,
  wordCells,
} from "./grid";

// Build a grid from ASCII rows, positions assigned row-major.
// '.' = block, '_' = empty value cell, any other char = a filled value cell.
function grid(rows: string[]): {
  cells: Cell[];
  width: number;
  height: number;
} {
  const [firstRow] = rows;
  if (firstRow === undefined)
    throw new Error("grid() requires at least one row");
  const width = firstRow.length;
  const height = rows.length;
  const cells: Cell[] = rows
    .flatMap((row) => [...row])
    .map((ch, position) =>
      ch === "."
        ? { kind: "block", position }
        : { kind: "value", position, value: ch === "_" ? "" : ch },
    );
  return { cells, width, height };
}

describe("wordCells — across", () => {
  test("highlights the full word from a middle cell", () => {
    // C A T . D
    const { cells, width, height } = grid(["CAT.D"]);
    expect(wordCells(cells, 1, Direction.Across, width, height)).toEqual([
      0, 1, 2,
    ]);
  });

  test("includes the right-edge cell", () => {
    const { cells, width, height } = grid(["ABCDE"]);
    expect(wordCells(cells, 4, Direction.Across, width, height)).toEqual([
      0, 1, 2, 3, 4,
    ]);
  });

  test("stops at a leading block (does not overshoot)", () => {
    // . C A T  — selecting inside CAT must not return []
    const { cells, width, height } = grid([".CAT"]);
    expect(wordCells(cells, 2, Direction.Across, width, height)).toEqual([
      1, 2, 3,
    ]);
  });

  test("stops at a trailing block", () => {
    // C A T .
    const { cells, width, height } = grid(["CAT."]);
    expect(wordCells(cells, 1, Direction.Across, width, height)).toEqual([
      0, 1, 2,
    ]);
  });

  test("single-cell word bounded by blocks on both sides", () => {
    // . A .
    const { cells, width, height } = grid([".A."]);
    expect(wordCells(cells, 1, Direction.Across, width, height)).toEqual([1]);
  });
});

describe("wordCells — down", () => {
  // 0 1 2
  // 3 4 5
  // 6 7 8
  const square = grid(["ABC", "DEF", "GHI"]);

  test("highlights the full column from a middle cell", () => {
    expect(
      wordCells(square.cells, 4, Direction.Down, square.width, square.height),
    ).toEqual([1, 4, 7]);
  });

  test("highlights from the top edge", () => {
    expect(
      wordCells(square.cells, 1, Direction.Down, square.width, square.height),
    ).toEqual([1, 4, 7]);
  });

  test("highlights from the bottom edge", () => {
    expect(
      wordCells(square.cells, 7, Direction.Down, square.width, square.height),
    ).toEqual([1, 4, 7]);
  });

  test("a block splits the column into separate words", () => {
    // A B
    // C .   <- block at position 3
    // E F
    const { cells, width, height } = grid(["AB", "C.", "EF"]);
    // column 1 is cells 1, 3(block), 5 -> selecting above the block yields just [1]
    expect(wordCells(cells, 1, Direction.Down, width, height)).toEqual([1]);
    // selecting below the block yields just [5]
    expect(wordCells(cells, 5, Direction.Down, width, height)).toEqual([5]);
  });
});

describe("wordCells — guards", () => {
  test("returns empty when the selected cell is a block", () => {
    // . A
    const { cells, width, height } = grid([".A"]);
    expect(wordCells(cells, 0, Direction.Across, width, height)).toEqual([]);
  });
});

describe("gridIndex", () => {
  test("numbers the top row and left column of an open grid", () => {
    // 0 1 2
    // 3 4 5   — 4,5,7,8 are interior cells (a cell above and to the left)
    // 6 7 8
    const { cells, width, height } = grid(["ABC", "DEF", "GHI"]);
    expect(gridIndex(cells, width, height)).toEqual([0, 1, 2, 3, 6]);
  });

  test("a block creates new word starts on its right and below", () => {
    // A B C
    // D . F   — block at 4
    // G H I
    const { cells, width, height } = grid(["ABC", "D.F", "GHI"]);
    // 5 starts an across word (block to its left); 7 starts a down word (block above)
    expect(gridIndex(cells, width, height)).toEqual([0, 1, 2, 3, 5, 6, 7]);
  });

  test("ignores blocks and numbers the cells between them", () => {
    // . A B .
    const { cells, width, height } = grid([".AB."]);
    expect(gridIndex(cells, width, height)).toEqual([1, 2]);
  });

  test("handles a single column split by a block (down words)", () => {
    // A
    // B
    // .   — block at 2
    // D
    const { cells, width, height } = grid(["A", "B", ".", "D"]);
    expect(gridIndex(cells, width, height)).toEqual([0, 1, 3]);
  });

  test("numbers a lone value cell", () => {
    expect(gridIndex(grid(["A"]).cells, 1, 1)).toEqual([0]);
  });

  test("returns empty when every cell is a block", () => {
    const { cells, width, height } = grid(["..."]);
    expect(gridIndex(cells, width, height)).toEqual([]);
  });
});

describe("toggleDirection", () => {
  test("flips between across and down", () => {
    expect(toggleDirection(Direction.Across)).toBe(Direction.Down);
    expect(toggleDirection(Direction.Down)).toBe(Direction.Across);
  });
});
