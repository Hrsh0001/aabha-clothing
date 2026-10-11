import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isAuthorizedAdmin } from '../../../lib/auth-guard';

export interface Subscriber {
  id: string;
  email: string;
  subscribedAt: string;
  source: string;
}

const NEWSLETTER_FILE_PATH = path.join(process.cwd(), 'data', 'newsletter.json');

function ensureNewsletterFile(): void {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(NEWSLETTER_FILE_PATH)) {
    fs.writeFileSync(NEWSLETTER_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
  }
}

function readSubscribers(): Subscriber[] {
  try {
    ensureNewsletterFile();
    const data = fs.readFileSync(NEWSLETTER_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function saveSubscribers(subscribers: Subscriber[]): void {
  ensureNewsletterFile();
  fs.writeFileSync(NEWSLETTER_FILE_PATH, JSON.stringify(subscribers, null, 2), 'utf-8');
}

// GET /api/newsletter — List all newsletter subscribers (Admin Only)
export async function GET(request: Request) {
  try {
    const subscribers = readSubscribers();
    // Sort newest first
    subscribers.sort((a, b) => new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime());
    return NextResponse.json({
      success: true,
      subscribers,
      totalCount: subscribers.length,
    });
  } catch (error) {
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

    const subscribers = readSubscribers();
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
    saveSubscribers(subscribers);

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

    const subscribers = readSubscribers();
    const filtered = subscribers.filter((s) => s.id !== id && s.email !== id);
    saveSubscribers(filtered);

    return NextResponse.json({ success: true, message: 'Subscriber removed successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete subscriber' }, { status: 500 });
  }
}
