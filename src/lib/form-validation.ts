export const MAX_IMAGE_FILE_SIZE_MB = 5;
export const MAX_IMAGE_FILE_SIZE_BYTES = MAX_IMAGE_FILE_SIZE_MB * 1024 * 1024; // 5 MB per photo
export const MAX_GALLERY_PHOTOS = 10;
export const MAX_PAYLOAD_SIZE_BYTES = Math.floor(3.5 * 1024 * 1024); // 3.5 MB safe serverless payload cap

export const IMAGE_UPLOAD_LIMIT_BADGE =
  'Max 5 MB per photo · JPEG, PNG, WebP, AVIF, SVG, GIF · 100% Original High Fidelity';

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
]);

export const ALLOWED_IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.svg',
  '.avif',
]);

export interface FileLike {
  name: string;
  size: number;
  type?: string;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileExtension(filename: string): string {
  if (!filename) return '';
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot).toLowerCase();
}

/**
 * Validates a single image file against size limit (default 5 MB), MIME type, and file extension.
 */
export function validateImageFile(
  file: FileLike | null | undefined,
  options?: { maxSizeMB?: number; allowSvg?: boolean }
): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No image file provided for upload.' };
  }

  const maxSizeMB = options?.maxSizeMB ?? MAX_IMAGE_FILE_SIZE_MB;
  const maxBytes = maxSizeMB * 1024 * 1024;
  const allowSvg = options?.allowSvg ?? true;
  const fileName = file.name || 'image';

  if (file.size <= 0) {
    return {
      valid: false,
      error: `"${fileName}" is empty (0 bytes). Please choose a valid image file.`,
    };
  }

  // 1. Validate file size against limit
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `"${fileName}" (${formatFileSize(file.size)}) exceeds the ${maxSizeMB} MB maximum image size limit.`,
    };
  }

  // 2. Validate MIME type
  const mime = (file.type || '').toLowerCase().trim();
  if (mime) {
    if (!allowSvg && mime === 'image/svg+xml') {
      return {
        valid: false,
        error: `"${fileName}": SVG files are not permitted here. Allowed formats: JPG, PNG, WebP, AVIF, GIF.`,
      };
    }
    if (!ALLOWED_IMAGE_MIME_TYPES.has(mime)) {
      return {
        valid: false,
        error: `"${fileName}" has unsupported file type (${mime}). Allowed formats: JPG, PNG, WebP, AVIF, GIF${allowSvg ? ', SVG' : ''}.`,
      };
    }
  }

  // 3. Validate extension
  const ext = getFileExtension(fileName);
  if (ext) {
    if (!allowSvg && ext === '.svg') {
      return {
        valid: false,
        error: `"${fileName}": SVG extension is not permitted here. Allowed formats: JPG, PNG, WebP, AVIF, GIF.`,
      };
    }
    if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
      return {
        valid: false,
        error: `"${fileName}" has an unsupported file extension (${ext}). Allowed: .jpg, .jpeg, .png, .webp, .avif, .gif${allowSvg ? ', .svg' : ''}.`,
      };
    }
  } else if (!mime) {
    return {
      valid: false,
      error: `"${fileName}" is missing a valid image format or extension.`,
    };
  }

  return { valid: true };
}

/**
 * Validates a batch of image files simultaneously, returning all valid files and accumulating all error messages at once.
 */
export function validateImageFilesBatch<T extends FileLike = File>(
  files: T[] | FileList | null | undefined,
  currentGalleryCount: number = 0,
  maxGalleryCount: number = MAX_GALLERY_PHOTOS,
  options?: { maxSizeMB?: number; allowSvg?: boolean }
): { validFiles: T[]; errors: string[] } {
  if (!files || files.length === 0) {
    return { validFiles: [], errors: ['Please select at least one image file to upload.'] };
  }

  const list = Array.from(files as Iterable<T>);
  const errors: string[] = [];
  const candidateFiles: T[] = [];

  for (const file of list) {
    const check = validateImageFile(file, options);
    if (!check.valid && check.error) {
      errors.push(check.error);
    } else {
      candidateFiles.push(file);
    }
  }

  const remainingSlots = Math.max(0, maxGalleryCount - currentGalleryCount);
  if (candidateFiles.length > remainingSlots) {
    errors.push(
      `Maximum ${maxGalleryCount} gallery photos allowed per garment (${currentGalleryCount} currently in gallery, ${candidateFiles.length} valid file(s) selected). ${
        remainingSlots > 0
          ? `Only the first ${remainingSlots} photo(s) were queued.`
          : 'Please remove an existing photo before adding more.'
      }`
    );
    return {
      validFiles: candidateFiles.slice(0, remainingSlots),
      errors,
    };
  }

  return { validFiles: candidateFiles, errors };
}

