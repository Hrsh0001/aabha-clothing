import { describe, test, expect } from './jest-lite';
import {
  MAX_IMAGE_FILE_SIZE_MB,
  MAX_IMAGE_FILE_SIZE_BYTES,
  MAX_GALLERY_PHOTOS,
  validateImageFile,
  validateImageFilesBatch,
  validateJsonPayloadSize,
  validateProductForm,
  validateCheckoutForm,
  validateBrandingForm,
} from '../src/lib/form-validation';

describe('1. Product Editor Simultaneous All-Inputs Validation (useForm style)', () => {
  test('returns ALL field errors simultaneously when all inputs are empty/invalid', () => {
    const result = validateProductForm({
      name: '',
      category: '',
      sku: '',
      price: '',
      originalPrice: '',
      fabric: '',
      sizes: [],
      description: '',
      gallery: [],
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeDefined();
    expect(result.errors.category).toBeDefined();
    expect(result.errors.sku).toBeDefined();
    expect(result.errors.price).toBeDefined();
    expect(result.errors.fabric).toBeDefined();
    expect(result.errors.sizes).toBeDefined();
    expect(result.errors.description).toBeDefined();
    expect(result.errors.gallery).toBeDefined();
    expect(Object.keys(result.errors)).toHaveLength(8);
  });

  test('simultaneously flags originalPrice < price alongside other invalid fields', () => {
    const result = validateProductForm({
      name: 'Ab', // too short (< 3 chars)
      category: 'Anarkali',
      sku: 'AB', // too short (< 3 chars)
      price: '1249',
      originalPrice: '999', // lower than selling price
      fabric: '',
      sizes: [],
      description: 'Short', // < 10 chars
      gallery: [],
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.name).toContain('at least 3 characters');
    expect(result.errors.sku).toContain('at least 3 characters');
    expect(result.errors.originalPrice).toContain('greater than or equal to the selling price');
    expect(result.errors.fabric).toBeDefined();
    expect(result.errors.sizes).toBeDefined();
    expect(result.errors.description).toContain('at least 10 characters');
    expect(result.errors.gallery).toBeDefined();
  });

  test('passes validation for valid 5-photo garment ("Wine Kurta Pant Set with Floral Dupatta")', () => {
    const result = validateProductForm({
      name: 'Wine Kurta Pant Set with Floral Dupatta',
      category: 'Anarkali',
      sku: 'AB-ANA-548',
      price: 1049,
      originalPrice: 1249,
      fabric: 'Pure Handloom Chanderi Silk',
      sizes: ['M', 'L', 'XL'],
      description:
        'Tailored in Pure Handloom Chanderi Silk with a hand-printed floral dupatta and breathable straight pants.',
      gallery: [
        { url: '/images/product_kurta_ivory_1791119105107.jpg', label: 'Full Studio Silhouette' },
        { url: '/images/product_kurtaset_sand_1791119136277.jpg', label: 'Pleated Bodice & Yoke Detail' },
        { url: '/images/product_dress_ochre_1791119165890.jpg', label: 'Kalidar Flare & Zari Selvedge' },
        { url: '/images/product_coords_charcoal_1791119178003.jpg', label: 'Studio Angle 4' },
        { url: '/images/product_kurta_olive_1791119121380.jpg', label: 'Studio Angle 5' },
      ],
    });

    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  test('rejects gallery exceeding MAX_GALLERY_PHOTOS (10 photos) or containing oversized raw data URL', () => {
    const elevenPhotos = Array.from({ length: 11 }, (_, idx) => ({
      url: `/images/photo_${idx + 1}.jpg`,
      label: `Angle ${idx + 1}`,
    }));

    const resTooMany = validateProductForm({
      name: 'Handwoven Silk Anarkali',
      category: 'Anarkali',
      sku: 'AB-ANA-101',
      price: 4990,
      fabric: 'Chanderi Silk',
      sizes: ['S', 'M'],
      description: 'Handcrafted luxury Anarkali with intricate zari detailing.',
      gallery: elevenPhotos,
    });

    expect(resTooMany.isValid).toBe(false);
    expect(resTooMany.errors.gallery).toContain(`cannot exceed ${MAX_GALLERY_PHOTOS} photos`);

    const hugeDataUrl = `data:image/png;base64,${'A'.repeat(Math.ceil(MAX_IMAGE_FILE_SIZE_BYTES * 1.4))}`;
    const resOversized = validateProductForm({
      name: 'Handwoven Silk Anarkali',
      category: 'Anarkali',
      sku: 'AB-ANA-101',
      price: 4990,
      fabric: 'Chanderi Silk',
      sizes: ['S', 'M'],
      description: 'Handcrafted luxury Anarkali with intricate zari detailing.',
      gallery: [{ url: hugeDataUrl, label: 'Cover' }],
    });

    expect(resOversized.isValid).toBe(false);
    expect(resOversized.errors.gallery).toContain(`${MAX_IMAGE_FILE_SIZE_MB} MB image size limit`);
  });
});

describe('2. Image Upload File Size Limit (5 MB) & Batch Validation', () => {
  test('accepts valid JPG, PNG, and WebP files under 5 MB', () => {
    expect(
      validateImageFile({ name: 'studio-front.jpg', size: 1.4 * 1024 * 1024, type: 'image/jpeg' }).valid
    ).toBe(true);
    expect(
      validateImageFile({ name: 'drape-detail.png', size: 3.2 * 1024 * 1024, type: 'image/png' }).valid
    ).toBe(true);
    expect(
      validateImageFile({ name: 'lookbook.webp', size: 420 * 1024, type: 'image/webp' }).valid
    ).toBe(true);
  });

  test('rejects image files exceeding the 5 MB limit with explicit size error message', () => {
    const oversizedFile = {
      name: 'raw-studio-camera.png',
      size: Math.round(6.8 * 1024 * 1024),
      type: 'image/png',
    };
    const check = validateImageFile(oversizedFile);
    expect(check.valid).toBe(false);
    expect(check.error).toContain('raw-studio-camera.png');
    expect(check.error).toContain('6.80 MB');
    expect(check.error).toContain('5 MB maximum image size limit');
  });

  test('rejects 0-byte empty files and unsupported file types/extensions', () => {
    const emptyCheck = validateImageFile({ name: 'empty.jpg', size: 0, type: 'image/jpeg' });
    expect(emptyCheck.valid).toBe(false);
    expect(emptyCheck.error).toContain('empty (0 bytes)');

    const pdfCheck = validateImageFile({
      name: 'catalog.pdf',
      size: 200 * 1024,
      type: 'application/pdf',
    });
    expect(pdfCheck.valid).toBe(false);
    expect(pdfCheck.error).toContain('unsupported');
  });

  test('validateImageFilesBatch validates 5 files simultaneously and accumulates all errors at once', () => {
    const batch = [
      { name: 'angle-1.jpg', size: 800 * 1024, type: 'image/jpeg' },
      { name: 'oversized-2.png', size: 7.5 * 1024 * 1024, type: 'image/png' },
      { name: 'angle-3.webp', size: 450 * 1024, type: 'image/webp' },
      { name: 'invalid-4.pdf', size: 120 * 1024, type: 'application/pdf' },
      { name: 'oversized-5.jpg', size: 5.5 * 1024 * 1024, type: 'image/jpeg' },
    ];

    const result = validateImageFilesBatch(batch, 0, MAX_GALLERY_PHOTOS);
    expect(result.validFiles).toHaveLength(2);
    expect(result.errors).toHaveLength(3);
    expect(result.errors[0]).toContain('oversized-2.png');
    expect(result.errors[1]).toContain('invalid-4.pdf');
    expect(result.errors[2]).toContain('oversized-5.jpg');
  });

  test('validateJsonPayloadSize guards against oversized request payloads (> 3.5 MB)', () => {
    const normalPayload = { name: 'Wine Kurta Set', gallery: ['/api/images/img1.webp'] };
    expect(validateJsonPayloadSize(normalPayload).valid).toBe(true);

    const hugePayload = { data: 'X'.repeat(4 * 1024 * 1024) };
    const check = validateJsonPayloadSize(hugePayload);
    expect(check.valid).toBe(false);
    expect(check.error).toContain('exceeds the');
  });
});

describe('3. Checkout Delivery Form Simultaneous Validation (useForm style)', () => {
  test('returns all delivery field errors simultaneously when submitted blank', () => {
    const result = validateCheckoutForm({
      fullName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      stateName: '',
      postalCode: '',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.fullName).toBeDefined();
    expect(result.errors.email).toBeDefined();
    expect(result.errors.phone).toBeDefined();
    expect(result.errors.address).toBeDefined();
    expect(result.errors.city).toBeDefined();
    expect(result.errors.stateName).toBeDefined();
    expect(result.errors.postalCode).toBeDefined();
    expect(Object.keys(result.errors)).toHaveLength(7);
  });

  test('validates Indian mobile number, email format, and 6-digit PIN code simultaneously', () => {
    const invalidResult = validateCheckoutForm({
      fullName: 'A',
      email: 'not-an-email',
      phone: '12345',
      address: '123',
      city: 'M',
      stateName: 'Maharashtra',
      postalCode: '00123',
    });

    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.errors.fullName).toBeDefined();
    expect(invalidResult.errors.email).toContain('valid email');
    expect(invalidResult.errors.phone).toContain('10-digit Indian mobile number');
    expect(invalidResult.errors.address).toContain('minimum 5 characters');
    expect(invalidResult.errors.city).toBeDefined();
    expect(invalidResult.errors.postalCode).toContain('6-digit Indian PIN code');

    const validResult = validateCheckoutForm({
      fullName: 'Ananya Sharma',
      email: 'ananya@aabhaclothing.com',
      phone: '+91 98200 12345',
      address: '42 Heritage Enclave, Colaba Causeway',
      city: 'Mumbai',
      stateName: 'Maharashtra',
      postalCode: '400001',
    });

    expect(validResult.isValid).toBe(true);
    expect(Object.keys(validResult.errors)).toHaveLength(0);
  });
});

describe('4. Boutique Branding Media Simultaneous Validation', () => {
  test('returns all missing branding media field errors simultaneously', () => {
    const result = validateBrandingForm({
      logoUrl: '',
      heroBanner: '',
      heroCoords: '',
      heroEthnic: '',
      brandStory: '',
      igPhotos: [],
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.logoUrl).toBeDefined();
    expect(result.errors.heroBanner).toBeDefined();
    expect(result.errors.heroCoords).toBeDefined();
    expect(result.errors.heroEthnic).toBeDefined();
    expect(result.errors.brandStory).toBeDefined();
    expect(result.errors.igPhotos).toBeDefined();
  });
});
