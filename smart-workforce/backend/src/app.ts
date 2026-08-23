import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Application } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { corsAllowedOrigins, env, isProduction } from './config/env';
import { morganStream } from './config/logger';
import { errorHandler } from './middlewares/error.middleware';
import { notFoundHandler } from './middlewares/notFound.middleware';
import { analyticsRouter } from './modules/analytics/analytics.routes';
import { attendanceRouter } from './modules/attendance/attendance.routes';
import { auditRouter } from './modules/audit/audit.routes';
import { authRouter } from './modules/auth/auth.routes';
import { departmentRouter } from './modules/departments/department.routes';
import { employeeRouter } from './modules/employees/employee.routes';
import { faceRouter } from './modules/face-recognition/face.routes';
import { geofenceRouter } from './modules/geofence/geofence.routes';
import { healthRouter } from './modules/health/health.routes';
import { holidayRouter } from './modules/leaves/holiday.routes';
import { leaveRouter } from './modules/leaves/leave.routes';
import { leaveTypeRouter } from './modules/leaves/leaveType.routes';
import { notificationRouter } from './modules/notifications/notification.routes';
import { payrollRunRouter } from './modules/payroll/payrollRun.routes';
import { payslipRouter } from './modules/payroll/payslip.routes';
import { salaryRouter } from './modules/payroll/salary.routes';
import { qrRouter } from './modules/qr/qr.routes';
import { shiftRouter } from './modules/shifts/shift.routes';

export function createApp(): Application {
  const app = express();

  app.use(helmet());

  app.use(
    cors({
      origin: corsAllowedOrigins,
      credentials: true,
    }),
  );

  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(morgan(isProduction ? 'combined' : 'dev', { stream: morganStream }));

  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down.' },
      },
    }),
  );

  app.use(`${env.API_PREFIX}/health`, healthRouter);
  app.use(`${env.API_PREFIX}/auth`, authRouter);
  app.use(`${env.API_PREFIX}/employees`, employeeRouter);
  app.use(`${env.API_PREFIX}/departments`, departmentRouter);
  app.use(`${env.API_PREFIX}/attendance`, attendanceRouter);
  app.use(`${env.API_PREFIX}/geofences`, geofenceRouter);
  app.use(`${env.API_PREFIX}/qr`, qrRouter);
  app.use(`${env.API_PREFIX}/face`, faceRouter);
  app.use(`${env.API_PREFIX}/leaves`, leaveRouter);
  app.use(`${env.API_PREFIX}/leave-types`, leaveTypeRouter);
  app.use(`${env.API_PREFIX}/holidays`, holidayRouter);
  app.use(`${env.API_PREFIX}/shifts`, shiftRouter);
  app.use(`${env.API_PREFIX}/salaries`, salaryRouter);
  app.use(`${env.API_PREFIX}/payroll`, payrollRunRouter);
  app.use(`${env.API_PREFIX}/payslips`, payslipRouter);
  app.use(`${env.API_PREFIX}/notifications`, notificationRouter);
  app.use(`${env.API_PREFIX}/analytics`, analyticsRouter);
  app.use(`${env.API_PREFIX}/audit-logs`, auditRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
