/**
 * TradingOrchestrator
 * Main orchestration service that coordinates all 4 engines
 * Implements the complete trading pipeline:
 * Data → Signal → Policy → Execution
 */

import { Injectable, Logger } from '@nestjs/common';

// DataEngine
import { DataCollectionService } from './engines/data/data-collection.service';
import { FeatureEngineeringService } from './engines/data/feature-engineering.service';
import { FeatureStoreService } from './engines/data/feature-store.service';

// SignalEngine
import { SignalEngineService } from './engines/signal/signal-engine.service';

// PolicyEngine
import { StrategySelectionService } from './engines/policy/strategy-selection.service';
import { RiskManagementService } from './engines/policy/risk-management.service';
import { PositionSizingService } from './engines/policy/position-sizing.service';

// ExecutionEngine
import { OrderPlacementService } from './engines/execution/order-placement.service';
import { PositionManagerService } from './engines/execution/position-manager.service';

import type { Features, TradingSignal, Strategy, Order } from '@repo/schema';

@Injectable()
export class TradingOrchestrator {
  private readonly logger = new Logger(TradingOrchestrator.name);

  constructor(
    // DataEngine services
    private readonly dataCollection: DataCollectionService,
    private readonly featureEngineering: FeatureEngineeringService,
    private readonly featureStore: FeatureStoreService,

    // SignalEngine services
    private readonly signalEngine: SignalEngineService,

    // PolicyEngine services
    private readonly strategySelection: StrategySelectionService,
    private readonly riskManagement: RiskManagementService,
    private readonly positionSizing: PositionSizingService,

    // ExecutionEngine services
    private readonly orderPlacement: OrderPlacementService,
    private readonly positionManager: PositionManagerService,
  ) {}

  /**
   * Main trading loop - executes complete pipeline
   */
  async executeTradingCycle(userId: string): Promise<void> {
    this.logger.log('Starting trading cycle...');

    try {
      // Step 1: Collect market data and engineer features
      const features = await this.collectAndEngineerFeatures();

      if (!features) {
        this.logger.warn('No features available, skipping cycle');
        return;
      }

      // Step 2: Generate trading signal
      const signal = await this.generateSignal(features, userId);

      if (!signal) {
        this.logger.debug('No signal generated');
        return;
      }

      // Step 3: Select strategy based on signal
      const strategy = await this.selectStrategy(signal);

      if (!strategy) {
        this.logger.debug('No strategy selected (NO_TRADE signal)');
        return;
      }

      // Step 4: Validate risk and calculate position size
      const canTrade = await this.validateRiskAndSize(strategy, signal, userId);

      if (!canTrade) {
        this.logger.warn('Risk validation failed, skipping trade');
        return;
      }

      // Step 5: Execute order
      await this.executeOrder(strategy, signal, userId);

      this.logger.log('Trading cycle completed successfully');
    } catch (error) {
      this.logger.error('Trading cycle failed', error);
      throw error;
    }
  }

  /**
   * Step 1: Collect market data and engineer features
   */
  private async collectAndEngineerFeatures(): Promise<Features | null> {
    this.logger.debug('Collecting market data...');

    // Collect raw market data
    const historicalData = await this.dataCollection.fetchHistoricalData(
      'NIFTY50',
      60, // 60 periods
    );

    const optionChain = await this.dataCollection.fetchOptionChain('NIFTY');
    const vix = await this.dataCollection.fetchIndiaVIX();
    const pcr = await this.dataCollection.fetchPutCallRatio('NIFTY');

    // Engineer features
    const features = await this.featureEngineering.engineerFeatures(
      historicalData,
      optionChain,
      vix,
      pcr,
    );

    // Validate features
    const validation = this.featureEngineering.validateFeatures(features);

    if (!validation.valid) {
      this.logger.error('Feature validation failed', validation.errors);
      return null;
    }

    // Store features in MongoDB
    await this.featureStore.saveFeatures('NIFTY50', features);

    return features;
  }

