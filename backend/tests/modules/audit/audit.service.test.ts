import { mockQuery } from '../../utils/mockQuery';

jest.mock('../../../src/modules/audit/auditLog.model', () => ({
  AuditLog: { create: jest.fn(), find: jest.fn(), countDocuments: jest.fn() },
}));

import { listAuditLogs, recordAudit } from '../../../src/modules/audit/audit.service';
import { AuditLog } from '../../../src/modules/audit/auditLog.model';

const mockedCreate = AuditLog.create as unknown as jest.Mock;
const mockedFind = AuditLog.find as unknown as jest.Mock;
const mockedCount = AuditLog.countDocuments as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('recordAudit', () => {
  it('writes the entry as given', async () => {
    mockedCreate.mockResolvedValue({});

    await recordAudit({
      actorId: 'user-1',
      action: 'attendance.correct',
      entityType: 'Attendance',
      entityId: 'att-1',
    });

    expect(mockedCreate).toHaveBeenCalledWith({
      actorId: 'user-1',
      action: 'attendance.correct',
      entityType: 'Attendance',
      entityId: 'att-1',
    });
  });

  it('never throws — a failed audit write is logged, not propagated to the caller', async () => {
    mockedCreate.mockRejectedValue(new Error('db down'));

    await expect(
      recordAudit({ actorId: 'user-1', action: 'x', entityType: 'Y', entityId: 'z' }),
    ).resolves.toBeUndefined();
  });
});

describe('listAuditLogs', () => {
  function fakeLog(overrides: Record<string, unknown> = {}) {
    return {
      id: 'log-1',
      actorId: 'user-1',
      action: 'attendance.correct',
      entityType: 'Attendance',
      entityId: 'att-1',
      before: null,
      after: null,
      ipAddress: undefined,
      userAgent: undefined,
      createdAt: new Date('2026-08-01T00:00:00Z'),
      ...overrides,
    };
  }

  it('paginates with no filters by default', async () => {
    mockedFind.mockReturnValue(mockQuery([fakeLog()]));
    mockedCount.mockResolvedValue(1);

    const result = await listAuditLogs({ page: 1, limit: 20 });

    expect(mockedFind).toHaveBeenCalledWith({});
    expect(result).toEqual({ items: [expect.any(Object)], total: 1, page: 1, limit: 20, pages: 1 });
    expect(result.items[0].id).toBe('log-1');
  });

  it('combines every provided filter with AND semantics', async () => {
    mockedFind.mockReturnValue(mockQuery([]));
    mockedCount.mockResolvedValue(0);
    const from = new Date('2026-08-01T00:00:00Z');
    const to = new Date('2026-08-31T00:00:00Z');

    await listAuditLogs({
      entityType: 'Attendance',
      entityId: 'att-1',
      actorId: 'user-1',
      from,
      to,
      page: 1,
      limit: 20,
    });

    expect(mockedFind).toHaveBeenCalledWith({
      entityType: 'Attendance',
      entityId: 'att-1',
      actorId: 'user-1',
      createdAt: { $gte: from, $lte: to },
    });
  });

  it('accepts an open-ended date range (only `from`, or only `to`)', async () => {
    mockedFind.mockReturnValue(mockQuery([]));
    mockedCount.mockResolvedValue(0);
    const from = new Date('2026-08-01T00:00:00Z');

    await listAuditLogs({ from, page: 1, limit: 20 });

    expect(mockedFind).toHaveBeenCalledWith({ createdAt: { $gte: from } });
  });

  it('maps a null before/after to null, not undefined, in the DTO', async () => {
    mockedFind.mockReturnValue(
      mockQuery([fakeLog({ before: { status: 'present' }, after: { status: 'late' } })]),
    );
    mockedCount.mockResolvedValue(1);

    const result = await listAuditLogs({ page: 1, limit: 20 });

    expect(result.items[0].before).toEqual({ status: 'present' });
    expect(result.items[0].after).toEqual({ status: 'late' });
  });
});
