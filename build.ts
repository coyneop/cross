import dts from "bun-plugin-dts";

const result = await Bun.build({
  entrypoints: ["./src/core/index.ts", "./src/react/index.ts"],
  outdir: "./dist",
  root: "./src",
  packages: "external",
  plugins: [dts()],
});

if (!result.success) {
  console.error("Build failed:", result.logs);
  process.exit(1);
}
