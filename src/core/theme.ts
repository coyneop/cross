export type Theme = {
  background: string;
  text: string;
  textSecondary: string;
  border: string;
  borderSecondary: string;
  borderWidth: number;
  lineWidth: number;
  highlight: string;
  highlightBorder: string;
  highlightText: string;
  highlightTextSecondary: string;
  select: string;
  selectBorder: string;
  selectText: string;
  selectTextSecondary: string;
};

export const DEFAULT_LIGHT_THEME: Theme = {
  background: "#fff",
  text: "#121212",
  textSecondary: "#999",
  border: "#121212",
  borderSecondary: "#999",
  borderWidth: 2,
  lineWidth: 1,
  highlight: "#ddd",
  highlightBorder: "",
  highlightText: "#121212",
  highlightTextSecondary: "999",
  select: "#b1d7fb",
  selectBorder: "",
  selectText: "",
  selectTextSecondary: "",
};
