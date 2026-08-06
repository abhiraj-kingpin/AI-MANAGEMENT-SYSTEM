import crypto from 'node:crypto';
import { logger } from '../../config/logger';
import { AppError } from '../../shared/errors/AppError';
import { Employee } from '../employees/employee.model';
import { generatePayslipForEmployee } from './payslip.service';
import type { RunPayrollInput } from './payrollRun.validators';

export type PayrollRunStatus = 'processing' | 'completed' | 'failed';

export interface PayrollRunFailure {
  employeeId: string;
  message: string;
}

export interface PayrollRunRecord {
  runId: string;
  month: string;
  departmentId?: string;
  status: PayrollRunStatus;
  totalEmployees: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: PayrollRunFailure[];
  startedAt: Date;
  completedAt: Date | null;
}

/**
 * In-memory run registry — a deliberate, documented placeholder for what
 * BullMQ + Redis (already provisioned in docker-compose.yml, not yet wired
 * into any application code) would give for real: a durable,
 * horizontally-scalable job queue whose status survives a process restart.
 * This map does not. What it does NOT simplify: every Payslip it writes is
 * a real document via the real computation in payslip.service.ts — a
 * restart mid-run loses only the *progress readout* for that run, never
 * silently fabricates or loses payslip data already written before the
 * restart. Swapping this for a real BullMQ worker later doesn't change
 * generatePayslipForEmployee() at all — only what calls it and how its
 * progress is polled.
 */
const runs = new Map<string, PayrollRunRecord>();

async function processRun(record: PayrollRunRecord, employeeIds: string[]): Promise<void> {
  for (const employeeId of employeeIds) {
    try {
      const { outcome } = await generatePayslipForEmployee(employeeId, record.month);
      if (outcome === 'created') record.created += 1;
      else if (outcome === 'updated') record.updated += 1;
      else record.skipped += 1;
    } catch (error) {
      record.failed.push({
        employeeId,
        message: error instanceof AppError ? error.message : 'Payslip generation failed.',
      });
    }
    record.processed += 1;
  }
  record.status = 'completed';
  record.completedAt = new Date();
}

export const payrollRunService = {
  /** Kicks off generation for every active employee (optionally scoped to a department) and returns immediately — poll `getStatus` for progress. */
  async start(input: RunPayrollInput): Promise<PayrollRunRecord> {
    const filter: Record<string, unknown> = { status: 'active' };
    if (input.departmentId) filter.departmentId = input.departmentId;
    const employees = await Employee.find(filter).select('_id');

    const record: PayrollRunRecord = {
      runId: crypto.randomUUID(),
      month: input.month,
      departmentId: input.departmentId,
      status: 'processing',
      totalEmployees: employees.length,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: [],
      startedAt: new Date(),
      completedAt: null,
    };
    runs.set(record.runId, record);

    processRun(
      record,
      employees.map((e) => String(e._id)),
    ).catch((error: unknown) => {
      // Only reachable if processRun's own per-employee try/catch didn't
      // contain the failure — i.e. a genuine bug, not a bad employee record.
      record.status = 'failed';
      record.completedAt = new Date();
      logger.error('Payroll run crashed unexpectedly', { runId: record.runId, error });
    });

    return record;
  },

  getStatus(runId: string): PayrollRunRecord | undefined {
    return runs.get(runId);
  },
};
