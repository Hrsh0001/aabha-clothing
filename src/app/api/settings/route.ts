import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { isAuthorizedAdmin } from '../../../lib/auth-guard';
import { persistImageUrlForCloud } from '../../../lib/image-store';
import {
  type SiteSettings,
  DEFAULT_SETTINGS,
} from '../../../lib/site-settings';
import {
  readLocalSettings,
  saveLocalSettings,
} from '../../../lib/site-settings-server';

export type { SiteSettings };

// GET /api/settings — Fetch active branding & section images
export async function GET() {
  try {
    if ((process.env.NODE_ENV as string) !== 'test' && prisma) {
      try {
        const row = await prisma.siteSetting.findUnique({
          where: { id: 'site_branding' },
        });
        if (row && row.data) {
          const parsed =
            typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
          const merged: SiteSettings = { ...DEFAULT_SETTINGS, ...parsed };
          saveLocalSettings(merged);
          return NextResponse.json(
            { success: true, settings: merged },
            { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
          );
        }
      } catch (dbErr) {
        if ((process.env.NODE_ENV as string) !== 'test') {
          console.warn('Database settings read notice:', dbErr);
        }
      }
    }

    const settings = readLocalSettings();
    return NextResponse.json(
      { success: true, settings },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    );
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
    let current = readLocalSettings();
    if ((process.env.NODE_ENV as string) !== 'test' && prisma) {
      try {
        const row = await prisma.siteSetting.findUnique({
          where: { id: 'site_branding' },
        });
        if (row && row.data) {
          const parsed =
            typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
          current = { ...DEFAULT_SETTINGS, ...parsed };
        }
      } catch (dbErr) {
        if ((process.env.NODE_ENV as string) !== 'test') {
          console.warn('Database settings read notice in POST:', dbErr);
        }
      }
    }

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

    // Persist any uploaded custom category cover photos to cloud/db storage
    const categoryImages: Record<string, string> = {};
    if (rawUpdated.categoryImages && typeof rawUpdated.categoryImages === 'object') {
      for (const [key, val] of Object.entries(rawUpdated.categoryImages)) {
        if (typeof val === 'string' && val.trim()) {
          categoryImages[key] = (await persistImageUrlForCloud(val)) || val;
        }
      }
    }

    const updated: SiteSettings = {
      ...DEFAULT_SETTINGS,
      ...rawUpdated,
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
      categoryImages:
        Object.keys(categoryImages).length > 0 ? categoryImages : (rawUpdated.categoryImages || {}),
    };

    if ((process.env.NODE_ENV as string) !== 'test' && prisma) {
      try {
        await prisma.siteSetting.upsert({
          where: { id: 'site_branding' },
          update: { data: updated as any },
          create: { id: 'site_branding', data: updated as any },
        });
      } catch (dbErr) {
        if ((process.env.NODE_ENV as string) !== 'test') {
          console.warn('Database settings write notice:', dbErr);
        }
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
