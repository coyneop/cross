import { mount } from "svelte";
import type { Cell } from "../src/core";
import Crossword from "../src/svelte/Crossword.svelte";

const width = 15,
  height = 15;
const cells: Cell[] = Array.from({ length: width * height }, (_, i) =>
  i % 4 === 0
    ? { kind: "block", position: i }
    : { kind: "value", position: i, value: "W" },
);

const target = document.getElementById("root");
if (!target) throw new Error("#root not found");
mount(Crossword, {
  target,
  props: { state: { puzzle: { width, height, cells, gridIndex: [] } } },
});
