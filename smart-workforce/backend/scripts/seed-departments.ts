/**
 * Seeds a baseline set of departments so the Add Employee form's Department
 * dropdown (and Departments page) isn't empty on a fresh database.
 *
 * There's no self-serve "create department" UI until this codebase has one
 * (see admin-dashboard's Departments page, which exercises the same
 * POST /departments this script calls into) — before that, a brand-new
 * database genuinely has zero departments, which is what made the dropdown
 * look broken rather than just empty. Idempotent: skips any department
 * whose name or code already exists, so it's safe to run again.
 *
 * Usage: `npm run seed:departments` (from backend/), against whichever
 * MONGO_URI is in .env — point that at a specific environment deliberately;
 * this writes real rows.
 */
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { logger } from '../src/config/logger';
import { Department } from '../src/modules/departments/department.model';

const BASELINE_DEPARTMENTS: Array<{ name: string; code: string }> = [
  { name: 'Engineering', code: 'ENG' },
  { name: 'Sales', code: 'SAL' },
  { name: 'Marketing', code: 'MKT' },
  { name: 'Finance', code: 'FIN' },
  { name: 'Human Resources', code: 'HR' },
  { name: 'Operations', code: 'OPS' },
];

async function main() {
  await connectDatabase();

  let created = 0;
  let skipped = 0;

  for (const dept of BASELINE_DEPARTMENTS) {
    const existing = await Department.findOne({
      $or: [{ name: dept.name }, { code: dept.code }],
    });
    if (existing) {
      skipped++;
      continue;
    }
    await Department.create(dept);
    created++;
    logger.info(`Seeded department: ${dept.name} (${dept.code})`);
  }

  logger.info(`Done — ${created} created, ${skipped} already existed.`);
  await disconnectDatabase();
}

main().catch((err) => {
  logger.error('Department seed failed', { err });
  process.exitCode = 1;
});
