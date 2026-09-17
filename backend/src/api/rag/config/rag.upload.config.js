import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { StatusCodes } from 'http-status-codes';

const uploadDir = process.env.RAG_UPLOAD_DIR || 'uploads/rag';
const maxUploadMb = Number(process.env.RAG_MAX_UPLOAD_MB) || 10;

export const ragUploadRoot = path.resolve(process.cwd(), uploadDir);

if (!fs.existsSync(ragUploadRoot)) {
  fs.mkdirSync(ragUploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const userDir = path.join(ragUploadRoot, String(req.user?.id || 'anonymous'));
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}.pdf`);
  },
});

function fileFilter(_req, file, cb) {
  if (file.mimetype !== 'application/pdf') {
    cb(new Error('Only PDF files are supported.'));
    return;
  }
  cb(null, true);
}

export const ragUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxUploadMb * 1024 * 1024 },
});

/**
 * Turns multer errors (file too large, wrong type, etc.) into a clean
 * 400 JSON response instead of letting them bubble up as 500s.
 */
export function createDocumentMulterErrorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const msg =
      err.code === 'LIMIT_FILE_SIZE'
        ? `File exceeds the ${maxUploadMb}MB upload limit.`
        : err.message;
    return res.status(StatusCodes.BAD_REQUEST).json({ msg });
  }
  if (err) {
    return res.status(StatusCodes.BAD_REQUEST).json({ msg: err.message || 'Upload failed.' });
  }
  next();
}
