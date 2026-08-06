import { type Document, Schema, type Types, model } from 'mongoose';

export interface IFaceEmbedding extends Document {
  employeeId: Types.ObjectId;
  vector: number[]; // 128-d (ML Kit) or 512-d (TFLite FaceNet-style model)
  sourceImageUrl: string;
  qualityScore: number | null;
  isActive: boolean;
  registeredAt: Date;
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
  // Private/signed Cloudinary reference, HR/Admin access only — excluded
  // from default query projections.
  sourceImageUrl: { type: String, required: true, select: false },
  qualityScore: { type: Number, default: null },
  isActive: { type: Boolean, default: true },
  registeredAt: { type: Date, default: Date.now },
});

faceEmbeddingSchema.index({ employeeId: 1, isActive: 1 });

export const FaceEmbedding = model<IFaceEmbedding>('FaceEmbedding', faceEmbeddingSchema);
