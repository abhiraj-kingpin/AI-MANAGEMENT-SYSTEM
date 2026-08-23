import type { IHoliday } from './holiday.model';

export interface HolidayDTO {
  id: string;
  name: string;
  date: Date;
  isOptional: boolean;
}

export function toHolidayDTO(doc: IHoliday): HolidayDTO {
  return {
    id: doc.id as string,
    name: doc.name,
    date: doc.date,
    isOptional: doc.isOptional,
  };
}
