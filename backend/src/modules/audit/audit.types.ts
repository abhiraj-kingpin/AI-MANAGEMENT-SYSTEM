import type { IAuditLog } from './auditLog.model';

export interface AuditLogDTO {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export function toAuditLogDTO(doc: IAuditLog): AuditLogDTO {
  return {
    id: doc.id as string,
    actorId: String(doc.actorId),
    action: doc.action,
    entityType: doc.entityType,
    entityId: String(doc.entityId),
    before: doc.before ?? null,
    after: doc.after ?? null,
    ipAddress: doc.ipAddress,
    userAgent: doc.userAgent,
    createdAt: doc.createdAt,
  };
}
