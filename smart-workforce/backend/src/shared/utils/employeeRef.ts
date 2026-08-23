import { Employee } from '../../modules/employees/employee.model';

export interface EmployeeRefDTO {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
}

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
