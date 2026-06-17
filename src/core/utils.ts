type ElProps<K extends keyof HTMLElementTagNameMap> = Partial<
  Omit<HTMLElementTagNameMap[K], "style">
> & {
  style?: Partial<CSSStyleDeclaration>;
  dataset?: Record<string, string>;
};

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElProps<K> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const { style, dataset, ...rest } = props;
  const node = document.createElement(tag);
  Object.assign(node, rest);
  if (style) Object.assign(node.style, style);
  if (dataset) Object.assign(node.dataset, dataset);
  node.append(...children);
  return node;
}
