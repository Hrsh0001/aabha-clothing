import 'dotenv/config';
import { describe, test, expect } from './jest-lite';
import { signJwt } from '../src/lib/jwt';
import { deleteUploadedImage } from '../src/lib/image-store';

// Import all 12 Next.js App Router API Route Handlers
import * as AdminAuthAPI from '../src/app/api/admin/auth/route';
import * as CustomerAuthAPI from '../src/app/api/auth/route';
import * as UploadAPI from '../src/app/api/upload/route';
import * as ImagesAPI from '../src/app/api/images/[id]/route';
import * as ProductsAPI from '../src/app/api/products/route';
import * as OrdersAPI from '../src/app/api/orders/route';
import * as MyOrdersAPI from '../src/app/api/my-orders/route';
import * as SettingsAPI from '../src/app/api/settings/route';
import * as InquiriesAPI from '../src/app/api/inquiries/route';
import * as ReviewsAPI from '../src/app/api/reviews/route';
import * as NewsletterAPI from '../src/app/api/newsletter/route';
import * as CustomersAPI from '../src/app/api/customers/route';

const adminToken = signJwt({
  sub: 'admin_test_runner',
  role: 'admin',
  name: 'AABHA Test Admin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
});

function createJsonRequest(
  url: string,
  method: string,
  body?: unknown,
  headers: Record<string, string> = {}
): Request {
  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const adminAuthHeaders = {
  Authorization: `Bearer ${adminToken}`,
};

// Valid 1x1 PNG buffer (68 bytes)
const VALID_PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

describe('API 1: /api/admin/auth (Admin Authentication & JWT Verification)', () => {
  test('POST /api/admin/auth rejects invalid credentials with 401 and accepts valid credentials with 200 JWT', async () => {
    const prevPass = process.env.ADMIN_PASSWORD;
    if (!process.env.ADMIN_PASSWORD) {
      process.env.ADMIN_PASSWORD = 'test_admin_password_2026';
    }
    try {
      const badReq = createJsonRequest('http://localhost:3000/api/admin/auth', 'POST', {
        email: 'admin',
        password: 'wrong_password_123',
      });
      const badRes = await AdminAuthAPI.POST(badReq);
      const badData = await badRes.json();
      expect(badRes.status).toBe(401);
      expect(badData.success).toBe(false);

      const validUser = process.env.ADMIN_USERNAME || 'admin';
      const validPass = process.env.ADMIN_PASSWORD;
      const goodReq = createJsonRequest('http://localhost:3000/api/admin/auth', 'POST', {
        email: validUser,
        password: validPass,
      });
      const goodRes = await AdminAuthAPI.POST(goodReq);
      const goodData = await goodRes.json();
      expect(goodRes.status).toBe(200);
      expect(goodData.success).toBe(true);
      expect(goodData.token).toBeDefined();
    } finally {
      if (prevPass === undefined) {
        delete process.env.ADMIN_PASSWORD;
      } else {
        process.env.ADMIN_PASSWORD = prevPass;
      }
    }
  });

  test('GET /api/admin/auth verifies valid Admin Bearer JWT token and rejects missing token', async () => {
    const unauthReq = new Request('http://localhost:3000/api/admin/auth', { method: 'GET' });
    const unauthRes = await AdminAuthAPI.GET(unauthReq);
    expect(unauthRes.status).toBe(401);

    const authReq = new Request('http://localhost:3000/api/admin/auth', {
      method: 'GET',
      headers: adminAuthHeaders,
    });
    const authRes = await AdminAuthAPI.GET(authReq);
    const authData = await authRes.json();
    expect(authRes.status).toBe(200);
    expect(authData.success).toBe(true);
    expect(authData.valid).toBe(true);
  });
});

let testCustomerId = '';
let testCustomerToken = '';
const testCustomerEmail = `patron.test.${Date.now()}@aabhaclothing.com`;
const testCustomerPhone = '9820099887';

describe('API 2: /api/auth (Customer Signup, Login, Session & Password Reset)', () => {
  test('POST /api/auth (signup) registers a new customer and returns JWT token', async () => {
    const req = createJsonRequest('http://localhost:3000/api/auth', 'POST', {
      action: 'signup',
      name: 'Meera Rajput',
      email: testCustomerEmail,
      phone: testCustomerPhone,
      password: 'LuxuryPassword123!',
    });
    const res = await CustomerAuthAPI.POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.token).toBeDefined();
    expect(data.user.email).toBe(testCustomerEmail);
    testCustomerId = data.user.id;
    testCustomerToken = data.token;
  });

  test('POST /api/auth (signup) rejects duplicate email with 409', async () => {
    const req = createJsonRequest('http://localhost:3000/api/auth', 'POST', {
      action: 'signup',
      name: 'Meera Rajput',
      email: testCustomerEmail,
      password: 'LuxuryPassword123!',
    });
    const res = await CustomerAuthAPI.POST(req);
    expect(res.status).toBe(409);
  });

  test('POST /api/auth (login) authenticates valid credentials and rejects wrong password', async () => {
    const badReq = createJsonRequest('http://localhost:3000/api/auth', 'POST', {
      action: 'login',
      email: testCustomerEmail,
      password: 'WrongPassword',
    });
    const badRes = await CustomerAuthAPI.POST(badReq);
    expect(badRes.status).toBe(401);

    const goodReq = createJsonRequest('http://localhost:3000/api/auth', 'POST', {
      action: 'login',
      email: testCustomerEmail,
      password: 'LuxuryPassword123!',
    });
    const goodRes = await CustomerAuthAPI.POST(goodReq);
    const goodData = await goodRes.json();
    expect(goodRes.status).toBe(200);
    expect(goodData.success).toBe(true);
    expect(goodData.token).toBeDefined();
  });

  test('GET /api/auth returns customer profile with valid Bearer token', async () => {
    const req = new Request('http://localhost:3000/api/auth', {
      method: 'GET',
      headers: { Authorization: `Bearer ${testCustomerToken}` },
    });
    const res = await CustomerAuthAPI.GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user.email).toBe(testCustomerEmail);
  });

  test('POST /api/auth (forgot_password & reset_password) completes OTP password reset flow', async () => {
    const forgotReq = createJsonRequest('http://localhost:3000/api/auth', 'POST', {
      action: 'forgot_password',
      email: testCustomerEmail,
    });
    const forgotRes = await CustomerAuthAPI.POST(forgotReq);
    const forgotData = await forgotRes.json();
    expect(forgotRes.status).toBe(200);
    expect(forgotData.success).toBe(true);
    expect(forgotData.demoCode).toBeDefined();

    const resetReq = createJsonRequest('http://localhost:3000/api/auth', 'POST', {
      action: 'reset_password',
      email: testCustomerEmail,
      code: forgotData.demoCode,
      newPassword: 'NewLuxuryPassword456!',
    });
    const resetRes = await CustomerAuthAPI.POST(resetReq);
    const resetData = await resetRes.json();
    expect(resetRes.status).toBe(200);
    expect(resetData.success).toBe(true);
  });
});

