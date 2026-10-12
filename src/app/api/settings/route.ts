import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../../lib/db';
import { isAuthorizedAdmin } from '../../../lib/auth-guard';
import { persistImageUrlForCloud } from '../../../lib/image-store';

export interface SiteSettings {
  logoUrl: string;
  heroBanner: string;
  heroCoords: string;
  heroEthnic: string;
  brandStory: string;
  igPhotos: string[];
}

const DEFAULT_SETTINGS: SiteSettings = {
  logoUrl: '/logo.svg',
  heroBanner: '/images/hero_editorial_banner_1791119088652.jpg',
  heroCoords: '/images/hero_slide_coords_1791228726563.jpg',
  heroEthnic: '/images/hero_slide_ethnic_1791228741882.jpg',
  brandStory: '/images/brand_story_editorial_1791119191742.jpg',
  igPhotos: [
    '/images/product_kurta_ivory_1791119105107.jpg',
    '/images/product_kurtaset_sand_1791119136277.jpg',
    '/images/product_dress_ochre_1791119165890.jpg',
    '/images/product_coords_charcoal_1791119178003.jpg',
    '/images/product_kurta_olive_1791119121380.jpg',
    '/images/product_kurtaset_rosewood_1791119152298.jpg',
  ],
};

const SETTINGS_FILE_PATH = path.join(process.cwd(), 'data', 'settings.json');

// In-memory fallback cache for serverless environments where local filesystem is read-only
let inMemorySettingsCache: SiteSettings | null = null;
let isSettingsTableInitialized = false;

async function ensureSettingsTable(): Promise<boolean> {
  if (!process.env.DATABASE_URL || !prisma) return false;
  try {
    if (!isSettingsTableInitialized) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SiteSetting" (
          "id" TEXT NOT NULL,
          "data" JSONB NOT NULL,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
        );
      `);
      isSettingsTableInitialized = true;
    }
    return true;
  } catch (err) {
    console.warn('SiteSetting table init notice:', err);
    return true;
  }
}

function ensureSettingsFile(): void {
  try {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(SETTINGS_FILE_PATH)) {
      fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
    }
  } catch {
    // Read-only filesystem in cloud deployment
  }
}

function readLocalSettings(): SiteSettings {
  if (inMemorySettingsCache) {
    return inMemorySettingsCache;
  }
  try {
    ensureSettingsFile();
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const data = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
      inMemorySettingsCache = { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      return inMemorySettingsCache;
    }
    return DEFAULT_SETTINGS;
  } catch {
    return inMemorySettingsCache || DEFAULT_SETTINGS;
  }
}

function saveLocalSettings(settings: SiteSettings): void {
  inMemorySettingsCache = settings;
  try {
    ensureSettingsFile();
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), 'utf-8');
  } catch {
    // Kept in memory cache on serverless
  }
}

// GET /api/settings — Fetch active branding & section images
export async function GET() {
  try {
    const dbReady = await ensureSettingsTable();
    if (dbReady && prisma) {
      try {
        const rows = await prisma.$queryRawUnsafe<{ data: any }[]>(
          `SELECT "data" FROM "SiteSetting" WHERE "id" = 'site_branding' LIMIT 1`
        );
        if (rows && rows.length > 0 && rows[0].data) {
          const parsed =
            typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
          const merged: SiteSettings = { ...DEFAULT_SETTINGS, ...parsed };
          inMemorySettingsCache = merged;
          return NextResponse.json({ success: true, settings: merged });
        }
      } catch (dbErr) {
        console.warn('Database settings read notice:', dbErr);
      }
    }

    const settings = readLocalSettings();
    return NextResponse.json({ success: true, settings });
  } catch {
    return NextResponse.json({ success: true, settings: DEFAULT_SETTINGS });
  }
}

// POST /api/settings — Update branding & section images (Admin)
export async function POST(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Administrator access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const current = readLocalSettings();
    const rawUpdated: SiteSettings = {
      ...DEFAULT_SETTINGS,
      ...current,
      ...body,
    };

    const igPhotos: string[] = [];
    for (let i = 0; i < (rawUpdated.igPhotos || []).length; i++) {
      const p = rawUpdated.igPhotos[i];
      igPhotos.push(
        (await persistImageUrlForCloud(p)) || DEFAULT_SETTINGS.igPhotos[i] || DEFAULT_SETTINGS.igPhotos[0]
      );
    }

    const updated: SiteSettings = {
      logoUrl: (await persistImageUrlForCloud(rawUpdated.logoUrl)) || DEFAULT_SETTINGS.logoUrl,
      heroBanner:
        (await persistImageUrlForCloud(rawUpdated.heroBanner)) || DEFAULT_SETTINGS.heroBanner,
      heroCoords:
        (await persistImageUrlForCloud(rawUpdated.heroCoords)) || DEFAULT_SETTINGS.heroCoords,
      heroEthnic:
        (await persistImageUrlForCloud(rawUpdated.heroEthnic)) || DEFAULT_SETTINGS.heroEthnic,
      brandStory:
        (await persistImageUrlForCloud(rawUpdated.brandStory)) || DEFAULT_SETTINGS.brandStory,
      igPhotos: igPhotos.length > 0 ? igPhotos : DEFAULT_SETTINGS.igPhotos,
    };

    const dbReady = await ensureSettingsTable();
    if (dbReady && prisma) {
      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "SiteSetting" ("id", "data", "updatedAt")
           VALUES ('site_branding', $1::jsonb, CURRENT_TIMESTAMP)
           ON CONFLICT ("id") DO UPDATE SET "data" = $1::jsonb, "updatedAt" = CURRENT_TIMESTAMP`,
          JSON.stringify(updated)
        );
      } catch (dbErr) {
        console.warn('Database settings write notice:', dbErr);
      }
    }

    saveLocalSettings(updated);

    return NextResponse.json({
      success: true,
      settings: updated,
      message: 'Site branding and images updated successfully',
    });
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
