import { createElement, useEffect, useRef } from "react";
import { Engine, RenderType, type PuzzleState } from "../core";

export interface CrosswordProps {
  state: PuzzleState;
  renderer?: RenderType;
  className?: string;
  style?: React.CSSProperties;
}

export function Crossword({
  state,
  renderer = RenderType.Html,
  className,
  style,
}: CrosswordProps) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);

  // create/tear down only when the host or renderer changes
  useEffect(() => {
    if (!host.current) return;
    engine.current = new Engine(host.current, state, renderer);
    return () => engine.current?.destroy();
  }, [state, renderer]);

  // push new state on every change without rebuilding the engine
  useEffect(() => {
    engine.current?.update(state);
  }, [state]);

  return createElement("div", {
    ref: host,
    className,
    style: { width: "100%", height: "100%", ...style },
  });
}