let uploadedImageUrl = '';

describe('API 3 & 4: /api/upload & /api/images/[id] (5 MB Limit, Format Check & Binary Streaming)', () => {
  test('POST /api/upload rejects unauthorized requests with 401', async () => {
    const formData = new FormData();
    formData.append('file', new File([VALID_PNG_BYTES], 'test.png', { type: 'image/png' }));
    const req = new Request('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });
    const res = await UploadAPI.POST(req);
    expect(res.status).toBe(401);
  });

  test('POST /api/upload rejects files exceeding the 5 MB size limit with 400', async () => {
    const sixMbBuffer = Buffer.alloc(6 * 1024 * 1024, 1);
    const formData = new FormData();
    formData.append(
      'file',
      new File([sixMbBuffer], 'oversized-studio.png', { type: 'image/png' })
    );
    const req = new Request('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: adminAuthHeaders,
      body: formData,
    });
    const res = await UploadAPI.POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('5 MB maximum limit');
  });

  test('POST /api/upload rejects invalid MIME types with 400', async () => {
    const formData = new FormData();
    formData.append(
      'file',
      new File([Buffer.from('not an image')], 'malicious.txt', { type: 'text/plain' })
    );
    const req = new Request('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: adminAuthHeaders,
      body: formData,
    });
    const res = await UploadAPI.POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  test('POST /api/upload saves valid PNG image (< 5 MB) and GET /api/images/[id] serves binary & 404 for unknown ID', async () => {
    const formData = new FormData();
    formData.append(
      'file',
      new File([VALID_PNG_BYTES], 'wine_kurta_angle1.png', { type: 'image/png' })
    );
    const req = new Request('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: adminAuthHeaders,
      body: formData,
    });
    const res = await UploadAPI.POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.imageUrl).toBeDefined();
    expect(data.url).toBe(data.imageUrl);
    uploadedImageUrl = data.imageUrl;

    if (uploadedImageUrl.startsWith('/api/images/')) {
      const imageId = uploadedImageUrl.replace('/api/images/', '');
      const imgReq = new Request(`http://localhost:3000/api/images/${imageId}`, {
        method: 'GET',
      });
      const imgRes = await ImagesAPI.GET(imgReq, {
        params: Promise.resolve({ id: imageId }),
      });
      expect(imgRes.status).toBe(200);
      expect(imgRes.headers.get('Content-Type')).toBe('image/png');
      expect(imgRes.headers.get('ETag')).toBeDefined();
      expect(imgRes.headers.get('Cache-Control')).toContain('immutable');

      const etag = imgRes.headers.get('ETag') || '';
      const notModReq = new Request(`http://localhost:3000/api/images/${imageId}`, {
        method: 'GET',
        headers: { 'If-None-Match': etag },
      });
      const notModRes = await ImagesAPI.GET(notModReq, {
        params: Promise.resolve({ id: imageId }),
      });
      expect(notModRes.status).toBe(304);
    }

    // Verify 404 handling for non-existent image ID
    const missingId = 'nonexistent_test_id_999999.png';
    const missingReq = new Request(`http://localhost:3000/api/images/${missingId}`, {
      method: 'GET',
    });
    const missingRes = await ImagesAPI.GET(missingReq, {
      params: Promise.resolve({ id: missingId }),
    });
    const missingData = await missingRes.json();
    expect(missingRes.status).toBe(404);
    expect(missingData.success).toBe(false);
  });

  test('POST /api/upload accepts AVIF and JPEG studio photos preserving full fidelity', async () => {
    // 1. Test AVIF upload
    const avifBuffer = Buffer.from('mock-avif-studio-photo-bytes-high-res');
    const avifFormData = new FormData();
    avifFormData.append('file', new File([avifBuffer], 'lookbook.avif', { type: 'image/avif' }));
    const avifReq = new Request('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: adminAuthHeaders,
      body: avifFormData,
    });
    const avifRes = await UploadAPI.POST(avifReq);
    const avifData = await avifRes.json();
    expect(avifRes.status).toBe(200);
    expect(avifData.success).toBe(true);
    expect(avifData.imageUrl).toBeDefined();
    expect(avifData.url).toBe(avifData.imageUrl);

    // 2. Test JPEG upload
    const jpegBuffer = Buffer.from('mock-jpeg-studio-photo-bytes-high-res');
    const jpegFormData = new FormData();
    jpegFormData.append('file', new File([jpegBuffer], 'zari_detail.jpg', { type: 'image/jpeg' }));
    const jpegReq = new Request('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: adminAuthHeaders,
      body: jpegFormData,
    });
    const jpegRes = await UploadAPI.POST(jpegReq);
    const jpegData = await jpegRes.json();
    expect(jpegRes.status).toBe(200);
    expect(jpegData.success).toBe(true);
    expect(jpegData.imageUrl).toBeDefined();
    expect(jpegData.url).toBe(jpegData.imageUrl);
  });
});

