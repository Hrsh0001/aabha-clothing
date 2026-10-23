import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isAuthorizedAdmin } from '../../../lib/auth-guard';
import { saveUploadedImage } from '../../../lib/image-store';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB maximum per photo limit
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
]);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif']);

export async function POST(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Administrator access required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided for upload' },
        { status: 400 }
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { success: false, error: 'Uploaded file is empty (0 bytes)' },
        { status: 400 }
      );
    }

    // 1. Validate max file size (5 MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `File "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 5 MB maximum limit`,
        },
        { status: 400 }
      );
    }

    // 2. Validate MIME type
    const mimeType = (file.type || 'image/jpeg').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Only standard image formats (JPEG, JPG, PNG, WebP, GIF, SVG, AVIF) are permitted',
        },
        { status: 400 }
      );
    }

    // 3. Validate file extension
    const ext = (path.extname(file.name) || '.webp').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file extension. Please upload a valid image file.',
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 4. Sanitize file base name
    const rawBase = path.basename(file.name, ext);
    const cleanBase = rawBase.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 32);
    const filename = `garment_${cleanBase}_${Date.now()}${ext}`;

    // 5. Try uploading to Supabase Storage bucket if SUPABASE_URL & key are configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'products';
        const uploadEndpoint = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${bucket}/${filename}`;
        const storageRes = await fetch(uploadEndpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            apikey: supabaseKey,
            'Content-Type': mimeType,
            'x-upsert': 'true',
          },
          body: buffer,
        });

        if (storageRes.ok) {
          const publicUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${filename}`;
          return NextResponse.json({
            success: true,
            imageUrl: publicUrl,
            message: 'Image uploaded to Supabase cloud storage',
          });
        }
      } catch (storageErr) {
        console.warn('Supabase Storage fallback notice:', storageErr);
      }
    }

    // 6. Optional local backup copy when running in local dev (non-fatal on Vercel read-only fs)
    if (!process.env.VERCEL) {
      try {
        const publicImagesDir = path.join(process.cwd(), 'public', 'images');
        if (!fs.existsSync(publicImagesDir)) {
          fs.mkdirSync(publicImagesDir, { recursive: true });
        }
        fs.writeFileSync(path.join(publicImagesDir, filename), buffer);
      } catch {
        // Ignore on read-only filesystems
      }
    }

    // 7. Persist in Supabase PostgreSQL ("UploadedImage") and return /api/images/<filename>
    //    (Falls back to compressed Data URL only if PostgreSQL is offline)
    const imageUrl = await saveUploadedImage(filename, mimeType, buffer);

    return NextResponse.json({
      success: true,
      imageUrl,
      message: 'Image verified and saved to cloud storage',
    });
  } catch (error) {
    console.error('Upload API validation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process and validate image upload' },
      { status: 500 }
    );
  }
}
