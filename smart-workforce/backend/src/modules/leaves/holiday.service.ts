import { startOfUtcDay } from '../../shared/utils/dateTime';
import { Holiday } from './holiday.model';
import { type HolidayDTO, toHolidayDTO } from './holiday.types';
import type { CreateHolidayInput } from './holiday.validators';

export async function getHolidayDatesInRange(start: Date, end: Date): Promise<Date[]> {
  const holidays = await Holiday.find({
    date: { $gte: startOfUtcDay(start), $lte: startOfUtcDay(end) },
  }).select('date');
  return holidays.map((h) => h.date);
}

export const holidayService = {
  async list(year?: number): Promise<HolidayDTO[]> {
    const filter: Record<string, unknown> = {};
    if (year) {
      filter.date = {
        $gte: new Date(Date.UTC(year, 0, 1)),
        $lte: new Date(Date.UTC(year, 11, 31, 23, 59, 59)),
      };
    }
    const holidays = await Holiday.find(filter).sort({ date: 1 });
    return holidays.map(toHolidayDTO);
  },

  async create(input: CreateHolidayInput): Promise<HolidayDTO> {
    const holiday = await Holiday.create(input);
    return toHolidayDTO(holiday);
  },
};
