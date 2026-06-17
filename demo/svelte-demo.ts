import { mount, unmount } from "svelte";
import { type Cell, RenderType } from "../src/core";
import Crossword from "../src/svelte/Crossword.svelte";

const width = 15,
	height = 15;
const cells: Cell[] = Array.from({ length: width * height }, (_, i) =>
	i % 4 === 0
		? { kind: "block", position: i }
		: { kind: "value", position: i, value: "W" },
);
const state = { puzzle: { width, height, cells, gridIndex: [] } };

const target = document.getElementById("root");
if (!target) throw new Error("#root not found");

let active: RenderType = RenderType.Html;
let app = mount(Crossword, { target, props: { state, renderer: active } });

// renderer toggle
const renderers = [
	{ label: "HTML", type: RenderType.Html },
	{ label: "Canvas", type: RenderType.Canvas },
] as const;

const bar = document.createElement("div");
bar.style.cssText =
	"position:fixed;top:8px;left:8px;display:flex;gap:8px;z-index:10";

const buttons = renderers.map(({ label, type }) => {
	const btn = document.createElement("button");
	btn.type = "button";
	btn.textContent = label;
	btn.onclick = () => {
		if (type === active) return;
		active = type;
		unmount(app);
		app = mount(Crossword, { target, props: { state, renderer: active } });
		sync();
	};
	bar.append(btn);
	return { btn, type };
});

function sync() {
	for (const { btn, type } of buttons) {
		btn.style.fontWeight = type === active ? "bold" : "normal";
	}
}

sync();
document.body.append(bar);
