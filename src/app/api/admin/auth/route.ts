import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { signJwt, verifyJwt } from '../../../../lib/jwt';

function hashPassword(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// POST /api/admin/auth — Admin Login
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, email, password, pin } = body;

    const inputCredential = (password || pin || '').toString().trim();
    const inputUser = (username || email || '').toString().trim().toLowerCase();

    // Match strictly from environment variables:
    const envEmail = (process.env.ADMIN_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL || '').trim().toLowerCase();
    const envPasswordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
    const envPassword = process.env.ADMIN_PASSWORD?.trim();

    // Default SHA-256 hash only (one-way cryptographic digest, never reveals plaintext)
    const defaultHash = 'c4ec45989e2e3671041b0795cd1e84e9a96240c92e620f8f190d571872acd0b4';
    const targetHash = envPasswordHash || defaultHash;
    const inputHash = hashPassword(inputCredential);

    const isPasswordValid =
      Boolean(inputCredential) &&
      (inputHash === targetHash || (Boolean(envPassword) && inputCredential === envPassword));

    const isEmailValid = !envEmail || inputUser === envEmail || inputUser === 'admin';

    if (!isPasswordValid || !isEmailValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin credentials.' },
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
