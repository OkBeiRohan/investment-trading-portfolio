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
import { MlflowProxyService } from './mlflow-proxy.service';

@Controller('api/admin/training')
@UseGuards(AuthGuard)
export class AdminTrainingController {
  private readonly logger = new Logger(AdminTrainingController.name);

  constructor(
    private readonly experimentRepo: ExperimentRepository,
    private readonly trainingRunRepo: TrainingRunRepository,
    private readonly auditLogRepo: AuditLogRepository,
    private readonly mlflow: MlflowProxyService,
  ) {}

  @Get('experiments')
  @HttpCode(HttpStatus.OK)
  async listExperiments(
    @Query('tier') tier?: number,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const experiments = tier
      ? await this.experimentRepo.findByTier(+tier)
      : status
        ? await this.experimentRepo.findByStatus(status)
        : await this.experimentRepo.findAll();

    const total = experiments.length;
    const offset = (+page - 1) * +limit;
    const items = experiments.slice(offset, offset + +limit);

    return { page: +page, limit: +limit, items, total };
  }

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

  @Get('experiments/:id')
  @HttpCode(HttpStatus.OK)
  async getExperiment(@Param('id') id: string) {
    const experiment = await this.experimentRepo.findById(id);
    if (!experiment) return null;

    let mlflowData: Record<string, unknown> = {};
    if (experiment.mlflowExperimentId) {
      try {
        const mlflowExp = await this.mlflow.getExperiment(experiment.mlflowExperimentId);
        if (mlflowExp) {
          mlflowData = { mlflowExperiment: mlflowExp };
        }
      } catch (e: any) {
        this.logger.warn(`MLflow experiment fetch failed: ${e.message}`);
      }
    }

    return { ...experiment.toObject(), ...mlflowData };
  }

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

