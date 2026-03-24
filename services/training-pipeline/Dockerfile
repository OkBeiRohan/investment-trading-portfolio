FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime AS builder

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY services/training-pipeline/pyproject.toml services/training-pipeline/requirements.txt ./

RUN uv pip install --system --no-cache \
    "mlflow>=3.10.1" \
    "optuna>=4.0.0" \
    "boto3>=1.35.0" \
    "prometheus-client>=0.21.0" \
    "opentelemetry-api>=1.29.0" \
    "opentelemetry-sdk>=1.29.0" \
    "opentelemetry-exporter-otlp>=1.29.0" \
    "opentelemetry-instrumentation-logging>=0.50b0"

RUN uv pip install --system --no-cache -r requirements.txt

COPY services/training-pipeline/ ./

RUN uv pip install --system --no-cache -e .

FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime AS runtime

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/src

WORKDIR /app

COPY --from=builder /opt/conda/lib/python3.11/site-packages /opt/conda/lib/python3.11/site-packages
COPY --from=builder /opt/conda/bin /opt/conda/bin
COPY --from=builder /app/ ./

RUN mkdir -p data/06_models logs

EXPOSE 8082
EXPOSE 8888

HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
  CMD python -c "import training_pipeline; print('ok')" || exit 1

ENTRYPOINT ["python", "-m", "training_pipeline.runner"]
