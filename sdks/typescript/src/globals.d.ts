/**
 * Build-time constants injected by the bundler/test runner.
 *
 * `__SDK_VERSION__` is replaced with the `version` field from `package.json`
 * by `tsup.config.ts` (build) and `vitest.config.ts` (tests), keeping the
 * manifest as the single source of truth.
 */
declare const __SDK_VERSION__: string;
