import PDFDocument from 'pdfkit';
import { logger } from '../../config/logger';
import { AppError } from '../../shared/errors/AppError';
import type { ActorContext } from '../../shared/types/actorContext';
import type { PaginatedResult } from '../../shared/types/pagination';
import { requireEmployeeId } from '../../shared/utils/actor';
import { resolveEmployeeRefs } from '../../shared/utils/employeeRef';
import { round2 } from '../../shared/utils/math';
import { Attendance } from '../attendance/attendance.model';
import { Employee } from '../employees/employee.model';
import { notify } from '../notifications/notification.service';
import { type IPayslip, Payslip } from './payslip.model';
import { type PayslipDTO, toPayslipDTO } from './payslip.types';
import type { ListPayslipsQuery } from './payslip.validators';
import { type ISalary, Salary } from './salary.model';

const STANDARD_MONTHLY_HOURS = 208;
const OVERTIME_MULTIPLIER = 1.5;
const LATE_PENALTY_FRACTION_OF_DAY = 0.1;
const HALF_DAY_DEDUCTION_FRACTION = 0.5;
const ABSENT_DEDUCTION_FRACTION = 1.0;

function monthDateRange(month: string): { start: Date; end: Date } {
  const [year, monthNum] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, monthNum - 1, 1));
  const end = new Date(Date.UTC(year, monthNum, 0));
  return { start, end };
}

interface AttendanceStats {
  lateCount: number;
  halfDayCount: number;
  absentCount: number;
  totalOvertimeMinutes: number;
}

async function getAttendanceStats(employeeId: string, month: string): Promise<AttendanceStats> {
  const { start, end } = monthDateRange(month);
  const records = await Attendance.find({
    employeeId,
    date: { $gte: start, $lte: end },
  }).select('status overtimeMinutes');

  return records.reduce<AttendanceStats>(
    (stats, record) => {
      if (record.status === 'late') stats.lateCount += 1;
      if (record.status === 'absent') stats.absentCount += 1;
      if (record.status === 'half_day') stats.halfDayCount += 1;
      stats.totalOvertimeMinutes += record.overtimeMinutes;
      return stats;
    },
    { lateCount: 0, halfDayCount: 0, absentCount: 0, totalOvertimeMinutes: 0 },
  );
}

interface ComputedPayFields {
  grossPay: number;
  netPay: number;
  latePenalty: number;
  overtimePay: number;
  bonus: number;
}

function computePayFields(
  salary: ISalary,
  month: string,
  stats: AttendanceStats,
): ComputedPayFields {
  const { hra = 0, transport = 0, medical = 0, other: otherAllowance = 0 } = salary.allowances;
  const allowancesTotal = hra + transport + medical + otherAllowance;

  const { pf = 0, tax = 0, other: otherDeduction = 0 } = salary.deductions;
  const deductionsTotal = pf + tax + otherDeduction;

  const hourlyRate = salary.baseSalary / STANDARD_MONTHLY_HOURS;
  const overtimePay = round2((stats.totalOvertimeMinutes / 60) * hourlyRate * OVERTIME_MULTIPLIER);

  const { end } = monthDateRange(month);
  const daysInMonth = end.getUTCDate();
  const dailyRate = salary.baseSalary / daysInMonth;
  const latePenalty = round2(
    dailyRate *
      (stats.lateCount * LATE_PENALTY_FRACTION_OF_DAY +
        stats.halfDayCount * HALF_DAY_DEDUCTION_FRACTION +
        stats.absentCount * ABSENT_DEDUCTION_FRACTION),
  );

  const bonus = 0;
  const grossPay = round2(salary.baseSalary + allowancesTotal + overtimePay + bonus);
  const netPay = round2(Math.max(0, grossPay - deductionsTotal - latePenalty));

  return { grossPay, netPay, latePenalty, overtimePay, bonus };
}

export type GenerateOutcome = 'created' | 'updated' | 'skipped';

export async function generatePayslipForEmployee(
  employeeId: string,
  month: string,
): Promise<{ outcome: GenerateOutcome; payslip: IPayslip }> {
  const salary = await Salary.findOne({ employeeId });
  if (!salary) {
    throw AppError.badRequest('No salary record exists for this employee.', 'NO_SALARY_RECORD');
  }

  const existing = await Payslip.findOne({ employeeId, month });
  if (existing?.status === 'released') {
    return { outcome: 'skipped', payslip: existing };
  }

  const stats = await getAttendanceStats(employeeId, month);
  const fields = computePayFields(salary, month, stats);

  if (existing) {
    Object.assign(existing, fields, { status: 'generated', generatedAt: new Date() });
    await existing.save();
    return { outcome: 'updated', payslip: existing };
  }

  const payslip = await Payslip.create({
    employeeId,
    salaryId: salary.id,
    month,
    ...fields,
    status: 'generated',
    generatedAt: new Date(),
  });
  return { outcome: 'created', payslip };
}

