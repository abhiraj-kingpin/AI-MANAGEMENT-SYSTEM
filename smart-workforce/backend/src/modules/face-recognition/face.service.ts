import type { Types } from 'mongoose';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { AppError } from '../../shared/errors/AppError';
import { uploadBuffer } from '../../shared/services/fileUpload.service';
import type { ActorContext } from '../../shared/types/actorContext';
import { maxCosineSimilarity } from '../../shared/utils/vectorMath';
import { generateFaceEmbedding, NoFaceDetectedError } from './faceEmbedding.provider';
import { FaceEmbedding } from './faceEmbedding.model';
import { detectLiveness } from './livenessDetector';
import type {
  FaceRegisterResultDTO,
  FaceRegistrationStatusDTO,
  FaceVerifyResultDTO,
} from './face.types';

const MIN_REGISTRATION_IMAGES = 3;
const MAX_REGISTRATION_IMAGES = 5;
const MIN_QUALITY_SCORE = 0.2;

function resolveTargetEmployeeId(requested: string | undefined, actor: ActorContext): string {
  const target = requested ?? actor.employeeId;
  if (!target) {
    throw AppError.badRequest(
      'Your account is not linked to an employee profile.',
      'NO_EMPLOYEE_PROFILE',
    );
  }
  if (target !== actor.employeeId && actor.role !== 'super_admin' && actor.role !== 'hr') {
    throw AppError.forbidden(
      'You do not have permission to manage face data for another employee.',
      'FORBIDDEN',
    );
  }
  return target;
}

async function deactivatePreviousEmbeddings(
  employeeId: string,
  keepIds: Types.ObjectId[],
): Promise<void> {
  await FaceEmbedding.updateMany(
    { employeeId, isActive: true, _id: { $nin: keepIds } },
    { $set: { isActive: false } },
  );
}

export const faceService = {
  async register(
    images: Buffer[],
    requestedEmployeeId: string | undefined,
    actor: ActorContext,
  ): Promise<FaceRegisterResultDTO> {
    const employeeId = resolveTargetEmployeeId(requestedEmployeeId, actor);

    if (images.length < MIN_REGISTRATION_IMAGES || images.length > MAX_REGISTRATION_IMAGES) {
      throw AppError.badRequest(
        `Upload between ${MIN_REGISTRATION_IMAGES} and ${MAX_REGISTRATION_IMAGES} photos.`,
        'INVALID_IMAGE_COUNT',
      );
    }

    let discarded = 0;
    const newEmbeddingIds: Types.ObjectId[] = [];

    for (const image of images) {
      let vector: number[];
      let qualityScore: number;
      let bbox: Awaited<ReturnType<typeof generateFaceEmbedding>>['bbox'];
      try {
        ({ vector, qualityScore, bbox } = await generateFaceEmbedding(image));
      } catch (error) {
        if (error instanceof NoFaceDetectedError) {
          discarded += 1;
          continue;
        }
        throw error;
      }

      if (qualityScore < MIN_QUALITY_SCORE) {
        discarded += 1;
        continue;
      }

      const liveness = await detectLiveness(image, bbox);
      if (!liveness.isLive) {
        discarded += 1;
        logger.warn(`Discarded a registration photo that failed liveness detection`, {
          employeeId,
          liveScore: liveness.liveScore,
        });
        continue;
      }

      const { url } = await uploadBuffer(image, `employees/${employeeId}/face`, {
        resourceType: 'image',
      });

      const doc = await FaceEmbedding.create({
        employeeId,
        vector,
        sourceImageUrl: url,
        qualityScore,
        isActive: true,
      });
      newEmbeddingIds.push(doc._id);
    }

    if (newEmbeddingIds.length === 0) {
      throw AppError.unprocessable(
        'None of the uploaded photos were clear enough. Please retake them and try again.',
        'FACE_QUALITY_TOO_LOW',
      );
    }

    await deactivatePreviousEmbeddings(employeeId, newEmbeddingIds);

    logger.info(`Face registration complete for employee ${employeeId}`, {
      kept: newEmbeddingIds.length,
      discarded,
    });

    return {
      status: 'registered',
      embeddingCount: newEmbeddingIds.length,
      discardedCount: discarded,
    };
  },

  async registerWithEmbeddings(
    embeddings: number[][],
    requestedEmployeeId: string | undefined,
    actor: ActorContext,
  ): Promise<FaceRegisterResultDTO> {
    const employeeId = resolveTargetEmployeeId(requestedEmployeeId, actor);

    const newEmbeddingIds: Types.ObjectId[] = [];
    for (const vector of embeddings) {
      const doc = await FaceEmbedding.create({
        employeeId,
        vector,
        qualityScore: null,
        isActive: true,
      });
      newEmbeddingIds.push(doc._id);
    }

    await deactivatePreviousEmbeddings(employeeId, newEmbeddingIds);

    logger.info(
      `Face registration (client-computed embeddings) complete for employee ${employeeId}`,
      {
        kept: newEmbeddingIds.length,
      },
    );

    return {
      status: 'registered',
      embeddingCount: newEmbeddingIds.length,
      discardedCount: 0,
    };
  },

  async getRegistrationStatus(
    requestedEmployeeId: string | undefined,
    actor: ActorContext,
  ): Promise<FaceRegistrationStatusDTO> {
    const employeeId = resolveTargetEmployeeId(requestedEmployeeId, actor);

    const embeddings = await FaceEmbedding.find({ employeeId, isActive: true }).select(
      'registeredAt',
    );

    if (embeddings.length === 0) {
      return { status: 'not_registered', embeddingCount: 0, lastRegisteredAt: null };
    }

    const lastRegisteredAt = embeddings.reduce(
      (latest, e) => (e.registeredAt > latest ? e.registeredAt : latest),
      embeddings[0].registeredAt,
    );

    return { status: 'registered', embeddingCount: embeddings.length, lastRegisteredAt };
  },

  async verify(actor: ActorContext, embedding: number[]): Promise<FaceVerifyResultDTO> {
    if (!actor.employeeId) {
      throw AppError.badRequest(
        'Your account is not linked to an employee profile.',
        'NO_EMPLOYEE_PROFILE',
      );
    }

    const embeddings = await FaceEmbedding.find({
      employeeId: actor.employeeId,
      isActive: true,
    });
    if (embeddings.length === 0) {
      throw AppError.badRequest(
        'No face is registered for this account yet.',
        'FACE_NOT_REGISTERED',
      );
    }

    const confidence = maxCosineSimilarity(
      embedding,
      embeddings.map((e) => e.vector),
    );

    return { matched: confidence >= env.FACE_MATCH_THRESHOLD, confidence };
  },

  async deleteFaceData(employeeId: string): Promise<void> {
    await FaceEmbedding.deleteMany({ employeeId });
  },
};
