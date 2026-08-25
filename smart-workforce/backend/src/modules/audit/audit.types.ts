import type { AuditResult, IAuditLog } from './auditLog.model';

export interface AuditLogDTO {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  result: AuditResult;
  source: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export function toAuditLogDTO(doc: IAuditLog, actorEmail?: string): AuditLogDTO {
  return {
    id: doc.id as string,
    actorId: String(doc.actorId),
    actorEmail: actorEmail ?? 'Unknown',
    action: doc.action,
    entityType: doc.entityType,
    entityId: String(doc.entityId),
    before: doc.before ?? null,
    after: doc.after ?? null,
    result: doc.result ?? 'success',
    source: doc.ipAddress ?? 'Console',
    ipAddress: doc.ipAddress,
    userAgent: doc.userAgent,
    createdAt: doc.createdAt,
  };
}
