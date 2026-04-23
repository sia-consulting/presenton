/**
 * Node.js-only OpenTelemetry instrumentation.
 *
 * Called by instrumentation.ts only when NEXT_RUNTIME === "nodejs".
 * Configures OpenTelemetry tracing with Azure Monitor exporter when
 * APPLICATIONINSIGHTS_CONNECTION_STRING is set. When unset this is a
 * complete no-op — zero runtime overhead.
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { AzureMonitorTraceExporter } from "@azure/monitor-opentelemetry-exporter";

export function setupTelemetry() {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  if (!connectionString) {
    console.info(
      "OpenTelemetry disabled: APPLICATIONINSIGHTS_CONNECTION_STRING not set"
    );
    return;
  }

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
