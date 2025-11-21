/**
 * Health Check Controller
 * Provides health status endpoints for monitoring and PM2 health checks
 */

import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * GET /health
   * Basic health check endpoint
   * Returns 200 if application is running
   */
  @Get()
  async check() {
    return this.healthService.check();
  }

  /**
   * GET /health/ready
   * Readiness probe - checks if app is ready to serve traffic
   * Verifies database connections and critical dependencies
   */
  @Get('ready')
  async ready() {
    return this.healthService.readinessCheck();
  }

  /**
   * GET /health/live
   * Liveness probe - checks if app is alive
   * Returns 200 if process is running, even if dependencies are down
   */
  @Get('live')
  async live() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
