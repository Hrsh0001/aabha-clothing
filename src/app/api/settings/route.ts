import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isAuthorizedAdmin } from '../../../lib/auth-guard';

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

function ensureSettingsFile(): void {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(SETTINGS_FILE_PATH)) {
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
  }
}

function readSettings(): SiteSettings {
  try {
    ensureSettingsFile();
    const data = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch (err) {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: SiteSettings): void {
  ensureSettingsFile();
  fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}

// GET /api/settings — Fetch active branding & section images
export async function GET() {
  const settings = readSettings();
  return NextResponse.json({ success: true, settings });
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
    const current = readSettings();
    const updated: SiteSettings = {
      ...current,
      ...body,
    };
    saveSettings(updated);

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
