import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Experiment } from "../../schemas/training/experiment.schema";
import DatabaseConnections from "../../connections/connections";

@Injectable()
export class ExperimentRepository {
  constructor(
    @InjectModel(Experiment.name, DatabaseConnections.Trading)
    private readonly model: Model<Experiment>,
  ) {}

  async create(data: Partial<Experiment>): Promise<Experiment> {
    const experiment = new this.model(data);
    return experiment.save();
  }

  async findById(id: string): Promise<Experiment | null> {
    return this.model.findById(id).exec();
  }

  async findAll(): Promise<Experiment[]> {
    return this.model.find().exec();
  }

  async findByTier(tier: number): Promise<Experiment[]> {
    return this.model.find({ tier }).exec();
  }

  async findByStatus(status: string): Promise<Experiment[]> {
    return this.model.find({ status }).exec();
  }

  async findDeployed(): Promise<Experiment[]> {
    return this.model.find({ isDeployed: true }).exec();
  }

  async updateMetrics(
    id: string,
    metrics: Partial<Experiment["metrics"]>,
  ): Promise<Experiment | null> {
    const update: Record<string, any> = {};
    for (const [key, value] of Object.entries(metrics)) {
      update[`metrics.${key}`] = value;
    }
    return this.model
      .findByIdAndUpdate(id, { $set: update }, { new: true })
      .exec();
  }

  async deploy(id: string): Promise<Experiment | null> {
    return this.model
      .findByIdAndUpdate(
        id,
        { isDeployed: true, deployedAt: new Date() },
        { new: true },
      )
      .exec();
  }

  async update(
    id: string,
    data: Partial<Experiment>,
  ): Promise<Experiment | null> {
    return this.model
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }
}
