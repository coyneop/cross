import { describe, expect, test } from "bun:test";
import { type Cell, Direction, wordCells } from "./grid";

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
