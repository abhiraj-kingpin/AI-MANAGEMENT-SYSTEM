import multer, { type FileFilterCallback } from 'multer';
import type { Request } from 'express';
import { AppError } from '../shared/errors/AppError';

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DOCUMENT_MIME_TYPES = new Set([...IMAGE_MIME_TYPES, 'application/pdf']);

function fileFilter(allowed: Set<string>) {
  return (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (!allowed.has(file.mimetype)) {
      cb(
        AppError.unprocessable(`Unsupported file type: ${file.mimetype}`, 'UNSUPPORTED_FILE_TYPE'),
      );
      return;
    }
    cb(null, true);
  };
}

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: IMAGE_MAX_BYTES },
  fileFilter: fileFilter(IMAGE_MIME_TYPES),
});

export const uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: DOCUMENT_MAX_BYTES },
  fileFilter: fileFilter(DOCUMENT_MIME_TYPES),
});
