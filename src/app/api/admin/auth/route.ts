import { NextResponse } from 'next/server';
import { signJwt, verifyJwt } from '../../../../lib/jwt';

// POST /api/admin/auth — Admin Login
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, pin } = body;

    const inputCredential = (password || pin || '').toString().trim();
    const inputUser = (username || '').toString().trim().toLowerCase();

    // Valid admin credentials:
    // 1. PIN: "aabha2026" or "admin123"
    // 2. Username/Password: "admin" / "aabha2026"
    const isValid =
      inputCredential === 'aabha2026' ||
      inputCredential === 'admin123' ||
      ((inputUser === 'admin' || inputUser === 'admin@aabhaclothing.com') && inputCredential === 'aabha2026');

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin credentials. (Default Secret PIN: "aabha2026")' },
        { status: 401 }
      );
    }

    const payload = {
      sub: 'admin_store_owner',
      role: 'admin',
      name: 'AABHA Store Owner',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days validity
    };

    const token = signJwt(payload);

    return NextResponse.json({
      success: true,
      token,
      admin: {
        role: 'admin',
        name: 'AABHA Store Administrator',
        email: 'owner@aabhaclothing.com',
      },
    });
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json({ success: false, error: 'Server authentication error' }, { status: 500 });
  }
}

// GET /api/admin/auth — Verify Admin JWT Token
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return NextResponse.json({ success: false, valid: false, error: 'Token missing' }, { status: 401 });
    }

    const decoded = verifyJwt(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ success: false, valid: false, error: 'Invalid or expired token' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      valid: true,
      admin: {
        role: 'admin',
        name: decoded.name || 'AABHA Store Administrator',
        email: 'owner@aabhaclothing.com',
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, valid: false, error: 'Verification failed' }, { status: 500 });
  }
}
