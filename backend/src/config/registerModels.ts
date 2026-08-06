/**
 * Side-effect-only import barrel: pulling this file in guarantees every
 * Mongoose model is registered before anything calls `populate('ref')` or
 * `mongoose.model('Name')` by string, regardless of which module happens to
 * load first. Imported once from database.ts before the app starts serving
 * requests. See docs/architecture/03-database-schema.md for the full schema.
 */
import '../modules/users/user.model';
import '../modules/departments/department.model';
import '../modules/employees/employee.model';
import '../modules/employees/document.model';
import '../modules/attendance/attendance.model';
import '../modules/leaves/leave.model';
import '../modules/leaves/leaveType.model';
import '../modules/leaves/leaveBalance.model';
import '../modules/leaves/holiday.model';
import '../modules/shifts/shift.model';
import '../modules/shifts/shiftAssignment.model';
import '../modules/payroll/salary.model';
import '../modules/payroll/payslip.model';
import '../modules/notifications/notification.model';
import '../modules/qr/qrCode.model';
import '../modules/geofence/geofence.model';
import '../modules/face-recognition/faceEmbedding.model';
import '../modules/audit/auditLog.model';
import '../shared/counter/counter.model';
