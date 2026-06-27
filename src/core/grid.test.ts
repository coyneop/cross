import { describe, expect, test } from "bun:test";
import {
  type Cell,
  col,
  Direction,
  gridHash,
  gridIndex,
  row,
  rowcol,
  step,
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

describe("rowcol", () => {
  test("returns row and column for a position", () => {
    expect(rowcol(7, 5)).toEqual({ row: 1, col: 2 });
  });

  test("top-left is row 0, col 0", () => {
    expect(rowcol(0, 5)).toEqual({ row: 0, col: 0 });
  });
});

describe("row", () => {
  // width 5
  test("first cell is row 0", () => {
    expect(row(0, 5)).toBe(0);
  });

  test("last cell of the first row is still row 0", () => {
    expect(row(4, 5)).toBe(0);
  });

  test("first cell of the next row increments", () => {
    expect(row(5, 5)).toBe(1);
  });

  test("a cell deeper in the grid", () => {
    expect(row(12, 5)).toBe(2);
  });

  test("width 1 means every position is its own row", () => {
    expect(row(7, 1)).toBe(7);
  });
});

describe("col", () => {
  // width 5
  test("first cell is col 0", () => {
    expect(col(0, 5)).toBe(0);
  });

  test("last cell of a row is the rightmost col", () => {
    expect(col(4, 5)).toBe(4);
  });

  test("wraps back to col 0 on the next row", () => {
    expect(col(5, 5)).toBe(0);
  });

  test("a cell mid-row", () => {
    expect(col(7, 5)).toBe(2);
  });

  test("width 1 means every position is col 0", () => {
    expect(col(3, 1)).toBe(0);
  });
});

describe("step", () => {
  // width 5, height 4:
  //   0  1  2  3  4
  //   5  6  7  8  9
  //  10 11 12 13 14
  //  15 16 17 18 19
  const W = 5;
  const H = 4;

  test("moves right and left within a row (across)", () => {
    expect(step(6, Direction.Across, 1, W, H)).toBe(7);
    expect(step(6, Direction.Across, -1, W, H)).toBe(5);
  });

  test("returns null at the row edges (across)", () => {
    expect(step(9, Direction.Across, 1, W, H)).toBeNull(); // col 4, right edge
    expect(step(5, Direction.Across, -1, W, H)).toBeNull(); // col 0, left edge
  });

  test("moves down and up within a column (down)", () => {
    expect(step(6, Direction.Down, 1, W, H)).toBe(11);
    expect(step(6, Direction.Down, -1, W, H)).toBe(1);
  });

  test("returns null at the column edges (down)", () => {
    expect(step(2, Direction.Down, -1, W, H)).toBeNull(); // row 0, top edge
    expect(step(17, Direction.Down, 1, W, H)).toBeNull(); // row 3, bottom edge
  });

  test("returns null stepping down from the first cell of the last row", () => {
    // off-by-one guard: 15 is the first cell of the last row and must not
    // wrap onto a nonexistent cell (the old `<= width*height` bug)
    expect(step(15, Direction.Down, 1, W, H)).toBeNull();
  });

  test("uses height, not width, for the vertical bound", () => {
    // non-square grid: down from row 2 lands in the valid last row (row 3)
    expect(step(12, Direction.Down, 1, W, H)).toBe(17);
  });
});

describe("gridHash", () => {
  test("encodes dimensions for an open grid", () => {
    const { cells, width, height } = grid(["ABC", "DEF", "GHI"]);
    expect(gridHash(cells, width, height)).toBe("3x3");
  });

  test("includes block positions", () => {
    // A B / C . / E F  -> block at index 3
    const { cells, width, height } = grid(["AB", "C.", "EF"]);
    expect(gridHash(cells, width, height)).toBe("2x3,3");
  });

  test("ignores letter values — only structure matters", () => {
    const a = grid(["AB", "CD"]);
    const b = grid(["XY", "ZW"]);
    expect(gridHash(a.cells, a.width, a.height)).toBe(
      gridHash(b.cells, b.width, b.height),
    );
  });

  test("changes when a block moves", () => {
    const a = grid([".B", "CD"]); // block at 0
    const b = grid(["A.", "CD"]); // block at 1
    expect(gridHash(a.cells, a.width, a.height)).not.toBe(
      gridHash(b.cells, b.width, b.height),
    );
  });

  test("changes when dimensions change", () => {
    const a = grid(["AB"]); // 2x1
    const b = grid(["A", "B"]); // 1x2
    expect(gridHash(a.cells, a.width, a.height)).not.toBe(
      gridHash(b.cells, b.width, b.height),
    );
  });
});
