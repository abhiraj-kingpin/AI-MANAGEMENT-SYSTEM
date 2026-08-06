import { mockQuery } from '../../utils/mockQuery';

jest.mock('../../../src/modules/notifications/notification.model', () => {
  const actual = jest.requireActual('../../../src/modules/notifications/notification.model');
  return {
    ...actual,
    Notification: {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      countDocuments: jest.fn(),
      updateMany: jest.fn(),
      insertMany: jest.fn(),
    },
  };
});
jest.mock('../../../src/modules/employees/employee.model', () => ({
  Employee: { findById: jest.fn(), find: jest.fn() },
}));
jest.mock('../../../src/modules/users/user.model', () => ({
  User: { findById: jest.fn(), findByIdAndUpdate: jest.fn() },
}));
jest.mock('../../../src/modules/notifications/push.service', () => ({
  sendPushNotification: jest.fn(() => Promise.resolve()),
}));

import { Employee } from '../../../src/modules/employees/employee.model';
import { Notification } from '../../../src/modules/notifications/notification.model';
import {
  notificationService,
  notify,
} from '../../../src/modules/notifications/notification.service';
import { sendPushNotification } from '../../../src/modules/notifications/push.service';
import { User } from '../../../src/modules/users/user.model';
import type { ActorContext } from '../../../src/shared/types/actorContext';

const mockedNotificationCreate = Notification.create as unknown as jest.Mock;
const mockedNotificationFind = Notification.find as unknown as jest.Mock;
const mockedNotificationFindById = Notification.findById as unknown as jest.Mock;
const mockedNotificationCount = Notification.countDocuments as unknown as jest.Mock;
const mockedNotificationUpdateMany = Notification.updateMany as unknown as jest.Mock;
const mockedNotificationInsertMany = Notification.insertMany as unknown as jest.Mock;
const mockedEmployeeFindById = Employee.findById as unknown as jest.Mock;
const mockedEmployeeFind = Employee.find as unknown as jest.Mock;
const mockedUserFindById = User.findById as unknown as jest.Mock;
const mockedUserFindByIdAndUpdate = User.findByIdAndUpdate as unknown as jest.Mock;
const mockedSendPush = sendPushNotification as unknown as jest.Mock;

const EMPLOYEE_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

function fakeNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: 'notif-1',
    recipientId: EMPLOYEE_ID,
    title: 'Title',
    body: 'Body',
    type: 'leave',
    isRead: false,
    createdAt: new Date(),
    save: jest.fn(function save(this: object) {
      return Promise.resolve(this);
    }),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('notify()', () => {
  it("creates a real Notification document and pushes to the recipient's registered devices", async () => {
    mockedNotificationCreate.mockResolvedValue(fakeNotification());
    mockedEmployeeFindById.mockReturnValue(mockQuery({ userId: 'user-1' }));
    mockedUserFindById.mockReturnValue(mockQuery({ deviceTokens: ['token-1', 'token-2'] }));

    await notify(EMPLOYEE_ID, 'Title', 'Body', 'leave', { leaveId: 'leave-1' });

    expect(mockedNotificationCreate).toHaveBeenCalledWith({
      recipientId: EMPLOYEE_ID,
      title: 'Title',
      body: 'Body',
      type: 'leave',
      data: { leaveId: 'leave-1' },
    });
    expect(mockedSendPush).toHaveBeenCalledWith(['token-1', 'token-2'], 'Title', 'Body');
  });

  it('never throws — swallows a failure and logs instead (fire-and-forget, same contract as recordAudit)', async () => {
    mockedNotificationCreate.mockRejectedValue(new Error('DB unavailable'));

    await expect(notify(EMPLOYEE_ID, 'Title', 'Body', 'leave')).resolves.toBeUndefined();
    expect(mockedSendPush).not.toHaveBeenCalled();
  });

  it("does nothing further if the recipient's employee record can't be found", async () => {
    mockedNotificationCreate.mockResolvedValue(fakeNotification());
    mockedEmployeeFindById.mockReturnValue(mockQuery(null));

    await expect(notify(EMPLOYEE_ID, 'Title', 'Body', 'leave')).resolves.toBeUndefined();
    expect(mockedSendPush).not.toHaveBeenCalled();
  });
});

describe('notificationService.getMyNotifications', () => {
  it('rejects an actor with no linked employee profile', async () => {
    const actor: ActorContext = { id: 'user-x', role: 'employee' };
    await expect(
      notificationService.getMyNotifications(actor, { page: 1, limit: 20 }),
    ).rejects.toMatchObject({ code: 'NO_EMPLOYEE_PROFILE' });
  });

  it("includes both the caller's own notifications and global broadcasts", async () => {
    mockedNotificationFind.mockReturnValue(mockQuery([fakeNotification()]));
    mockedNotificationCount.mockResolvedValue(1);
    const actor: ActorContext = { id: 'user-1', role: 'employee', employeeId: EMPLOYEE_ID };

    await notificationService.getMyNotifications(actor, { page: 1, limit: 20 });

    expect(mockedNotificationFind).toHaveBeenCalledWith({
      $or: [{ recipientId: EMPLOYEE_ID }, { recipientId: null }],
    });
  });

  it('adds an isRead:false filter when unread=true', async () => {
    mockedNotificationFind.mockReturnValue(mockQuery([]));
    mockedNotificationCount.mockResolvedValue(0);
    const actor: ActorContext = { id: 'user-1', role: 'employee', employeeId: EMPLOYEE_ID };

    await notificationService.getMyNotifications(actor, { unread: true, page: 1, limit: 20 });

    expect(mockedNotificationFind).toHaveBeenCalledWith(expect.objectContaining({ isRead: false }));
  });
});

