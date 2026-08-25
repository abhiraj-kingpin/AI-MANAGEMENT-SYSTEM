import { Types } from 'mongoose';
import { AppError } from '../../shared/errors/AppError';
import type { ActorContext } from '../../shared/types/actorContext';
import { requireEmployeeId } from '../../shared/utils/actor';
import { shiftDurationMinutes, startOfUtcDay } from '../../shared/utils/dateTime';
import type { EmployeeRefDTO } from '../../shared/utils/employeeRef';
import { Employee } from '../employees/employee.model';
import { notify } from '../notifications/notification.service';
import { type ShiftDTO, toShiftDTO } from './shift.types';
import type { IShift } from './shift.model';
import { Shift } from './shift.model';
import {
  type RosterEmployeeDTO,
  type ShiftAssignmentDTO,
  toShiftAssignmentDTO,
} from './shiftAssignment.types';
import { type IShiftAssignment, ShiftAssignment } from './shiftAssignment.model';
import type {
  AssignShiftInput,
  BulkAssignShiftInput,
  ListAssignmentsQuery,
} from './shiftAssignment.validators';

function shiftRef(assignment: IShiftAssignment): IShift | undefined {
  const value = assignment.shiftId as unknown;
  if (value && typeof value === 'object' && 'startTime' in value) {
    return value as IShift;
  }
  return undefined;
}

async function findEffectiveAssignment(
  employeeId: string,
  date: Date,
): Promise<IShiftAssignment | null> {
  const day = startOfUtcDay(date);
  return ShiftAssignment.findOne({
    employeeId,
    effectiveFrom: { $lte: day },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: day } }],
  })
    .sort({ effectiveFrom: -1 })
    .populate('shiftId');
}

async function assignOne(
  employeeId: string,
  shiftId: string,
  effectiveFrom: Date,
): Promise<{ assignment: IShiftAssignment; shift: IShift }> {
  const shift = await Shift.findById(shiftId);
  if (!shift) {
    throw AppError.badRequest('Shift not found.', 'SHIFT_NOT_FOUND');
  }
  if (!shift.isActive) {
    throw AppError.badRequest('Cannot assign an inactive shift.', 'SHIFT_INACTIVE');
  }

  const from = startOfUtcDay(effectiveFrom);
  const today = startOfUtcDay(new Date());
  if (from.getTime() < today.getTime()) {
    throw AppError.badRequest('effectiveFrom cannot be in the past.', 'EFFECTIVE_FROM_IN_PAST');
  }

  const sameDayOpen = await ShiftAssignment.findOne({
    employeeId,
    effectiveFrom: from,
    effectiveTo: null,
  });
  if (sameDayOpen) {
    sameDayOpen.shiftId = new Types.ObjectId(shiftId);
    await sameDayOpen.save();
    return { assignment: sameDayOpen, shift };
  }

  const dayBefore = new Date(from.getTime() - 24 * 60 * 60 * 1000);
  await ShiftAssignment.updateMany(
    { employeeId, effectiveTo: null, effectiveFrom: { $lt: from } },
    { $set: { effectiveTo: dayBefore } },
  );

  const assignment = await ShiftAssignment.create({
    employeeId,
    shiftId,
    effectiveFrom: from,
    effectiveTo: null,
  });
  return { assignment, shift };
}

export const shiftAssignmentService = {
  async assign(input: AssignShiftInput): Promise<ShiftAssignmentDTO> {
    const { assignment, shift } = await assignOne(
      input.employeeId,
      input.shiftId,
      input.effectiveFrom,
    );
    await notify(
      input.employeeId,
      'Shift assigned',
      `You've been assigned to "${shift.name}" starting ${assignment.effectiveFrom.toISOString().slice(0, 10)}.`,
      'shift',
      { shiftId: shift.id },
    );
    return toShiftAssignmentDTO(assignment, shift);
  },

  async bulkAssign(
    input: BulkAssignShiftInput,
  ): Promise<{ assigned: string[]; failed: { employeeId: string; message: string }[] }> {
    const assigned: string[] = [];
    const failed: { employeeId: string; message: string }[] = [];

    for (const employeeId of input.employeeIds) {
      try {
        await assignOne(employeeId, input.shiftId, input.effectiveFrom);
        assigned.push(employeeId);
      } catch (error) {
        failed.push({
          employeeId,
          message: error instanceof AppError ? error.message : 'Assignment failed.',
        });
      }
    }

    return { assigned, failed };
  },

  async getMyShift(actor: ActorContext): Promise<ShiftAssignmentDTO | null> {
    const employeeId = requireEmployeeId(actor);
    const assignment = await findEffectiveAssignment(employeeId, new Date());
    if (!assignment) return null;

    const shift = shiftRef(assignment);
    if (!shift) return null;
    return toShiftAssignmentDTO(assignment, shift);
  },

  // Powers the Shifts roster grid — every employee (optionally scoped to a
  // department), with the shift assignment(s) that overlap the requested
  // week. An employee's assignment is an effective-date *range*, not a
  // per-day rotation, so most weeks show the same shift repeated across
  // every day; a cell only changes where a new assignment actually starts
  // partway through the week.
  async listRoster(query: ListAssignmentsQuery): Promise<RosterEmployeeDTO[]> {
    const employeeFilter: Record<string, unknown> = { isDeleted: false };
    if (query.departmentId) employeeFilter.departmentId = query.departmentId;

    const employees = await Employee.find(employeeFilter)
      .select('employeeCode firstName lastName departmentId')
      .sort({ firstName: 1 })
      .limit(500);
    if (employees.length === 0) return [];

    const employeeIds = employees.map((e) => e._id);
    const assignments = await ShiftAssignment.find({
      employeeId: { $in: employeeIds },
      effectiveFrom: { $lte: query.to },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gte: query.from } }],
    })
      .populate('shiftId')
      .sort({ effectiveFrom: 1 });

    const byEmployee = new Map<string, IShiftAssignment[]>();
    for (const assignment of assignments) {
      const key = String(assignment.employeeId);
      const list = byEmployee.get(key);
      if (list) list.push(assignment);
      else byEmployee.set(key, [assignment]);
    }

    return employees.map((employee) => {
      const employeeId = String(employee._id);
      const employeeAssignments = (byEmployee.get(employeeId) ?? [])
        .map((assignment) => {
          const shift = shiftRef(assignment);
          return shift
            ? {
                shift: toShiftDTO(shift) as ShiftDTO,
                effectiveFrom: assignment.effectiveFrom,
                effectiveTo: assignment.effectiveTo,
              }
            : null;
        })
        .filter((x): x is { shift: ShiftDTO; effectiveFrom: Date; effectiveTo: Date | null } => x !== null);

      const ref: EmployeeRefDTO = {
        id: employeeId,
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
      };

      return { employee: ref, departmentId: String(employee.departmentId), assignments: employeeAssignments };
    });
  },
};

export async function getEffectiveShift(
  employeeId: string,
  date: Date,
): Promise<{
  startTime: string;
  gracePeriodMinutes: number;
  workdayMinutes: number;
  shiftId: string;
} | null> {
  const assignment = await findEffectiveAssignment(employeeId, date);
  if (!assignment) return null;

  const shift = shiftRef(assignment);
  if (!shift) return null;

  return {
    startTime: shift.startTime,
    gracePeriodMinutes: shift.gracePeriodMinutes,
    workdayMinutes: shiftDurationMinutes(shift.startTime, shift.endTime),
    shiftId: String(shift.id),
  };
}
