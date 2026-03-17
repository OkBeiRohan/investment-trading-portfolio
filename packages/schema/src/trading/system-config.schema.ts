export type SystemConfigCategory = 'market' | 'trading' | 'data' | 'training' | 'system' | 'notification';
export type SystemConfigValueType = 'string' | 'number' | 'boolean' | 'json' | 'array';

export interface ISystemConfig {
  key: string;
  value: unknown;
  category: SystemConfigCategory;
  description: string;
  valueType: SystemConfigValueType;
  isSecret: boolean;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
