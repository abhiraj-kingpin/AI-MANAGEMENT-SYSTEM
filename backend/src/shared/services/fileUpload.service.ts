import { cloudinary, isCloudinaryConfigured } from '../../config/cloudinary';
import { AppError } from '../errors/AppError';

export interface UploadResult {
  url: string;
  publicId: string;
}

/**
 * Streams a buffer (from multer's memory storage) to Cloudinary — no file
 * ever touches local disk. See docs/architecture/06-tech-stack-justification.md
 * for why Cloudinary over hand-rolled S3+CDN.
 */
export function uploadBuffer(
  buffer: Buffer,
  folder: string,
  options: { resourceType?: 'image' | 'raw' | 'auto' } = {},
): Promise<UploadResult> {
  if (!isCloudinaryConfigured) {
    throw AppError.internal(
      'File storage is not configured on this server yet.',
      'STORAGE_NOT_CONFIGURED',
    );
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: options.resourceType ?? 'auto' },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload failed with no error detail.'));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    uploadStream.end(buffer);
  });
}
