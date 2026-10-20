import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/keep-alive
 * Scheduled keep-alive activity to prevent Supabase Free Tier auto-pausing.
 * Supabase free projects pause after 7 consecutive days of inactivity.
 * This endpoint executes a lightweight query every 2 days to keep the database awake 24/7/365.
 */
export async function GET() {
  try {
    let dbStatus = 'disconnected';
    let recordFound = false;

    if (prisma) {
      // Lightweight read from SiteSetting or fallback query
      const setting = await prisma.siteSetting.findFirst({
        select: { id: true, updatedAt: true },
      });
      dbStatus = 'connected_and_active';
      recordFound = !!setting;
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase keep-alive heartbeat acknowledged. Database is active.',
      database: dbStatus,
      recordFound,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Keep-alive ping error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Database keep-alive ping failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
