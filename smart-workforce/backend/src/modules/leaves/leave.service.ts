import { Types } from 'mongoose';
import { logger } from '../../config/logger';
import { AppError } from '../../shared/errors/AppError';
import type { ActorContext } from '../../shared/types/actorContext';
import type { PaginatedResult } from '../../shared/types/pagination';
import { countBusinessDays, listBusinessDays } from '../../shared/utils/businessDays';
import { requireEmployeeId } from '../../shared/utils/actor';
import { startOfUtcDay } from '../../shared/utils/dateTime';
import { resolveEmployeeRefs } from '../../shared/utils/employeeRef';
import { getManagedEmployeeIds } from '../../shared/utils/teamScope';
import { Attendance } from '../attendance/attendance.model';
import { recordAudit } from '../audit/audit.service';
import { Employee } from '../employees/employee.model';
import { notify } from '../notifications/notification.service';
import { getHolidayDatesInRange } from './holiday.service';
import { type ILeave, Leave, type LeaveStatus } from './leave.model';
import { LeaveBalance } from './leaveBalance.model';
import { LeaveType } from './leaveType.model';
import { type LeaveBalanceDTO, type LeaveDTO, toLeaveDTO } from './leave.types';
import type { ApplyLeaveInput, ListLeavesQuery } from './leave.validators';

async function getEffectiveBalance(
  employeeId: string,
  leaveTypeId: string,
  year: number,
  defaultAnnualQuota: number,
): Promise<{ allocated: number; used: number; carriedForward: number }> {
  const existing = await LeaveBalance.findOne({ employeeId, leaveTypeId, year });
  if (existing) {
    return {
      allocated: existing.allocated,
      used: existing.used,
      carriedForward: existing.carriedForward,
    };
  }
  return { allocated: defaultAnnualQuota, used: 0, carriedForward: 0 };
}

async function adjustBalanceUsed(
  employeeId: string,
  leaveTypeId: string,
  year: number,
  delta: number,
): Promise<void> {
  const leaveType = await LeaveType.findById(leaveTypeId);
  await LeaveBalance.findOneAndUpdate(
    { employeeId, leaveTypeId, year },
    {
      $inc: { used: delta },
      $setOnInsert: { allocated: leaveType?.defaultAnnualQuota ?? 0, carriedForward: 0 },
    },
    { upsert: true },
  );
}

