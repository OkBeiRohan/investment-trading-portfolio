FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        wget curl && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    "mlflow[server]>=3.10.1" \
    boto3 \
    psycopg2-binary \
    xgboost \
    lightgbm \
    torch --index-url https://download.pytorch.org/whl/cpu \
    scikit-learn \
    hmmlearn \
    scipy \
    numpy \
    pandas

RUN useradd -m mlflow
USER mlflow
WORKDIR /home/mlflow

COPY serve.sh /home/mlflow/serve.sh

EXPOSE 5001 5002 5003 5004 5005 5006

HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=5 \
    CMD wget -qO- http://localhost:5001/health || exit 1

ENTRYPOINT ["bash", "/home/mlflow/serve.sh"]
