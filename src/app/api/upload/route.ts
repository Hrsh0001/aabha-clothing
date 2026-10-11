import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isAuthorizedAdmin } from '../../../lib/auth-guard';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);

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

    // 1. Validate max file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds the 5MB maximum limit (received ${(file.size / (1024 * 1024)).toFixed(2)} MB)`,
        },
        { status: 400 }
      );
    }

    // 2. Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
      return NextResponse.json(
        {
          success: false,
          error: 'Only standard image formats (JPG, PNG, WebP, GIF, SVG) are permitted',
        },
        { status: 400 }
      );
    }

    // 3. Validate file extension
    const ext = (path.extname(file.name) || '.jpg').toLowerCase();
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

    // Try saving locally to public/images/
    try {
      const publicImagesDir = path.join(process.cwd(), 'public', 'images');
      if (!fs.existsSync(publicImagesDir)) {
        fs.mkdirSync(publicImagesDir, { recursive: true });
      }
      const filePath = path.join(publicImagesDir, filename);
      fs.writeFileSync(filePath, buffer);

      return NextResponse.json({
        success: true,
        imageUrl: `/images/${filename}`,
        message: 'Image validated and uploaded successfully',
      });
    } catch (fsErr) {
      // Vercel serverless environment fallback: return optimized data URL
      const base64Data = buffer.toString('base64');
      const dataUrl = `data:${file.type};base64,${base64Data}`;

      return NextResponse.json({
        success: true,
        imageUrl: dataUrl,
        message: 'Image verified and encoded for cloud deployment',
      });
    }
  } catch (error) {
    console.error('Upload API validation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process and validate image upload' },
      { status: 500 }
    );
  }
}