let createdProductId = '';

describe('API 5: /api/products (Catalog CRUD, Simultaneous Validation & 5-Photo Garment Save)', () => {
  test('GET /api/products returns the full storefront catalog', async () => {
    const req = new Request('http://localhost:3000/api/products', { method: 'GET' });
    const res = await ProductsAPI.GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.products)).toBe(true);
    expect(data.products.length).toBeGreaterThanOrEqual(0);
  });

  test('POST /api/products validates all required/pricing fields simultaneously and returns 400 errors', async () => {
    const req = createJsonRequest(
      'http://localhost:3000/api/products',
      'POST',
      {
        name: '',
        category: '',
        price: -50,
        originalPrice: -10,
      },
      adminAuthHeaders
    );
    const res = await ProductsAPI.POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors).toBeDefined();
    expect(data.errors.name).toBeDefined();
    expect(data.errors.category).toBeDefined();
    expect(data.errors.price).toBeDefined();
    expect(data.errors.originalPrice).toBeDefined();
  });

  test('POST /api/products creates 5-photo garment ("Wine Kurta Pant Set with Floral Dupatta", SKU AB-ANA-548)', async () => {
    const payload = {
      name: 'Wine Kurta Pant Set with Floral Dupatta',
      sku: `AB-ANA-548-${Date.now().toString().slice(-4)}`,
      category: 'Anarkali',
      price: 1049,
      originalPrice: 1249,
      fabric: 'Pure Handloom Chanderi Silk',
      inStock: true,
      sizes: ['M', 'L', 'XL'],
      description:
        'Handcrafted Wine Kurta Pant Set paired with a luminous floral printed Chanderi dupatta.',
      primaryImage: uploadedImageUrl || '/images/product_kurta_ivory_1791119105107.jpg',
      secondaryImage: '/images/product_kurtaset_sand_1791119136277.jpg',
      gallery: [
        {
          url: uploadedImageUrl || '/images/product_kurta_ivory_1791119105107.jpg',
          label: 'Full Studio Silhouette',
          focalClass: 'object-center',
        },
        {
          url: '/images/product_kurtaset_sand_1791119136277.jpg',
          label: 'Pleated Bodice & Yoke Detail',
          focalClass: 'object-center',
        },
        {
          url: '/images/product_dress_ochre_1791119165890.jpg',
          label: 'Kalidar Flare & Zari Selvedge',
          focalClass: 'object-center',
        },
        {
          url: '/images/product_coords_charcoal_1791119178003.jpg',
          label: 'Studio Angle 4',
          focalClass: 'object-center',
        },
        {
          url: '/images/product_kurta_olive_1791119121380.jpg',
          label: 'Studio Angle 5',
          focalClass: 'object-center',
        },
      ],
    };

    const req = createJsonRequest(
      'http://localhost:3000/api/products',
      'POST',
      payload,
      adminAuthHeaders
    );
    const res = await ProductsAPI.POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.product.name).toBe('Wine Kurta Pant Set with Floral Dupatta');
    expect(data.product.price).toBe(1049);
    expect(data.product.originalPrice).toBe(1249);
    expect(data.product.sizes).toEqual(['M', 'L', 'XL']);
    expect(data.product.gallery).toHaveLength(5);
    createdProductId = data.product.id;
  });

  test('GET /api/products?id=... retrieves single garment with all 5 gallery photos intact', async () => {
    const req = new Request(
      `http://localhost:3000/api/products?id=${encodeURIComponent(createdProductId)}`,
      { method: 'GET' }
    );
    const res = await ProductsAPI.GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.product.id).toBe(createdProductId);
    expect(data.product.gallery).toHaveLength(5);
  });

  test('PUT /api/products updates garment price, stock status, and gallery and rejects invalid price with 400', async () => {
    const badPutReq = createJsonRequest(
      'http://localhost:3000/api/products',
      'PUT',
      {
        id: createdProductId,
        price: -100,
      },
      adminAuthHeaders
    );
    const badPutRes = await ProductsAPI.PUT(badPutReq);
    expect(badPutRes.status).toBe(400);

    const req = createJsonRequest(
      'http://localhost:3000/api/products',
      'PUT',
      {
        id: createdProductId,
        price: 1149,
        inStock: false,
      },
      adminAuthHeaders
    );
    const res = await ProductsAPI.PUT(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.product.price).toBe(1149);
    expect(data.product.inStock).toBe(false);
    expect(data.product.gallery).toHaveLength(5);
  });

  test('DELETE /api/products removes the test garment cleanly', async () => {
    const req = new Request(
      `http://localhost:3000/api/products?id=${encodeURIComponent(createdProductId)}`,
      {
        method: 'DELETE',
        headers: adminAuthHeaders,
      }
    );
    const res = await ProductsAPI.DELETE(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });
});

