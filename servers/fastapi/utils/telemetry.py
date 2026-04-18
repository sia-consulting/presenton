"""
OpenTelemetry + Azure Monitor bootstrap module.

When APPLICATIONINSIGHTS_CONNECTION_STRING is set, this module configures:
  - TracerProvider  → AzureMonitorTraceExporter
  - MeterProvider   → AzureMonitorMetricExporter
  - LoggerProvider  → AzureMonitorLogExporter
  - Auto-instrumentation for FastAPI, HTTPX, SQLAlchemy, and logging

When the env var is absent everything is a no-op — zero overhead.
"""

import logging
import os
from typing import Optional

from fastapi import FastAPI

logger = logging.getLogger(__name__)

_CONNECTION_STRING_ENV = "APPLICATIONINSIGHTS_CONNECTION_STRING"

# Module-level flag so callers can check whether telemetry is active.
telemetry_enabled: bool = False


def _get_connection_string() -> Optional[str]:
    return os.environ.get(_CONNECTION_STRING_ENV)


def get_tracer(name: str):
    """Return an OpenTelemetry tracer.

    If telemetry is disabled a no-op tracer is returned automatically by the
    OpenTelemetry API (default behaviour when no TracerProvider is configured).
    """
    from opentelemetry import trace

    return trace.get_tracer(name)


def setup_telemetry(app: FastAPI) -> None:
    """Initialise OpenTelemetry providers and instrument the FastAPI app.

    Safe to call unconditionally — if APPLICATIONINSIGHTS_CONNECTION_STRING is
    not set the function returns immediately.
    """
    global telemetry_enabled

    connection_string = _get_connection_string()
    if not connection_string:
        logger.info(
            "OpenTelemetry disabled: %s not set", _CONNECTION_STRING_ENV
        )
        return

    # ------------------------------------------------------------------
    # Imports are deferred so nothing is loaded when telemetry is off.
    # ------------------------------------------------------------------
    from opentelemetry import trace, metrics
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.sdk.metrics import MeterProvider
    from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
    from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
    from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
    from opentelemetry.sdk.resources import Resource

    from azure.monitor.opentelemetry.exporter import (
        AzureMonitorTraceExporter,
        AzureMonitorMetricExporter,
        AzureMonitorLogExporter,
    )

    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
    from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
    from opentelemetry.instrumentation.logging import LoggingInstrumentor

    service_name = os.environ.get("OTEL_SERVICE_NAME", "presenton-backend")
    resource = Resource.create({"service.name": service_name})

    # --- Traces ---
    trace_exporter = AzureMonitorTraceExporter(
        connection_string=connection_string
    )
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(BatchSpanProcessor(trace_exporter))
    trace.set_tracer_provider(tracer_provider)

    # --- Metrics ---
    metric_exporter = AzureMonitorMetricExporter(
        connection_string=connection_string
    )
    metric_reader = PeriodicExportingMetricReader(metric_exporter)
    meter_provider = MeterProvider(
        resource=resource, metric_readers=[metric_reader]
    )
    metrics.set_meter_provider(meter_provider)

    # --- Logs ---
    log_exporter = AzureMonitorLogExporter(
        connection_string=connection_string
    )
    logger_provider = LoggerProvider(resource=resource)
    logger_provider.add_log_record_processor(
        BatchLogRecordProcessor(log_exporter)
    )
    handler = LoggingHandler(level=logging.NOTSET, logger_provider=logger_provider)
    logging.getLogger().addHandler(handler)

    # --- Auto-instrumentors ---
    FastAPIInstrumentor.instrument_app(app)
    HTTPXClientInstrumentor().instrument()
    SQLAlchemyInstrumentor().instrument()
    LoggingInstrumentor().instrument()

    telemetry_enabled = True
    logger.info("OpenTelemetry enabled — exporting to Azure Monitor")
