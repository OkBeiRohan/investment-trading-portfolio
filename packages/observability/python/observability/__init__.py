from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
import os

def init_observability(service_name: str):
    otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
    
    resource = Resource.create({
        "service.name": service_name,
        "deployment.environment": os.getenv("NODE_ENV", "development")
    })

    trace.set_tracer_provider(TracerProvider(resource=resource))
    
    otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
    
    span_processor = BatchSpanProcessor(otlp_exporter)
    
    trace.get_tracer_provider().add_span_processor(span_processor)
    
    print(f"Observability initialized for {service_name} at {otlp_endpoint}")
