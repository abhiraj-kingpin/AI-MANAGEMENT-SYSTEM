export interface FaceRegistrationStatusDTO {
  status: 'not_registered' | 'registered';
  embeddingCount: number;
  lastRegisteredAt: Date | null;
}

export interface FaceVerifyResultDTO {
  matched: boolean;
  confidence: number;
}

export interface FaceRegisterResultDTO {
  status: 'registered' | 'failed';
  embeddingCount: number;
  discardedCount: number;
}

export type FaceEnrollmentStatus = 'registered' | 'not_registered' | 're_enrollment_due';

export interface FaceEnrollmentRowDTO {
  employeeId: string;
  employeeCode: string;
  name: string;
  department: string;
  status: FaceEnrollmentStatus;
  enrolledAt: Date | null;
  lastVerifiedAt: Date | null;
}

export interface FaceEnrollmentStatsDTO {
  enrolled: number;
  notRegistered: number;
  reEnrollmentDue: number;
  verificationsToday: number;
}
