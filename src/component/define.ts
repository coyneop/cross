// Side-effecting entry: importing this module registers <cross-word> for you.
//   import "cross/component/define";
// For control over the tag name or to avoid the side effect, import
// { defineCross, CrossElement } from "cross/component" instead.
import { defineCross } from "./index";

defineCross();

// Re-export the API so this entry is also usable as a typed module
export * from "./index";
