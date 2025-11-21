/**
 * PM2 Process Management Configuration
 * Supports both Windows and ArchLinux environments
 */

module.exports = {
  apps: [
    // ========================================
    // WINDOWS APPS - Market Data & Trading
    // ========================================
    {
      name: "algo-worker",
      script: "./apps/algo-worker/dist/main.js",
      cwd: "./apps/algo-worker",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        ROLE: "inference",
        GPU_ENABLED: "false",
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 3001,
        ROLE: "inference",
      },
      error_file: "./logs/pm2/algo-worker-error.log",
      out_file: "./logs/pm2/algo-worker-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "1G",
      watch: false,
    },
    {
      name: "market-feeder",
      script: "./apps/market-feeder/dist/main.js",
      cwd: "./apps/market-feeder",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3002,
      },
      error_file: "./logs/pm2/market-feeder-error.log",
      out_file: "./logs/pm2/market-feeder-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "512M",
    },
    {
      name: "data-processor",
      script: "./apps/data-processor/dist/main.js",
      cwd: "./apps/data-processor",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3003,
      },
      error_file: "./logs/pm2/data-processor-error.log",
      out_file: "./logs/pm2/data-processor-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      cron_restart: "0 2 * * *", // Restart daily at 2 AM
    },
    {
      name: "api",
      script: "./apps/api/dist/main.js",
      cwd: "./apps/api",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3004,
      },
      error_file: "./logs/pm2/api-error.log",
      out_file: "./logs/pm2/api-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
    },
    {
      name: "web",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "./apps/web",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "./logs/pm2/web-error.log",
      out_file: "./logs/pm2/web-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
    },

    // ========================================
    // ARCHLINUX APPS - ML Training
    // ========================================
    {
      name: "algo-worker-training",
      script: "./apps/algo-worker/dist/main.js",
      cwd: "./apps/algo-worker",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        ROLE: "training",
        GPU_ENABLED: "true",
        CUDA_VISIBLE_DEVICES: "0",
      },
      error_file: "./logs/pm2/training-error.log",
      out_file: "./logs/pm2/training-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_memory_restart: "16G", // Higher limit for training
      watch: false,
    },
    {
      name: "training-pipeline",
      script: "python",
      args: "kedro_cli.py run",
      cwd: "./apps/training-pipeline",
      interpreter: "none",
      instances: 1,
      exec_mode: "fork",
      env: {
        PYTHONPATH: "./apps/training-pipeline",
        CUDA_VISIBLE_DEVICES: "0",
      },
      error_file: "./logs/pm2/training-pipeline-error.log",
      out_file: "./logs/pm2/training-pipeline-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: false, // Don't auto-restart training jobs
      cron_restart: "0 2 * * 0", // Run weekly on Sunday at 2 AM
    },
  ],
};
