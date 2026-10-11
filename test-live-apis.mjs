import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:3000';

// Generate a valid admin token for authorization testing
import { signJwt } from './src/lib/jwt.ts';

async function run() {
  console.log('Testing APIs against dev server at', BASE_URL);
  const token = signJwt({ role: 'admin', email: 'admin@aabhaclothing.com' });
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 1. GET /api/products
  console.log('\n--- 1. GET /api/products ---');
  const getRes = await fetch(`${BASE_URL}/api/products`);
  console.log('GET status:', getRes.status);
  const getData = await getRes.json();
  console.log('GET success:', getData.success, 'count:', getData.products?.length);

  // 2. PUT /api/products with the user's exact payload
  console.log('\n--- 2. PUT /api/products (User payload) ---');
  const putPayload = {
    id: "anarkali-01",
    name: "Anarkali 01",
    category: "Anarkali",
    price: 9490,
    originalPrice: 10800,
    fabric: "Handwoven Kora Silk-Cotton",
    inStock: false,
    description: "Cut with sixteen narrow godet panels (kalis) that flare gracefully from a high empire waist without adding bulk, Anarkali 01 pairs architectural tailoring with luminous earthen ochre kora silk-cotton and a whisper of antique zari at the hem.",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    primaryImage: "/images/product_dress_ochre_1791119165890.jpg",
    secondaryImage: "/images/brand_story_editorial_1791119191742.jpg",
    gallery: [
      { url: "/images/product_dress_ochre_1791119165890.jpg", label: "Full Studio Silhouette", focalClass: "object-center" },
      { url: "/images/brand_story_editorial_1791119191742.jpg", label: "Pleated Bodice & Yoke Detail", focalClass: "object-center" }
    ]
  };

  const putRes = await fetch(`${BASE_URL}/api/products`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify(putPayload)
  });
  console.log('PUT status:', putRes.status);
  const putData = await putRes.json();
  console.log('PUT result:', putData.success ? 'SUCCESS' : 'FAILED', putData);

  // 3. GET /api/settings
  console.log('\n--- 3. GET /api/settings ---');
  const setRes = await fetch(`${BASE_URL}/api/settings`);
  console.log('Settings status:', setRes.status);
  const setData = await setRes.json();
  console.log('Settings success:', setData.success, 'brandName:', setData.settings?.brandName);

  // 4. POST /api/orders (Create order)
  console.log('\n--- 4. POST /api/orders ---');
  const orderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Pooja Verma',
      phone: '9876543210',
      email: 'pooja@example.com',
      address: '42 Lotus Boulevard, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      items: [
        {
          productId: 'anarkali-01',
          name: 'Anarkali 01',
          size: 'M',
          quantity: 1,
          price: 9490
        }
      ],
      total: 9490,
      paymentMethod: 'CASH_ON_DELIVERY'
    })
  });
  console.log('Order status:', orderRes.status);
  const orderData = await orderRes.json();
  console.log('Order result:', orderData.success ? 'SUCCESS' : 'FAILED', orderData.order?.orderNumber);

  // 5. GET /api/my-orders?phone=9876543210
  console.log('\n--- 5. GET /api/my-orders ---');
  const trackRes = await fetch(`${BASE_URL}/api/my-orders?phone=9876543210`);
  console.log('Tracking status:', trackRes.status);
  const trackData = await trackRes.json();
  console.log('Tracking count:', trackData.orders?.length);

  // 6. Admin auth verify
  console.log('\n--- 6. GET /api/admin/auth ---');
  const adminAuthRes = await fetch(`${BASE_URL}/api/admin/auth`, {
    headers: authHeaders
  });
  console.log('Admin auth status:', adminAuthRes.status);
  const adminAuthData = await adminAuthRes.json();
  console.log('Admin auth authenticated:', adminAuthData.authenticated);
}

run().catch(console.error);
