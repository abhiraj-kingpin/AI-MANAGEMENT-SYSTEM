import type { Types } from 'mongoose';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { AppError } from '../../shared/errors/AppError';
import { uploadBuffer } from '../../shared/services/fileUpload.service';
import type { ActorContext } from '../../shared/types/actorContext';
import { startOfUtcDay } from '../../shared/utils/dateTime';
import { maxCosineSimilarity } from '../../shared/utils/vectorMath';
import { Attendance } from '../attendance/attendance.model';
import { Employee } from '../employees/employee.model';
import { generateFaceEmbedding, NoFaceDetectedError } from './faceEmbedding.provider';
import { FaceEmbedding } from './faceEmbedding.model';
import { detectLiveness } from './livenessDetector';
import type {
  FaceEnrollmentRowDTO,
  FaceEnrollmentStatsDTO,
  FaceRegisterResultDTO,
  FaceRegistrationStatusDTO,
  FaceVerifyResultDTO,
} from './face.types';

const MIN_REGISTRATION_IMAGES = 3;
const MAX_REGISTRATION_IMAGES = 5;
const MIN_QUALITY_SCORE = 0.2;
// A face registered longer ago than this is flagged "re-enrolment due" in
// the admin console — templates drift from how someone actually looks
// (haircuts, glasses, ageing) far enough back that a stale one starts
// producing more false rejections at check-in.
const RE_ENROLLMENT_DUE_DAYS = 180;

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
    const matched = confidence >= env.FACE_MATCH_THRESHOLD;

    if (matched) {
      await FaceEmbedding.updateMany(
        { employeeId: actor.employeeId, isActive: true },
        { $set: { lastVerifiedAt: new Date() } },
      );
    }

    return { matched, confidence };
  },

  async deleteFaceData(employeeId: string): Promise<void> {
    await FaceEmbedding.deleteMany({ employeeId });
  },

  // Face Management console — enrolment state per employee. Deliberately
  // exposes nothing biometric: no vectors, no source images, just dates and
  // a derived status.
  async adminListEnrollments(): Promise<FaceEnrollmentRowDTO[]> {
    const employees = await Employee.find({ isDeleted: false })
      .select('employeeCode firstName lastName departmentId')
      .populate({ path: 'departmentId', select: 'name' })
      .sort({ firstName: 1 });

    const embeddings = await FaceEmbedding.find({ isActive: true }).select(
      'employeeId registeredAt lastVerifiedAt',
    );
    const byEmployee = new Map<string, { registeredAt: Date; lastVerifiedAt: Date | null }[]>();
    for (const embedding of embeddings) {
      const key = String(embedding.employeeId);
      const list = byEmployee.get(key);
      const entry = { registeredAt: embedding.registeredAt, lastVerifiedAt: embedding.lastVerifiedAt };
      if (list) list.push(entry);
      else byEmployee.set(key, [entry]);
    }

    const dueThreshold = Date.now() - RE_ENROLLMENT_DUE_DAYS * 24 * 60 * 60 * 1000;

    return employees.map((employee) => {
      const employeeId = String(employee._id);
      const rows = byEmployee.get(employeeId);
      const department = (employee.departmentId as unknown as { name?: string } | null)?.name ?? '—';

      if (!rows || rows.length === 0) {
        return {
          employeeId,
          employeeCode: employee.employeeCode,
          name: `${employee.firstName} ${employee.lastName}`,
          department,
          status: 'not_registered',
          enrolledAt: null,
          lastVerifiedAt: null,
        };
      }

      const enrolledAt = rows.reduce((latest, r) => (r.registeredAt > latest ? r.registeredAt : latest), rows[0].registeredAt);
      const lastVerifiedAt = rows.reduce<Date | null>((latest, r) => {
        if (!r.lastVerifiedAt) return latest;
        if (!latest || r.lastVerifiedAt > latest) return r.lastVerifiedAt;
        return latest;
      }, null);

      return {
        employeeId,
        employeeCode: employee.employeeCode,
        name: `${employee.firstName} ${employee.lastName}`,
        department,
        status: enrolledAt.getTime() < dueThreshold ? 're_enrollment_due' : 'registered',
        enrolledAt,
        lastVerifiedAt,
      };
    });
  },

  async adminStats(): Promise<FaceEnrollmentStatsDTO> {
    const rows = await faceService.adminListEnrollments();
    const today = startOfUtcDay(new Date());
    const verificationsToday = await Attendance.countDocuments({ method: 'face', date: today });

    return {
      enrolled: rows.filter((r) => r.status !== 'not_registered').length,
      notRegistered: rows.filter((r) => r.status === 'not_registered').length,
      reEnrollmentDue: rows.filter((r) => r.status === 're_enrollment_due').length,
      verificationsToday,
    };
  },
};