/**
 * Checks whether a serialized JSON request body stays within safe serverless payload limits.
 */
export function validateJsonPayloadSize(
  payload: unknown,
  maxBytes: number = MAX_PAYLOAD_SIZE_BYTES
): { valid: boolean; sizeBytes: number; error?: string } {
  try {
    const json = JSON.stringify(payload);
    const sizeBytes =
      typeof Buffer !== 'undefined'
        ? Buffer.byteLength(json, 'utf-8')
        : new TextEncoder().encode(json).length;

    if (sizeBytes > maxBytes) {
      return {
        valid: false,
        sizeBytes,
        error: `Total garment payload (${formatFileSize(sizeBytes)}) exceeds the ${formatFileSize(maxBytes)} cloud limit. Please reduce photo count or replace oversized images.`,
      };
    }
    return { valid: true, sizeBytes };
  } catch {
    return {
      valid: false,
      sizeBytes: 0,
      error: 'Unable to serialize form payload.',
    };
  }
}

export interface ProductGalleryInputItem {
  url: string;
  label?: string;
  focalClass?: string;
}

export interface ProductFormValues {
  name: string;
  category: string;
  sku: string;
  price: string | number;
  originalPrice?: string | number;
  fabric: string;
  sizes: string[];
  selectedSizes?: string[];
  primaryImage?: string;
  description: string;
  gallery: ProductGalleryInputItem[];
}

export type ProductFormField =
  | 'name'
  | 'category'
  | 'sku'
  | 'price'
  | 'originalPrice'
  | 'fabric'
  | 'sizes'
  | 'description'
  | 'gallery';

export type ProductFormErrors = Partial<Record<ProductFormField, string>>;

/**
 * Validates ALL product form inputs simultaneously (react-hook-form `useForm` style)
 * so every invalid input error is returned at once rather than stopping at the first error.
 */
