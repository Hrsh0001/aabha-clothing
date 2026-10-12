import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../../lib/db';
import { isAuthorizedAdmin } from '../../../lib/auth-guard';

export interface Subscriber {
  id: string;
  email: string;
  subscribedAt: string;
  source: string;
}

const NEWSLETTER_FILE_PATH = path.join(process.cwd(), 'data', 'newsletter.json');

// In-memory fallback cache for serverless environments where local filesystem is read-only
let inMemoryNewsletterCache: Subscriber[] | null = null;
let isNewsletterTableReady = false;

async function ensureNewsletterStorage(): Promise<boolean> {
  if (!process.env.DATABASE_URL || !prisma) return false;
  try {
    if (!isNewsletterTableReady) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SiteSetting" (
          "id" TEXT NOT NULL,
          "data" JSONB NOT NULL,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
        );
      `);
      isNewsletterTableReady = true;
    }
    return true;
  } catch {
    return true;
  }
}

function ensureNewsletterFile(): void {
  try {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(NEWSLETTER_FILE_PATH)) {
      fs.writeFileSync(NEWSLETTER_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch {
    // Read-only filesystem in cloud deployment
  }
}

async function readSubscribers(): Promise<Subscriber[]> {
  const dbReady = await ensureNewsletterStorage();
  if (dbReady && prisma) {
    try {
      const rows = await prisma.$queryRawUnsafe<{ data: any }[]>(
        `SELECT "data" FROM "SiteSetting" WHERE "id" = 'site_newsletter' LIMIT 1`
      );
      if (rows && rows.length > 0 && Array.isArray(rows[0].data)) {
        inMemoryNewsletterCache = rows[0].data;
        return inMemoryNewsletterCache || [];
      }
    } catch {
      // Fallback
    }
  }

  if (inMemoryNewsletterCache && inMemoryNewsletterCache.length > 0) {
    return inMemoryNewsletterCache;
  }
  try {
    ensureNewsletterFile();
    if (fs.existsSync(NEWSLETTER_FILE_PATH)) {
      const data = fs.readFileSync(NEWSLETTER_FILE_PATH, 'utf-8');
      inMemoryNewsletterCache = JSON.parse(data);
      return inMemoryNewsletterCache || [];
    }
    return inMemoryNewsletterCache || [];
  } catch {
    return inMemoryNewsletterCache || [];
  }
}

async function saveSubscribers(subscribers: Subscriber[]): Promise<void> {
  inMemoryNewsletterCache = subscribers;

  const dbReady = await ensureNewsletterStorage();
  if (dbReady && prisma) {
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "SiteSetting" ("id", "data", "updatedAt")
         VALUES ('site_newsletter', $1::jsonb, CURRENT_TIMESTAMP)
         ON CONFLICT ("id") DO UPDATE SET "data" = $1::jsonb, "updatedAt" = CURRENT_TIMESTAMP`,
        JSON.stringify(subscribers)
      );
    } catch (err) {
      console.warn('Database newsletter save notice:', err);
    }
  }

  try {
    ensureNewsletterFile();
    fs.writeFileSync(NEWSLETTER_FILE_PATH, JSON.stringify(subscribers, null, 2), 'utf-8');
  } catch {
    // Kept in memory / DB on serverless
  }
}

// GET /api/newsletter — List all newsletter subscribers (Admin Only)
export async function GET() {
  try {
    const subscribers = await readSubscribers();
    subscribers.sort((a, b) => new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime());
    return NextResponse.json({
      success: true,
      subscribers,
      totalCount: subscribers.length,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subscribers' },
      { status: 500 }
    );
  }
}

// POST /api/newsletter — Subscribe to newsletter (Public Storefront)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address format' },
        { status: 400 }
      );
    }

    const subscribers = await readSubscribers();
    const alreadySubscribed = subscribers.some((s) => s.email.toLowerCase() === cleanEmail);

    if (alreadySubscribed) {
      return NextResponse.json({
        success: true,
        message: 'You are already subscribed to AABHA CLOTHING private previews.',
        alreadySubscribed: true,
      });
    }

    const newSubscriber: Subscriber = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email: cleanEmail,
      subscribedAt: new Date().toISOString(),
      source: 'Storefront Footer',
    };

    subscribers.unshift(newSubscriber);
    await saveSubscribers(subscribers);

    return NextResponse.json({
      success: true,
      message: 'Thank you for subscribing to AABHA CLOTHING private previews.',
      subscriber: newSubscriber,
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process subscription' },
      { status: 500 }
    );
  }
}

// DELETE /api/newsletter — Remove subscriber (Admin Only)
export async function DELETE(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin authorization required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Subscriber ID is required' }, { status: 400 });
    }

    const subscribers = await readSubscribers();
    const filtered = subscribers.filter((s) => s.id !== id && s.email !== id);
    await saveSubscribers(filtered);

    return NextResponse.json({ success: true, message: 'Subscriber removed successfully' });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to delete subscriber' }, { status: 500 });
  }
}
