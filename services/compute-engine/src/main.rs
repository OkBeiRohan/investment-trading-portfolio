use observability::init_tracing;

#[tokio::main]
async fn main() {
    init_tracing("compute-engine");
    println!("Compute Engine Started (Shared Telemetry Enabled)");
    
    // Simulate work to keep process alive
    loop {
        tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
    }
}