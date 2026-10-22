Object.assign(process.env, { NODE_ENV: 'test', TEST_EMAIL_SIMULATE: 'true' });
import 'dotenv/config';
import { describe, test, expect } from './jest-lite';
import { sendEmail, generateOrderConfirmationHtml, generateDispatchNoticeHtml } from '../src/lib/email';
import { CATEGORIES } from '../src/data/products';
import * as OrdersAPI from '../src/app/api/orders/route';
import { signJwt } from '../src/lib/jwt';

const adminToken = signJwt({
  sub: 'admin_test_runner',
  role: 'admin',
  name: 'AABHA Test Admin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
});

const adminAuthHeaders = {
  Authorization: `Bearer ${adminToken}`,
};

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

describe('Storefront Fixes: Categories, Email Diagnostics & Order Notifications', () => {
  test('CATEGORIES metadata contains clean category definitions without piece counts', () => {
    expect(CATEGORIES.length).toBe(4);
    const catNames = CATEGORIES.map((c) => c.name);
    expect(catNames).toContain('Anarkali');
    expect(catNames).toContain('3-Piece Dresses');
    expect(catNames).toContain('Co-ord Sets');
    expect(catNames).toContain('Chikankari Suit');
    CATEGORIES.forEach((cat) => {
      expect((cat as any).pieceCount).toBeUndefined();
    });
  });

  test('sendEmail handles local simulation and generates HTML with order details', async () => {
    const html = generateOrderConfirmationHtml({
      orderNumber: 'AB-9999',
      customerName: 'Pooja Shah',
      phone: '9876543210',
      email: 'pooja.shah@example.com',
      address: 'Flat 402, Lotus Court',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380015',
      items: [
        {
          name: 'Anarkali 01',
          size: 'M',
          quantity: 1,
          price: 9490,
        },
      ],
      total: 9490,
    });

    expect(html).toContain('AB-9999');
    expect(html).toContain('Pooja Shah');
    expect(html).toContain('Ahmedabad');
    expect(html).toContain('9,490');

    // Simulate sending email
    const result = await sendEmail({
      to: 'pooja.shah@example.com',
      subject: 'Test Order Confirmation',
      html,
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  test('POST /api/orders records order and triggers customer email without error', async () => {
    const req = createJsonRequest('http://localhost:3000/api/orders', 'POST', {
      fullName: 'Pooja Shah',
      phone: '9876543210',
      email: 'pooja.shah@example.com',
      address: 'Flat 402, Lotus Court',
      city: 'Ahmedabad',
      stateName: 'Gujarat',
      postalCode: '380015',
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
    expect(data.order.email).toBe('pooja.shah@example.com');

    // Clean up
    const delReq = new Request(
      `http://localhost:3000/api/orders?id=${encodeURIComponent(data.order.id)}`,
      { method: 'DELETE', headers: adminAuthHeaders }
    );
    await OrdersAPI.DELETE(delReq);
  });

  test('PATCH /api/orders with status CONFIRMED executes customer confirmation email path', async () => {
    // 1. Create order
    const createReq = createJsonRequest('http://localhost:3000/api/orders', 'POST', {
      fullName: 'Anita Patel',
      phone: '9820011223',
      email: 'anita.patel@example.com',
      address: '12 Alkapuri',
      city: 'Vadodara',
      stateName: 'Gujarat',
      postalCode: '390007',
      items: [
        {
          productId: 'three-piece-01',
          name: 'Three-Piece Dress 01',
          size: 'S',
          quantity: 1,
          price: 8990,
        },
      ],
      total: 8990,
    });

    const createRes = await OrdersAPI.POST(createReq);
    const createData = await createRes.json();
    const orderId = createData.order.id;

    // 2. Admin confirms order
    const patchReq = createJsonRequest(
      'http://localhost:3000/api/orders',
      'PATCH',
      {
        orderId,
        status: 'CONFIRMED',
      },
      adminAuthHeaders
    );

    const patchRes = await OrdersAPI.PATCH(patchReq);
    const patchData = await patchRes.json();
    expect(patchRes.status).toBe(200);
    expect(patchData.success).toBe(true);
    expect(patchData.order.status).toBe('CONFIRMED');
    expect(patchData.order.email).toBe('anita.patel@example.com');

    // 3. Admin updates status to DISPATCHED (case-insensitive 'dispatched')
    const dispatchReq = createJsonRequest(
      'http://localhost:3000/api/orders',
      'PATCH',
      {
        orderId,
        status: 'dispatched',
      },
      adminAuthHeaders
    );
    const dispatchRes = await OrdersAPI.PATCH(dispatchReq);
    const dispatchData = await dispatchRes.json();
    expect(dispatchRes.status).toBe(200);
    expect(dispatchData.success).toBe(true);
    expect(dispatchData.order.status).toBe('dispatched');

    // 4. Clean up
    const delReq = new Request(
      `http://localhost:3000/api/orders?id=${encodeURIComponent(orderId)}`,
      { method: 'DELETE', headers: adminAuthHeaders }
    );
    await OrdersAPI.DELETE(delReq);
  });

  test('POST /api/orders automatically computes total and sanitizes quantity if total is omitted', async () => {
    const req = createJsonRequest('http://localhost:3000/api/orders', 'POST', {
      fullName: 'Ritu Varma',
      phone: '9898012345',
      email: 'ritu@example.com',
      address: '7 Residency Road',
      city: 'Bengaluru',
      stateName: 'Karnataka',
      postalCode: '560025',
      items: [
        {
          productId: 'anarkali-01',
          name: 'Anarkali 01',
          size: 'L',
          quantity: 2,
          price: 9490,
        },
        {
          productId: 'coord-01',
          name: 'Co-ord 01',
          size: 'M',
          quantity: 0, // invalid/zero quantity -> sanitized to min 1
          price: 6990,
        },
      ],
      // total is deliberately omitted
    });

    const res = await OrdersAPI.POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    // 2 * 9490 + 1 * 6990 = 18980 + 6990 = 25970
    expect(data.order.total).toBe(25970);
    expect(data.order.items[1].quantity).toBe(1);

    // Clean up
    const delReq = new Request(
      `http://localhost:3000/api/orders?id=${encodeURIComponent(data.order.id)}`,
      { method: 'DELETE', headers: adminAuthHeaders }
    );
    await OrdersAPI.DELETE(delReq);
  });
});
