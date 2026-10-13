import { defineConfig } from "tsup";
import { copyFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import pkg from "./package.json" with { type: "json" };

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
  onSuccess: async () => {
    try {
      const certsDir = join("src", "certificates");
      const outCertsDir = join("dist", "certificates");
      if (existsSync(certsDir)) {
        mkdirSync(outCertsDir, { recursive: true });
        for (const f of readdirSync(certsDir)) {
          if (f.endsWith(".cer")) {
            copyFileSync(join(certsDir, f), join(outCertsDir, f));
          }
        }
      }
    } catch (e) {
      // ignore
    }
  },
});
