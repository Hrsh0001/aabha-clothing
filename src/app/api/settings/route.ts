import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../../lib/db';
import { isAuthorizedAdmin } from '../../../lib/auth-guard';
import { persistImageUrlForCloud } from '../../../lib/image-store';

export interface SiteSettings {
  logoUrl: string;
  heroBanner: string;
  heroBannerMobile?: string;
  heroCoords: string;
  heroCoordsMobile?: string;
  heroEthnic: string;
  heroEthnicMobile?: string;
  whatsappNumber?: string;
  supportEmail?: string;
  supportPhone?: string;
  instagramUrl?: string;
  instagramHandle?: string;
  storeAddress?: string;
  storeHours?: string;
  brandStory: string;
  igPhotos: string[];
  announcementText?: string;
  heroSlide1Eyebrow?: string;
  heroSlide1Heading?: string;
  heroSlide1Subheading?: string;
  heroSlide2Eyebrow?: string;
  heroSlide2Heading?: string;
  heroSlide2Subheading?: string;
  heroSlide3Eyebrow?: string;
  heroSlide3Heading?: string;
  heroSlide3Subheading?: string;
  brandStoryTitle?: string;
  brandStoryParagraph1?: string;
  brandStoryParagraph2?: string;
}

const DEFAULT_SETTINGS: SiteSettings = {
  logoUrl: '/logo.svg',
  heroBanner: '/images/hero_editorial_banner_1791119088652.jpg',
  heroBannerMobile: '',
  heroCoords: '/images/hero_slide_coords_1791228726563.jpg',
  heroCoordsMobile: '',
  heroEthnic: '/images/hero_slide_ethnic_1791228741882.jpg',
  heroEthnicMobile: '',
  whatsappNumber: '919876543210',
  supportEmail: 'care@aabhaclothing.com',
  supportPhone: '+91 98765 43210',
  instagramUrl: 'https://instagram.com/aabhaclothing',
  instagramHandle: '@aabhaclothing',
  storeAddress: 'AABHA Atelier, Mumbai, Maharashtra 400001',
  storeHours: 'Monday to Saturday · 10:00 AM – 7:00 PM IST',
  brandStory: '/images/brand_story_editorial_1791119191742.jpg',
  igPhotos: [
    '/images/product_kurta_ivory_1791119105107.jpg',
    '/images/product_kurtaset_sand_1791119136277.jpg',
    '/images/product_dress_ochre_1791119165890.jpg',
    '/images/product_coords_charcoal_1791119178003.jpg',
    '/images/product_kurta_olive_1791119121380.jpg',
    '/images/product_kurtaset_rosewood_1791119152298.jpg',
  ],
  announcementText: 'Complimentary express shipping across India on orders above ₹1,999 · Artisan Handcrafted',
  heroSlide1Eyebrow: 'INAUGURAL EDIT · HANDLOOM',
  heroSlide1Heading: 'EFFORTLESSLY INDIAN.',
  heroSlide1Subheading: 'Modern silhouettes. Timeless elegance.',
  heroSlide2Eyebrow: 'THE CO-ORD EDIT',
  heroSlide2Heading: 'MODERN. EFFORTLESS. YOURS.',
  heroSlide2Subheading: 'Contemporary silhouettes designed for everyday elegance.',
  heroSlide3Eyebrow: 'TIMELESS INDIAN',
  heroSlide3Heading: 'MADE FOR EVERY MOMENT.',
  heroSlide3Subheading: 'Refined Indian silhouettes for celebrations and everyday occasions.',
  brandStoryTitle: 'MADE FOR YOUR EVERYDAY ELEGANCE',
  brandStoryParagraph1: 'Born from a desire to move beyond heavy occasion-only ornamentation, AABHA reimagines Indian textile heritage for the rhythm of modern life. Our collection brings together panelled Anarkalis, three-piece Chanderi ensembles, tailored Khadi co-ord sets, and authentic hand-embroidered Chikankari.',
  brandStoryParagraph2: 'Every garment is tailored with French seams, deep concealed pockets, and soft cotton mulmul linings—silhouettes that feel as natural in morning light as they do at an intimate evening gathering.',
};

const SETTINGS_FILE_PATH = path.join(process.cwd(), 'data', 'settings.json');

