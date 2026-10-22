import fs from 'fs';
import path from 'path';

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

  // 2. Hero Carousel Slides (1, 2, 3)
  heroSlide1Eyebrow?: string;
  heroSlide1Heading?: string;
  heroSlide1Subheading?: string;
  heroSlide1ButtonLabel?: string;
  heroSlide1TargetCategory?: string;

  heroSlide2Eyebrow?: string;
  heroSlide2Heading?: string;
  heroSlide2Subheading?: string;
  heroSlide2ButtonLabel?: string;
  heroSlide2TargetCategory?: string;

  heroSlide3Eyebrow?: string;
  heroSlide3Heading?: string;
  heroSlide3Subheading?: string;
  heroSlide3ButtonLabel?: string;
  heroSlide3TargetCategory?: string;

  // 3. Shop By Category Section
  categorySectionEyebrow?: string;
  categorySectionHeading?: string;
  categorySectionSubheading?: string;
  categoryTaglines?: Record<string, string>;
  categoryImages?: Record<string, string>;

  // 4. New Arrivals Section
  newArrivalsEyebrow?: string;
  newArrivalsHeading?: string;
  newArrivalsSubheading?: string;

  // 5. Brand Story Section
  brandStoryEyebrow?: string;
  brandStoryTitle?: string;
  brandStoryParagraph1?: string;
  brandStoryParagraph2?: string;
  brandStoryButtonText?: string;
  brandStoryButtonLink?: string;

  // 6. Curated Collection / Spotlight Section
  curatedEyebrow?: string;
  curatedHeading?: string;
  curatedSubheading?: string;

  // 7. Heritage & Trust Badges (4 Pillars)
  trustBadge1Title?: string;
  trustBadge1Subtitle?: string;
  trustBadge2Title?: string;
  trustBadge2Subtitle?: string;
  trustBadge3Title?: string;
  trustBadge3Subtitle?: string;
  trustBadge4Title?: string;
  trustBadge4Subtitle?: string;

  // 8. Instagram Feed Section
  igSectionEyebrow?: string;
  igSectionHeading?: string;
  igSectionSubheading?: string;

  // 10. About Page Content
  aboutHeroHeading?: string;
  aboutHeroLead?: string;
  aboutFoundationalTitle?: string;
  aboutFoundationalBody?: string;

  // Section Visibility / Add & Remove Flags
  showAnnouncementBar?: boolean;
  showHeroCarousel?: boolean;
  showCategorySection?: boolean;
  showNewArrivals?: boolean;
  showBrandStory?: boolean;
  showCuratedSection?: boolean;
  showTrustBadges?: boolean;
  showInstagramSection?: boolean;
  showFooterNewsletter?: boolean;
  showAboutHero?: boolean;
  showAboutFoundational?: boolean;
  showContactChannels?: boolean;
  showContactForm?: boolean;
  showProductReviews?: boolean;
  showRelatedProducts?: boolean;
  showPinCodeChecker?: boolean;
  showShopHeader?: boolean;
  showShopFilters?: boolean;

  // 11. High-Impact Conversion & Trust Features
  showSizeRecommender?: boolean;
  sizeRecommenderNote?: string;
  showWhatsAppDirectOrder?: boolean;
  whatsAppOrderButtonText?: string;
  showRecentlyViewed?: boolean;
  recentlyViewedTitle?: string;
  showCodTrustGuarantee?: boolean;
  codTrustPillar1Title?: string;
  codTrustPillar1Desc?: string;
  codTrustPillar2Title?: string;
  codTrustPillar2Desc?: string;
  codTrustPillar3Title?: string;
  codTrustPillar3Desc?: string;
  showOrderSelfService?: boolean;
}

