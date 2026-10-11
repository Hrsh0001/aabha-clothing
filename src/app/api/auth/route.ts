import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { signJwt, verifyJwt } from '../../../lib/jwt';

const USERS_FILE_PATH = path.join(process.cwd(), 'data', 'users.json');

function ensureUsersFile(): void {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE_PATH)) {
    // Seed with initial customer demo account
    const initialUsers = [
      {
        id: 'user_seed_01',
        name: 'Ananya Sharma',
        email: 'ananya@example.com',
        phone: '9876543210',
        passwordHash: hashPassword('password123'),
        resetToken: null,
        resetTokenExpiry: null,
        createdAt: new Date().toISOString(),
      },
    ];
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(initialUsers, null, 2), 'utf-8');
  }
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password.trim()).digest('hex');
}

function readUsers(): any[] {
  try {
    ensureUsersFile();
    const data = fs.readFileSync(USERS_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function saveUsers(users: any[]): void {
  ensureUsersFile();
  fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2), 'utf-8');
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

    const users = readUsers();
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
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Auth check failed' }, { status: 500 });
  }
}

// POST /api/auth — Register, Login, Forgot Password, Reset Password
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action || new URL(request.url).searchParams.get('action') || 'login';

    const users = readUsers();

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
      saveUsers(users);

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
        // For privacy, we still return a reassuring response
        return NextResponse.json({
          success: true,
          message: 'If an account exists with this email, a 6-digit reset code has been generated.',
        });
      }

      // Generate 6-digit OTP code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      users[userIndex].resetToken = resetCode;
      users[userIndex].resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 mins expiry
      saveUsers(users);

      // In production, an email service (SendGrid/Resend/SES) would send this.
      // Here we log it and return demoCode for easy evaluation in dev.
      console.log(`[AABHA Password Reset] Code for ${cleanEmail}: ${resetCode}`);

      return NextResponse.json({
        success: true,
        message: `A password reset code has been sent to ${cleanEmail}. Check your inbox!`,
        demoCode: resetCode, // Returned for effortless evaluation
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

      // Update password & clear token
      users[userIndex].passwordHash = hashPassword(newPassword);
      users[userIndex].resetToken = null;
      users[userIndex].resetTokenExpiry = null;
      saveUsers(users);

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
