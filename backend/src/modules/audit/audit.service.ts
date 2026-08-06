import { logger } from '../../config/logger';
import { AuditLog } from './auditLog.model';

export interface AuditEntry {
  actorId: string;
  action: string; // e.g. "attendance.correct", "attendance.correction.approve"
  entityType: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Fire-and-forget by design: a failed audit write must never fail the
 * request it's describing (the primary action already succeeded). Logs the
 * failure loudly instead, since a missing audit entry is a compliance gap
 * worth noticing, not a silent one.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await AuditLog.create(entry);
  } catch (err) {
    logger.error('Failed to write audit log entry', { entry, err });
  }
}
