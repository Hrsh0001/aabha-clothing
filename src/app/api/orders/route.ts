import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../../lib/db';
import { isAuthorizedAdmin } from '../../../lib/auth-guard';
import { sendEmail, generateOrderConfirmationHtml } from '../../../lib/email';

export interface OrderItem {
  productId: string;
  name: string;
  size: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface CODOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  mapUrl?: string;
  items: OrderItem[];
  total: number;
  paymentMethod: 'CASH_ON_DELIVERY';
  status: 'PENDING_VERIFICATION' | 'CONFIRMED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  createdAt: string;
}

const ORDERS_FILE_PATH = path.join(process.cwd(), 'data', 'orders.json');

// In-memory fallback cache for serverless environments where local filesystem is read-only
let inMemoryOrdersCache: CODOrder[] | null = null;

function ensureDataDirectory(): void {
  try {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(ORDERS_FILE_PATH)) {
      fs.writeFileSync(ORDERS_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (fsErr) {
    // Read-only filesystem in cloud deployment
  }
}

function readOrders(): CODOrder[] {
  if (inMemoryOrdersCache && inMemoryOrdersCache.length > 0) {
    return inMemoryOrdersCache;
  }
  try {
    ensureDataDirectory();
    if (fs.existsSync(ORDERS_FILE_PATH)) {
      const data = fs.readFileSync(ORDERS_FILE_PATH, 'utf-8');
      inMemoryOrdersCache = JSON.parse(data);
      return inMemoryOrdersCache || [];
    }
    return inMemoryOrdersCache || [];
  } catch (err) {
    return inMemoryOrdersCache || [];
  }
}

function saveOrders(orders: CODOrder[]): void {
  inMemoryOrdersCache = orders;
  try {
    ensureDataDirectory();
    fs.writeFileSync(ORDERS_FILE_PATH, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (fsErr) {
    console.warn('Serverless filesystem notice (orders kept in memory cache):', fsErr);
  }
}

// GET /api/orders — Fetch all COD orders (Used by Admin Dashboard)
export async function GET() {
  try {
    if (process.env.DATABASE_URL && prisma) {
      try {
        const dbOrders = await prisma.order.findMany({
          orderBy: { createdAt: 'desc' },
        });
        if (dbOrders && dbOrders.length > 0) {
          return NextResponse.json({ success: true, orders: dbOrders });
        }
      } catch (dbErr) {
        console.warn('Prisma orders fetch notice:', dbErr);
      }
    }

    const orders = readOrders();
    // Return sorted newest first
    const sorted = [...orders].reverse();
    return NextResponse.json({ success: true, orders: sorted });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// POST /api/orders — Place a new Cash on Delivery order
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fullName,
      phone,
      email,
      address,
      city,
      stateName,
      postalCode,
      latitude,
      longitude,
      mapUrl,
      items,
      total,
    } = body;

    // Basic Validation
    if (!fullName || !phone || !address || !city || !postalCode || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required order fields' },
        { status: 400 }
      );
    }

    const latNum =
      typeof latitude === 'number' && !isNaN(latitude)
        ? latitude
        : latitude
        ? parseFloat(latitude)
        : undefined;
    const lngNum =
      typeof longitude === 'number' && !isNaN(longitude)
        ? longitude
        : longitude
        ? parseFloat(longitude)
        : undefined;

    const resolvedMapUrl =
      mapUrl ||
      (latNum !== undefined && lngNum !== undefined
        ? `https://www.google.com/maps?q=${latNum},${lngNum}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${address}, ${city}, ${stateName || ''} ${postalCode}`
          )}`);

    const orderNumber = `AB-${Math.floor(24000 + Math.random() * 5999)}`;
    const newOrder: CODOrder = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      orderNumber,
      customerName: fullName.trim(),
      phone: phone.trim(),
      email: email?.trim() || '',
      address: address.trim(),
      city: city.trim(),
      state: stateName?.trim() || 'Maharashtra',
      pincode: postalCode.trim(),
      latitude: latNum,
      longitude: lngNum,
      mapUrl: resolvedMapUrl,
      items: items.map((i: any) => ({
        productId: i.product?.id || i.productId,
        name: i.product?.name || i.name,
        size: i.size,
        quantity: i.quantity,
        price: i.product?.price || i.price,
        image: i.product?.primaryImage || i.image || '/images/hero_editorial_banner_1791119088652.jpg',
      })),
      total: Number(total),
      paymentMethod: 'CASH_ON_DELIVERY',
      status: 'PENDING_VERIFICATION',
      createdAt: new Date().toISOString(),
    };

    if (process.env.DATABASE_URL && prisma) {
      try {
        await prisma.order.create({
          data: {
            orderNumber: newOrder.orderNumber,
            customerName: newOrder.customerName,
            phone: newOrder.phone,
            email: newOrder.email,
            address: newOrder.address,
            city: newOrder.city,
            state: newOrder.state,
            pincode: newOrder.pincode,
            total: newOrder.total,
            status: newOrder.status,
            paymentMethod: newOrder.paymentMethod,
            items: newOrder.items as any,
          },
        });
      } catch (dbErr) {
        console.warn('Prisma order create notice:', dbErr);
      }
    }

    const existingOrders = readOrders();
    existingOrders.push(newOrder);
    saveOrders(existingOrders);

    // Asynchronously dispatch Order Confirmation Email (non-blocking)
    if (newOrder.email) {
      sendEmail({
        to: newOrder.email,
        subject: `Namaste ${newOrder.customerName} — Your AABHA Order #${newOrder.orderNumber} is Confirmed`,
        html: generateOrderConfirmationHtml(newOrder),
      }).catch((err) => console.warn('Customer confirmation email notice:', err));
    }

    // Notify Store Owner if ADMIN_NOTIFICATION_EMAIL is configured
    const adminNotificationEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (adminNotificationEmail) {
      sendEmail({
        to: adminNotificationEmail,
        subject: `[NEW ORDER] #${newOrder.orderNumber} placed by ${newOrder.customerName} (₹${newOrder.total})`,
        html: generateOrderConfirmationHtml(newOrder),
      }).catch((err) => console.warn('Admin notification email notice:', err));
    }

    return NextResponse.json({
      success: true,
      order: newOrder,
      message: 'Cash on delivery order recorded successfully',
    });
  } catch (error) {
    console.error('Error saving order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record order' },
      { status: 500 }
    );
  }
}

// PATCH /api/orders — Update Order Status (Admin)
export async function PATCH(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Administrator access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, error: 'Order ID and status are required' },
        { status: 400 }
      );
    }

    if (process.env.DATABASE_URL && prisma) {
      try {
        await prisma.order.updateMany({
          where: {
            OR: [{ id: orderId }, { orderNumber: orderId }],
          },
          data: { status },
        });
      } catch (dbErr) {
        console.warn('Prisma order update notice:', dbErr);
      }
    }

    const orders = readOrders();
    const index = orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId);

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    orders[index].status = status;
    saveOrders(orders);

    return NextResponse.json({ success: true, order: orders[index] });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update order status' },
      { status: 500 }
    );
  }
}
