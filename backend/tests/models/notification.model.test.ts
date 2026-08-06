import { Types } from 'mongoose';
import { Notification } from '../../src/modules/notifications/notification.model';

describe('Notification model validation', () => {
  it('accepts a well-formed, targeted notification', () => {
    const notification = new Notification({
      recipientId: new Types.ObjectId(),
      title: 'Leave approved',
      body: 'Your leave request was approved.',
      type: 'leave',
    });

    expect(notification.validateSync()).toBeUndefined();
    expect(notification.isRead).toBe(false); // default
  });

  it('accepts a null recipientId (broadcast to all)', () => {
    const notification = new Notification({
      recipientId: null,
      title: 'Office closed',
      body: 'Office closed for maintenance.',
      type: 'announcement',
    });

    expect(notification.validateSync()).toBeUndefined();
  });

  it('rejects a type outside the enum', () => {
    const notification = new Notification({
      recipientId: new Types.ObjectId(),
      title: 'X',
      body: 'Y',
      type: 'made-up',
    });

    const error = notification.validateSync();
    expect(error?.errors.type).toBeDefined();
  });

  it('requires a title and body', () => {
    const notification = new Notification({ recipientId: new Types.ObjectId(), type: 'leave' });
    const error = notification.validateSync();
    expect(error?.errors.title).toBeDefined();
    expect(error?.errors.body).toBeDefined();
  });
});