let createdOrderId = '';
let createdOrderNumber = '';

describe('API 6 & 7: /api/orders & /api/my-orders (COD Orders, GPS Pin & Order Tracking)', () => {
  test('POST /api/orders rejects incomplete delivery payload with 400', async () => {
    const req = createJsonRequest('http://localhost:3000/api/orders', 'POST', {
      fullName: '',
      phone: '',
      items: [],
    });
    const res = await OrdersAPI.POST(req);
    expect(res.status).toBe(400);
  });

  test('POST /api/orders records a new COD order with GPS coordinates', async () => {
    const req = createJsonRequest('http://localhost:3000/api/orders', 'POST', {
      fullName: 'Meera Rajput',
      phone: testCustomerPhone,
      email: testCustomerEmail,
      address: '14 Palace Road, Civil Lines',
      city: 'Jaipur',
      stateName: 'Rajasthan',
      postalCode: '302006',
      latitude: 26.9124,
      longitude: 75.7873,
      items: [
        {
          productId: 'anarkali-01',
          name: 'Anarkali 01',
          size: 'M',
          quantity: 1,
          price: 9490,
        },
      ],
      total: 9490,
    });
    const res = await OrdersAPI.POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.order.orderNumber).toBeDefined();
    createdOrderId = data.order.id;
    createdOrderNumber = data.order.orderNumber;
  });

  test('GET /api/orders returns order list and PATCH /api/orders updates order status to DISPATCHED', async () => {
    const getRes = await OrdersAPI.GET();
    const getData = await getRes.json();
    expect(getRes.status).toBe(200);
    expect(getData.success).toBe(true);
    expect(Array.isArray(getData.orders)).toBe(true);

    const patchReq = createJsonRequest(
      'http://localhost:3000/api/orders',
      'PATCH',
      {
        orderId: createdOrderId,
        status: 'DISPATCHED',
      },
      adminAuthHeaders
    );
    const patchRes = await OrdersAPI.PATCH(patchReq);
    const patchData = await patchRes.json();
    expect(patchRes.status).toBe(200);
    expect(patchData.success).toBe(true);
  });

  test('GET /api/my-orders finds order by phone number and by orderNumber', async () => {
    const phoneReq = new Request(
      `http://localhost:3000/api/my-orders?phone=${testCustomerPhone}`,
      { method: 'GET' }
    );
    const phoneRes = await MyOrdersAPI.GET(phoneReq);
    const phoneData = await phoneRes.json();
    expect(phoneRes.status).toBe(200);
    expect(phoneData.success).toBe(true);
    expect(phoneData.orders.length).toBeGreaterThanOrEqual(1);

    const numReq = new Request(
      `http://localhost:3000/api/my-orders?orderNumber=${encodeURIComponent(createdOrderNumber)}`,
      { method: 'GET' }
    );
    const numRes = await MyOrdersAPI.GET(numReq);
    const numData = await numRes.json();
    expect(numRes.status).toBe(200);
    expect(numData.success).toBe(true);
    expect(numData.orders.some((o: any) => o.orderNumber === createdOrderNumber)).toBe(true);
  });
});

