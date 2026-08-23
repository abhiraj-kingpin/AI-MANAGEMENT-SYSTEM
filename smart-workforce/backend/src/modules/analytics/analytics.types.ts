export interface DashboardKpisDTO {
  date: Date;
  headcount: number;
  attendanceRate: number;
  lateRate: number;
  leaveRate: number;
  presentCount: number;
  lateCount: number;
  onLeaveCount: number;
}

export interface AttendanceTrendPointDTO {
  month: string;
  attendanceRate: number;
  lateRate: number;
}

export interface DepartmentComparisonDTO {
  departmentId: string;
  departmentName: string;
  headcount: number;
  attendanceRate: number;
  lateRate: number;
}
