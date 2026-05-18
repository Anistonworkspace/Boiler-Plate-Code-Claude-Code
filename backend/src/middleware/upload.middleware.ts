import multer from 'multer';
import path from 'node:path';
import { env } from '../config/env.js';
import { ValidationError } from './errorHandler.js';

const MAX_SIZE = env.MAX_UPLOAD_SIZE_MB * 1024 * 1024;

const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
const DOC_MIME = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const DOC_EXT = ['.pdf', '.doc', '.docx'];
const RESUME_MIME = [...DOC_MIME];
const RESUME_EXT = [...DOC_EXT];

const storage = multer.diskStorage({
  destination: env.UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, safe);
  },
});

function makeFilter(allowedMime: string[], allowedExt: string[]): multer.Options['fileFilter'] {
  return (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedMime.includes(file.mimetype) || !allowedExt.includes(ext)) {
      return cb(new ValidationError(`File type not allowed: ${file.mimetype} ${ext}`));
    }
    cb(null, true);
  };
}

export const uploadImage = multer({ storage, limits: { fileSize: MAX_SIZE }, fileFilter: makeFilter(IMAGE_MIME, IMAGE_EXT) });
export const uploadDocument = multer({ storage, limits: { fileSize: MAX_SIZE }, fileFilter: makeFilter(DOC_MIME, DOC_EXT) });
export const uploadResume = multer({ storage, limits: { fileSize: MAX_SIZE }, fileFilter: makeFilter(RESUME_MIME, RESUME_EXT) });
