// scripts/verify-all.mjs
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('====================================================');
  console.log('   AABHA CLOTHING — COMPREHENSIVE SYSTEM AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`Testing: ${name}... `);
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err) {
      console.log('❌ FAILED:', err.message);
      failed++;
    }
  }

  // 1. Page Route Status Tests
  const pages = [
    { name: 'Storefront Homepage (/)', url: '/' },
    { name: 'Order Tracking & GST Bills (/my-orders)', url: '/my-orders' },
    { name: 'Admin Login (/admin/login)', url: '/admin/login' },
    { name: 'Admin Orders (/admin/orders)', url: '/admin/orders' },
    { name: 'Admin Products (/admin/products)', url: '/admin/products' },
    { name: 'Admin Branding (/admin/branding)', url: '/admin/branding' },
  ];

  for (const p of pages) {
    await test(`Page: ${p.name}`, async () => {
      const res = await fetch(`${BASE_URL}${p.url}`);
      if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
      const text = await res.text();
      if (!text || text.length < 100) throw new Error('Response body was empty or too small');
    });
  }

  // 2. GET /api/products
  let testProductId = null;
  await test('API: GET /api/products', async () => {
    const res = await fetch(`${BASE_URL}/api/products`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.products)) throw new Error('Invalid products payload');
    if (data.products.length < 10) throw new Error(`Expected at least 10 products, got ${data.products.length}`);
  });

  // 3. POST /api/products (Create garment)
  await test('API: POST /api/products (Add garment)', async () => {
    const payload = {
      name: 'Audited Silk Tunic Test',
      category: 'Anarkali',
      price: 9500,
      originalPrice: 11000,
      primaryImage: '/images/product_kurta_ivory_1791119105107.jpg',
      fabric: 'Handloom Chanderi',
      description: 'Automated test garment verification item.',
    };
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.product?.id) throw new Error('Failed to create garment');
    testProductId = data.product.id;
  });

  // 4. PUT /api/products (Toggle stock)
  await test('API: PUT /api/products (Toggle inStock)', async () => {
    if (!testProductId) throw new Error('No test product ID available');
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: testProductId, inStock: false }),
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || data.product?.inStock !== false) throw new Error('Failed to update inStock');
  });

  // 5. DELETE /api/products (Clean up test garment)
  await test('API: DELETE /api/products (Clean up)', async () => {
    if (!testProductId) throw new Error('No test product ID available');
    const res = await fetch(`${BASE_URL}/api/products?id=${testProductId}`, {
      method: 'DELETE',
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Failed to delete test garment');
  });

  // 6. GET /api/settings
  await test('API: GET /api/settings', async () => {
    const res = await fetch(`${BASE_URL}/api/settings`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.settings) throw new Error('Settings not returned');
  });

  // 7. POST /api/orders (Place COD order)
  let testOrderNumber = null;
  const testPhone = '9876543299';
  await test('API: POST /api/orders (Place COD Order)', async () => {
    const orderPayload = {
      fullName: 'AABHA Tester',
      phone: testPhone,
      email: 'tester@aabhaclothing.com',
      address: '123 Heritage Lane, Civil Lines',
      city: 'Jaipur',
      stateName: 'Rajasthan',
      postalCode: '302001',
      items: [
        {
          product: {
            id: 'prod-ivory-anarkali',
            name: 'Ivory Chanderi Anarkali',
            price: 14500,
            category: 'Anarkali',
            sku: 'AB-AN-01',
            primaryImage: '/images/product_kurta_ivory_1791119105107.jpg',
          },
          size: 'M',
          quantity: 1,
        },
      ],
      total: 14500,
    };
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.order?.orderNumber) throw new Error('Failed to create order');
    testOrderNumber = data.order.orderNumber;
  });

  // 8. GET /api/my-orders by Phone
  await test('API: GET /api/my-orders (Search by Phone)', async () => {
    const res = await fetch(`${BASE_URL}/api/my-orders?phone=${testPhone}`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.orders) || data.orders.length === 0) {
      throw new Error('Order not found by phone');
    }
  });

  // 9. GET /api/my-orders by Order Number
  await test('API: GET /api/my-orders (Search by Order Number)', async () => {
    if (!testOrderNumber) throw new Error('No test order number');
    const res = await fetch(`${BASE_URL}/api/my-orders?orderNumber=${testOrderNumber}`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.orders) || data.orders.length === 0) {
      throw new Error('Order not found by order number');
    }
    const found = data.orders.find(o => o.orderNumber === testOrderNumber);
    if (!found) throw new Error('Specific order number not in results');
  });

  // 10. PATCH /api/orders (Update status)
  await test('API: PATCH /api/orders (Update Status to DISPATCHED)', async () => {
    if (!testOrderNumber) throw new Error('No test order number');
    // Find the order id
    const resGet = await fetch(`${BASE_URL}/api/my-orders?orderNumber=${testOrderNumber}`);
    const dataGet = await resGet.json();
    const orderObj = dataGet.orders.find(o => o.orderNumber === testOrderNumber);
    if (!orderObj) throw new Error('Order lookup failed');

    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: orderObj.id, status: 'DISPATCHED' }),
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Failed to patch order status');
  });

  // 11. Image Asset Verifications
  await test('Image Assets: All local image files exist', async () => {
    const publicImages = path.join(process.cwd(), 'public', 'images');
    const srcImages = path.join(process.cwd(), 'src', 'assets', 'images');
    const primaryFiles = [
      'brand_story_editorial_1791119191742.jpg',
      'hero_editorial_banner_1791119088652.jpg',
      'hero_slide_coords_1791228726563.jpg',
      'hero_slide_ethnic_1791228741882.jpg',
      'product_coords_charcoal_1791119178003.jpg',
      'product_dress_ochre_1791119165890.jpg',
      'product_kurta_ivory_1791119105107.jpg',
      'product_kurta_olive_1791119121380.jpg',
      'product_kurtaset_rosewood_1791119152298.jpg',
      'product_kurtaset_sand_1791119136277.jpg',
    ];

    for (const f of primaryFiles) {
      const inPublic = fs.existsSync(path.join(publicImages, f));
      const inSrc = fs.existsSync(path.join(srcImages, f));
      if (!inPublic && !inSrc) {
        throw new Error(`Missing image asset: ${f}`);
      }
    }
  });

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