describe('API 8: /api/settings (Boutique Branding & Media Settings)', () => {
  test('GET /api/settings returns active site settings and POST /api/settings updates branding with Admin JWT', async () => {
    const getRes = await SettingsAPI.GET();
    const getData = await getRes.json();
    expect(getRes.status).toBe(200);
    expect(getData.success).toBe(true);
    expect(getData.settings.logoUrl).toBeDefined();
    expect(Array.isArray(getData.settings.igPhotos)).toBe(true);

    const postReq = createJsonRequest(
      'http://localhost:3000/api/settings',
      'POST',
      getData.settings,
      adminAuthHeaders
    );
    const postRes = await SettingsAPI.POST(postReq);
    const postData = await postRes.json();
    expect(postRes.status).toBe(200);
    expect(postData.success).toBe(true);
  });
});

let createdInquiryId = '';

describe('API 9: /api/inquiries (Client Care Inquiries CRUD)', () => {
  test('POST, GET, PATCH, and DELETE /api/inquiries work end-to-end', async () => {
    const postReq = createJsonRequest('http://localhost:3000/api/inquiries', 'POST', {
      name: 'Kavya Nair',
      email: 'kavya@example.com',
      phone: '9811122334',
      topic: 'Bespoke Tailoring',
      message: 'Can I request custom sleeve length on Anarkali 01?',
    });
    const postRes = await InquiriesAPI.POST(postReq);
    const postData = await postRes.json();
    expect(postRes.status).toBe(200);
    expect(postData.success).toBe(true);
    createdInquiryId = postData.inquiry.id;

    const getRes = await InquiriesAPI.GET();
    const getData = await getRes.json();
    expect(getRes.status).toBe(200);
    expect(getData.success).toBe(true);
    expect(getData.inquiries.some((i: any) => i.id === createdInquiryId)).toBe(true);

    const patchReq = createJsonRequest(
      'http://localhost:3000/api/inquiries',
      'PATCH',
      { id: createdInquiryId, status: 'RESOLVED' },
      adminAuthHeaders
    );
    const patchRes = await InquiriesAPI.PATCH(patchReq);
    const patchData = await patchRes.json();
    expect(patchRes.status).toBe(200);
    expect(patchData.inquiry.status).toBe('RESOLVED');

    const delReq = new Request(
      `http://localhost:3000/api/inquiries?id=${encodeURIComponent(createdInquiryId)}`,
      { method: 'DELETE', headers: adminAuthHeaders }
    );
    const delRes = await InquiriesAPI.DELETE(delReq);
    expect(delRes.status).toBe(200);
  });
});

