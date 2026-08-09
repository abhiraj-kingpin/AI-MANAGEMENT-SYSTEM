import { mockQuery } from '../../utils/mockQuery';

// Service-layer unit tests — models/collaborators mocked, no live database.
jest.mock('../../../src/modules/face-recognition/faceEmbedding.model', () => ({
  FaceEmbedding: {
    create: jest.fn(),
    find: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../../../src/shared/services/fileUpload.service', () => ({
  uploadBuffer: jest.fn().mockResolvedValue({ url: 'https://cdn/face.jpg', publicId: 'x' }),
}));

jest.mock('../../../src/modules/face-recognition/faceEmbedding.provider', () => ({
  generateFaceEmbedding: jest.fn(),
}));

import { faceService } from '../../../src/modules/face-recognition/face.service';
import { FaceEmbedding } from '../../../src/modules/face-recognition/faceEmbedding.model';
import { generateFaceEmbedding } from '../../../src/modules/face-recognition/faceEmbedding.provider';
import type { ActorContext } from '../../../src/shared/types/actorContext';

const mockedCreate = FaceEmbedding.create as unknown as jest.Mock;
const mockedFind = FaceEmbedding.find as unknown as jest.Mock;
const mockedUpdateMany = FaceEmbedding.updateMany as unknown as jest.Mock;
const mockedDeleteMany = FaceEmbedding.deleteMany as unknown as jest.Mock;
const mockedGenerateEmbedding = generateFaceEmbedding as unknown as jest.Mock;

const self: ActorContext = { id: 'user-1', role: 'employee', employeeId: 'emp-1' };
const otherEmployee: ActorContext = { id: 'user-2', role: 'employee', employeeId: 'emp-2' };
const hr: ActorContext = { id: 'user-hr', role: 'hr', employeeId: 'emp-hr' };

function goodEmbedding(seed: number) {
  return { vector: Array(128).fill(seed), qualityScore: 0.8 };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedUpdateMany.mockResolvedValue({});
  mockedDeleteMany.mockResolvedValue({});
});

describe('faceService.register', () => {
  const threeImages = [Buffer.from('a'), Buffer.from('b'), Buffer.from('c')];

  it('stores an embedding per kept image and reports counts', async () => {
    mockedGenerateEmbedding
      .mockResolvedValueOnce(goodEmbedding(1))
      .mockResolvedValueOnce(goodEmbedding(2))
      .mockResolvedValueOnce(goodEmbedding(3));
    mockedCreate.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ _id: `id-${Math.random()}`, ...data }),
    );

    const result = await faceService.register(threeImages, undefined, self);

    expect(result).toEqual({ status: 'registered', embeddingCount: 3, discardedCount: 0 });
    expect(mockedCreate).toHaveBeenCalledTimes(3);
  });

  it('discards low-quality images but keeps the rest', async () => {
    mockedGenerateEmbedding
      .mockResolvedValueOnce({ vector: Array(128).fill(1), qualityScore: 0.05 }) // discarded
      .mockResolvedValueOnce(goodEmbedding(2))
      .mockResolvedValueOnce(goodEmbedding(3));
    mockedCreate.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ _id: `id-${Math.random()}`, ...data }),
    );

    const result = await faceService.register(threeImages, undefined, self);

    expect(result).toEqual({ status: 'registered', embeddingCount: 2, discardedCount: 1 });
  });

  it('rejects when every image is discarded for low quality', async () => {
    mockedGenerateEmbedding.mockResolvedValue({ vector: Array(128).fill(1), qualityScore: 0.01 });

    await expect(faceService.register(threeImages, undefined, self)).rejects.toMatchObject({
      code: 'FACE_QUALITY_TOO_LOW',
    });
  });

  it('rejects fewer than 3 or more than 5 images', async () => {
    await expect(
      faceService.register([Buffer.from('a'), Buffer.from('b')], undefined, self),
    ).rejects.toMatchObject({ code: 'INVALID_IMAGE_COUNT' });
  });

  it('deactivates prior embeddings by id, excluding the ones just created', async () => {
    mockedGenerateEmbedding.mockResolvedValue(goodEmbedding(1));
    mockedCreate.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ _id: 'new-id', ...data }),
    );

    await faceService.register(threeImages, undefined, self);

    expect(mockedUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: 'emp-1',
        isActive: true,
        _id: { $nin: expect.arrayContaining(['new-id']) },
      }),
      { $set: { isActive: false } },
    );
  });

  it('lets HR register on behalf of another employee', async () => {
    mockedGenerateEmbedding.mockResolvedValue(goodEmbedding(1));
    mockedCreate.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ _id: 'id', ...data }),
    );

    await expect(faceService.register(threeImages, 'emp-2', hr)).resolves.toMatchObject({
      status: 'registered',
    });
    expect(mockedCreate).toHaveBeenCalledWith(expect.objectContaining({ employeeId: 'emp-2' }));
  });

  it('blocks a plain employee from registering face data for someone else', async () => {
    await expect(faceService.register(threeImages, 'emp-2', self)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(mockedGenerateEmbedding).not.toHaveBeenCalled();
  });
});