  /**
   * Step 2: Generate trading signal
   */
  private async generateSignal(
    features: Features,
    userId: string,
  ): Promise<TradingSignal | null> {
    this.logger.debug('Generating signal...');

    const signalInput = await this.signalEngine.generateSignal(
      features,
      userId,
    );

    // TODO: Persist signal to MongoDB
    // const signalId = await collections.tradingSignals.insertOne(signalInput);
    // return { ...signalInput, _id: signalId };

    return signalInput as TradingSignal; // Cast for now
  }

  /**
   * Step 3: Select strategy based on signal
   */
  private async selectStrategy(
    signal: TradingSignal,
  ): Promise<Strategy | null> {
    this.logger.debug(`Selecting strategy for signal: ${signal.prediction}`);

    const strategyInput = this.strategySelection.selectStrategy(signal);

    if (!strategyInput) {
      return null;
    }

    // TODO: Persist strategy to MongoDB
    // const strategyId = await collections.strategies.insertOne(strategyInput);
    // return { ...strategyInput, _id: strategyId };

    return strategyInput as Strategy; // Cast for now
  }

  /**
   * Step 4: Validate risk and calculate position size
   */
  private async validateRiskAndSize(
    strategy: Strategy,
    signal: TradingSignal,
    userId: string,
  ): Promise<boolean> {
    this.logger.debug('Validating risk and calculating position size...');

    // Get current portfolio risk
    const openPositions = await this.positionManager.getOpenPositions(userId);

    // Calculate current risk metrics
    const currentRisk = await this.riskManagement.calculateCurrentRisk(
      openPositions,
      500000, // TODO: Get actual cash reserve from portfolio
    );

    // Calculate position size
    const positionSize = this.positionSizing.calculateStrategySize(
      strategy.name,
      signal,
      500000, // Account size
      {
        winRate: 0.55, // TODO: Get from historical stats
        avgWin: 5000,
        avgLoss: -3000,
      },
    );

    // Validate position size
    const sizeValidation = this.positionSizing.validatePositionSize(
      positionSize,
      currentRisk.cashReserve,
    );

    if (!sizeValidation.valid) {
      this.logger.warn(
        `Position size validation failed: ${sizeValidation.reason}`,
      );
      return false;
    }

    // Check if can open position
    const riskValidation = await this.riskManagement.canOpenPosition(
      positionSize.notionalValue,
      { delta: 50, vega: 10, gamma: 5 }, // TODO: Get actual Greeks
      currentRisk,
    );

    if (!riskValidation.allowed) {
      this.logger.warn(`Risk validation failed: ${riskValidation.reason}`);
      return false;
    }

    return true;
  }

  /**
   * Step 5: Execute order
   */
  private async executeOrder(
    strategy: Strategy,
    signal: TradingSignal,
    userId: string,
  ): Promise<void> {
    this.logger.log(`Executing order for strategy: ${strategy.name}`);

    // TODO: Build actual order legs based on strategy type
    // This is a simplified example
    const orderRequest = this.orderPlacement.buildMultiLegOrder(strategy, [
      {
        instrumentKey: 'NSE_FO|12345', // TODO: Get actual instrument keys
        side: 'BUY',
        quantity: 50,
        price: 100, // TODO: Get actual prices
      },
    ]);

    // Place order
    const order = await this.orderPlacement.placeOrder(
      strategy,
      orderRequest.legs,
      userId,
    );

    // TODO: Start monitoring fills
    // await this.executionMonitor.startMonitoring(order.orderId);

    this.logger.log(`Order placed successfully: ${order.orderId}`);
  }

  /**
   * Health check - verify all engines are operational
   */
  async healthCheck(): Promise<{
    dataEngine: boolean;
    signalEngine: boolean;
    policyEngine: boolean;
    executionEngine: boolean;
  }> {
    return {
      dataEngine: true, // TODO: Check DB connection
      signalEngine: true, // TODO: Check models loaded
      policyEngine: true,
      executionEngine: true, // TODO: Check API connection
    };
  }
}