export function validateProductForm(values: ProductFormValues): {
  isValid: boolean;
  errors: ProductFormErrors;
} {
  const errors: ProductFormErrors = {};

  // 1. Garment Silhouette Name
  const cleanName = (values.name ?? '').toString().trim();
  if (!cleanName) {
    errors.name = 'Garment silhouette name is required.';
  } else if (cleanName.length < 3) {
    errors.name = 'Garment silhouette name must be at least 3 characters.';
  } else if (cleanName.length > 140) {
    errors.name = 'Garment silhouette name cannot exceed 140 characters.';
  }

  // 2. Collection Category
  const cleanCategory = (values.category ?? '').toString().trim();
  if (!cleanCategory) {
    errors.category = 'Collection category is required.';
  }

  // 3. Atelier SKU Code
  const cleanSku = (values.sku ?? '').toString().trim();
  if (!cleanSku) {
    errors.sku = 'Atelier SKU code is required (e.g. AB-ANA-548).';
  } else if (cleanSku.length < 3) {
    errors.sku = 'Atelier SKU code must be at least 3 characters.';
  }

  // 4. Selling Price (INR)
  const rawPrice = (values.price ?? '').toString().trim();
  const parsedPrice = Number(rawPrice);
  if (!rawPrice || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
    errors.price = 'Selling price must be a valid amount greater than ₹0.';
  } else if (parsedPrice > 1_000_000) {
    errors.price = 'Selling price cannot exceed ₹10,00,000.';
  }

  // 5. MRP / Original Price (Optional, but if provided must be valid and >= Selling Price)
  const rawOriginal = (values.originalPrice ?? '').toString().trim();
  if (rawOriginal !== '') {
    const parsedOriginal = Number(rawOriginal);
    if (Number.isNaN(parsedOriginal) || parsedOriginal <= 0) {
      errors.originalPrice = 'MRP / Original price must be a valid positive amount in ₹ INR.';
    } else if (!Number.isNaN(parsedPrice) && parsedPrice > 0 && parsedOriginal < parsedPrice) {
      errors.originalPrice = `MRP / Original price (₹${parsedOriginal.toLocaleString('en-IN')}) must be greater than or equal to the selling price (₹${parsedPrice.toLocaleString('en-IN')}).`;
    }
  }

  // 6. Handloom Fabric & Weave Origin
  const cleanFabric = (values.fabric ?? '').toString().trim();
  if (!cleanFabric) {
    errors.fabric = 'Handloom fabric & weave origin is required.';
  } else if (cleanFabric.length < 2) {
    errors.fabric = 'Fabric description must be at least 2 characters.';
  }

  // 7. Sizes Inventory
  const rawSizes = (Array.isArray(values.sizes) && values.sizes.length > 0)
    ? values.sizes
    : (Array.isArray(values.selectedSizes) ? values.selectedSizes : []);
  const validSizes = rawSizes
    .map((s) => String(s ?? '').trim().toUpperCase())
    .filter(Boolean);
  if (validSizes.length === 0) {
    errors.sizes = 'Please select at least one available size (e.g. M, L, XL).';
      }

  // 8. Garment Description & Cut Notes
  const cleanDesc = (values.description ?? '').toString().trim();
  if (!cleanDesc) {
    errors.description = 'Garment description & cut notes are required.';
  } else if (cleanDesc.length < 10) {
    errors.description = 'Garment description must be at least 10 characters.';
  }

  // 9. Studio Photography & Gallery
  const gallery = Array.isArray(values.gallery) ? values.gallery : [];
  const validPhotos = gallery.filter((g) => g && typeof g.url === 'string' && g.url.trim().length > 0);

  if (validPhotos.length === 0) {
    errors.gallery = 'At least one garment studio photo is required.';
  } else if (gallery.length > MAX_GALLERY_PHOTOS) {
    errors.gallery = `Gallery cannot exceed ${MAX_GALLERY_PHOTOS} photos (currently ${gallery.length} photos).`;
  } else if (validPhotos.length !== gallery.length) {
    errors.gallery = 'All gallery photo cards must contain a valid image URL.';
  } else {
    // Check if any photo in gallery is an uncompressed data URL exceeding 5 MB binary (~6.85M base64 chars)
    const maxDataUrlLength = Math.ceil(MAX_IMAGE_FILE_SIZE_BYTES * 1.37) + 256;
    const oversizedIndex = validPhotos.findIndex(
      (g) => g.url.startsWith('data:image/') && g.url.length > maxDataUrlLength
    );
    if (oversizedIndex !== -1) {
      errors.gallery = `Photo #${oversizedIndex + 1} exceeds the ${MAX_IMAGE_FILE_SIZE_MB} MB image size limit. Please replace or re-upload it.`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface CheckoutFormValues {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  stateName: string;
  postalCode: string;
}

export type CheckoutFormField = keyof CheckoutFormValues;
export type CheckoutFormErrors = Partial<Record<CheckoutFormField, string>>;

/**
 * Validates ALL checkout delivery fields simultaneously (`useForm` style).
 */
export function validateCheckoutForm(values: CheckoutFormValues): {
  isValid: boolean;
  errors: CheckoutFormErrors;
} {
  const errors: CheckoutFormErrors = {};

  // 1. Full Name
  const cleanName = (values.fullName ?? '').toString().trim();
  if (!cleanName) {
    errors.fullName = 'Recipient full name is required.';
  } else if (cleanName.length < 2) {
    errors.fullName = 'Full name must be at least 2 characters.';
  }

  // 2. Email Address
  const cleanEmail = (values.email ?? '').toString().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail) {
    errors.email = 'Email address is required for order confirmation & GST invoice.';
  } else if (!emailRegex.test(cleanEmail)) {
    errors.email = 'Please enter a valid email address (e.g. name@domain.com).';
  }

  // 3. Mobile Number (10-digit Indian mobile number, optional +91 prefix)
  const rawPhone = (values.phone ?? '').toString().trim();
  const digits = rawPhone.replace(/[^0-9]/g, '');
  const normalizedPhone =
    digits.length === 12 && digits.startsWith('91')
      ? digits.slice(2)
      : digits.length === 11 && digits.startsWith('0')
      ? digits.slice(1)
      : digits;

  if (!digits) {
    errors.phone = 'Mobile number is required for doorstep COD delivery coordination.';
  } else if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
    errors.phone = 'Please enter a valid 10-digit Indian mobile number.';
  }

  // 4. Street Address
  const cleanAddress = (values.address ?? '').toString().trim();
  if (!cleanAddress) {
    errors.address = 'Street address, house / flat number & building are required.';
  } else if (cleanAddress.length < 5) {
    errors.address = 'Please enter a complete street address (minimum 5 characters).';
  }

  // 5. City
  const cleanCity = (values.city ?? '').toString().trim();
  if (!cleanCity) {
    errors.city = 'City / town name is required.';
  } else if (cleanCity.length < 2) {
    errors.city = 'City name must be at least 2 characters.';
  }

  // 6. State
  const cleanState = (values.stateName ?? '').toString().trim();
  if (!cleanState) {
    errors.stateName = 'State selection is required.';
  }

  // 7. PIN Code (6-digit Indian PIN code)
  const cleanPin = (values.postalCode ?? '').toString().trim();
  if (!cleanPin) {
    errors.postalCode = '6-digit PIN code is required.';
  } else if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
    errors.postalCode = 'Please enter a valid 6-digit Indian PIN code (e.g. 400001).';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface BrandingFormValues {
  logoUrl: string;
  heroBanner: string;
  heroBannerMobile?: string;
  heroCoords: string;
  heroCoordsMobile?: string;
  heroEthnic: string;
  heroEthnicMobile?: string;
  whatsappNumber?: string;
  brandStory: string;
  igPhotos: string[];
}

export type BrandingFormField =
  | 'logoUrl'
  | 'heroBanner'
  | 'heroBannerMobile'
  | 'heroCoords'
  | 'heroCoordsMobile'
  | 'heroEthnic'
  | 'heroEthnicMobile'
  | 'whatsappNumber'
  | 'brandStory'
  | 'igPhotos';

export type BrandingFormErrors = Partial<Record<BrandingFormField, string>>;

/**
 * Validates ALL branding media fields simultaneously (`useForm` style).
 */
export function validateBrandingForm(values: BrandingFormValues): {
  isValid: boolean;
  errors: BrandingFormErrors;
} {
  const errors: BrandingFormErrors = {};
  const maxDataUrlLength = Math.ceil(MAX_IMAGE_FILE_SIZE_BYTES * 1.37) + 256;

  const checkUrlField = (field: BrandingFormField, label: string, val: string) => {
    const clean = (val ?? '').trim();
    if (!clean) {
      errors[field] = `${label} image is required.`;
    } else if (clean.startsWith('data:image/') && clean.length > maxDataUrlLength) {
      errors[field] = `${label} exceeds the ${MAX_IMAGE_FILE_SIZE_MB} MB image size limit.`;
    }
  };

  const checkOptionalUrlField = (field: BrandingFormField, label: string, val?: string) => {
    const clean = (val ?? '').trim();
    if (clean && clean.startsWith('data:image/') && clean.length > maxDataUrlLength) {
      errors[field] = `${label} exceeds the ${MAX_IMAGE_FILE_SIZE_MB} MB image size limit.`;
    }
  };

  checkUrlField('logoUrl', 'Brand logo', values.logoUrl);
  checkUrlField('heroBanner', 'Hero Slide 01 (Main Banner)', values.heroBanner);
  checkUrlField('heroCoords', 'Hero Slide 02 (Co-ord Edit)', values.heroCoords);
  checkUrlField('heroEthnic', 'Hero Slide 03 (Ethnic Edit)', values.heroEthnic);
  checkOptionalUrlField('heroBannerMobile', 'Slide 01 Mobile Banner', values.heroBannerMobile);
  checkOptionalUrlField('heroCoordsMobile', 'Slide 02 Mobile Banner', values.heroCoordsMobile);
  checkOptionalUrlField('heroEthnicMobile', 'Slide 03 Mobile Banner', values.heroEthnicMobile);
  checkUrlField('brandStory', 'Brand Story Editorial', values.brandStory);

  if (!Array.isArray(values.igPhotos) || values.igPhotos.length === 0) {
    errors.igPhotos = 'Instagram showcase gallery requires at least 1 editorial photo.';
  } else {
    const emptyIdx = values.igPhotos.findIndex((p) => !p || !p.trim());
    const oversizedIdx = values.igPhotos.findIndex(
      (p) => p && p.startsWith('data:image/') && p.length > maxDataUrlLength
    );
    if (emptyIdx !== -1) {
      errors.igPhotos = `Instagram showcase photo #${emptyIdx + 1} is missing an image URL.`;
    } else if (oversizedIdx !== -1) {
      errors.igPhotos = `Instagram showcase photo #${oversizedIdx + 1} exceeds the ${MAX_IMAGE_FILE_SIZE_MB} MB image size limit.`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
