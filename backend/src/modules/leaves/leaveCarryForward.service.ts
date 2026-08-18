import { logger } from '../../config/logger';
import { Employee } from '../employees/employee.model';
import { LeaveBalance } from './leaveBalance.model';
import { LeaveType } from './leaveType.model';

export interface CarryForwardResultDTO {
  fromYear: number;
  toYear: number;
  employeesProcessed: number;
  balancesUpdated: number;
}

/**
 * Computes and writes `LeaveBalance.carriedForward` for `toYear` from each
 * active employee's `fromYear` balance, for every `LeaveType` with
 * `carryForward: true` — the piece backend/README.md's "Other known,
 * documented gaps" used to flag as missing ("nothing yet computes a
 * year-end rollover automatically").
 *
 * Deliberately a plain awaited function, not a BullMQ-style job with
 * progress polling like `payrollRunService` — this writes one cheap
 * `findOneAndUpdate` per (employee, carry-forward-eligible leave type)
 * pair, nowhere near payroll's per-employee computation cost, so there's
 * nothing worth polling.
 *
 * Idempotent by design: re-running the same (fromYear, toYear) pair always
 * recomputes the same `carriedForward` value from `fromYear`'s numbers and
 * `$set`s it (not `$inc`s), so running it twice never double-applies.
 *
 * Iterates every active employee explicitly (`Employee.find`), not just
 * employees who already have a `fromYear` LeaveBalance row — an employee
 * who took zero leave that year has no persisted row (`getEffectiveBalance`
 * in leave.service.ts only creates one when a leave is actually approved),
 * but they're exactly the ones with the most unused days to carry forward.
 * Skipping them here would be the opposite of what carry-forward is for.
 *
 * Employee scope matches `payrollRunService.start`'s own `status: 'active'`
 * filter — an employee on leave/suspended/terminated at run time doesn't
 * get a fresh carry-forward computed, same reasoning payroll already
 * applies to its own batch scope.
 */
export async function runCarryForward(
  fromYear: number,
  toYear: number,
): Promise<CarryForwardResultDTO> {
  const carryForwardTypes = await LeaveType.find({ carryForward: true });
  if (carryForwardTypes.length === 0) {
    return { fromYear, toYear, employeesProcessed: 0, balancesUpdated: 0 };
  }

  const activeEmployees = await Employee.find({ status: 'active' }).select('_id');
  const employeeIds = activeEmployees.map((e) => String(e._id));

  // One batch query across every employee/type for `fromYear`, not N+1 —
  // same discipline as resolveEmployeeRefs.
  const existingBalances = await LeaveBalance.find({
    employeeId: { $in: employeeIds },
    leaveTypeId: { $in: carryForwardTypes.map((t) => t._id) },
    year: fromYear,
  });
  const existingByKey = new Map(
    existingBalances.map((b) => [`${String(b.employeeId)}:${String(b.leaveTypeId)}`, b]),
  );

  let balancesUpdated = 0;
  const processedEmployees = new Set<string>();

  for (const employeeId of employeeIds) {
    for (const leaveType of carryForwardTypes) {
      const leaveTypeId = String(leaveType._id);
      const existing = existingByKey.get(`${employeeId}:${leaveTypeId}`);
      const allocated = existing?.allocated ?? leaveType.defaultAnnualQuota;
      const used = existing?.used ?? 0;
      const priorCarry = existing?.carriedForward ?? 0;

      const remaining = allocated + priorCarry - used;
      const carryAmount = Math.max(0, Math.min(remaining, leaveType.maxCarryForwardDays));
      if (carryAmount === 0) continue; // nothing to carry — skip the write entirely

      await LeaveBalance.findOneAndUpdate(
        { employeeId, leaveTypeId, year: toYear },
        {
          $set: { carriedForward: carryAmount },
          $setOnInsert: { allocated: leaveType.defaultAnnualQuota, used: 0 },
        },
        { upsert: true },
      );
      balancesUpdated += 1;
      processedEmployees.add(employeeId);
    }
  }

  logger.info(`Leave carry-forward run ${fromYear} -> ${toYear} complete`, {
    balancesUpdated,
    employeesProcessed: processedEmployees.size,
  });

  return {
    fromYear,
    toYear,
    employeesProcessed: processedEmployees.size,
    balancesUpdated,
  };
}
