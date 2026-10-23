import fs from 'fs';
import path from 'path';
import {
  SiteSettings,
  DEFAULT_SETTINGS,
  DEFAULT_NAV_LINKS,
  DEFAULT_FOOTER_COLUMNS,
  DEFAULT_CUSTOM_PAGES,
} from './site-settings';

export const SETTINGS_FILE_PATH = path.join(process.cwd(), 'data', 'settings.json');

// In-memory fallback cache for serverless environments where local filesystem is read-only
let inMemorySettingsCache: SiteSettings | null = null;

export function ensureSettingsFile(): void {
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

export function readLocalSettings(): SiteSettings {
  if (inMemorySettingsCache) {
    return inMemorySettingsCache;
  }
  try {
    ensureSettingsFile();
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const data = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      inMemorySettingsCache = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        navLinks: Array.isArray(parsed.navLinks)
          ? parsed.navLinks
          : DEFAULT_NAV_LINKS,
        footerColumns: Array.isArray(parsed.footerColumns)
          ? parsed.footerColumns
          : DEFAULT_FOOTER_COLUMNS,
        customPages: Array.isArray(parsed.customPages)
          ? parsed.customPages
          : DEFAULT_CUSTOM_PAGES,
      };
      return inMemorySettingsCache;
    }
    return DEFAULT_SETTINGS;
  } catch {
    return inMemorySettingsCache || DEFAULT_SETTINGS;
  }
}

export function saveLocalSettings(settings: SiteSettings): void {
  inMemorySettingsCache = settings;
  try {
    ensureSettingsFile();
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), 'utf-8');
  } catch {
    // Kept in memory cache on serverless
  }
}

export function resetSettingsForTesting(): void {
  inMemorySettingsCache = { ...DEFAULT_SETTINGS };
  try {
    ensureSettingsFile();
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
  } catch {
    // Kept in memory cache on serverless
  }
}
