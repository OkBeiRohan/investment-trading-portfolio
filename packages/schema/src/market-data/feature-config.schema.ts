export type FeatureCategory = 'index_breadth' | 'nifty_future' | 'options' | 'volatility' | 'order_flow' | 'price_structure' | 'momentum' | 'moving_averages' | 'bollinger' | 'regime' | 'time_context' | 'global_macro' | 'pre_market' | 'mcx';
export type ComputeFrequency = 'tick' | '1s' | '1m' | '5m' | 'eod';

export interface IFeatureConfig {
  featureName: string;
  category: FeatureCategory;
  enabled: boolean;
  parameters: Record<string, number>;
  tier: number;
  computeFrequency: ComputeFrequency;
  description?: string;
  dependencies: string[];
  createdAt: Date;
  updatedAt: Date;
}