// In-memory fallback cache for serverless environments where local filesystem is read-only
let inMemorySettingsCache: SiteSettings | null = null;

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
    if (prisma) {
      try {
        const row = await prisma.siteSetting.findUnique({
          where: { id: 'site_branding' },
        });
        if (row && row.data) {
          const parsed =
            typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
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
      heroBannerMobile: rawUpdated.heroBannerMobile
        ? (await persistImageUrlForCloud(rawUpdated.heroBannerMobile)) || rawUpdated.heroBannerMobile
        : '',
      heroCoords:
        (await persistImageUrlForCloud(rawUpdated.heroCoords)) || DEFAULT_SETTINGS.heroCoords,
      heroCoordsMobile: rawUpdated.heroCoordsMobile
        ? (await persistImageUrlForCloud(rawUpdated.heroCoordsMobile)) || rawUpdated.heroCoordsMobile
        : '',
      heroEthnic:
        (await persistImageUrlForCloud(rawUpdated.heroEthnic)) || DEFAULT_SETTINGS.heroEthnic,
      heroEthnicMobile: rawUpdated.heroEthnicMobile
        ? (await persistImageUrlForCloud(rawUpdated.heroEthnicMobile)) || rawUpdated.heroEthnicMobile
        : '',
      whatsappNumber:
        rawUpdated.whatsappNumber !== undefined
          ? rawUpdated.whatsappNumber
          : DEFAULT_SETTINGS.whatsappNumber,
      supportEmail:
        rawUpdated.supportEmail !== undefined
          ? rawUpdated.supportEmail
          : DEFAULT_SETTINGS.supportEmail,
      supportPhone:
        rawUpdated.supportPhone !== undefined
          ? rawUpdated.supportPhone
          : DEFAULT_SETTINGS.supportPhone,
      instagramUrl:
        rawUpdated.instagramUrl !== undefined
          ? rawUpdated.instagramUrl
          : DEFAULT_SETTINGS.instagramUrl,
      instagramHandle:
        rawUpdated.instagramHandle !== undefined
          ? rawUpdated.instagramHandle
          : DEFAULT_SETTINGS.instagramHandle,
      storeAddress:
        rawUpdated.storeAddress !== undefined
          ? rawUpdated.storeAddress
          : DEFAULT_SETTINGS.storeAddress,
      storeHours:
        rawUpdated.storeHours !== undefined
          ? rawUpdated.storeHours
          : DEFAULT_SETTINGS.storeHours,
      brandStory:
        (await persistImageUrlForCloud(rawUpdated.brandStory)) || DEFAULT_SETTINGS.brandStory,
      igPhotos: igPhotos.length > 0 ? igPhotos : DEFAULT_SETTINGS.igPhotos,
      announcementText: rawUpdated.announcementText !== undefined ? rawUpdated.announcementText : DEFAULT_SETTINGS.announcementText,
      heroSlide1Eyebrow: rawUpdated.heroSlide1Eyebrow !== undefined ? rawUpdated.heroSlide1Eyebrow : DEFAULT_SETTINGS.heroSlide1Eyebrow,
      heroSlide1Heading: rawUpdated.heroSlide1Heading !== undefined ? rawUpdated.heroSlide1Heading : DEFAULT_SETTINGS.heroSlide1Heading,
      heroSlide1Subheading: rawUpdated.heroSlide1Subheading !== undefined ? rawUpdated.heroSlide1Subheading : DEFAULT_SETTINGS.heroSlide1Subheading,
      heroSlide2Eyebrow: rawUpdated.heroSlide2Eyebrow !== undefined ? rawUpdated.heroSlide2Eyebrow : DEFAULT_SETTINGS.heroSlide2Eyebrow,
      heroSlide2Heading: rawUpdated.heroSlide2Heading !== undefined ? rawUpdated.heroSlide2Heading : DEFAULT_SETTINGS.heroSlide2Heading,
      heroSlide2Subheading: rawUpdated.heroSlide2Subheading !== undefined ? rawUpdated.heroSlide2Subheading : DEFAULT_SETTINGS.heroSlide2Subheading,
      heroSlide3Eyebrow: rawUpdated.heroSlide3Eyebrow !== undefined ? rawUpdated.heroSlide3Eyebrow : DEFAULT_SETTINGS.heroSlide3Eyebrow,
      heroSlide3Heading: rawUpdated.heroSlide3Heading !== undefined ? rawUpdated.heroSlide3Heading : DEFAULT_SETTINGS.heroSlide3Heading,
      heroSlide3Subheading: rawUpdated.heroSlide3Subheading !== undefined ? rawUpdated.heroSlide3Subheading : DEFAULT_SETTINGS.heroSlide3Subheading,
      brandStoryTitle: rawUpdated.brandStoryTitle !== undefined ? rawUpdated.brandStoryTitle : DEFAULT_SETTINGS.brandStoryTitle,
      brandStoryParagraph1: rawUpdated.brandStoryParagraph1 !== undefined ? rawUpdated.brandStoryParagraph1 : DEFAULT_SETTINGS.brandStoryParagraph1,
      brandStoryParagraph2: rawUpdated.brandStoryParagraph2 !== undefined ? rawUpdated.brandStoryParagraph2 : DEFAULT_SETTINGS.brandStoryParagraph2,
    };

    if (prisma) {
      try {
        await prisma.siteSetting.upsert({
          where: { id: 'site_branding' },
          update: { data: updated as any },
          create: { id: 'site_branding', data: updated as any },
        });
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
