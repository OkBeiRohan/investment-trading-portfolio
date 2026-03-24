"""
Observability module for the training pipeline.

Provides:
- Prometheus custom metrics exposed on a configurable HTTP port
- OpenTelemetry structured logging with trace/span correlation
- OpenTelemetry tracing with span creation for pipeline stages
"""

import logging
import os
import threading
from contextlib import contextmanager
from typing import Optional

from prometheus_client import (
    Counter,
    Gauge,
    Histogram,
    start_http_server,
    CollectorRegistry,
    REGISTRY,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prometheus metrics
# ---------------------------------------------------------------------------

TRAINING_EPOCH_DURATION = Histogram(
    "training_epoch_duration_seconds",
    "Duration of a single training epoch",
    ["tier", "model_type"],
    buckets=(0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300),
)

TRAINING_EPOCH_LOSS = Gauge(
    "training_epoch_loss",
    "Loss value at end of epoch",
    ["tier", "model_type", "loss_type"],
)

TRAINING_FOLD_AUC = Gauge(
    "training_fold_auc",
    "AUC score for a CPCV fold",
    ["tier", "horizon", "fold_id"],
)

TRAINING_RUN_DURATION = Histogram(
    "training_run_duration_seconds",
    "Total duration of a training run",
    ["tier", "status"],
    buckets=(10, 30, 60, 120, 300, 600, 1800, 3600),
)

TRAINING_RUN_TOTAL = Counter(
    "training_run_total",
    "Total number of training runs",
    ["tier", "status"],
)

MODEL_QUALITY_GATE = Gauge(
    "model_quality_gate_result",
    "Quality gate check result (1=pass, 0=fail)",
    ["tier", "metric_name"],
)

FEATURE_DRIFT_PCT = Gauge(
    "feature_drift_pct",
    "Percentage of features that have drifted",
    ["instrument_key"],
)

FEATURE_DRIFT_PER_FEATURE = Gauge(
    "feature_drift_per_feature",
    "KS statistic per feature (0=no drift)",
    ["feature_name"],
)

ONNX_EXPORT_DURATION = Histogram(
    "onnx_export_duration_seconds",
    "Duration of ONNX model export",
    ["tier"],
    buckets=(0.5, 1, 2, 5, 10, 30, 60),
)

ONNX_MODEL_SIZE = Gauge(
    "onnx_model_size_bytes",
    "Size of exported ONNX model",
    ["tier", "model_name"],
)

TRAINING_GPU_UTILIZATION = Gauge(
    "training_gpu_utilization",
    "GPU utilization percentage during training",
)

TRAINING_GPU_MEMORY = Gauge(
    "training_gpu_memory_used_bytes",
    "GPU memory used in bytes",
)

TRAINING_DATA_ROWS = Counter(
    "training_data_rows_loaded",
    "Number of data rows loaded for training",
    ["tier", "table"],
)

TRAINING_LEARNING_RATE = Gauge(
    "training_learning_rate",
    "Current learning rate",
    ["tier", "model_type"],
)

META_GATING_WEIGHT = Gauge(
    "meta_gating_weight",
    "Meta-learner gating weight per tier",
    ["tier_index"],
)

TRAINING_BATCH_DURATION = Histogram(
    "training_batch_duration_seconds",
    "Duration of a single training batch",
    ["tier", "model_type"],
    buckets=(0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0),
)

# ---------------------------------------------------------------------------
# Prometheus server
# ---------------------------------------------------------------------------

_metrics_server_started = False
_server_lock = threading.Lock()


def start_metrics_server(port: Optional[int] = None) -> None:
    """Start the Prometheus metrics HTTP server (idempotent)."""
    global _metrics_server_started
    with _server_lock:
        if _metrics_server_started:
            return
        p = port or int(os.environ.get("PROMETHEUS_METRICS_PORT", "8082"))
        try:
            start_http_server(p)
            _metrics_server_started = True
            logger.info("Prometheus metrics server started on port %d", p)
        except OSError as e:
            logger.warning("Could not start metrics server on port %d: %s", p, e)


# ---------------------------------------------------------------------------
# GPU metric collection
# ---------------------------------------------------------------------------

def update_gpu_metrics() -> None:
    """Snapshot GPU utilization and memory into Prometheus gauges."""
    try:
        import torch

        if not torch.cuda.is_available():
            return
        mem_used = torch.cuda.memory_allocated(0)
        mem_total = torch.cuda.get_device_properties(0).total_mem
        TRAINING_GPU_MEMORY.set(mem_used)
        TRAINING_GPU_UTILIZATION.set(mem_used / mem_total * 100 if mem_total > 0 else 0)
    except ImportError:
        pass


# ---------------------------------------------------------------------------
# OpenTelemetry setup
# ---------------------------------------------------------------------------

_otel_initialized = False


def init_otel(service_name: Optional[str] = None) -> None:
    """
    Initialize OpenTelemetry tracing and logging for the training pipeline.

    Exports traces and logs via OTLP to the configured collector.
    """
    global _otel_initialized
    if _otel_initialized:
        return

    svc = service_name or os.environ.get("OTEL_SERVICE_NAME", "training-pipeline")
    endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")

    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
            OTLPSpanExporter,
        )
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.semconv.resource import ResourceAttributes

        resource = Resource.create(
            {
                ResourceAttributes.SERVICE_NAME: svc,
                ResourceAttributes.SERVICE_VERSION: "1.0.0",
                "deployment.environment": os.environ.get("DEPLOYMENT_ENV", "development"),
            }
        )

        provider = TracerProvider(resource=resource)
        exporter = OTLPSpanExporter(endpoint=endpoint, insecure=True)
        provider.add_span_processor(BatchSpanProcessor(exporter))
        trace.set_tracer_provider(provider)

        try:
            from opentelemetry.instrumentation.logging import LoggingInstrumentor

            LoggingInstrumentor().instrument(set_logging_format=True)
        except ImportError:
            pass

        _otel_initialized = True
        logger.info(
            "OpenTelemetry initialized: service=%s endpoint=%s", svc, endpoint
        )
    except ImportError:
        logger.warning("OpenTelemetry packages not installed, tracing disabled")
    except Exception as e:
        logger.warning("Failed to initialize OpenTelemetry: %s", e)


