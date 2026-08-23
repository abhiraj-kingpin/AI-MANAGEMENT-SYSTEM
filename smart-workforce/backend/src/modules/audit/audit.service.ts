import { logger } from '../../config/logger';
import type { PaginatedResult } from '../../shared/types/pagination';
import { type AuditLogDTO, toAuditLogDTO } from './audit.types';
import { AuditLog } from './auditLog.model';
import type { ListAuditLogsQuery } from './audit.validators';

export interface AuditEntry {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
}

export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await AuditLog.create(entry);
  } catch (err) {
    logger.error('Failed to write audit log entry', { entry, err });
  }
}

export async function listAuditLogs(
  query: ListAuditLogsQuery,
): Promise<PaginatedResult<AuditLogDTO>> {
  const filter: Record<string, unknown> = {};
  if (query.entityType) filter.entityType = query.entityType;
  if (query.entityId) filter.entityId = query.entityId;
  if (query.actorId) filter.actorId = query.actorId;
  if (query.from || query.to) {
    filter.createdAt = {
      ...(query.from ? { $gte: query.from } : {}),
      ...(query.to ? { $lte: query.to } : {}),
    };
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    AuditLog.countDocuments(filter),
  ]);

  return {
    items: items.map(toAuditLogDTO),
    total,
    page: query.page,
    limit: query.limit,
    pages: Math.max(1, Math.ceil(total / query.limit)),
  };
}
