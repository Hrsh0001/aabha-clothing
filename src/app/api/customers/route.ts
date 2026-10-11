import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password.trim()).digest('hex');
}

// In-memory fallback cache for serverless environments where local filesystem is read-only
let inMemoryCustomersCache: any[] | null = null;

function ensureUsersFile(): void {
  try {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(USERS_FILE_PATH)) {
      // Empty array for clean production state (no static dummy patrons)
      fs.writeFileSync(USERS_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (fsErr) {
    // Read-only filesystem in cloud deployment
  }
}

function readUsers(): any[] {
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
  } catch (err) {
    return inMemoryCustomersCache || [];
  }
}

function saveUsers(users: any[]): void {
  inMemoryCustomersCache = users;
  try {
    ensureUsersFile();
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2), 'utf-8');
  } catch (fsErr) {
    console.warn('Serverless filesystem notice (customers kept in memory cache):', fsErr);
  }
}

function readOrders(): any[] {
  try {
    if (fs.existsSync(ORDERS_FILE_PATH)) {
      const data = fs.readFileSync(ORDERS_FILE_PATH, 'utf-8');
      return JSON.parse(data);
    }
    return [];
  } catch (err) {
    return [];
  }
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

    const rawUsers = readUsers();
    const orders = readOrders();

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

    const rawUsers = readUsers();
    const filtered = rawUsers.filter((u: any) => u.id !== id);

    if (filtered.length === rawUsers.length) {
      return NextResponse.json(
        { success: false, error: 'Customer account not found' },
        { status: 404 }
      );
    }

    saveUsers(filtered);

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