export const DEFAULT_SETTINGS: SiteSettings = {
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

  // 2. Hero Carousel Slides
  heroSlide1Eyebrow: 'INAUGURAL EDIT · HANDLOOM',
  heroSlide1Heading: 'EFFORTLESSLY INDIAN.',
  heroSlide1Subheading: 'Modern silhouettes. Timeless elegance.',
  heroSlide1ButtonLabel: 'SHOP THE COLLECTION',
  heroSlide1TargetCategory: 'All Collection',

  heroSlide2Eyebrow: 'THE CO-ORD EDIT',
  heroSlide2Heading: 'MODERN. EFFORTLESS. YOURS.',
  heroSlide2Subheading: 'Contemporary silhouettes designed for everyday elegance.',
  heroSlide2ButtonLabel: 'SHOP CO-ORDS',
  heroSlide2TargetCategory: 'Co-ord Sets',

  heroSlide3Eyebrow: 'TIMELESS INDIAN',
  heroSlide3Heading: 'MADE FOR EVERY MOMENT.',
  heroSlide3Subheading: 'Refined Indian silhouettes for celebrations and everyday occasions.',
  heroSlide3ButtonLabel: 'EXPLORE THE COLLECTION',
  heroSlide3TargetCategory: 'All Collection',

  // 3. Shop By Category
  categorySectionEyebrow: 'THE LAUNCH SILHOUETTES',
  categorySectionHeading: 'Shop By Category',
  categorySectionSubheading: 'Fluid silhouettes tailored for effortless elegance',
  categoryTaglines: {
    Anarkali: 'Fluid kalidar silhouettes in Chanderi & silk',
    '3-Piece Dresses': 'Complete ensembles with mulmul dupatta',
    'Co-ord Sets': 'Tailored twin-sets for modern refinement',
    'Chikankari Suit': 'Intricate tone-on-tone artisanal needlework',
  },
  categoryImages: {},

  // 4. New Arrivals
  newArrivalsEyebrow: 'INAUGURAL RELEASE',
  newArrivalsHeading: 'New Arrivals',
  newArrivalsSubheading: 'Handcrafted in limited quantities with artisanal attention.',

  // 5. Brand Story
  brandStoryEyebrow: 'OUR ESSENCE',
  brandStoryTitle: 'MADE FOR YOUR EVERYDAY ELEGANCE',
  brandStoryParagraph1: 'Born from a desire to move beyond heavy occasion-only ornamentation, AABHA reimagines Indian textile heritage for the rhythm of modern life. Our collection brings together panelled Anarkalis, three-piece Chanderi ensembles, tailored Khadi co-ord sets, and authentic hand-embroidered Chikankari.',
  brandStoryParagraph2: 'Every garment is tailored with French seams, deep concealed pockets, and soft cotton mulmul linings—silhouettes that feel as natural in morning light as they do at an intimate evening gathering.',
  brandStoryButtonText: 'Discover Our Craft',
  brandStoryButtonLink: 'about',

  // 6. Curated Collection / Spotlight
  curatedEyebrow: 'THE CURATED COLLECTION',
  curatedHeading: 'Artisanal Grace, Tailored For Life',
  curatedSubheading: 'Each piece reflects our commitment to preserving heritage weaving techniques through modern, wearable design.',

  // 7. Heritage & Trust Badges (4 Pillars)
  trustBadge1Title: 'Artisan Handcrafted',
  trustBadge1Subtitle: 'Complimentary insured express delivery across all Indian PIN codes.',
  trustBadge2Title: 'French Seams & Mulmul Lining',
  trustBadge2Subtitle: '14-day complimentary doorstep return and size exchange.',
  trustBadge3Title: 'Complimentary Express Delivery & COD',
  trustBadge3Subtitle: 'Zero advance payment. Pay conveniently via cash or UPI upon delivery.',
  trustBadge4Title: 'Dedicated Atelier Concierge',
  trustBadge4Subtitle: 'Crafted in India with authentic handloom textiles and artisanal tailoring.',

  // 8. Instagram Feed Section
  igSectionEyebrow: 'MOMENTS IN AABHA',
  igSectionHeading: 'The Living Atelier',
  igSectionSubheading: 'Follow our story on Instagram',

  // 10. About Page Content
  aboutHeroHeading: 'Quiet Indian Luxury, Woven for the Everyday Hour.',
  aboutHeroLead: 'AABHA was founded with a singular conviction: Indian textiles do not belong locked inside occasion trunks. Handwoven Chanderi silk, breathable linen, kora cotton, and fine khadi deserve to be inhabited every single day—cut with architectural clarity, deep pockets, and unhurried grace.',
  aboutFoundationalTitle: 'Handcrafted Foundational Silhouettes.',
  aboutFoundationalBody: 'Instead of producing hundreds of fleeting styles each month, our curated edition consists of thoughtfully tailored garments across our foundational categories: Anarkalis, Three-Piece Dresses, Contemporary Co-ord Sets, and Authentic Chikankari.',

  // Section Visibility Defaults (all true by default)
  showAnnouncementBar: true,
  showHeroCarousel: true,
  showCategorySection: true,
  showNewArrivals: true,
  showBrandStory: true,
  showCuratedSection: true,
  showTrustBadges: true,
  showInstagramSection: true,
  showFooterNewsletter: true,
  showAboutHero: true,
  showAboutFoundational: true,
  showContactChannels: true,
  showContactForm: true,
  showProductReviews: true,
  showRelatedProducts: true,
  showPinCodeChecker: true,
  showShopHeader: true,
  showShopFilters: true,

  // 11. Conversion Features Defaults
  showSizeRecommender: true,
  sizeRecommenderNote: 'Tailored with 2.5″ comfortable ease for effortless all-day wear.',
  showWhatsAppDirectOrder: true,
  whatsAppOrderButtonText: 'Quick Order on WhatsApp',
  showRecentlyViewed: true,
  recentlyViewedTitle: 'Recently Viewed Silhouettes',
  showCodTrustGuarantee: true,
  codTrustPillar1Title: 'Zero Advance Payment',
  codTrustPillar1Desc: 'Pay only when your parcel arrives safely at your doorstep.',
  codTrustPillar2Title: 'Doorstep Cash or UPI',
  codTrustPillar2Desc: 'Pay courier conveniently via Cash, GPay, PhonePe, or Paytm.',
  codTrustPillar3Title: '14-Day Free Exchange',
  codTrustPillar3Desc: 'Doorstep size replacement or exchange if fit needs adjusting.',
  showOrderSelfService: true,
};

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
      inMemorySettingsCache = { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
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
