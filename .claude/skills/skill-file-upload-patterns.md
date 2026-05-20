# Skill — File Upload Patterns

Multer → validate → store → DB → serve. Complete pattern for images and documents.

---

## Backend — Multer middleware (already in boilerplate)

```typescript
// backend/src/middleware/upload.ts — already exists
import multer, { type FileFilterCallback } from 'multer';
import path from 'path';
import crypto from 'crypto';

const ALLOWED_IMAGES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOCS   = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_SIZE_MB    = 5;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/'),
  filename:    (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomBytes(16).toString('hex');
    cb(null, `${name}${ext}`);
  },
});

function fileFilter(allowed: string[]) {
  return (_req: Express.Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (!allowed.includes(file.mimetype)) {
      return cb(new ValidationError(`Only ${allowed.join(', ')} allowed`));
    }
    cb(null, true);
  };
}

export const uploadImage    = multer({ storage, limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 }, fileFilter: fileFilter(ALLOWED_IMAGES) });
export const uploadDocument = multer({ storage, limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 }, fileFilter: fileFilter(ALLOWED_DOCS) });
export const uploadAny      = multer({ storage, limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 } });
```

---

## Routes — file upload endpoints

```typescript
// backend/src/modules/employee/employee.routes.ts
import { uploadDocument, uploadImage } from '../../middleware/upload.js';

// Single file upload — profile photo
employeeRouter.patch(
  '/:id/photo',
  authenticate,
  requirePermission('EMPLOYEE_UPDATE'),
  uploadImage.single('photo'),          // 'photo' = form field name
  EmployeeController.uploadPhoto,
);

// Multiple files — documents
employeeRouter.post(
  '/:id/documents',
  authenticate,
  requirePermission('EMPLOYEE_UPDATE'),
  uploadDocument.array('documents', 5),  // up to 5 files
  EmployeeController.uploadDocuments,
);
```

---

## Service — save path, return URL

```typescript
// backend/src/modules/employee/employee.service.ts
import path from 'path';
import sharp from 'sharp';   // npm install sharp
import fs from 'fs/promises';

static async uploadPhoto(id: string, file: Express.Multer.File, actor: AuthUser) {
  const employee = await this.getOne(id, actor);

  // Resize and compress image with sharp
  const outputPath = path.join('uploads', `thumb_${path.basename(file.path)}`);
  await sharp(file.path)
    .resize(200, 200, { fit: 'cover' })
    .jpeg({ quality: 85 })
    .toFile(outputPath);

  // Delete original
  await fs.unlink(file.path);

  // Build the public URL
  const photoUrl = `/uploads/${path.basename(outputPath)}`;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.employee.update({
      where: { id },
      data: { photoUrl },
    });
    await auditLogger.log(tx, {
      action: 'EMPLOYEE_PHOTO_UPLOADED',
      entityId: id, actorId: actor.id, organizationId: actor.organizationId,
    });
    return updated;
  });
}

static async uploadDocuments(id: string, files: Express.Multer.File[], actor: AuthUser) {
  await this.getOne(id, actor);

  const documents = files.map(f => ({
    name:      f.originalname,
    url:       `/uploads/${path.basename(f.path)}`,
    mimeType:  f.mimetype,
    sizeBytes: f.size,
    employeeId: id,
    organizationId: actor.organizationId,
  }));

  return prisma.employeeDocument.createMany({ data: documents });
}
```

---

## Serve uploads securely (only org-scoped access)

```typescript
// backend/src/app.ts — add static route with auth
import express from 'express';
import path from 'path';

// ❌ WRONG — anyone can access any file by guessing the URL
app.use('/uploads', express.static('uploads'));

// ✅ CORRECT — check auth before serving
app.get('/uploads/:filename', authenticate, async (req, res) => {
  // Verify the requesting user owns or can access this file
  const document = await prisma.employeeDocument.findFirst({
    where: { url: `/uploads/${req.params.filename}`, organizationId: req.user.organizationId },
  });

  if (!document) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } });

  res.sendFile(path.resolve('uploads', req.params.filename));
});
```

---

## Prisma model — document store

```prisma
model EmployeeDocument {
  id             String   @id @default(uuid())
  organizationId String
  employeeId     String
  name           String              // original filename
  url            String              // /uploads/xxx.pdf
  mimeType       String
  sizeBytes      Int
  uploadedAt     DateTime @default(now())
  deletedAt      DateTime?

  employee   Employee     @relation(fields: [employeeId], references: [id])
  @@index([organizationId])
  @@index([employeeId])
}
```

---

## Frontend — File upload with preview

```typescript
// frontend/src/features/employee/PhotoUpload.tsx
import { useRef, useState } from 'react';
import { useUploadEmployeePhotoMutation } from './employeeApi';
import { toast } from '@/hooks/useToast';

export function PhotoUpload({ employeeId, currentPhotoUrl }: { employeeId: string; currentPhotoUrl?: string }) {
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl ?? null);
  const [upload, { isLoading }] = useUploadEmployeePhotoMutation();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation before sending
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPEG, PNG, and WebP images allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    // Show local preview immediately (UX improvement)
    setPreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append('photo', file);

    try {
      await upload({ id: employeeId, formData }).unwrap();
      toast.success('Photo updated');
    } catch {
      toast.error('Failed to upload photo');
      setPreview(currentPhotoUrl ?? null);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-24 h-24 rounded-full overflow-hidden bg-[var(--ui-background-color)] cursor-pointer"
        onClick={() => inputRef.current?.click()}>
        {preview
          ? <img src={preview} alt="Profile" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-[var(--secondary-text-color)]">📷</div>
        }
        {isLoading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="text-white animate-spin">⟳</span></div>}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
      <button className="btn btn--secondary btn--sm" onClick={() => inputRef.current?.click()} disabled={isLoading}>Change photo</button>
    </div>
  );
}
```

---

## RTK Query — file upload mutation

```typescript
uploadEmployeePhoto: builder.mutation<Employee, { id: string; formData: FormData }>({
  query: ({ id, formData }) => ({
    url: `/employees/${id}/photo`,
    method: 'PATCH',
    body: formData,
    // Do NOT set Content-Type — let browser set multipart/form-data with boundary
    formData: true,
  }),
  invalidatesTags: (_result, _error, { id }) => [{ type: 'Employee', id }],
}),
```

---

## Checklist

- [ ] MIME type AND file extension both validated (not just extension — extensions can be faked)
- [ ] File size limited on server (not just client)
- [ ] Filename randomized with `crypto.randomBytes` — never use `originalname` directly
- [ ] Uploads directory is NOT served statically — auth-gated endpoint only
- [ ] Images resized/compressed with `sharp` before storing
- [ ] DB record stores `mimeType`, `sizeBytes`, and original `name`
- [ ] Client shows preview before upload completes (UX)
- [ ] Client validates file type + size before sending (saves bandwidth)
- [ ] `multer.array()` has a count limit to prevent DoS
- [ ] Old file deleted when replacing (no orphaned files)