def get_tracer(name: str = "training_pipeline"):
    """Get an OpenTelemetry tracer instance."""
    try:
        from opentelemetry import trace

        return trace.get_tracer(name)
    except ImportError:
        return None


@contextmanager
def traced_stage(stage_name: str, attributes: Optional[dict] = None):
    """
    Context manager that creates an OTEL span for a pipeline stage.

    Falls back to a no-op if OTEL is not available.
    """
    tracer = get_tracer()
    if tracer is None:
        yield None
        return

    with tracer.start_as_current_span(stage_name) as span:
        if attributes:
            for k, v in attributes.items():
                span.set_attribute(k, v)
        yield span


def setup_structured_logging(level: str = "INFO") -> None:
    """
    Configure structured JSON logging with OTEL trace correlation.

    Replaces basicConfig with a handler that outputs JSON lines
    including trace_id and span_id when available.
    """
    import json as _json

    class _JsonFormatter(logging.Formatter):
        def format(self, record: logging.LogRecord) -> str:
            log_entry = {
                "timestamp": self.formatTime(record, self.datefmt),
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage(),
            }
            for attr in (
                "otelTraceID", "otelSpanID", "tier", "experiment_id",
                "run_id", "stage", "instrument_key",
            ):
                val = getattr(record, attr, None)
                if val:
                    log_entry[attr] = val
            if record.exc_info and record.exc_info[1]:
                log_entry["exception"] = self.formatException(record.exc_info)
            return _json.dumps(log_entry)

    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))

    for h in root.handlers[:]:
        root.removeHandler(h)

    handler = logging.StreamHandler()
    handler.setFormatter(_JsonFormatter(datefmt="%Y-%m-%dT%H:%M:%S"))
    root.addHandler(handler)