describe('notificationService.markRead', () => {
  it('404s for a missing notification', async () => {
    mockedNotificationFindById.mockResolvedValue(null);
    const actor: ActorContext = { id: 'user-1', role: 'employee', employeeId: EMPLOYEE_ID };
    await expect(notificationService.markRead('ghost', actor)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it("rejects marking someone else's targeted notification read", async () => {
    mockedNotificationFindById.mockResolvedValue(fakeNotification({ recipientId: 'someone-else' }));
    const actor: ActorContext = { id: 'user-1', role: 'employee', employeeId: EMPLOYEE_ID };
    await expect(notificationService.markRead('notif-1', actor)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it("marks the caller's own notification read", async () => {
    const fake = fakeNotification({ recipientId: EMPLOYEE_ID });
    mockedNotificationFindById.mockResolvedValue(fake);
    const actor: ActorContext = { id: 'user-1', role: 'employee', employeeId: EMPLOYEE_ID };

    const dto = await notificationService.markRead('notif-1', actor);

    expect(fake.isRead).toBe(true);
    expect(dto.isRead).toBe(true);
  });

  it('lets any authenticated employee mark a global broadcast (recipientId: null) read', async () => {
    const fake = fakeNotification({ recipientId: null });
    mockedNotificationFindById.mockResolvedValue(fake);
    const actor: ActorContext = { id: 'user-1', role: 'employee', employeeId: EMPLOYEE_ID };

    const dto = await notificationService.markRead('notif-1', actor);

    expect(dto.isRead).toBe(true);
  });
});

describe('notificationService.markAllRead', () => {
  it("only ever updates the caller's own targeted notifications, never a shared broadcast", async () => {
    mockedNotificationUpdateMany.mockResolvedValue({ modifiedCount: 3 });
    const actor: ActorContext = { id: 'user-1', role: 'employee', employeeId: EMPLOYEE_ID };

    const result = await notificationService.markAllRead(actor);

    expect(mockedNotificationUpdateMany).toHaveBeenCalledWith(
      { recipientId: EMPLOYEE_ID, isRead: false },
      { $set: { isRead: true } },
    );
    expect(result.count).toBe(3);
  });
});

describe('notificationService.broadcast', () => {
  it('creates one recipientId:null document for a company-wide broadcast', async () => {
    mockedNotificationCreate.mockResolvedValue(fakeNotification({ recipientId: null }));

    const result = await notificationService.broadcast({
      title: 'Office closed',
      body: 'Closed for maintenance.',
      type: 'announcement',
    });

    expect(mockedNotificationCreate).toHaveBeenCalledWith({
      recipientId: null,
      title: 'Office closed',
      body: 'Closed for maintenance.',
      type: 'announcement',
    });
    expect(result.count).toBe(1);
    expect(mockedEmployeeFind).not.toHaveBeenCalled();
  });

  it('fans out to one real, targeted document per active employee when scoped to a department', async () => {
    mockedEmployeeFind.mockReturnValue(mockQuery([{ _id: 'emp-1' }, { _id: 'emp-2' }]));

    const result = await notificationService.broadcast({
      title: 'Team meeting',
      body: 'Tomorrow at 10am.',
      type: 'announcement',
      departmentId: 'dept-1',
    });

    expect(mockedNotificationInsertMany).toHaveBeenCalledWith([
      {
        recipientId: 'emp-1',
        title: 'Team meeting',
        body: 'Tomorrow at 10am.',
        type: 'announcement',
      },
      {
        recipientId: 'emp-2',
        title: 'Team meeting',
        body: 'Tomorrow at 10am.',
        type: 'announcement',
      },
    ]);
    expect(result.count).toBe(2);
    expect(mockedNotificationCreate).not.toHaveBeenCalled();
  });

  it('reports 0 without writing anything for an empty department', async () => {
    mockedEmployeeFind.mockReturnValue(mockQuery([]));

    const result = await notificationService.broadcast({
      title: 'X',
      body: 'Y',
      type: 'announcement',
      departmentId: 'dept-empty',
    });

    expect(result.count).toBe(0);
    expect(mockedNotificationInsertMany).not.toHaveBeenCalled();
  });
});

describe('notificationService.registerDeviceToken', () => {
  it("adds the token to the caller's User document, deduplicated", async () => {
    const actor: ActorContext = { id: 'user-1', role: 'employee', employeeId: EMPLOYEE_ID };

    await notificationService.registerDeviceToken(actor, 'token-abc');

    expect(mockedUserFindByIdAndUpdate).toHaveBeenCalledWith('user-1', {
      $addToSet: { deviceTokens: 'token-abc' },
    });
  });
});
