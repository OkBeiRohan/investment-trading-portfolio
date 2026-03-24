FROM rust:1.82-alpine AS builder

RUN apk add --no-cache musl-dev pkgconfig openssl-dev

WORKDIR /app

COPY packages/compute-engine/Cargo.toml packages/compute-engine/Cargo.lock* ./
COPY packages/compute-engine/.cargo .cargo/

RUN mkdir src && echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

COPY packages/compute-engine/src ./src

RUN cargo build --release

FROM alpine:3.20 AS runtime

RUN apk add --no-cache libgcc

WORKDIR /app

RUN addgroup -S compute && adduser -S compute -G compute

COPY --from=builder /app/target/release/compute-engine ./compute-engine

USER compute

ENV RUST_LOG=info

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD pgrep compute-engine || exit 1

ENTRYPOINT ["./compute-engine"]
