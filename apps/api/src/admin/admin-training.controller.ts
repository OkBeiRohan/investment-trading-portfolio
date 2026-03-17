import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, Session } from '@repo/authentication';
import {
  ExperimentRepository,
  TrainingRunRepository,
  AuditLogRepository,
} from '@repo/database';

@Controller('api/admin/training')
@UseGuards(AuthGuard)
export class AdminTrainingController {
  private readonly logger = new Logger(AdminTrainingController.name);

  constructor(
    private readonly experimentRepo: ExperimentRepository,
    private readonly trainingRunRepo: TrainingRunRepository,
    private readonly auditLogRepo: AuditLogRepository,
  ) {}

  /**
   * List experiments with optional filters.
   * @route GET /api/admin/training/experiments
   */
  @Get('experiments')
  @HttpCode(HttpStatus.OK)
  async listExperiments(
    @Query('tier') tier?: number,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    // TODO: Implement filtered/paginated experiment listing
    return { page: +page, limit: +limit, items: [], total: 0 };
  }

  /**
   * Create a new experiment.
   * @route POST /api/admin/training/experiments
   */
  @Post('experiments')
  @HttpCode(HttpStatus.CREATED)
  async createExperiment(@Body() body: any, @Session() session: any) {
    const experiment = await this.experimentRepo.create(body);

    await this.auditLogRepo.create({
      action: 'admin.training.experiment.create',
      category: 'admin',
      userId: session.user.id,
      targetId: experiment._id?.toString(),
      targetType: 'experiment',
    });

    this.logger.log(`Experiment created by admin ${session.user.id}`);
    return experiment;
  }

  /**
   * Get experiment detail by id.
   * @route GET /api/admin/training/experiments/:id
   */
  @Get('experiments/:id')
  @HttpCode(HttpStatus.OK)
  async getExperiment(@Param('id') id: string) {
    return this.experimentRepo.findById(id);
  }

  /**
   * Update an experiment.
   * @route PUT /api/admin/training/experiments/:id
   */
  @Put('experiments/:id')
  @HttpCode(HttpStatus.OK)
  async updateExperiment(
    @Param('id') id: string,
    @Body() body: any,
    @Session() session: any,
  ) {
    const experiment = await this.experimentRepo.update(id, body);

    await this.auditLogRepo.create({
      action: 'admin.training.experiment.update',
      category: 'admin',
      userId: session.user.id,
      targetId: id,
      targetType: 'experiment',
    });

    return experiment;
  }

  /**
   * Trigger a training run for an experiment.
   * @route POST /api/admin/training/experiments/:id/run
   */
  @Post('experiments/:id/run')
  @HttpCode(HttpStatus.CREATED)
  async triggerRun(@Param('id') id: string, @Session() session: any) {
    const run = await this.trainingRunRepo.create({
      experimentId: id,
      status: 'queued',
    });

    await this.auditLogRepo.create({
      action: 'admin.training.run.trigger',
      category: 'admin',
      userId: session.user.id,
      targetId: run._id?.toString(),
      targetType: 'training_run',
      details: { experimentId: id },
    });

    this.logger.log(`Training run triggered for experiment ${id} by admin ${session.user.id}`);
    return run;
  }

  /**
   * List runs for an experiment.
   * @route GET /api/admin/training/experiments/:id/runs
   */
  @Get('experiments/:id/runs')
  @HttpCode(HttpStatus.OK)
  async listRuns(@Param('id') id: string) {
    return this.trainingRunRepo.findByExperiment(id);
  }

  /**
   * Get training run details.
   * @route GET /api/admin/training/runs/:runId
   */
  @Get('runs/:runId')
  @HttpCode(HttpStatus.OK)
  async getRunDetails(@Param('runId') runId: string) {
    return this.trainingRunRepo.findById(runId);
  }

  /**
   * Cancel a running training run.
   * @route POST /api/admin/training/runs/:runId/cancel
   */
  @Post('runs/:runId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelRun(@Param('runId') runId: string, @Session() session: any) {
    const run = await this.trainingRunRepo.updateStatus(runId, 'cancelled');

    await this.auditLogRepo.create({
      action: 'admin.training.run.cancel',
      category: 'admin',
      userId: session.user.id,
      targetId: runId,
      targetType: 'training_run',
    });

    this.logger.log(`Training run ${runId} cancelled by admin ${session.user.id}`);
    return run;
  }

  /**
   * List all deployed models.
   * @route GET /api/admin/training/models
   */
  @Get('models')
  @HttpCode(HttpStatus.OK)
  async listDeployedModels() {
    return this.experimentRepo.findDeployed();
  }

  /**
   * Deploy a model from an experiment.
   * @route POST /api/admin/training/models/:id/deploy
   */
  @Post('models/:id/deploy')
  @HttpCode(HttpStatus.OK)
  async deployModel(@Param('id') id: string, @Session() session: any) {
    const experiment = await this.experimentRepo.deploy(id);

    await this.auditLogRepo.create({
      action: 'admin.training.model.deploy',
      category: 'admin',
      userId: session.user.id,
      targetId: id,
      targetType: 'experiment',
    });

    this.logger.log(`Model ${id} deployed by admin ${session.user.id}`);
    return experiment;
  }
}