describe('faceService.registerWithEmbeddings', () => {
  const threeEmbeddings = [Array(67).fill(0.1), Array(67).fill(0.2), Array(67).fill(0.3)];

  it('stores one row per submitted embedding with no image reference', async () => {
    mockedCreate.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ _id: `id-${Math.random()}`, ...data }),
    );

    const result = await faceService.registerWithEmbeddings(threeEmbeddings, undefined, self);

    expect(result).toEqual({ status: 'registered', embeddingCount: 3, discardedCount: 0 });
    expect(mockedCreate).toHaveBeenCalledTimes(3);
    for (const call of mockedCreate.mock.calls) {
      expect(call[0]).not.toHaveProperty('sourceImageUrl');
      expect(call[0]).toMatchObject({ employeeId: 'emp-1', qualityScore: null, isActive: true });
    }
  });

  it('deactivates the previous reference set, same as image-based registration', async () => {
    mockedCreate.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ _id: 'new-id', ...data }),
    );

    await faceService.registerWithEmbeddings(threeEmbeddings, undefined, self);

    expect(mockedUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: 'emp-1',
        isActive: true,
        _id: { $nin: expect.arrayContaining(['new-id']) },
      }),
      { $set: { isActive: false } },
    );
  });

  it('lets HR register on behalf of another employee', async () => {
    mockedCreate.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ _id: 'id', ...data }),
    );

    await expect(
      faceService.registerWithEmbeddings(threeEmbeddings, 'emp-2', hr),
    ).resolves.toMatchObject({ status: 'registered' });
    expect(mockedCreate).toHaveBeenCalledWith(expect.objectContaining({ employeeId: 'emp-2' }));
  });

  it('blocks a plain employee from registering face data for someone else', async () => {
    await expect(
      faceService.registerWithEmbeddings(threeEmbeddings, 'emp-2', self),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mockedCreate).not.toHaveBeenCalled();
  });
});

describe('faceService.getRegistrationStatus', () => {
  it('reports not_registered when there are no active embeddings', async () => {
    mockedFind.mockReturnValue(mockQuery([]));

    await expect(faceService.getRegistrationStatus(undefined, self)).resolves.toEqual({
      status: 'not_registered',
      embeddingCount: 0,
      lastRegisteredAt: null,
    });
  });

  it('reports registered with the embedding count and most recent registration time', async () => {
    const older = new Date('2026-01-01');
    const newer = new Date('2026-06-01');
    mockedFind.mockReturnValue(mockQuery([{ registeredAt: older }, { registeredAt: newer }]));

    const status = await faceService.getRegistrationStatus(undefined, self);

    expect(status.status).toBe('registered');
    expect(status.embeddingCount).toBe(2);
    expect(status.lastRegisteredAt).toEqual(newer);
  });

  it('blocks viewing another employee’s status without HR/Admin', async () => {
    // otherEmployee's own id is 'emp-2' — requesting 'emp-1' is the cross-employee case.
    await expect(faceService.getRegistrationStatus('emp-1', otherEmployee)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});

describe('faceService.verify', () => {
  it('matches when the closest stored embedding is above threshold', async () => {
    mockedFind.mockResolvedValue([{ vector: Array(128).fill(1) }]);

    const result = await faceService.verify(self, Array(128).fill(1));

    expect(result.matched).toBe(true);
    expect(result.confidence).toBeCloseTo(1);
  });

  it('does not match when confidence is below threshold', async () => {
    mockedFind.mockResolvedValue([{ vector: Array(128).fill(1) }]);
    const orthogonal = Array(128).fill(0);
    orthogonal[0] = 1; // very different direction from an all-ones vector

    const result = await faceService.verify(self, orthogonal);

    expect(result.matched).toBe(false);
  });

  it('throws FACE_NOT_REGISTERED when the employee has no active embeddings', async () => {
    mockedFind.mockResolvedValue([]);

    await expect(faceService.verify(self, Array(128).fill(1))).rejects.toMatchObject({
      code: 'FACE_NOT_REGISTERED',
    });
  });

  it('throws NO_EMPLOYEE_PROFILE for an actor with no linked employee', async () => {
    const noProfile: ActorContext = { id: 'user-x', role: 'employee' };
    await expect(faceService.verify(noProfile, Array(128).fill(1))).rejects.toMatchObject({
      code: 'NO_EMPLOYEE_PROFILE',
    });
  });
});

describe('faceService.deleteFaceData', () => {
  it('hard-deletes every embedding for the employee', async () => {
    await faceService.deleteFaceData('emp-1');
    expect(mockedDeleteMany).toHaveBeenCalledWith({ employeeId: 'emp-1' });
  });
});
