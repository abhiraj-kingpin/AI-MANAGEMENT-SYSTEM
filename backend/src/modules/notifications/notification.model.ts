import { type Document, Schema, type Types, model } from 'mongoose';

// const tuple (not `type` + array) so this can feed `z.enum(...)` directly
// in notification.validators.ts — see shared/constants/roles.ts for the pattern.
export const NOTIFICATION_TYPES = [
  'attendance',
  'leave',
  'salary',
  'shift',
  'holiday',
  'birthday',
  'announcement',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface INotification extends Document {
  recipientId: Types.ObjectId | null; // null = broadcast to all/department
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'Employee', default: null, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    isRead: { type: Boolean, default: false },
    data: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export const Notification = model<INotification>('Notification', notificationSchema);
