import { Types } from 'mongoose';
import type { ActorContext } from '../../shared/types/actorContext';
import { WorkspaceSettings } from './settings.model';
import { type WorkspaceSettingsDTO, toWorkspaceSettingsDTO } from './settings.types';
import type { UpdateSettingsInput } from './settings.validators';

async function getOrCreate() {
  const existing = await WorkspaceSettings.findOne();
  if (existing) return existing;
  return WorkspaceSettings.create({});
}

export const settingsService = {
  async get(): Promise<WorkspaceSettingsDTO> {
    const doc = await getOrCreate();
    return toWorkspaceSettingsDTO(doc);
  },

  async update(updates: UpdateSettingsInput, actor: ActorContext): Promise<WorkspaceSettingsDTO> {
    const doc = await getOrCreate();

    if (updates.attendanceRules) Object.assign(doc.attendanceRules, updates.attendanceRules);
    if (updates.leaveApprovals) Object.assign(doc.leaveApprovals, updates.leaveApprovals);
    if (updates.aiAnalytics) Object.assign(doc.aiAnalytics, updates.aiAnalytics);
    if (updates.dataPayroll) Object.assign(doc.dataPayroll, updates.dataPayroll);
    doc.updatedBy = new Types.ObjectId(actor.id);

    await doc.save();
    return toWorkspaceSettingsDTO(doc);
  },
};
