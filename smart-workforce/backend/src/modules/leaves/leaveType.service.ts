import { AppError } from '../../shared/errors/AppError';
import { LeaveType } from './leaveType.model';
import { type LeaveTypeDTO, toLeaveTypeDTO } from './leaveType.types';
import type { CreateLeaveTypeInput } from './leaveType.validators';

export const leaveTypeService = {
  async list(): Promise<LeaveTypeDTO[]> {
    const types = await LeaveType.find().sort({ name: 1 });
    return types.map(toLeaveTypeDTO);
  },

  async create(input: CreateLeaveTypeInput): Promise<LeaveTypeDTO> {
    const existing = await LeaveType.findOne({ name: input.name });
    if (existing) {
      throw AppError.conflict('A leave type with this name already exists.', 'LEAVE_TYPE_EXISTS');
    }
    const leaveType = await LeaveType.create(input);
    return toLeaveTypeDTO(leaveType);
  },
};
