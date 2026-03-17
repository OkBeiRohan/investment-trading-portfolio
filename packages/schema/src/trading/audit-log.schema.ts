export type AuditLogCategory = 'auth' | 'trading' | 'admin' | 'data' | 'training' | 'system';

export interface IAuditLog {
  action: string;
  category: AuditLogCategory;
  userId: string;
  targetId?: string;
  targetType?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}
