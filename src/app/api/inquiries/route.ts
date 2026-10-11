import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isAuthorizedAdmin } from '../../../lib/auth-guard';

export interface CustomerInquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  topic: string;
  message: string;
  status: 'UNREAD' | 'RESPONDED' | 'RESOLVED';
  createdAt: string;
}

const INQUIRIES_FILE_PATH = path.join(process.cwd(), 'data', 'inquiries.json');

function ensureInquiriesFile(): void {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(INQUIRIES_FILE_PATH)) {
    fs.writeFileSync(INQUIRIES_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
  }
}

function readInquiries(): CustomerInquiry[] {
  try {
    ensureInquiriesFile();
    const data = fs.readFileSync(INQUIRIES_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function saveInquiries(inquiries: CustomerInquiry[]): void {
  ensureInquiriesFile();
  fs.writeFileSync(INQUIRIES_FILE_PATH, JSON.stringify(inquiries, null, 2), 'utf-8');
}

// GET /api/inquiries — List all customer inquiries
export async function GET() {
  try {
    const inquiries = readInquiries();
    // Sort newest first
    inquiries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json({
      success: true,
      inquiries,
      unreadCount: inquiries.filter((i) => i.status === 'UNREAD').length,
    });
  } catch (error) {
    console.error('Inquiries GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inquiries' },
      { status: 500 }
    );
  }
}

// POST /api/inquiries — Submit inquiry from storefront Contact Page
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, topic, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    const inquiries = readInquiries();
    const newInquiry: CustomerInquiry = {
      id: `inq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim().replace(/[^0-9]/g, '') : '',
      topic: topic || 'General Inquiry',
      message: message.trim(),
      status: 'UNREAD',
      createdAt: new Date().toISOString(),
    };

    inquiries.unshift(newInquiry);
    saveInquiries(inquiries);

    return NextResponse.json({
      success: true,
      message: 'Thank you. Your message has been received by our Client Care atelier.',
      inquiry: newInquiry,
    });
  } catch (error) {
    console.error('Inquiries POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit inquiry' },
      { status: 500 }
    );
  }
}

// PATCH /api/inquiries — Update inquiry status (UNREAD, RESPONDED, RESOLVED)
export async function PATCH(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Administrator access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'Inquiry ID and new status are required' },
        { status: 400 }
      );
    }

    const inquiries = readInquiries();
    const index = inquiries.findIndex((i) => i.id === id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Inquiry record not found' },
        { status: 404 }
      );
    }

    inquiries[index].status = status;
    saveInquiries(inquiries);

    return NextResponse.json({
      success: true,
      message: `Inquiry status updated to ${status}`,
      inquiry: inquiries[index],
    });
  } catch (error) {
    console.error('Inquiries PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update inquiry status' },
      { status: 500 }
    );
  }
}

// DELETE /api/inquiries — Delete an inquiry
export async function DELETE(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Administrator access required' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Inquiry ID is required' },
        { status: 400 }
      );
    }

    let inquiries = readInquiries();
    const initialLen = inquiries.length;
    inquiries = inquiries.filter((i) => i.id !== id);

    if (inquiries.length === initialLen) {
      return NextResponse.json(
        { success: false, error: 'Inquiry record not found' },
        { status: 404 }
      );
    }

    saveInquiries(inquiries);

    return NextResponse.json({
      success: true,
      message: 'Inquiry record deleted successfully',
    });
  } catch (error) {
    console.error('Inquiries DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete inquiry record' },
      { status: 500 }
    );
  }
}
