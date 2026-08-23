import { type Document, Schema, type Types, model } from 'mongoose';

export const EMPLOYMENT_STATUSES = ['active', 'on_leave', 'suspended', 'terminated'] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

const PHONE_REGEX = /^[+\d][\d\s-]{6,14}$/;

export interface EmergencyContact {
  name?: string;
  relationship?: string;
  phone?: string;
}

export interface BankDetails {
  accountNumberEnc?: string;
  ifscEnc?: string;
  bankName?: string;
}

export interface Address {
  line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

export interface IEmployee extends Document {
  userId: Types.ObjectId;
  employeeCode: string;
  firstName: string;
  lastName: string;
  phone: string;
  profileImageUrl: string | null;
  departmentId: Types.ObjectId;
  designation: string;
  managerId: Types.ObjectId | null;
  dateOfJoining: Date;
  employmentStatus: EmploymentStatus;
  emergencyContact: EmergencyContact;
  bankDetails: BankDetails;
  address: Address;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const emergencyContactSchema = new Schema<EmergencyContact>(
  { name: String, relationship: String, phone: String },
  { _id: false },
);

const bankDetailsSchema = new Schema<BankDetails>(
  { accountNumberEnc: String, ifscEnc: String, bankName: String },
  { _id: false },
);

const addressSchema = new Schema<Address>(
  { line1: String, city: String, state: String, pincode: String, country: String },
  { _id: false },
);

const employeeSchema = new Schema<IEmployee>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    employeeCode: { type: String, required: true, unique: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      match: [PHONE_REGEX, 'Invalid phone number'],
    },
    profileImageUrl: { type: String, default: null },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    designation: { type: String, required: true, trim: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'Employee', default: null, index: true },
    dateOfJoining: { type: Date, required: true },
    employmentStatus: {
      type: String,
      enum: EMPLOYMENT_STATUSES,
      default: 'active',
      index: true,
    },
    emergencyContact: { type: emergencyContactSchema, default: () => ({}) },
    bankDetails: { type: bankDetailsSchema, default: () => ({}) },
    address: { type: addressSchema, default: () => ({}) },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

employeeSchema.index({ firstName: 'text', lastName: 'text', employeeCode: 'text' });

export const Employee = model<IEmployee>('Employee', employeeSchema);