async function hasOverlappingLeave(
  employeeId: string,
  startDate: Date,
  endDate: Date,
): Promise<boolean> {
  const overlap = await Leave.findOne({
    employeeId,
    status: { $in: ['pending', 'approved'] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });
  return !!overlap;
}

async function markAttendanceOnLeave(employeeId: string, days: Date[]): Promise<void> {
  await Promise.all(
    days.map((date) =>
      Attendance.updateOne(
        { employeeId, date },
        { $setOnInsert: { employeeId, date, method: 'manual', status: 'on_leave' } },
        { upsert: true },
      ),
    ),
  );
}

async function clearFutureOnLeaveStubs(employeeId: string, from: Date): Promise<void> {
  await Attendance.deleteMany({
    employeeId,
    date: { $gte: startOfUtcDay(from) },
    status: 'on_leave',
    checkInAt: null,
  });
}

async function resolveLeaveTypeNames(leaves: ILeave[]): Promise<Map<string, string>> {
  const leaveTypeIds = [...new Set(leaves.map((l) => String(l.leaveTypeId)))];
  const leaveTypes = await LeaveType.find({ _id: { $in: leaveTypeIds } }).select('name');
  return new Map(leaveTypes.map((lt) => [String(lt._id), lt.name]));
}

export const leaveService = {
  async apply(actor: ActorContext, input: ApplyLeaveInput): Promise<LeaveDTO> {
    const employeeId = requireEmployeeId(actor);

    const leaveType = await LeaveType.findById(input.leaveTypeId);
    if (!leaveType) {
      throw AppError.badRequest('Leave type not found.', 'LEAVE_TYPE_NOT_FOUND');
    }

    if (await hasOverlappingLeave(employeeId, input.startDate, input.endDate)) {
      throw AppError.conflict(
        'You already have a pending or approved leave overlapping these dates.',
        'LEAVE_OVERLAP',
      );
    }

    const holidayDates = await getHolidayDatesInRange(input.startDate, input.endDate);
    const totalDays = countBusinessDays(input.startDate, input.endDate, holidayDates);
    if (totalDays < 0.5) {
      throw AppError.badRequest(
        'The selected range has no working days (weekends/holidays only).',
        'NO_WORKING_DAYS',
      );
    }

    const year = input.startDate.getUTCFullYear();
    const balance = await getEffectiveBalance(
      employeeId,
      input.leaveTypeId,
      year,
      leaveType.defaultAnnualQuota,
    );
    const remaining = balance.allocated + balance.carriedForward - balance.used;
    if (totalDays > remaining) {
      throw AppError.unprocessable(
        `Insufficient leave balance: ${remaining} day(s) remaining, ${totalDays} requested.`,
        'INSUFFICIENT_BALANCE',
        { remaining, requested: totalDays },
      );
    }

    const leave = await Leave.create({
      employeeId,
      leaveTypeId: input.leaveTypeId,
      startDate: input.startDate,
      endDate: input.endDate,
      totalDays,
      reason: input.reason,
      status: 'pending',
    });

    logger.info(`Leave applied by employee ${employeeId}, awaiting manager review`, {
      leaveId: leave.id,
    });
    const applicant = await Employee.findById(employeeId).select('managerId firstName lastName');
    if (applicant?.managerId) {
      await notify(
        String(applicant.managerId),
        'New leave request',
        `${applicant.firstName} ${applicant.lastName} applied for ${totalDays} day(s) of leave.`,
        'leave',
        { leaveId: leave.id },
      );
    }

    return toLeaveDTO(leave);
  },

  async cancel(leaveId: string, actor: ActorContext): Promise<LeaveDTO> {
    const employeeId = requireEmployeeId(actor);
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      throw AppError.notFound('Leave request not found.');
    }
    if (String(leave.employeeId) !== employeeId) {
      throw AppError.forbidden('You can only cancel your own leave requests.', 'FORBIDDEN');
    }

    if (leave.status === 'pending') {
      leave.status = 'cancelled';
      await leave.save();
      return toLeaveDTO(leave);
    }

    if (leave.status === 'approved' && leave.startDate.getTime() > Date.now()) {
      const year = leave.startDate.getUTCFullYear();
      await adjustBalanceUsed(employeeId, String(leave.leaveTypeId), year, -leave.totalDays);
      await clearFutureOnLeaveStubs(employeeId, leave.startDate);
      leave.status = 'cancelled';
      await leave.save();
      return toLeaveDTO(leave);
    }

    throw AppError.badRequest('This leave can no longer be cancelled.', 'CANNOT_CANCEL');
  },

  async getMyLeaves(actor: ActorContext, status?: LeaveStatus): Promise<LeaveDTO[]> {
    const employeeId = requireEmployeeId(actor);
    const filter: Record<string, unknown> = { employeeId };
    if (status) filter.status = status;

    const leaves = await Leave.find(filter).sort({ createdAt: -1 });
    const leaveTypeNames = await resolveLeaveTypeNames(leaves);
    return leaves.map((leave) =>
      toLeaveDTO(leave, undefined, leaveTypeNames.get(String(leave.leaveTypeId))),
    );
  },

  async getMyBalance(actor: ActorContext): Promise<LeaveBalanceDTO[]> {
    const employeeId = requireEmployeeId(actor);
    const year = new Date().getUTCFullYear();
    const leaveTypes = await LeaveType.find();

    return Promise.all(
      leaveTypes.map(async (lt) => {
        const balance = await getEffectiveBalance(
          employeeId,
          lt.id as string,
          year,
          lt.defaultAnnualQuota,
        );
        return {
          leaveTypeId: lt.id as string,
          leaveTypeName: lt.name,
          year,
          allocated: balance.allocated,
          used: balance.used,
          carriedForward: balance.carriedForward,
          remaining: balance.allocated + balance.carriedForward - balance.used,
        };
      }),
    );
  },

  async list(query: ListLeavesQuery, actor: ActorContext): Promise<PaginatedResult<LeaveDTO>> {
    if (actor.role === 'employee') {
      throw AppError.forbidden('You do not have permission to view the leave queue.', 'FORBIDDEN');
    }

    const filter: Record<string, unknown> = {};
    if (actor.role === 'manager') {
      const teamIds = await getManagedEmployeeIds(actor);
      if (query.employeeId) {
        if (!teamIds.includes(query.employeeId)) {
          throw AppError.forbidden('That employee is not on your team.', 'FORBIDDEN');
        }
        filter.employeeId = query.employeeId;
      } else {
        filter.employeeId = { $in: teamIds };
      }
    } else if (query.employeeId) {
      filter.employeeId = query.employeeId;
    }
    if (query.status) filter.status = query.status;

    const [items, total] = await Promise.all([
      Leave.find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit),
      Leave.countDocuments(filter),
    ]);

    const [employeeRefs, leaveTypeNames] = await Promise.all([
      resolveEmployeeRefs(items, (item) => String(item.employeeId)),
      resolveLeaveTypeNames(items),
    ]);

    return {
      items: items.map((item) =>
        toLeaveDTO(
          item,
          employeeRefs.get(String(item.employeeId)),
          leaveTypeNames.get(String(item.leaveTypeId)),
        ),
      ),
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.max(1, Math.ceil(total / query.limit)),
    };
  },

  async review(
    leaveId: string,
    decision: 'approved' | 'rejected',
    actor: ActorContext,
    comment: string | undefined,
  ): Promise<LeaveDTO> {
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      throw AppError.notFound('Leave request not found.');
    }
    if (leave.status !== 'pending') {
      throw AppError.badRequest('This leave has already been reviewed.', 'ALREADY_REVIEWED');
    }

    if (actor.role === 'manager') {
      const teamIds = await getManagedEmployeeIds(actor);
      if (!teamIds.includes(String(leave.employeeId))) {
        throw AppError.forbidden('That employee is not on your team.', 'FORBIDDEN');
      }
    }

    leave.status = decision;
    leave.approvedBy = actor.employeeId ? new Types.ObjectId(actor.employeeId) : null;
    leave.managerComment = comment;

    if (decision === 'approved') {
      const employeeId = String(leave.employeeId);
      const year = leave.startDate.getUTCFullYear();
      await adjustBalanceUsed(employeeId, String(leave.leaveTypeId), year, leave.totalDays);

      const holidayDates = await getHolidayDatesInRange(leave.startDate, leave.endDate);
      const days = listBusinessDays(leave.startDate, leave.endDate, holidayDates);
      await markAttendanceOnLeave(employeeId, days);
    }

    await leave.save();

    await recordAudit({
      actorId: actor.id,
      action: `leave.${decision}`,
      entityType: 'Leave',
      entityId: leave.id as string,
      before: null,
      after: { status: leave.status, managerComment: leave.managerComment ?? null },
    });

    logger.info(`Leave ${leaveId} ${decision} by user ${actor.id}`);
    await notify(
      String(leave.employeeId),
      `Leave request ${decision}`,
      decision === 'approved'
        ? `Your leave request for ${leave.totalDays} day(s) was approved.`
        : `Your leave request was rejected.${comment ? ` Reason: ${comment}` : ''}`,
      'leave',
      { leaveId: leave.id },
    );

    return toLeaveDTO(leave);
  },
};
