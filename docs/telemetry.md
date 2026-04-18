# Telemetry — OpenTelemetry + Azure Monitor

Presenton includes **opt-in** telemetry powered by [OpenTelemetry](https://opentelemetry.io/) and
[Azure Monitor / Application Insights](https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview).

When enabled, the following data is collected:

| Signal  | What is captured |
|---------|------------------|
| **Traces** | HTTP requests (incoming & outgoing), LLM calls (`generate`, `stream`, `generate_structured`, `stream_structured`), document processing, PPTX export |
| **Metrics** | Standard HTTP and runtime metrics emitted by OpenTelemetry auto-instrumentors |
| **Logs** | Python `logging` output correlated with trace IDs |

## Enabling Telemetry

Set a single environment variable:

```bash
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=…;IngestionEndpoint=…
```

This is the standard Azure Application Insights connection string. You can
find it in the Azure Portal under your Application Insights resource →
**Overview** → **Connection String**.

### Docker Compose

The variable is already wired through `docker-compose.yml`. Just add it to
your `.env` file:

```dotenv
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=…;IngestionEndpoint=…
```

### Local Development

Export the variable before running `start.js`:

```bash
export APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=…;IngestionEndpoint=…"
node start.js --dev
```

### Optionally Set the Service Name

By default the backend reports as `presenton-backend` and the frontend as
`presenton-frontend`. Override with:

```dotenv
OTEL_SERVICE_NAME=my-custom-name
```

## Disabling Telemetry

Simply **do not set** `APPLICATIONINSIGHTS_CONNECTION_STRING`. When the
variable is absent:

- No OpenTelemetry SDK code is loaded.
- No exporter connections are made.
- Zero runtime overhead.

## Viewing Data in Azure Portal

1. Open the [Azure Portal](https://portal.azure.com) and navigate to your
   Application Insights resource.
2. **Application Map** — see the frontend → backend → LLM provider → database
   call chain.
3. **Transaction Search** — find individual requests and drill into their
   end-to-end traces.
4. **Performance** — view latency percentiles for every endpoint and
   dependency.
5. **Failures** — investigate errors and exceptions across both services.

Data typically appears within **2–5 minutes** of the first request.

## Architecture

```
┌──────────────┐  traces  ┌──────────────────────────┐
│  Next.js 14  │ ───────► │                          │
│  (frontend)  │          │  Azure Monitor /         │
└──────────────┘          │  Application Insights    │
                          │                          │
┌──────────────┐  traces  │                          │
│  FastAPI     │ ───────► │                          │
│  (backend)   │          └──────────────────────────┘
└──────────────┘
```

Both services use the **same connection string** but report with different
service names, so they appear as separate nodes in the Application Map.

## No Vendor Lock-In

The integration uses the vendor-neutral OpenTelemetry SDK. To switch from
Azure Monitor to another backend (Jaeger, Zipkin, Grafana Tempo, etc.)
simply swap the exporter — no application code changes required.
