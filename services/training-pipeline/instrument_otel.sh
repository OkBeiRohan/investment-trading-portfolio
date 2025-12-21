#!/bin/bash

# Install OpenTelemetry dependencies
poetry add opentelemetry-distro opentelemetry-exporter-otlp

# Auto-instrumentation command
# Usage: ./instrument_otel.sh <your_python_command>
# Example: ./instrument_otel.sh python main.py

export OTEL_TRACES_EXPORTER=otlp
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4317"
export OTEL_SERVICE_NAME="training-pipeline"
export OTEL_PYTHON_LOG_CORRELATION=true

opentelemetry-instrument \
    --traces_exporter otlp \
    --metrics_exporter otlp \
    --logs_exporter otlp \
    --service_name training-pipeline \
    "$@"
