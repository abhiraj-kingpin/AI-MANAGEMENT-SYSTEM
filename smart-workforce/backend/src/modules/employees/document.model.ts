import { type Document as MongooseDocument, Schema, type Types, model } from 'mongoose';

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

export const EmployeeDocument = model<IEmployeeDocument>(
  'EmployeeDocument',
  employeeDocumentSchema,
  'documents',
);
