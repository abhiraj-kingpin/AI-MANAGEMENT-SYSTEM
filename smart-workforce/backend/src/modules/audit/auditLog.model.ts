import { type Document, Schema, type Types, model } from 'mongoose';

export const AUDIT_RESULTS = ['success', 'failed', 'blocked'] as const;
export type AuditResult = (typeof AUDIT_RESULTS)[number];

export interface IAuditLog extends Document {
  actorId: Types.ObjectId;
  action: string;
  entityType: string;
  entityId: Types.ObjectId;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  // Every current recordAudit() call site only fires after the mutation it
  // describes has already succeeded, so 'success' is the correct default
  // for the full existing history as well as new rows — 'failed'/'blocked'
  // are available for future call sites that want to log a rejected action.
  result: AuditResult;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    result: { type: String, enum: AUDIT_RESULTS, default: 'success' },
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
