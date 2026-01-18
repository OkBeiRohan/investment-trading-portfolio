/**
 * Constituent Change Repository (MongoDB)
 * Manage Nifty 50 composition history
 */

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ConstituentChange, ConstituentChangeDocument } from "../schemas/trading/constituent-change.schema";

@Injectable()
export class ConstituentChangeRepository {
    constructor(
        @InjectModel(ConstituentChange.name)
        private readonly model: Model<ConstituentChangeDocument>
    ) { }

    async create(change: Omit<ConstituentChange, "createdAt" | "updatedAt">): Promise<ConstituentChangeDocument> {
        return this.model.create(change);
    }

    async findByIndex(indexName: string): Promise<ConstituentChangeDocument[]> {
        return this.model
            .find({ indexName })
            .sort({ effectiveDate: -1 })
            .exec();
    }

    async findByDateRange(
        indexName: string,
        startDate: Date,
        endDate: Date
    ): Promise<ConstituentChangeDocument[]> {
        return this.model
            .find({
                indexName,
                effectiveDate: { $gte: startDate, $lte: endDate },
            })
            .sort({ effectiveDate: -1 })
            .exec();
    }

    /**
     * Get constituents at a specific date
     * Works by replaying changes from inception
     */
    async getConstituentsAtDate(indexName: string, asOfDate: Date): Promise<string[]> {
        const changes = await this.model
            .find({
                indexName,
                effectiveDate: { $lte: asOfDate },
            })
            .sort({ effectiveDate: 1 })
            .exec();

        const constituents = new Set<string>();

        for (const change of changes) {
            if (change.changeType === "ADD" && change.addedInstrumentKey) {
                constituents.add(change.addedInstrumentKey);
            } else if (change.changeType === "REMOVE" && change.removedInstrumentKey) {
                constituents.delete(change.removedInstrumentKey);
            } else if (change.changeType === "REPLACE") {
                if (change.removedInstrumentKey) {
                    constituents.delete(change.removedInstrumentKey);
                }
                if (change.addedInstrumentKey) {
                    constituents.add(change.addedInstrumentKey);
                }
            }
        }

        return Array.from(constituents);
    }

    /**
     * Get current constituents (changes up to today)
     */
    async getCurrentConstituents(indexName: string): Promise<string[]> {
        return this.getConstituentsAtDate(indexName, new Date());
    }

    /**
     * Seed initial Nifty 50 data from hardcoded values
     */
    async seedNifty50(
        initialConstituents: Array<{ instrumentKey: string; symbol: string; companyName: string }>,
        asOfDate: Date = new Date("2020-01-01")
    ): Promise<number> {
        const ops = initialConstituents.map(c => ({
            updateOne: {
                filter: {
                    indexName: "Nifty 50",
                    effectiveDate: asOfDate,
                    addedInstrumentKey: c.instrumentKey,
                },
                update: {
                    $set: {
                        indexName: "Nifty 50",
                        effectiveDate: asOfDate,
                        changeType: "ADD",
                        addedInstrumentKey: c.instrumentKey,
                        addedSymbol: c.symbol,
                        addedCompanyName: c.companyName,
                        source: "initial_seed",
                    },
                },
                upsert: true,
            },
        }));

        const result = await this.model.bulkWrite(ops);
        return result.upsertedCount;
    }
}
