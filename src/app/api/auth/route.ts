import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../../../lib/db';
import { signJwt, verifyJwt } from '../../../lib/jwt';

const USERS_FILE_PATH = path.join(process.cwd(), 'data', 'users.json');

// In-memory fallback cache for serverless environments where local filesystem is read-only
let inMemoryUsersCache: any[] | null = null;
let isAuthTableReady = false;

async function ensureAuthStorage(): Promise<boolean> {
  if (!process.env.DATABASE_URL || !prisma) return false;
  try {
    if (!isAuthTableReady) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SiteSetting" (
          "id" TEXT NOT NULL,
          "data" JSONB NOT NULL,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
        );
      `);
      isAuthTableReady = true;
    }
    return true;
  } catch {
    return true;
  }
}

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

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password.trim()).digest('hex');
}

async function readUsers(): Promise<any[]> {
  const dbReady = await ensureAuthStorage();
  if (dbReady && prisma) {
    try {
      const rows = await prisma.$queryRawUnsafe<{ data: any }[]>(
        `SELECT "data" FROM "SiteSetting" WHERE "id" = 'site_users' LIMIT 1`
      );
      if (rows && rows.length > 0 && Array.isArray(rows[0].data)) {
        inMemoryUsersCache = rows[0].data;
        return inMemoryUsersCache || [];
      }
    } catch {
      // Fallback
    }
  }

  if (inMemoryUsersCache && inMemoryUsersCache.length > 0) {
    return inMemoryUsersCache;
  }
  try {
    ensureUsersFile();
    if (fs.existsSync(USERS_FILE_PATH)) {
      const data = fs.readFileSync(USERS_FILE_PATH, 'utf-8');
      inMemoryUsersCache = JSON.parse(data);
      return inMemoryUsersCache || [];
    }
    return inMemoryUsersCache || [];
  } catch {
    return inMemoryUsersCache || [];
  }
}

async function saveUsers(users: any[]): Promise<void> {
  inMemoryUsersCache = users;

  const dbReady = await ensureAuthStorage();
  if (dbReady && prisma) {
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "SiteSetting" ("id", "data", "updatedAt")
         VALUES ('site_users', $1::jsonb, CURRENT_TIMESTAMP)
         ON CONFLICT ("id") DO UPDATE SET "data" = $1::jsonb, "updatedAt" = CURRENT_TIMESTAMP`,
        JSON.stringify(users)
      );
    } catch (err) {
      console.warn('Database users save notice:', err);
    }
  }

  try {
    ensureUsersFile();
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2), 'utf-8');
  } catch {
    // Kept in memory / DB on serverless
  }
}

// GET /api/auth — Verify customer token & return profile
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyJwt(token);
    if (!decoded || decoded.role !== 'customer') {
      return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
    }

    const users = await readUsers();
    const user = users.find((u: any) => u.id === decoded.sub || u.email === decoded.email);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: 'customer',
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Auth check failed' }, { status: 500 });
  }
}

// POST /api/auth — Register, Login, Forgot Password, Reset Password
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action || new URL(request.url).searchParams.get('action') || 'login';

    const users = await readUsers();

    // 1. REGISTER / SIGN UP
    if (action === 'register' || action === 'signup') {
      const { name, email, phone, password } = body;

      if (!name || !email || !password) {
        return NextResponse.json(
          { success: false, error: 'Name, email, and password are required' },
          { status: 400 }
        );
      }

      const cleanEmail = email.trim().toLowerCase();
      const existingUser = users.find((u: any) => u.email.toLowerCase() === cleanEmail);
      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'An account with this email already exists. Please sign in.' },
          { status: 409 }
        );
      }

      const newUser = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: name.trim(),
        email: cleanEmail,
        phone: phone ? phone.trim().replace(/[^0-9]/g, '') : '',
        passwordHash: hashPassword(password),
        resetToken: null,
        resetTokenExpiry: null,
        createdAt: new Date().toISOString(),
      };

      users.push(newUser);
      await saveUsers(users);

      const token = signJwt({
        sub: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: 'customer',
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
      });

      return NextResponse.json({
        success: true,
        message: 'Account created successfully! Welcome to AABHA CLOTHING.',
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: 'customer',
        },
      });
    }

    // 2. LOGIN / SIGN IN
    if (action === 'login' || action === 'signin') {
      const { email, password } = body;

      if (!email || !password) {
        return NextResponse.json(
          { success: false, error: 'Email and password are required' },
          { status: 400 }
        );
      }

      const cleanEmail = email.trim().toLowerCase();
      const user = users.find((u: any) => u.email.toLowerCase() === cleanEmail);

      if (!user || user.passwordHash !== hashPassword(password)) {
        return NextResponse.json(
          { success: false, error: 'Incorrect email or password. Please try again.' },
          { status: 401 }
        );
      }

      const token = signJwt({
        sub: user.id,
        email: user.email,
        name: user.name,
        role: 'customer',
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      });

      return NextResponse.json({
        success: true,
        message: `Welcome back, ${user.name}!`,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: 'customer',
        },
      });
    }

    // 3. FORGOT PASSWORD (Request OTP / Reset Code)
    if (action === 'forgot_password' || action === 'forgot-password') {
      const { email } = body;
      if (!email) {
        return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
      }

      const cleanEmail = email.trim().toLowerCase();
      const userIndex = users.findIndex((u: any) => u.email.toLowerCase() === cleanEmail);

      if (userIndex === -1) {
        return NextResponse.json({
          success: true,
          message: 'If an account exists with this email, a 6-digit reset code has been generated.',
        });
      }

      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      users[userIndex].resetToken = resetCode;
      users[userIndex].resetTokenExpiry = Date.now() + 15 * 60 * 1000;
      await saveUsers(users);

      console.log(`[AABHA Password Reset] Code for ${cleanEmail}: ${resetCode}`);

      return NextResponse.json({
        success: true,
        message: `A password reset code has been sent to ${cleanEmail}. Check your inbox!`,
        demoCode: resetCode,
      });
    }

    // 4. RESET PASSWORD (Verify Code & Set New Password)
    if (action === 'reset_password' || action === 'reset-password') {
      const { email, code, newPassword } = body;

      if (!email || !code || !newPassword) {
        return NextResponse.json(
          { success: false, error: 'Email, reset code, and new password are required' },
          { status: 400 }
        );
      }

      const cleanEmail = email.trim().toLowerCase();
      const userIndex = users.findIndex((u: any) => u.email.toLowerCase() === cleanEmail);

      if (userIndex === -1) {
        return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
      }

      const user = users[userIndex];
      if (!user.resetToken || user.resetToken !== code.trim()) {
        return NextResponse.json(
          { success: false, error: 'Invalid or incorrect reset code' },
          { status: 400 }
        );
      }

      if (user.resetTokenExpiry && Date.now() > user.resetTokenExpiry) {
        return NextResponse.json(
          { success: false, error: 'Reset code has expired. Please request a new one.' },
          { status: 400 }
        );
      }

      users[userIndex].passwordHash = hashPassword(newPassword);
      users[userIndex].resetToken = null;
      users[userIndex].resetTokenExpiry = null;
      await saveUsers(users);

      return NextResponse.json({
        success: true,
        message: 'Password reset successfully! You can now sign in with your new password.',
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid auth action' }, { status: 400 });
  } catch (error) {
    console.error('Customer auth error:', error);
    return NextResponse.json({ success: false, error: 'Authentication request failed' }, { status: 500 });
  }
}
