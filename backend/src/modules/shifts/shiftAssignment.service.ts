import { Types } from 'mongoose';
import { AppError } from '../../shared/errors/AppError';
import type { ActorContext } from '../../shared/types/actorContext';
import { requireEmployeeId } from '../../shared/utils/actor';
import { shiftDurationMinutes, startOfUtcDay } from '../../shared/utils/dateTime';
import { notify } from '../notifications/notification.service';
import type { IShift } from './shift.model';
import { Shift } from './shift.model';
import { type ShiftAssignmentDTO, toShiftAssignmentDTO } from './shiftAssignment.types';
import { type IShiftAssignment, ShiftAssignment } from './shiftAssignment.model';
import type { AssignShiftInput, BulkAssignShiftInput } from './shiftAssignment.validators';

/** Reads the populated `shiftId` ref — undefined if population somehow didn't happen. Same pattern as attendance.service.ts#employeeRef. */
function shiftRef(assignment: IShiftAssignment): IShift | undefined {
  const value = assignment.shiftId as unknown;
  if (value && typeof value === 'object' && 'startTime' in value) {
    return value as IShift;
  }
  return undefined;
}

/** The assignment effective on the given date — most recent `effectiveFrom` on/before it, still open (`effectiveTo: null`) or not yet ended. */
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

/**
 * Assigns one employee to one shift, starting `effectiveFrom`.
 *
 * Assignments are forward-only (`effectiveFrom` must be today or later) —
 * deliberately, so "close the previous assignment out" never has to
 * reconcile overlapping or backdated history: there is at most one
 * open-ended (`effectiveTo: null`) assignment per employee at any time,
 * and this is the only place that invariant is maintained.
 *
 * Reassigning again for the *same* `effectiveFrom` day (a same-day
 * correction) updates that assignment's shift in place rather than
 * creating a second, redundant open-ended row for the same day.
 */
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

  // Close out whatever was open before this one — one day earlier, so the
  // two assignments never both claim the same calendar day.
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

  /**
   * Assigns every listed employee to the same shift/effectiveFrom — one
   * failure doesn't roll back the others (reported per-employee). Doesn't
   * notify per-employee the way `assign` does — see backend/README.md's
   * Notifications section for why a bulk fan-out of pushes is deferred to
   * the same queued-job treatment as Phase 11's payroll run.
   */
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
};

/**
 * Used by attendance.service.ts to resolve late/grace-period math against
 * the employee's real assigned shift instead of a single hardcoded default —
 * for both the late/grace-period check at check-in and the
 * overtime/half-day thresholds at check-out (`workdayMinutes`, wrap-aware
 * for shifts that cross midnight — see `shiftDurationMinutes`).
 * Returns `null` when the employee has never been assigned one — callers
 * fall back to a documented default rather than failing check-in outright.
 */
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
