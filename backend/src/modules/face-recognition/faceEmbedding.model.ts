import { type Document, Schema, type Types, model } from 'mongoose';

export interface IFaceEmbedding extends Document {
  employeeId: Types.ObjectId;
  // 512-d for the server-side path (faceEmbedding.provider.ts's real
  // MobileFaceNet model) or 67-d for mobile's own on-device geometric
  // placeholder (POST /face/register-embeddings) — the 64-1024 validator
  // below accepts either, deliberately, since this one field serves both
  // registration paths.
  vector: number[];
  // Undefined for an embedding computed entirely on-device and submitted
  // via POST /face/register-embeddings — by design, per
  // docs/architecture/06-tech-stack-justification.md's "on-device keeps
  // biometric processing off the wire entirely except the final embedding
  // vector": requiring an uploaded image alongside a client-computed
  // embedding would defeat that privacy rationale. Only ever set for the
  // image-upload registration path (POST /face/register).
  sourceImageUrl?: string;
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
  // from default query projections. Not required: see the interface's doc
  // comment above.
  sourceImageUrl: { type: String, select: false },
  qualityScore: { type: Number, default: null },
  isActive: { type: Boolean, default: true },
  registeredAt: { type: Date, default: Date.now },
});

faceEmbeddingSchema.index({ employeeId: 1, isActive: 1 });

export const FaceEmbedding = model<IFaceEmbedding>('FaceEmbedding', faceEmbeddingSchema);
