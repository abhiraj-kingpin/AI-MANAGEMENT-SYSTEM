import { AppError } from '../../shared/errors/AppError';
import type { PaginatedResult } from '../../shared/types/pagination';
import { Salary } from './salary.model';
import { type SalaryDTO, toSalaryDTO } from './salary.types';
import type { CreateSalaryInput, ListSalariesQuery, UpdateSalaryInput } from './salary.validators';

export const salaryService = {
  async create(input: CreateSalaryInput): Promise<SalaryDTO> {
    const existing = await Salary.findOne({ employeeId: input.employeeId });
    if (existing) {
      throw AppError.conflict(
        'A salary record already exists for this employee — use PATCH to update it.',
        'SALARY_ALREADY_EXISTS',
      );
    }
    const salary = await Salary.create(input);
    return toSalaryDTO(salary);
  },

  async update(employeeId: string, updates: UpdateSalaryInput): Promise<SalaryDTO> {
    const salary = await Salary.findOne({ employeeId });
    if (!salary) {
      throw AppError.notFound('No salary record exists for this employee yet.');
    }

    if (updates.baseSalary !== undefined) salary.baseSalary = updates.baseSalary;
    if (updates.allowances) salary.allowances = { ...salary.allowances, ...updates.allowances };
    if (updates.deductions) salary.deductions = { ...salary.deductions, ...updates.deductions };
    if (updates.currency !== undefined) salary.currency = updates.currency;
    if (updates.effectiveFrom !== undefined) salary.effectiveFrom = updates.effectiveFrom;

    await salary.save();
    return toSalaryDTO(salary);
  },

  async list(query: ListSalariesQuery): Promise<PaginatedResult<SalaryDTO>> {
    const filter: Record<string, unknown> = {};
    if (query.employeeId) filter.employeeId = query.employeeId;

    const [items, total] = await Promise.all([
      Salary.find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit),
      Salary.countDocuments(filter),
    ]);

    return {
      items: items.map(toSalaryDTO),
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.max(1, Math.ceil(total / query.limit)),
    };
  },
};
