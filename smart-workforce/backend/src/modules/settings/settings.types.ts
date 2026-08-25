import type { IWorkspaceSettings } from './settings.model';

export interface WorkspaceSettingsDTO {
  attendanceRules: IWorkspaceSettings['attendanceRules'];
  leaveApprovals: IWorkspaceSettings['leaveApprovals'];
  aiAnalytics: IWorkspaceSettings['aiAnalytics'];
  dataPayroll: IWorkspaceSettings['dataPayroll'];
  updatedAt: Date;
}

export function toWorkspaceSettingsDTO(doc: IWorkspaceSettings): WorkspaceSettingsDTO {
  return {
    attendanceRules: doc.attendanceRules,
    leaveApprovals: doc.leaveApprovals,
    aiAnalytics: doc.aiAnalytics,
    dataPayroll: doc.dataPayroll,
    updatedAt: doc.updatedAt,
  };
}
