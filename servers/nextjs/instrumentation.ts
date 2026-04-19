/**
 * Next.js instrumentation module.
 *
 * Loaded automatically by Next.js before any server-side code runs.
 * Configures OpenTelemetry tracing with Azure Monitor exporter when
 * APPLICATIONINSIGHTS_CONNECTION_STRING is set. When unset this is a
 * complete no-op — zero runtime overhead.
 */
export async function register() {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  if (!connectionString) {
    console.info(
      "OpenTelemetry disabled: APPLICATIONINSIGHTS_CONNECTION_STRING not set"
    );
    return;
  }

  // Dynamic imports so nothing is loaded when telemetry is off.
  const { NodeSDK } = await import("@opentelemetry/sdk-node");
  const { Resource } = await import("@opentelemetry/resources");
  const {
    ATTR_SERVICE_NAME,
  } = await import("@opentelemetry/semantic-conventions");
  const { BatchSpanProcessor } = await import(
    "@opentelemetry/sdk-trace-base"
  );
  const { HttpInstrumentation } = await import(
    "@opentelemetry/instrumentation-http"
  );
  const { AzureMonitorTraceExporter } = await import(
    "@azure/monitor-opentelemetry-exporter"
  );

  const serviceName =
    process.env.OTEL_SERVICE_NAME ?? "presenton-frontend";

  const traceExporter = new AzureMonitorTraceExporter({
    connectionString,
  });

  const sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
    }),
    spanProcessors: [new BatchSpanProcessor(traceExporter)],
    instrumentations: [new HttpInstrumentation()],
  });

  sdk.start();

  console.info("OpenTelemetry enabled — exporting to Azure Monitor");
}
