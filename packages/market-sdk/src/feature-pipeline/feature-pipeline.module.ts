/**
 * Feature Pipeline Module
 * Production-grade feature computation for ML training
 * 
 * Architecture:
 * - DailyFeaturesService: 48 daily features (2000-2026)
 * - MinuteFeaturesService: 54 minute features (2022-2026)
 * - LabelGeneratorService: Training labels generation
 * - FeaturePipelineOrchestrator: Coordinates full pipeline
 */

import { Module } from "@nestjs/common";
import { DailyFeaturesService } from "./daily-features.service";
import { MinuteFeaturesService } from "./minute-features.service";
import { LabelGeneratorService } from "./label-generator.service";
import { FeaturePipelineOrchestrator } from "./feature-pipeline.orchestrator";
import { IndicatorLibrary } from "./indicators/indicator-library";

@Module({
    providers: [
        DailyFeaturesService,
        MinuteFeaturesService,
        LabelGeneratorService,
        FeaturePipelineOrchestrator,
        IndicatorLibrary,
    ],
    exports: [
        DailyFeaturesService,
        MinuteFeaturesService,
        LabelGeneratorService,
        FeaturePipelineOrchestrator,
        IndicatorLibrary,
    ],
})
export class FeaturePipelineModule { }
