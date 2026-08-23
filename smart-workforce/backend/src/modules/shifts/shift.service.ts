import { AppError } from '../../shared/errors/AppError';
import { Shift } from './shift.model';
import { type ShiftDTO, toShiftDTO } from './shift.types';
import type { CreateShiftInput, UpdateShiftInput } from './shift.validators';

export const shiftService = {
  async create(input: CreateShiftInput): Promise<ShiftDTO> {
    const shift = await Shift.create(input);
    return toShiftDTO(shift);
  },

  async list(includeInactive: boolean): Promise<ShiftDTO[]> {
    const filter = includeInactive ? {} : { isActive: true };
    const shifts = await Shift.find(filter).sort({ name: 1 });
    return shifts.map(toShiftDTO);
  },

  async update(id: string, updates: UpdateShiftInput): Promise<ShiftDTO> {
    const shift = await Shift.findById(id);
    if (!shift) {
      throw AppError.notFound('Shift not found.');
    }

    if (updates.name !== undefined) shift.name = updates.name;
    if (updates.type !== undefined) shift.type = updates.type;
    if (updates.startTime !== undefined) shift.startTime = updates.startTime;
    if (updates.endTime !== undefined) shift.endTime = updates.endTime;
    if (updates.gracePeriodMinutes !== undefined) {
      shift.gracePeriodMinutes = updates.gracePeriodMinutes;
    }
    if (updates.isActive !== undefined) shift.isActive = updates.isActive;

    await shift.save();
    return toShiftDTO(shift);
  },

  async deactivate(id: string): Promise<void> {
    const shift = await Shift.findById(id);
    if (!shift) {
      throw AppError.notFound('Shift not found.');
    }
    shift.isActive = false;
    await shift.save();
  },
};
