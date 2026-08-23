import { Counter } from './counter.model';

export async function nextSequence(sequenceName: string): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );
  return counter.seq;
}
