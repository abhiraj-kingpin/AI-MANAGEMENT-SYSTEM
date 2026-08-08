import { Employee } from '../../modules/employees/employee.model';

/** Only attached where a caller needs a name instead of a bare id — an HR/Manager list or review queue, not a caller's own `/me` history (each module's DTO documents its own split). */
export interface EmployeeRefDTO {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
}

/**
 * One batch lookup for a page of records' distinct employee ids -> name/code,
 * instead of one query per row. Attendance's `listAttendance`, Leave's
 * `list`, Salary's `list`, and Payslip's `list` all hit the exact same gap
 * independently — an HR/Manager list endpoint that read back a bare
 * `employeeId` with nothing to show a human — and fixed it with the same
 * few lines. Extracted here after the third near-identical copy rather than
 * writing a fourth and fifth.
 */
export async function resolveEmployeeRefs<T>(
  items: T[],
  getEmployeeId: (item: T) => string,
): Promise<Map<string, EmployeeRefDTO>> {
  const employeeIds = [...new Set(items.map((item) => getEmployeeId(item)))];
  const employees = await Employee.find({ _id: { $in: employeeIds } }).select(
    'employeeCode firstName lastName',
  );
  return new Map(
    employees.map((e) => [
      String(e._id),
      {
        id: String(e._id),
        employeeCode: e.employeeCode,
        firstName: e.firstName,
        lastName: e.lastName,
      },
    ]),
  );
}
