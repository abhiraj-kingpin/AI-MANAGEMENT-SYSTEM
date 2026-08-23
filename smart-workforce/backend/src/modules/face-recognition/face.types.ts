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
