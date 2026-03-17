import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { TrainingRun } from "../../schemas/training/training-run.schema";
import DatabaseConnections from "../../connections/connections";

@Injectable()
export class TrainingRunRepository {
  constructor(
    @InjectModel(TrainingRun.name, DatabaseConnections.Trading)
    private readonly model: Model<TrainingRun>,
  ) {}

  async create(data: Partial<TrainingRun>): Promise<TrainingRun> {
    const run = new this.model(data);
    return run.save();
  }

  async findById(id: string): Promise<TrainingRun | null> {
    return this.model.findById(id).exec();
  }

  async findByExperiment(experimentId: string): Promise<TrainingRun[]> {
    return this.model
      .find({ experimentId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateStage(
    runId: string,
    stageName: string,
    stageData: Record<string, any>,
  ): Promise<TrainingRun | null> {
    const update: Record<string, any> = {};
    for (const [key, value] of Object.entries(stageData)) {
      update[`stages.$.${key}`] = value;
    }
    return this.model
      .findOneAndUpdate(
        { _id: runId, "stages.name": stageName },
        { $set: update },
        { new: true },
      )
      .exec();
  }

  async addArtifact(
    runId: string,
    artifact: Record<string, any>,
  ): Promise<TrainingRun | null> {
    return this.model
      .findByIdAndUpdate(
        runId,
        { $push: { artifacts: artifact } },
        { new: true },
      )
      .exec();
  }

  async updateStatus(
    runId: string,
    status: string,
    error?: string,
  ): Promise<TrainingRun | null> {
    const update: Record<string, any> = { status };
    if (status === "running") {
      update.startedAt = new Date();
    } else if (status === "completed" || status === "failed") {
      update.completedAt = new Date();
    }
    if (error) {
      update.error = error;
    }
    return this.model
      .findByIdAndUpdate(runId, update, { new: true })
      .exec();
  }

  async update(
    id: string,
    data: Partial<TrainingRun>,
  ): Promise<TrainingRun | null> {
    return this.model
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }
}
