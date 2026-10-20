import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../../lib/db';
import { isAuthorizedAdmin } from '../../../lib/auth-guard';

export interface SanitizedCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
}

const USERS_FILE_PATH = path.join(process.cwd(), 'data', 'users.json');
const ORDERS_FILE_PATH = path.join(process.cwd(), 'data', 'orders.json');

// In-memory fallback cache for serverless environments where local filesystem is read-only
let inMemoryCustomersCache: any[] | null = null;
let isCustomersTableReady = false;

async function ensureCustomersStorage(): Promise<boolean> { return true; }

function ensureUsersFile(): void {
  try {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(USERS_FILE_PATH)) {
      fs.writeFileSync(USERS_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch {
    // Read-only filesystem in cloud deployment
  }
}

async function readUsers(): Promise<any[]> {
  const dbReady = await ensureCustomersStorage();
  if (dbReady && prisma) {
    try {
      const rows = await prisma.$queryRawUnsafe<{ data: any }[]>(
        `SELECT "data" FROM "SiteSetting" WHERE "id" = 'site_users' LIMIT 1`
      );
      if (rows && rows.length > 0 && Array.isArray(rows[0].data)) {
        inMemoryCustomersCache = rows[0].data;
        return inMemoryCustomersCache || [];
      }
    } catch {
      // Fallback
    }
  }

  if (inMemoryCustomersCache && inMemoryCustomersCache.length > 0) {
    return inMemoryCustomersCache;
  }
  try {
    ensureUsersFile();
    if (fs.existsSync(USERS_FILE_PATH)) {
      const data = fs.readFileSync(USERS_FILE_PATH, 'utf-8');
      inMemoryCustomersCache = JSON.parse(data);
      return inMemoryCustomersCache || [];
    }
    return inMemoryCustomersCache || [];
  } catch {
    return inMemoryCustomersCache || [];
  }
}

async function saveUsers(users: any[]): Promise<void> {
  inMemoryCustomersCache = users;

  const dbReady = await ensureCustomersStorage();
  if (prisma) {
    try {
      await prisma.siteSetting.upsert({
        where: { id: 'site_users' },
        update: { data: users as any },
        create: { id: 'site_users', data: users as any },
      });
    } catch (err) {
      console.warn('Prisma site_users save notice:', err);
    }
  }

  try {
    ensureUsersFile();
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2), 'utf-8');
  } catch {
    // Kept in memory / DB on serverless
  }
}

async function readOrders(): Promise<any[]> {
  let dbOrders: any[] = [];
  if (process.env.DATABASE_URL && prisma) {
    try {
      dbOrders = await prisma.order.findMany();
    } catch {
      // Fallback
    }
  }
  let localOrders: any[] = [];
  try {
    if (fs.existsSync(ORDERS_FILE_PATH)) {
      const data = fs.readFileSync(ORDERS_FILE_PATH, 'utf-8');
      localOrders = JSON.parse(data);
    }
  } catch {
    localOrders = [];
  }

  if (dbOrders.length === 0) return Array.isArray(localOrders) ? localOrders : [];
  if (!Array.isArray(localOrders) || localOrders.length === 0) return dbOrders;

  const seenIds = new Set(dbOrders.map((o: any) => o.id));
  const seenNums = new Set(dbOrders.map((o: any) => o.orderNumber));
  const merged = [...dbOrders];
  for (const loc of localOrders) {
    if (loc && !seenIds.has(loc.id) && !seenNums.has(loc.orderNumber)) {
      merged.push(loc);
    }
  }
  return merged;
}

// GET /api/customers — List all registered customer accounts (Admin Only)
export async function GET(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Administrator access required' },
        { status: 401 }
      );
    }

    const rawUsers = await readUsers();
    const orders = await readOrders();

    // Map and sanitize patron data, never leaking passwordHash or resetToken
    const sanitizedCustomers: SanitizedCustomer[] = rawUsers.map((u: any) => {
      const customerEmail = (u.email || '').toLowerCase().trim();
      const customerPhone = (u.phone || '').trim().replace(/[^0-9]/g, '');

      // Compute order metrics
      const matchedOrders = orders.filter((o: any) => {
        const orderEmail = (o.email || '').toLowerCase().trim();
        const orderPhone = (o.phone || '').trim().replace(/[^0-9]/g, '');
        return (
          (customerEmail && orderEmail === customerEmail) ||
          (customerPhone && orderPhone === customerPhone)
        );
      });

      const totalSpent = matchedOrders.reduce(
        (acc: number, curr: any) => acc + (Number(curr.total) || 0),
        0
      );

      return {
        id: u.id,
        name: u.name || 'Patron',
        email: u.email || '',
        phone: u.phone || '',
        createdAt: u.createdAt || new Date().toISOString(),
        orderCount: matchedOrders.length,
        totalSpent,
      };
    });

    // Sort newest patrons first
    sanitizedCustomers.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      customers: sanitizedCustomers,
      totalCustomers: sanitizedCustomers.length,
    });
  } catch (error) {
    console.error('Customers GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer accounts' },
      { status: 500 }
    );
  }
}

// DELETE /api/customers?id=... — Remove customer account (Admin Only)
export async function DELETE(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Administrator access required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const rawUsers = await readUsers();
    const filtered = rawUsers.filter((u: any) => u.id !== id);

    if (filtered.length === rawUsers.length) {
      return NextResponse.json(
        { success: false, error: 'Customer account not found' },
        { status: 404 }
      );
    }

    await saveUsers(filtered);

    return NextResponse.json({
      success: true,
      message: 'Customer account deleted successfully',
    });
  } catch (error) {
    console.error('Customers DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete customer account' },
      { status: 500 }
    );
  }
}