export const payslipService = {
  async list(query: ListPayslipsQuery): Promise<PaginatedResult<PayslipDTO>> {
    const filter: Record<string, unknown> = {};
    if (query.month) filter.month = query.month;
    if (query.status) filter.status = query.status;

    if (query.employeeId) {
      filter.employeeId = query.employeeId;
    } else if (query.departmentId) {
      const deptEmployees = await Employee.find({ departmentId: query.departmentId }).select('_id');
      filter.employeeId = { $in: deptEmployees.map((e) => e._id) };
    }

    const [items, total] = await Promise.all([
      Payslip.find(filter)
        .sort({ month: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit),
      Payslip.countDocuments(filter),
    ]);

    const employeeById = await resolveEmployeeRefs(items, (item) => String(item.employeeId));

    return {
      items: items.map((item) => toPayslipDTO(item, employeeById.get(String(item.employeeId)))),
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.max(1, Math.ceil(total / query.limit)),
    };
  },

  async getMyPayslips(actor: ActorContext, month?: string): Promise<PayslipDTO[]> {
    const employeeId = requireEmployeeId(actor);
    const filter: Record<string, unknown> = { employeeId, status: 'released' };
    if (month) filter.month = month;

    const payslips = await Payslip.find(filter).sort({ month: -1 });
    return payslips.map((payslip) => toPayslipDTO(payslip));
  },

  async release(payslipId: string): Promise<PayslipDTO> {
    const payslip = await Payslip.findById(payslipId);
    if (!payslip) {
      throw AppError.notFound('Payslip not found.');
    }
    if (payslip.status === 'released') {
      throw AppError.badRequest('This payslip has already been released.', 'ALREADY_RELEASED');
    }
    if (payslip.status !== 'generated') {
      throw AppError.badRequest(
        'Only a generated payslip can be released.',
        'PAYSLIP_NOT_GENERATED',
      );
    }

    payslip.status = 'released';
    await payslip.save();

    logger.info(`Payslip ${payslipId} released`);
    await notify(
      String(payslip.employeeId),
      'Payslip available',
      `Your payslip for ${payslip.month} is ready to view.`,
      'salary',
      { payslipId: payslip.id },
    );

    return toPayslipDTO(payslip);
  },

  async getForDownload(
    payslipId: string,
    actor: ActorContext,
  ): Promise<{ payslip: IPayslip; salary: ISalary }> {
    const payslip = await Payslip.findById(payslipId);
    if (!payslip) {
      throw AppError.notFound('Payslip not found.');
    }

    if (actor.role === 'employee') {
      const isOwn = actor.employeeId && String(payslip.employeeId) === actor.employeeId;
      if (!isOwn || payslip.status !== 'released') {
        throw AppError.forbidden('You cannot access this payslip.', 'FORBIDDEN');
      }
    }

    const salary = await Salary.findById(payslip.salaryId);
    if (!salary) {
      throw AppError.internal('The salary record backing this payslip is missing.');
    }

    return { payslip, salary };
  },

  async renderPdf(payslip: IPayslip, salary: ISalary): Promise<Buffer> {
    const employee = await Employee.findById(payslip.employeeId).select(
      'employeeCode firstName lastName',
    );

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('Payslip', { align: 'center' });
      doc.moveDown();
      doc.fontSize(11);
      doc.text(`Month: ${payslip.month}`);
      doc.text(
        `Employee: ${employee ? `${employee.firstName} ${employee.lastName} (${employee.employeeCode})` : String(payslip.employeeId)}`,
      );
      doc.text(`Status: ${payslip.status}`);
      doc.moveDown();

      const row = (label: string, amount: number) => {
        doc.text(`${label}: ${salary.currency} ${amount.toFixed(2)}`);
      };

      doc.fontSize(13).text('Earnings', { underline: true });
      doc.fontSize(11);
      row('Base Salary', salary.baseSalary);
      row('HRA', salary.allowances.hra ?? 0);
      row('Transport', salary.allowances.transport ?? 0);
      row('Medical', salary.allowances.medical ?? 0);
      row('Other Allowance', salary.allowances.other ?? 0);
      row('Overtime Pay', payslip.overtimePay);
      row('Bonus', payslip.bonus);
      doc.moveDown(0.5);

      doc.fontSize(13).text('Deductions', { underline: true });
      doc.fontSize(11);
      row('Provident Fund', salary.deductions.pf ?? 0);
      row('Tax', salary.deductions.tax ?? 0);
      row('Other Deduction', salary.deductions.other ?? 0);
      row('Attendance Penalty (late/half-day/absent)', payslip.latePenalty);
      doc.moveDown();

      doc.fontSize(13).text(`Gross Pay: ${salary.currency} ${payslip.grossPay.toFixed(2)}`);
      doc
        .fontSize(15)
        .text(`Net Pay: ${salary.currency} ${payslip.netPay.toFixed(2)}`, { underline: true });

      doc.end();
    });
  },
};
