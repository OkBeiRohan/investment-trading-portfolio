FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN pip install --no-cache-dir \
    mlflow[server]>=2.19.0 \
    psycopg2-binary>=2.9.11 \
    boto3>=1.35.0

RUN useradd --system --uid 1001 mlflow && \
    mkdir -p /mlflow && \
    chown mlflow:mlflow /mlflow

USER mlflow
WORKDIR /mlflow

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')" || exit 1

ENTRYPOINT ["mlflow", "server"]
CMD ["--host", "0.0.0.0", "--port", "5000"]
