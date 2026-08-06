import { Counter } from './counter.model';

/**
 * Atomically increments and returns the next value for `sequenceName`.
 * `findByIdAndUpdate` + `$inc` is a single atomic Mongo operation, so
 * concurrent requests (two HR users creating employees at once) can never
 * be handed the same number — unlike counting existing documents.
 */
export async function nextSequence(sequenceName: string): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );
  return counter.seq;
}
