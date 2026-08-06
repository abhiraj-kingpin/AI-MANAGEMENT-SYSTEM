import { Schema, model } from 'mongoose';

/**
 * Generic atomic-sequence collection (the standard MongoDB "counters"
 * pattern). `_id` is the sequence's name (e.g. a department code like
 * "ENG"); `seq` increments atomically via `$inc` in counter.service.ts —
 * no read-modify-write race, unlike counting existing documents.
 *
 * Deliberately not extending Mongoose's `Document` here — `_id` is a
 * string, not the default ObjectId, and letting `model<ICounter>()`
 * synthesize the hydrated-document type avoids fighting that mismatch.
 */
export interface ICounter {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = model<ICounter>('Counter', counterSchema);
