/**
 * RL Agent State Repository
 * Handles reinforcement learning agent state persistence
 * Stores Q-tables, neural network weights, and training progress
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RLAgentState, RLAgentStateDocument } from '@repo/database';
import {
  type RLAgentStateCreateInput,
  type RLAgentStateUpdateInput,
  rlAgentStateSchema,
  type RLAgentType,
} from '@repo/schema';

@Injectable()
export class RLAgentStateRepository {
  private readonly logger = new Logger(RLAgentStateRepository.name);

  constructor(
    @InjectModel(RLAgentState.name, 'trading')
    private readonly rlAgentStateModel: Model<RLAgentStateDocument>,
  ) {}

  /**
   * Create new RL agent state
   */
  async create(data: RLAgentStateCreateInput): Promise<string> {
    try {
      // Validate with Zod
      const validated = rlAgentStateSchema.parse({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const created = await this.rlAgentStateModel.create(validated);
      this.logger.log(`RL agent state created: ${created._id}`);
      return created._id.toString();
    } catch (error) {
      this.logger.error('Failed to create RL agent state', error);
      throw error;
    }
  }

  /**
   * Find agent state by ID
   */
  async findById(
    id: string,
    userId?: string,
  ): Promise<RLAgentStateDocument | null> {
    try {
      const filter: any = { _id: id };
      if (userId) {
        filter.userId = userId;
      }

      return await this.rlAgentStateModel.findOne(filter).exec();
    } catch (error) {
      this.logger.error(`Failed to find RL agent state ${id}`, error);
      throw error;
    }
  }

  /**
   * Find latest agent state by type
   */
  async findLatestByType(
    agentType: RLAgentType,
    userId: string,
  ): Promise<RLAgentStateDocument | null> {
    try {
      return await this.rlAgentStateModel
        .findOne({ agentType, userId })
        .sort({ updatedAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error(
        `Failed to find latest ${agentType} agent state`,
        error,
      );
      throw error;
    }
  }

  /**
   * Find all agent states for user
   */
  async findByUser(userId: string): Promise<RLAgentStateDocument[]> {
    try {
      return await this.rlAgentStateModel
        .find({ userId })
        .sort({ updatedAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error('Failed to find agent states for user', error);
      throw error;
    }
  }

  /**
   * Find agent states by model version
   */
  async findByModelVersion(
    agentType: RLAgentType,
    modelVersion: string,
    userId?: string,
  ): Promise<RLAgentStateDocument[]> {
    try {
      const filter: any = { agentType, modelVersion };
      if (userId) {
        filter.userId = userId;
      }

      return await this.rlAgentStateModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error('Failed to find agent states by model version', error);
      throw error;
    }
  }

  /**
   * Update agent state
   */
  async update(
    id: string,
    data: RLAgentStateUpdateInput,
    userId?: string,
  ): Promise<boolean> {
    try {
      const filter: any = { _id: id };
      if (userId) {
        filter.userId = userId;
      }

      const result = await this.rlAgentStateModel
        .updateOne(filter, {
          $set: {
            ...data,
            updatedAt: new Date(),
          },
        })
        .exec();

      this.logger.log(`RL agent state updated: ${id}`);
      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error(`Failed to update RL agent state ${id}`, error);
      throw error;
    }
  }

  /**
   * Update agent performance metrics
   */
  async updatePerformance(
    id: string,
    performance: {
      avgReward: number;
      successRate: number;
      lastEpisodeReward: number;
    },
    userId?: string,
  ): Promise<boolean> {
    try {
      const filter: any = { _id: id };
      if (userId) {
        filter.userId = userId;
      }

      const result = await this.rlAgentStateModel
        .updateOne(filter, {
          $set: {
            performance,
            updatedAt: new Date(),
          },
        })
        .exec();

      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error(`Failed to update agent performance ${id}`, error);
      throw error;
    }
  }

  /**
   * Increment episode count
   */
  async incrementEpisodeCount(id: string, userId?: string): Promise<boolean> {
    try {
      const filter: any = { _id: id };
      if (userId) {
        filter.userId = userId;
      }

      const result = await this.rlAgentStateModel
        .updateOne(filter, {
          $inc: { 'stateSnapshot.episodeCount': 1 },
          $set: { updatedAt: new Date() },
        })
        .exec();

      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error(`Failed to increment episode count ${id}`, error);
      throw error;
    }
  }

  /**
   * Update epsilon (exploration rate)
   */
  async updateEpsilon(
    id: string,
    epsilon: number,
    userId?: string,
  ): Promise<boolean> {
    try {
      const filter: any = { _id: id };
      if (userId) {
        filter.userId = userId;
      }

      const result = await this.rlAgentStateModel
        .updateOne(filter, {
          $set: {
            'stateSnapshot.epsilon': epsilon,
            updatedAt: new Date(),
          },
        })
        .exec();

      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error(`Failed to update epsilon ${id}`, error);
      throw error;
    }
  }

  /**
   * Get training progress for agent type
   */
  async getTrainingProgress(
    agentType: RLAgentType,
    userId: string,
  ): Promise<{
    totalEpisodes: number;
    avgReward: number;
    latestSuccessRate: number;
    modelVersion: string;
  } | null> {
    try {
      const latest = await this.findLatestByType(agentType, userId);

      if (!latest) {
        return null;
      }

      return {
        totalEpisodes: latest.stateSnapshot.episodeCount,
        avgReward: latest.performance.avgReward,
        latestSuccessRate: latest.performance.successRate,
        modelVersion: latest.modelVersion,
      };
    } catch (error) {
      this.logger.error('Failed to get training progress', error);
      throw error;
    }
  }

  /**
   * Find best performing agent checkpoints
   */
  async findBestPerformers(
    agentType: RLAgentType,
    userId: string,
    limit = 5,
  ): Promise<RLAgentStateDocument[]> {
    try {
      return await this.rlAgentStateModel
        .find({ agentType, userId })
        .sort({ 'performance.avgReward': -1 })
        .limit(limit)
        .exec();
    } catch (error) {
      this.logger.error('Failed to find best performing agents', error);
      throw error;
    }
  }

  /**
   * Delete old agent states (keep only recent N versions)
   */
  async deleteOldStates(
    agentType: RLAgentType,
    userId: string,
    keepCount = 10,
  ): Promise<number> {
    try {
      // Find states to keep
      const toKeep = await this.rlAgentStateModel
        .find({ agentType, userId })
        .sort({ updatedAt: -1 })
        .limit(keepCount)
        .exec();

      if (toKeep.length === 0) {
        return 0;
      }

      const keepIds = toKeep.map((state) => state._id);

      // Delete old states
      const result = await this.rlAgentStateModel
        .deleteMany({
          agentType,
          userId,
          _id: { $nin: keepIds },
        })
        .exec();

      this.logger.log(
        `Deleted ${result.deletedCount} old ${agentType} agent states`,
      );
      return result.deletedCount;
    } catch (error) {
      this.logger.error('Failed to delete old agent states', error);
      throw error;
    }
  }

  /**
   * Delete agent state
   */
  async delete(id: string, userId?: string): Promise<boolean> {
    try {
      const filter: any = { _id: id };
      if (userId) {
        filter.userId = userId;
      }

      const result = await this.rlAgentStateModel.deleteOne(filter).exec();
      this.logger.log(`RL agent state deleted: ${id}`);
      return result.deletedCount > 0;
    } catch (error) {
      this.logger.error(`Failed to delete RL agent state ${id}`, error);
      throw error;
    }
  }
}
