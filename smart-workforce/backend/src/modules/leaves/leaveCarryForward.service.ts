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
      if (carryAmount === 0) continue;

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