let createdReviewId = '';

describe('API 10: /api/reviews (Verified Patron Reviews CRUD)', () => {
  test('POST, GET, and DELETE /api/reviews work end-to-end', async () => {
    const postReq = createJsonRequest('http://localhost:3000/api/reviews', 'POST', {
      productId: 'anarkali-01',
      productName: 'Anarkali 01',
      author: 'Roshni Menon',
      sizePurchased: 'M',
      rating: 5,
      title: 'Exquisite Handloom Weave',
      comment: 'The drape and zari border are museum-grade craftsmanship.',
    });
    const postRes = await ReviewsAPI.POST(postReq);
    const postData = await postRes.json();
    expect(postRes.status).toBe(200);
    expect(postData.success).toBe(true);
    createdReviewId = postData.review.id;

    const getReq = new Request('http://localhost:3000/api/reviews?productId=anarkali-01', {
      method: 'GET',
    });
    const getRes = await ReviewsAPI.GET(getReq);
    const getData = await getRes.json();
    expect(getRes.status).toBe(200);
    expect(getData.reviews.some((r: any) => r.id === createdReviewId)).toBe(true);

    const delReq = new Request(
      `http://localhost:3000/api/reviews?id=${encodeURIComponent(createdReviewId)}`,
      { method: 'DELETE', headers: adminAuthHeaders }
    );
    const delRes = await ReviewsAPI.DELETE(delReq);
    expect(delRes.status).toBe(200);
  });
});

