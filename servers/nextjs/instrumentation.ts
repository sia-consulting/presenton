/**
 * Next.js instrumentation module.
 *
 * Loaded automatically by Next.js before any server-side code runs.
 * The actual OpenTelemetry setup lives in instrumentation-node.ts and
 * is only imported when running in the Node.js runtime. This keeps the
 * Edge runtime bundle free of Node-only @opentelemetry/* packages.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
