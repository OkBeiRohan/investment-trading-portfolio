import { Module } from '@nestjs/common';
import { StrategySelectorService } from './strategy-selector.service';
import { RiskValidatorService } from './risk-validator.service';

@Module({
  providers: [StrategySelectorService, RiskValidatorService],
  exports: [StrategySelectorService, RiskValidatorService],
})
export class StrategyRiskModule {}
