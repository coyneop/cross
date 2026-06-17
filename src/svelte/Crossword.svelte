<script lang="ts">
    import { untrack } from "svelte";
    import { Engine, type PuzzleState, RenderType } from "../core";

    let {
        state,
        renderer = RenderType.Html,
        // biome-ignore lint/correctness/noUnusedVariables: used in template
        class: className = "",
    }: { state: PuzzleState; renderer?: RenderType; class?: string } = $props();

    let host: HTMLDivElement;
    let engine: Engine | undefined;

    $effect(() => {
        renderer;
        engine = new Engine(
            host,
            untrack(() => state),
            renderer,
        );
        return () => engine?.destroy();
    });

    $effect(() => {
        engine?.setState(state);
    });
</script>

<div bind:this={host} class={className} style="width:100%;height:100%"></div>
