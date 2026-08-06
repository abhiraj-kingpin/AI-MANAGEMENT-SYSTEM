import { type Document as MongooseDocument, Schema, type Types, model } from 'mongoose';

// const tuple so this can feed `z.enum(EMPLOYEE_DOCUMENT_TYPES)` directly in
// employee.validators.ts — see shared/constants/roles.ts for the same pattern.
export const EMPLOYEE_DOCUMENT_TYPES = [
  'id_proof',
  'resume',
  'offer_letter',
  'contract',
  'other',
] as const;
export type EmployeeDocumentType = (typeof EMPLOYEE_DOCUMENT_TYPES)[number];

export interface IEmployeeDocument extends MongooseDocument {
  employeeId: Types.ObjectId;
  type: EmployeeDocumentType;
  fileUrl: string;
  fileName: string | null;
  uploadedAt: Date;
}

const employeeDocumentSchema = new Schema<IEmployeeDocument>({
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  type: { type: String, enum: EMPLOYEE_DOCUMENT_TYPES, required: true },
  fileUrl: { type: String, required: true },
  fileName: { type: String, default: null },
  uploadedAt: { type: Date, default: Date.now },
});

// Model name "EmployeeDocument" avoids colliding with Mongoose's own
// `Document` type; the physical collection stays `documents` per
// docs/architecture/03-database-schema.md.
export const EmployeeDocument = model<IEmployeeDocument>(
  'EmployeeDocument',
  employeeDocumentSchema,
  'documents',
);