  @Post('experiments/:id/run')
  @HttpCode(HttpStatus.CREATED)
  async triggerRun(
    @Param('id') id: string,
    @Body() body: { tier?: string; tune?: boolean; nTrials?: number } = {},
    @Session() session: any,
  ) {
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
      details: { experimentId: id, tier: body.tier, tune: body.tune },
    });

    this.logger.log(`Training run triggered for experiment ${id} by admin ${session.user.id}`);

    const tier = body.tier ?? 'full';
    const tuneFlag = body.tune ? '--tune' : '';
    const nTrials = body.nTrials ?? 30;
    const args = `--experiment-id ${id} --tier ${tier} ${tuneFlag} ${tuneFlag ? `--n-trials ${nTrials}` : ''} --log-level INFO`.trim();

    this.triggerTrainingContainer(id, run._id?.toString() ?? '', args);

    return { ...run.toObject?.() ?? run, pipelineArgs: args };
  }

  private triggerTrainingContainer(experimentId: string, runId: string, args: string) {
    const { exec } = require('child_process');
    const containerCmd = `docker exec training-pipeline python -m training_pipeline.runner ${args}`;
    this.logger.log(`Triggering training in container: ${containerCmd}`);

    const child = exec(containerCmd, {
      timeout: 4 * 60 * 60 * 1000,
    });

    child.stdout?.on('data', (data: string) => {
      this.logger.log(`[training:${experimentId}] ${data.trim()}`);
    });
    child.stderr?.on('data', (data: string) => {
      this.logger.warn(`[training:${experimentId}] ${data.trim()}`);
    });
    child.on('exit', async (code: number) => {
      const status = code === 0 ? 'completed' : 'failed';
      this.logger.log(`Training pipeline exited with code ${code} (${status})`);
      try {
        await this.trainingRunRepo.updateStatus(runId, status);
      } catch (e: any) {
        this.logger.error(`Failed to update run status: ${e.message}`);
      }
    });
  }

  @Get('experiments/:id/runs')
  @HttpCode(HttpStatus.OK)
  async listRuns(@Param('id') id: string) {
    return this.trainingRunRepo.findByExperiment(id);
  }

  /**
   * MLflow metrics history for a run (for training curves in the UI).
   */
  @Get('experiments/:id/metrics-history')
  @HttpCode(HttpStatus.OK)
  async getMetricsHistory(
    @Param('id') id: string,
    @Query('metric') metricKey: string,
  ) {
    const experiment = await this.experimentRepo.findById(id);
    if (!experiment?.mlflowRunId) return [];
    try {
      return this.mlflow.getMetricHistory(experiment.mlflowRunId, metricKey);
    } catch {
      return [];
    }
  }

  /**
   * MLflow artifact URL for SHAP plots, evaluation reports, etc.
   */
  @Get('experiments/:id/artifacts')
  @HttpCode(HttpStatus.OK)
  async getArtifactUrl(
    @Param('id') id: string,
    @Query('path') artifactPath: string,
  ) {
    const experiment = await this.experimentRepo.findById(id);
    if (!experiment?.mlflowRunId) return { url: null };
    const url = await this.mlflow.getArtifactUrl(experiment.mlflowRunId, artifactPath);
    return { url };
  }

  /**
   * Dataset lineage for a training run.
   */
  @Get('experiments/:id/datasets')
  @HttpCode(HttpStatus.OK)
  async getDatasetLineage(@Param('id') id: string) {
    const experiment = await this.experimentRepo.findById(id);
    if (!experiment?.mlflowRunId) return [];
    try {
      return this.mlflow.getRunDatasetInputs(experiment.mlflowRunId);
    } catch {
      return [];
    }
  }

  @Get('runs/:runId')
  @HttpCode(HttpStatus.OK)
  async getRunDetails(@Param('runId') runId: string) {
    const run = await this.trainingRunRepo.findById(runId);
    if (!run) return null;

    let mlflowMetrics: Record<string, number> = {};
    if (run.mlflowRunId) {
      try {
        mlflowMetrics = await this.mlflow.getRunMetrics(run.mlflowRunId);
      } catch {
        // MLflow not reachable, proceed with MongoDB data
      }
    }

    return { ...run.toObject(), mlflowMetrics };
  }

  /**
   * System metrics (GPU/CPU) for a training run from MLflow.
   */
  @Get('runs/:runId/system-metrics')
  @HttpCode(HttpStatus.OK)
  async getSystemMetrics(@Param('runId') runId: string) {
    const run = await this.trainingRunRepo.findById(runId);
    if (!run?.mlflowRunId) return {};
    try {
      const cpuHistory = await this.mlflow.getMetricHistory(
        run.mlflowRunId,
        'system/cpu_utilization_percentage',
      );
      const gpuHistory = await this.mlflow.getMetricHistory(
        run.mlflowRunId,
        'system/gpu_utilization_percentage',
      );
      const memHistory = await this.mlflow.getMetricHistory(
        run.mlflowRunId,
        'system/system_memory_usage_percentage',
      );
      return { cpu: cpuHistory, gpu: gpuHistory, memory: memHistory };
    } catch {
      return {};
    }
  }

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

  @Get('models')
  @HttpCode(HttpStatus.OK)
  async listDeployedModels() {
    return this.experimentRepo.findDeployed();
  }

  /**
   * Get MLflow Model Registry versions for a registered model.
   */
  @Get('models/:name/versions')
  @HttpCode(HttpStatus.OK)
  async getModelVersions(@Param('name') name: string) {
    try {
      return this.mlflow.getRegisteredModel(name);
    } catch {
      return null;
    }
  }

  /**
   * Get the current @champion version for a model.
   */
  @Get('models/:name/champion')
  @HttpCode(HttpStatus.OK)
  async getChampionVersion(@Param('name') name: string) {
    try {
      return this.mlflow.getModelVersionByAlias(name, 'champion');
    } catch {
      return null;
    }
  }

  /**
   * Deploy a model: sets MLflow @champion alias and MongoDB deploy flag.
   */
  @Post('models/:id/deploy')
  @HttpCode(HttpStatus.OK)
  async deployModel(@Param('id') id: string, @Session() session: any) {
    const experiment = await this.experimentRepo.findById(id);
    let championVersion: string | undefined;

    if (experiment?.mlflowModelName && experiment?.mlflowRunId) {
      try {
        const model = await this.mlflow.getRegisteredModel(experiment.mlflowModelName);
        const latest = model?.latest_versions?.[0];
        if (latest) {
          await this.mlflow.setModelAlias(experiment.mlflowModelName, 'champion', latest.version);
          championVersion = latest.version;
          this.logger.log(`Set MLflow @champion alias for ${experiment.mlflowModelName} v${latest.version}`);
        }
      } catch (e: any) {
        this.logger.warn(`MLflow alias set failed: ${e.message}`);
      }
    }

    const updated = await this.experimentRepo.deploy(id, championVersion);

    await this.auditLogRepo.create({
      action: 'admin.training.model.deploy',
      category: 'admin',
      userId: session.user.id,
      targetId: id,
      targetType: 'experiment',
      details: { mlflowChampionVersion: championVersion },
    });

    this.logger.log(`Model ${id} deployed by admin ${session.user.id}`);
    return updated;
  }

  /**
   * List MLflow experiments (direct proxy).
   */
  @Get('mlflow/experiments')
  @HttpCode(HttpStatus.OK)
  async listMlflowExperiments() {
    try {
      return this.mlflow.searchExperiments();
    } catch {
      return [];
    }
  }
}
