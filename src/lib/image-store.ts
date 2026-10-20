import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from './db';

export interface CachedImage {
  mimeType: string;
  buffer: Buffer;
  etag: string;
}

const imageMemoryCache = new Map<string, CachedImage>();
const MAX_CACHE_ENTRIES = 200;
let isImageTableInitialized = false;

function computeEtag(buffer: Buffer): string {
  const hash = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 24);
  return `"${hash}"`;
}

function setCacheEntry(id: string, mimeType: string, buffer: Buffer): CachedImage {
  if (imageMemoryCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = imageMemoryCache.keys().next().value;
    if (oldestKey) imageMemoryCache.delete(oldestKey);
  }
  const entry: CachedImage = {
    mimeType,
    buffer,
    etag: computeEtag(buffer),
  };
  imageMemoryCache.set(id, entry);
  return entry;
}

export async function ensureUploadedImageTable(): Promise<boolean> {
  if (!process.env.DATABASE_URL || !prisma) return false;
  if (isImageTableInitialized) return true;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UploadedImage" (
        "id" TEXT NOT NULL,
        "mimeType" TEXT NOT NULL,
        "data" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UploadedImage_pkey" PRIMARY KEY ("id")
      );
    `);
    isImageTableInitialized = true;
    return true;
  } catch (err) {
    console.warn('UploadedImage table init notice:', err);
    return true; // Still attempt queries in case table already exists
  }
}

function getExtensionFromMime(mimeType: string): string {
  const clean = mimeType.toLowerCase();
  if (clean.includes('webp')) return '.webp';
  if (clean.includes('png')) return '.png';
  if (clean.includes('svg')) return '.svg';
  if (clean.includes('gif')) return '.gif';
  return '.jpg';
}

function getMimeFromFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.webp') return 'image/webp';
  if (ext === '.png') return 'image/png';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.gif') return 'image/gif';
  return 'image/jpeg';
}

/**
 * Stores an uploaded image binary in Supabase PostgreSQL ("UploadedImage")
 * and returns a clean, lightweight relative URL (`/api/images/<id>`) that works
 * identically on localhost and Vercel Production without bloating JSON payloads.
 * Falls back to a Data URL only if PostgreSQL is unreachable.
 */
export async function saveUploadedImage(
  id: string,
  mimeType: string,
  buffer: Buffer
): Promise<string> {
  const cleanId = path.basename(id).replace(/[^a-zA-Z0-9._-]/g, '_');
  const base64Data = buffer.toString('base64');

  setCacheEntry(cleanId, mimeType, buffer);

  if (process.env.DATABASE_URL && prisma) {
    try {
      await prisma.uploadedImage.upsert({
        where: { id: cleanId },
        update: { mimeType, data: base64Data },
        create: { id: cleanId, mimeType, data: base64Data },
      });
      return `/api/images/${cleanId}`;
    } catch {
      try {
        await ensureUploadedImageTable();
        await prisma.$executeRawUnsafe(
          `INSERT INTO "UploadedImage" ("id", "mimeType", "data", "createdAt")
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
           ON CONFLICT ("id") DO UPDATE SET "mimeType" = $2, "data" = $3`,
          cleanId,
          mimeType,
          base64Data
        );
        return `/api/images/${cleanId}`;
      } catch (err) {
        console.warn('PostgreSQL image store fallback notice:', err);
      }
    }
  }

  if (!process.env.VERCEL) {
    try {
      const publicImagesDir = path.join(process.cwd(), 'public', 'images');
      if (!fs.existsSync(publicImagesDir)) {
        fs.mkdirSync(publicImagesDir, { recursive: true });
      }
      fs.writeFileSync(path.join(publicImagesDir, cleanId), buffer);
    } catch {
      // Ignore on read-only filesystems
    }
    return `/api/images/${cleanId}`;
  }

  return `data:${mimeType};base64,${base64Data}`;
}

/**
 * Inspects an image URL before saving a Product or SiteSetting:
 * - Rejects truncated/corrupted test data URLs (< 64 chars) so callers fall back cleanly.
 * - Converts valid inline `data:image/...` strings into `/api/images/<id>` rows in PostgreSQL.
 * - Migrates any localhost-only `/images/garment_*` files into `/api/images/<id>` rows in PostgreSQL.
 */
export async function persistImageUrlForCloud(rawUrl: string | undefined | null): Promise<string> {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  // 1. Handle inline data:image/ URLs
  if (trimmed.startsWith('data:image/')) {
    // Reject truncated/dummy test strings (e.g. 36-char "data:image/jpeg;base64,/9j/4AAQSkZJRg==")
    if (!trimmed.startsWith('data:image/svg') && trimmed.length < 64) {
      return '';
    }

    const match = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
    if (!match) return trimmed;

    const mimeType = match[1].toLowerCase();
    const base64Payload = match[2].replace(/\s+/g, '');
    try {
      const buffer = Buffer.from(base64Payload, 'base64');
      if (buffer.length < 32 && !mimeType.includes('svg')) {
        return '';
      }
      const hash = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 20);
      const ext = getExtensionFromMime(mimeType);
      const imageId = `img_${hash}${ext}`;
      return await saveUploadedImage(imageId, mimeType, buffer);
    } catch {
      return trimmed;
    }
  }

  // 2. Migrate any localhost-only `/images/garment_*` file into PostgreSQL
  if (trimmed.startsWith('/images/garment_')) {
    const filename = path.basename(trimmed);
    const localPath = path.join(process.cwd(), 'public', 'images', filename);
    try {
      if (fs.existsSync(localPath)) {
        const buffer = fs.readFileSync(localPath);
        const mimeType = getMimeFromFilename(filename);
        return await saveUploadedImage(filename, mimeType, buffer);
      }
    } catch {
      // Ignore fs error
    }
    return `/api/images/${filename}`;
  }

  return trimmed;
}

/**
 * Retrieves an uploaded image binary by ID from memory cache, Supabase PostgreSQL, or local disk.
 * Never runs CREATE TABLE DDL on normal reads — queries findUnique directly for fast response.
 */
export async function getUploadedImage(id: string): Promise<CachedImage | null> {
  const cleanId = path.basename(id).replace(/[^a-zA-Z0-9._-]/g, '_');

  const cached = imageMemoryCache.get(cleanId);
  if (cached) return cached;

  if (process.env.DATABASE_URL && prisma) {
    try {
      const record = await prisma.uploadedImage.findUnique({
        where: { id: cleanId },
      });
      if (record && record.data) {
        const buffer = Buffer.from(record.data, 'base64');
        const mimeType = record.mimeType || getMimeFromFilename(cleanId);
        return setCacheEntry(cleanId, mimeType, buffer);
      }
    } catch {
      try {
        await ensureUploadedImageTable();
        const rows = await prisma.$queryRawUnsafe<{ mimeType: string; data: string }[]>(
          `SELECT "mimeType", "data" FROM "UploadedImage" WHERE "id" = $1 LIMIT 1`,
          cleanId
        );
        if (rows && rows.length > 0 && rows[0].data) {
          const buffer = Buffer.from(rows[0].data, 'base64');
          const mimeType = rows[0].mimeType || getMimeFromFilename(cleanId);
          return setCacheEntry(cleanId, mimeType, buffer);
        }
      } catch (err) {
        console.warn('PostgreSQL image read notice:', err);
      }
    }
  }

  // Fallback to local public/images directory if present
  try {
    const localPath = path.join(process.cwd(), 'public', 'images', cleanId);
    if (fs.existsSync(localPath)) {
      const buffer = fs.readFileSync(localPath);
      const mimeType = getMimeFromFilename(cleanId);
      return setCacheEntry(cleanId, mimeType, buffer);
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Deletes an uploaded image by ID or URL from memory cache, PostgreSQL, and local public/images.
 */
export async function deleteUploadedImage(idOrUrl: string): Promise<void> {
  if (!idOrUrl) return;
  const cleanId = path.basename(idOrUrl).replace(/[^a-zA-Z0-9._-]/g, '_');
  imageMemoryCache.delete(cleanId);

  if (process.env.DATABASE_URL && prisma) {
    try {
      await prisma.uploadedImage.deleteMany({ where: { id: cleanId } });
    } catch {
      // Ignore
    }
  }

  if (!process.env.VERCEL) {
    try {
      const localPath = path.join(process.cwd(), 'public', 'images', cleanId);
      if (fs.existsSync(localPath) && cleanId.startsWith('garment_')) {
        fs.unlinkSync(localPath);
      }
    } catch {
      // Ignore
    }
  }
}