let createdSubscriberId = '';

describe('API 11: /api/newsletter (Newsletter Subscription & Duplicate Check)', () => {
  test('POST, duplicate check, GET, and DELETE /api/newsletter work end-to-end', async () => {
    const testSubEmail = `newsletter.${Date.now()}@aabhaclothing.com`;

    const postReq = createJsonRequest('http://localhost:3000/api/newsletter', 'POST', {
      email: testSubEmail,
    });
    const postRes = await NewsletterAPI.POST(postReq);
    const postData = await postRes.json();
    expect(postRes.status).toBe(200);
    expect(postData.success).toBe(true);
    createdSubscriberId = postData.subscriber.id;

    const dupReq = createJsonRequest('http://localhost:3000/api/newsletter', 'POST', {
      email: testSubEmail,
    });
    const dupRes = await NewsletterAPI.POST(dupReq);
    const dupData = await dupRes.json();
    expect(dupRes.status).toBe(200);
    expect(dupData.alreadySubscribed).toBe(true);

    const getRes = await NewsletterAPI.GET();
    const getData = await getRes.json();
    expect(getRes.status).toBe(200);
    expect(getData.subscribers.some((s: any) => s.id === createdSubscriberId)).toBe(true);

    const delReq = new Request(
      `http://localhost:3000/api/newsletter?id=${encodeURIComponent(createdSubscriberId)}`,
      { method: 'DELETE', headers: adminAuthHeaders }
    );
    const delRes = await NewsletterAPI.DELETE(delReq);
    expect(delRes.status).toBe(200);
  });
});

describe('API 12: /api/customers (Patron Accounts & Order Metrics)', () => {
  test('GET /api/customers returns sanitized patron metrics and DELETE removes test customer', async () => {
    const unauthReq = new Request('http://localhost:3000/api/customers', { method: 'GET' });
    const unauthRes = await CustomersAPI.GET(unauthReq);
    expect(unauthRes.status).toBe(401);

    const authReq = new Request('http://localhost:3000/api/customers', {
      method: 'GET',
      headers: adminAuthHeaders,
    });
    const authRes = await CustomersAPI.GET(authReq);
    const authData = await authRes.json();
    expect(authRes.status).toBe(200);
    expect(authData.success).toBe(true);
    const foundCustomer = authData.customers.find((c: any) => c.id === testCustomerId);
    expect(foundCustomer).toBeDefined();
    expect(foundCustomer.passwordHash).toBeUndefined();
    expect(foundCustomer.orderCount).toBeGreaterThanOrEqual(1);

    if (testCustomerId) {
      const delReq = new Request(
        `http://localhost:3000/api/customers?id=${encodeURIComponent(testCustomerId)}`,
        { method: 'DELETE', headers: adminAuthHeaders }
      );
      const delRes = await CustomersAPI.DELETE(delReq);
      expect(delRes.status).toBe(200);
    }

    if (createdOrderId) {
      const delOrderReq = new Request(
        `http://localhost:3000/api/orders?id=${encodeURIComponent(createdOrderId)}`,
        { method: 'DELETE', headers: adminAuthHeaders }
      );
      const delOrderRes = await OrdersAPI.DELETE(delOrderReq);
      expect(delOrderRes.status).toBe(200);
    }

    if (uploadedImageUrl) {
      await deleteUploadedImage(uploadedImageUrl);
    }
  });
});
