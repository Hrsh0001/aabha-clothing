'use client';

import {
  MAX_IMAGE_FILE_SIZE_MB,
  MAX_IMAGE_FILE_SIZE_BYTES,
  MAX_GALLERY_PHOTOS,
  IMAGE_UPLOAD_LIMIT_BADGE,
  validateImageFile,
  formatFileSize,
} from './form-validation';

export {
  MAX_IMAGE_FILE_SIZE_MB,
  MAX_IMAGE_FILE_SIZE_BYTES,
  MAX_GALLERY_PHOTOS,
  IMAGE_UPLOAD_LIMIT_BADGE,
};

const MAX_RAW_FILE_BYTES = MAX_IMAGE_FILE_SIZE_BYTES; // 5 MB per photo limit
const TARGET_MAX_DIMENSION = 1080;
const TARGET_QUALITY = 0.78;
const TARGET_MAX_BYTES = 95 * 1024; // Ultra-lightweight ~40KB–90KB WebP for instant storefront loading

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), mimeType, quality);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Compresses and resizes an image File on the client using HTML5 Canvas.
 * Converts multi-megabyte studio/camera photos into crisp ~40KB-90KB WebP files.
 */
export async function compressImageFile(
  file: File,
  maxDimension: number = TARGET_MAX_DIMENSION,
  quality: number = TARGET_QUALITY
): Promise<File> {
  if (typeof window === 'undefined') return file;

  // Keep SVG vector files untouched
  if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
    return file;
  }

  // If already a tiny WebP under 75KB, no need to re-encode
  if (file.size <= 75 * 1024 && file.type === 'image/webp') {
    return file;
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      try {
        let width = img.naturalWidth || img.width || 800;
        let height = img.naturalHeight || img.height || 1000;

        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 1. Encode as WebP first (max 1080px, quality 0.78 -> ~40KB–90KB)
        let blob = await canvasToBlob(canvas, 'image/webp', quality);

        // 2. If browser fell back to PNG or blob exceeds target budget, compress further
        if (!blob || blob.size > TARGET_MAX_BYTES) {
          const smallerDim = Math.min(900, maxDimension);
          if (canvas.width > smallerDim || canvas.height > smallerDim) {
            const scale = smallerDim / Math.max(canvas.width, canvas.height);
            const c2 = document.createElement('canvas');
            c2.width = Math.max(1, Math.round(canvas.width * scale));
            c2.height = Math.max(1, Math.round(canvas.height * scale));
            const ctx2 = c2.getContext('2d');
            if (ctx2) {
              ctx2.imageSmoothingEnabled = true;
              ctx2.imageSmoothingQuality = 'high';
              ctx2.fillStyle = '#FAF8F5';
              ctx2.fillRect(0, 0, c2.width, c2.height);
              ctx2.drawImage(canvas, 0, 0, c2.width, c2.height);
              const webp2 = await canvasToBlob(c2, 'image/webp', 0.72);
              if (webp2 && webp2.size <= TARGET_MAX_BYTES) {
                blob = webp2;
              } else {
                const jpg2 = await canvasToBlob(c2, 'image/jpeg', 0.72);
                if (jpg2) blob = jpg2;
              }
            }
          } else {
            const jpgBlob = await canvasToBlob(canvas, 'image/jpeg', 0.74);
            if (jpgBlob && (!blob || jpgBlob.size < blob.size)) {
              blob = jpgBlob;
            }
          }
        }

        if (!blob) {
          resolve(file);
          return;
        }

        const ext = blob.type === 'image/webp' ? '.webp' : '.jpg';
        const baseName = file.name.replace(/\.[^/.]+$/, '') || 'garment';
        const compressedFile = new File([blob], `${baseName}${ext}`, {
          type: blob.type || 'image/webp',
          lastModified: Date.now(),
        });

        resolve(compressedFile);
      } catch {
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Ensures any oversized data:image/... URL in state is compressed to lightweight WebP before sending in a JSON body.
 */
export async function compressDataUrlIfNeeded(url: string): Promise<string> {
  if (
    typeof window === 'undefined' ||
    !url ||
    !url.startsWith('data:image/') ||
    url.startsWith('data:image/svg') ||
    (url.startsWith('data:image/webp') && url.length < 130_000)
  ) {
    return url;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const maxDim = TARGET_MAX_DIMENSION;
        let width = img.naturalWidth || img.width || 800;
        let height = img.naturalHeight || img.height || 1000;

        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(url);
          return;
        }

        ctx.fillStyle = '#FAF8F5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        let compressed = canvas.toDataURL('image/webp', TARGET_QUALITY);
        if (compressed.length > 150_000 || !compressed.startsWith('data:image/webp')) {
          compressed = canvas.toDataURL('image/jpeg', 0.72);
        }
        resolve(compressed);
      } catch {
        resolve(url);
      }
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

/**
 * Safely parses a fetch Response as JSON without throwing SyntaxError on 413/502/504 HTML/text responses.
 */
export async function safeParseJsonResponse(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (res.status === 413) {
      return {
        success: false,
        error: 'Upload payload exceeded server limit (413). Please try saving again.',
      };
    }
    return {
      success: false,
      error: `Server returned status ${res.status}: ${text.slice(0, 120) || res.statusText || 'Unexpected response'}`,
    };
  }
}

/**
 * Compresses an image file on the client and uploads it to /api/upload.
 * Falls back to a compressed client Data URL if the serverless upload endpoint is unreachable.
 */
export async function uploadAdminImage(
  file: File,
  headers: Record<string, string>
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const fileCheck = validateImageFile(file, { maxSizeMB: MAX_IMAGE_FILE_SIZE_MB });
  if (!fileCheck.valid) {
    return {
      success: false,
      error:
        fileCheck.error ||
        `"${file.name}" (${formatFileSize(file.size)}) exceeds the ${MAX_IMAGE_FILE_SIZE_MB} MB maximum size limit.`,
    };
  }

  if (file.size > MAX_RAW_FILE_BYTES) {
    return {
      success: false,
      error: `"${file.name}" (${formatFileSize(file.size)}) exceeds the ${MAX_IMAGE_FILE_SIZE_MB} MB maximum size limit.`,
    };
  }

  const compressedFile = await compressImageFile(file);

  try {
    const formData = new FormData();
    formData.append('file', compressedFile);

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers,
      body: formData,
    });

    if (res.status === 401) {
      return {
        success: false,
        error: 'Unauthorized: Administrator session expired. Please sign in again.',
      };
    }

    const data = await safeParseJsonResponse(res);
    if (data?.success && data?.imageUrl) {
      return { success: true, imageUrl: data.imageUrl };
    }

    if (res.status === 400) {
      return {
        success: false,
        error: data?.error || 'Image rejected due to file size or format restrictions.',
      };
    }

    // Fallback to client-encoded compressed Data URL if server upload returned a 5xx/storage error
    const fallbackDataUrl = await fileToDataUrl(compressedFile);
    if (fallbackDataUrl) {
      return { success: true, imageUrl: fallbackDataUrl };
    }

    return {
      success: false,
      error: data?.error || 'Failed to upload image',
    };
  } catch (err) {
    try {
      const fallbackDataUrl = await fileToDataUrl(compressedFile);
      if (fallbackDataUrl) {
        return { success: true, imageUrl: fallbackDataUrl };
      }
    } catch {
      // ignore
    }
    return {
      success: false,
      error: 'Network error during photo upload',
    };
  }
}
