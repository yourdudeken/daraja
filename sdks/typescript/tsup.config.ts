import { defineConfig } from "tsup";
import { join } from "path";
import pkg from "./package.json" with { type: "json" };
import { copyCertificates } from "./scripts/copy-certificates.js";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "webhooks/index": "src/webhooks/index.ts",
    "errors/index": "src/errors/index.ts",
    "types/index": "src/types/index.ts",
    "cli/index": "src/cli/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  tsconfig: "./tsconfig.json",
  // Single-source the SDK version from package.json at build time.
  define: { __SDK_VERSION__: JSON.stringify(pkg.version) },
  // Copy the bundled certificates next to the output. A failure here would
  // publish a package whose `initiatorPassword` path throws ENOENT at runtime,
  // so errors are NOT swallowed: the build must fail.
  onSuccess: async () => {
    copyCertificates(join("src", "certificates"), join("dist", "certificates"));
  },
});
