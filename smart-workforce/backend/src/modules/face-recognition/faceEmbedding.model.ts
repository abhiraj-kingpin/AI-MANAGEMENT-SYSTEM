import { type Document, Schema, type Types, model } from 'mongoose';

export interface IFaceEmbedding extends Document {
  employeeId: Types.ObjectId;
  vector: number[];
  sourceImageUrl?: string;
  qualityScore: number | null;
  isActive: boolean;
  registeredAt: Date;
  lastVerifiedAt: Date | null;
}

const faceEmbeddingSchema = new Schema<IFaceEmbedding>({
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  vector: {
    type: [Number],
    required: true,
    validate: {
      validator: (value: number[]) => value.length >= 64 && value.length <= 1024,
      message: 'vector length looks wrong for a face embedding (expected 64–1024 dimensions).',
    },
  },
  sourceImageUrl: { type: String, select: false },
  qualityScore: { type: Number, default: null },
  isActive: { type: Boolean, default: true },
  registeredAt: { type: Date, default: Date.now },
  // Touched on every successful faceService.verify() — the Face Management
  // console's "Last verified" column. Kept on the embedding rather than a
  // separate log table since there's nothing else that needs one verify
  // event's full detail, just the most recent timestamp per employee.
  lastVerifiedAt: { type: Date, default: null },
});

faceEmbeddingSchema.index({ employeeId: 1, isActive: 1 });

export const FaceEmbedding = model<IFaceEmbedding>('FaceEmbedding', faceEmbeddingSchema);
