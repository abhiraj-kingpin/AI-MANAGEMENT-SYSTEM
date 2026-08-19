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
// The embedding itself is real now (faceEmbedding.provider.ts's
// MobileFaceNet model), but qualityScore still comes from its unchanged
// byte-size heuristic — a real quality assessment (blur/sharpness,
// brightness) beyond "is a face even present" (which detectFaces now
// checks for real) hasn't been added. This threshold stays a placeholder
// paired with that placeholder score.
const MIN_QUALITY_SCORE = 0.2;

/** Self, or HR/Admin acting on someone else's face data. */
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

/** Deactivates embeddings from a previous registration — re-registering replaces the reference set rather than accumulating it unboundedly. Excludes by id (not a time cutoff) so a slow request processing several images/embeddings can never deactivate one of its own just-created rows before it finishes the batch. Shared by both registration paths (image-based and client-computed-embedding-based) — the exact same rule either way. */
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

    // Processed synchronously (request/response) for v1 — a real deployment
    // would enqueue this via BullMQ (see docs/architecture/09-deployment-architecture.md's
    // job-queue section) since embedding generation can be slow; no worker
    // infrastructure has been stood up in any phase so far, so this stays
    // consistent with how every other "should be async" step in this
    // codebase (Cloudinary uploads, emails) has been handled.
    let discarded = 0;
    const newEmbeddingIds: Types.ObjectId[] = [];

    for (const image of images) {
      let vector: number[];
      let qualityScore: number;
      let bbox: Awaited<ReturnType<typeof generateFaceEmbedding>>['bbox'];
      try {
        ({ vector, qualityScore, bbox } = await generateFaceEmbedding(image));
      } catch (error) {
        // A photo with no detectable face (someone's back, a blurry non-
        // face frame, an empty room) is discarded the same as a
        // low-quality one — a real, expected outcome now that detection
        // is real, not a request-crashing error.
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

      // Real presentation-attack detection (livenessDetector.ts,
      // MiniFASNet-V2) — a printed photo or a screen replay of someone
      // else's face is discarded the same way a low-quality or faceless
      // photo already is, rather than being registered as a legitimate
      // reference embedding. Failure here is treated the same as any
      // other per-photo problem: this one photo is skipped, the rest of
      // the batch still has a chance to produce enough kept embeddings.
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

    // TODO(Phase 12): push via FCM once notifications are wired in.
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

  /**
   * Registers using embeddings the client already computed on-device,
   * rather than uploaded photos — see `faceEmbedding.model.ts`'s doc
   * comment on `sourceImageUrl` for why no image is stored for these rows.
   * No quality-score filtering here: unlike `generateFaceEmbedding`'s
   * placeholder heuristic (a crude proxy for photo file size),
   * a client that ran real on-device face detection to produce these
   * vectors has already made its own quality decision before submitting.
   */
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

  /** Self-only — always verifies against the caller's own registered face(s). Used internally by attendance check-in. */
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

  /** HR/Admin only (route-gated) — a hard delete, not soft: biometric data, right-to-erasure. */
  async deleteFaceData(employeeId: string): Promise<void> {
    await FaceEmbedding.deleteMany({ employeeId });
  },
};
