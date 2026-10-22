import 'dotenv/config';
import { describe, test, expect, beforeAll, afterAll } from './jest-lite';
import * as SettingsAPI from '../src/app/api/settings/route';
import { resetSettingsForTesting } from '../src/lib/site-settings';
import { signJwt } from '../src/lib/jwt';
import { validateBrandingForm } from '../src/lib/form-validation';

const adminToken = signJwt({
  sub: 'admin_test_runner',
  role: 'admin',
  name: 'AABHA Test Admin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
});

const adminAuthHeaders = {
  Authorization: `Bearer ${adminToken}`,
};

function createJsonRequest(
  url: string,
  method: string,
  body?: unknown,
  headers: Record<string, string> = {}
): Request {
  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

describe('Storefront Sections & Dynamic Content Management', () => {
  beforeAll(() => {
    resetSettingsForTesting();
  });

  afterAll(() => {
    resetSettingsForTesting();
  });

  test('GET /api/settings returns all 10 dynamic sections with expected default text and visibility flags', async () => {
    const res = await SettingsAPI.GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    const s = data.settings;

    // 1. Announcement Bar
    expect(s.announcementText).toBeDefined();
    expect(s.showAnnouncementBar).toBe(true);

    // 2. Hero Carousel Slides
    expect(s.heroSlide1Eyebrow).toBe('INAUGURAL EDIT · HANDLOOM');
    expect(s.heroSlide1Heading).toBe('EFFORTLESSLY INDIAN.');
    expect(s.heroSlide1ButtonLabel).toBe('SHOP THE COLLECTION');
    expect(s.heroSlide1TargetCategory).toBe('All Collection');
    expect(s.heroSlide2Heading).toBe('MODERN. EFFORTLESS. YOURS.');
    expect(s.heroSlide3Heading).toBe('MADE FOR EVERY MOMENT.');
    expect(s.showHeroCarousel).toBe(true);

    // 3. Shop By Category
    expect(s.categorySectionEyebrow).toBe('THE LAUNCH SILHOUETTES');
    expect(s.categorySectionHeading).toBe('Shop By Category');
    expect(s.categorySectionSubheading).toBeDefined();
    expect(s.showCategorySection).toBe(true);
    expect(s.categoryTaglines).toBeDefined();

    // 4. New Arrivals
    expect(s.newArrivalsEyebrow).toBe('INAUGURAL RELEASE');
    expect(s.newArrivalsHeading).toBe('New Arrivals');
    expect(s.showNewArrivals).toBe(true);

    // 5. Brand Story
    expect(s.brandStoryEyebrow).toBe('OUR ESSENCE');
    expect(s.brandStoryTitle).toBe('MADE FOR YOUR EVERYDAY ELEGANCE');
    expect(s.brandStoryParagraph1).toBeDefined();
    expect(s.brandStoryButtonText).toBe('Discover Our Craft');
    expect(s.showBrandStory).toBe(true);

    // 6. Curated Collection
    expect(s.curatedEyebrow).toBe('THE CURATED COLLECTION');
    expect(s.curatedHeading).toBe('Artisanal Grace, Tailored For Life');
    expect(s.showCuratedSection).toBe(true);

    // 7. Heritage & Trust Badges
    expect(s.trustBadge1Title).toBe('Artisan Handcrafted');
    expect(s.trustBadge2Title).toBe('French Seams & Mulmul Lining');
    expect(s.trustBadge3Title).toBe('Complimentary Express Delivery & COD');
    expect(s.trustBadge4Title).toBe('Dedicated Atelier Concierge');
    expect(s.showTrustBadges).toBe(true);

    // 8. Instagram Feed Section
    expect(s.igSectionEyebrow).toBe('MOMENTS IN AABHA');
    expect(s.igSectionHeading).toBe('The Living Atelier');
    expect(s.showInstagramSection).toBe(true);
    expect(s.igPhotos.length).toBe(6);

    // 9. Store Concierge & Contact
    expect(s.whatsappNumber).toBe('919876543210');
    expect(s.supportEmail).toBe('care@aabhaclothing.com');
    expect(s.supportPhone).toBeDefined();
    expect(s.instagramUrl).toBeDefined();
    expect(s.storeAddress).toBeDefined();
    expect(s.storeHours).toBeDefined();

    // 10. About Page Content
    expect(s.aboutHeroHeading).toBe('Quiet Indian Luxury, Woven for the Everyday Hour.');
    expect(s.aboutFoundationalTitle).toBe('Handcrafted Foundational Silhouettes.');
    expect(s.showAboutHero).toBe(true);
    expect(s.showAboutFoundational).toBe(true);
    expect(s.showContactChannels).toBe(true);
    expect(s.showContactForm).toBe(true);
    expect(s.showFooterNewsletter).toBe(true);
    expect(s.showProductReviews).toBe(true);
    expect(s.showRelatedProducts).toBe(true);
    expect(s.showPinCodeChecker).toBe(true);
    expect(s.showShopHeader).toBe(true);
    expect(s.showShopFilters).toBe(true);

    // 11. High-Impact Conversion & COD Trust Features
    expect(s.showSizeRecommender).toBe(true);
    expect(s.sizeRecommenderNote).toBe('Tailored with 2.5″ comfortable ease for effortless all-day wear.');
    expect(s.showWhatsAppDirectOrder).toBe(true);
    expect(s.whatsAppOrderButtonText).toBe('Quick Order on WhatsApp');
    expect(s.showRecentlyViewed).toBe(true);
    expect(s.recentlyViewedTitle).toBe('Recently Viewed Silhouettes');
    expect(s.showCodTrustGuarantee).toBe(true);
    expect(s.codTrustPillar1Title).toBe('Zero Advance Payment');
    expect(s.codTrustPillar2Title).toBe('Doorstep Cash or UPI');
    expect(s.codTrustPillar3Title).toBe('14-Day Free Exchange');
    expect(s.showOrderSelfService).toBe(true);
  });

  test('POST /api/settings allows admin to customize any section and toggle add/remove visibility flags', async () => {
    // 1. Get current settings
    const getRes = await SettingsAPI.GET();
    const { settings: currentSettings } = await getRes.json();

    // 2. Modify sections and toggle visibility
    const updatedPayload = {
      ...currentSettings,
      announcementText: 'Festive Preview — Complimentary Express Delivery',
      showAnnouncementBar: false, // removed from storefront
      heroSlide1Heading: 'ELEGANCE REDEFINED.',
      heroSlide1ButtonLabel: 'EXPLORE ANARKALIS',
      heroSlide1TargetCategory: 'Anarkali',
      showHeroCarousel: false, // removed hero carousel
      categorySectionHeading: 'Curated Silhouettes',
      categoryTaglines: {
        ...currentSettings.categoryTaglines,
        Anarkali: 'Signature 16-panel handloom Kalidars',
      },
      newArrivalsHeading: 'Fresh Autumn Palette',
      brandStoryTitle: 'THE ART OF SILENT LUXURY',
      brandStoryButtonText: 'Explore Atelier',
      curatedHeading: 'Masterpiece Ensembles',
      trustBadge1Title: '100% Handcrafted Mulberry Silk',
      showTrustBadges: false, // removed trust badges
      aboutHeroHeading: 'Handcrafted Heritage Tailoring',
      showAboutHero: false,
      showContactChannels: false,
      showContactForm: false,
      categoryImages: {
        Anarkali: '/images/custom_anarkali_launch.jpg',
      },
      // 11. Customizing conversion & trust features
      showSizeRecommender: false,
      sizeRecommenderNote: 'Designed with extra relaxed royal drape.',
      showWhatsAppDirectOrder: false,
      whatsAppOrderButtonText: 'Direct Order on Concierge WhatsApp',
      showRecentlyViewed: false,
      recentlyViewedTitle: 'Previously Explored Ensembles',
      showCodTrustGuarantee: false,
      codTrustPillar1Title: 'Doorstep Verification & Payment',
      showOrderSelfService: false,
    };

    const postReq = createJsonRequest(
      'http://localhost:3000/api/settings',
      'POST',
      updatedPayload,
      adminAuthHeaders
    );
    const postRes = await SettingsAPI.POST(postReq);
    const postData = await postRes.json();

    expect(postRes.status).toBe(200);
    expect(postData.success).toBe(true);
    expect(postData.settings.announcementText).toBe('Festive Preview — Complimentary Express Delivery');
    expect(postData.settings.showAnnouncementBar).toBe(false);
    expect(postData.settings.showHeroCarousel).toBe(false);
    expect(postData.settings.heroSlide1Heading).toBe('ELEGANCE REDEFINED.');
    expect(postData.settings.heroSlide1ButtonLabel).toBe('EXPLORE ANARKALIS');
    expect(postData.settings.heroSlide1TargetCategory).toBe('Anarkali');
    expect(postData.settings.categorySectionHeading).toBe('Curated Silhouettes');
    expect(postData.settings.categoryTaglines.Anarkali).toBe('Signature 16-panel handloom Kalidars');
    expect(postData.settings.categoryImages.Anarkali).toBe('/images/custom_anarkali_launch.jpg');
    expect(postData.settings.newArrivalsHeading).toBe('Fresh Autumn Palette');
    expect(postData.settings.brandStoryTitle).toBe('THE ART OF SILENT LUXURY');
    expect(postData.settings.brandStoryButtonText).toBe('Explore Atelier');
    expect(postData.settings.curatedHeading).toBe('Masterpiece Ensembles');
    expect(postData.settings.trustBadge1Title).toBe('100% Handcrafted Mulberry Silk');
    expect(postData.settings.showTrustBadges).toBe(false);
    expect(postData.settings.aboutHeroHeading).toBe('Handcrafted Heritage Tailoring');
    expect(postData.settings.showAboutHero).toBe(false);
    expect(postData.settings.showContactChannels).toBe(false);
    expect(postData.settings.showContactForm).toBe(false);
    expect(postData.settings.showSizeRecommender).toBe(false);
    expect(postData.settings.sizeRecommenderNote).toBe('Designed with extra relaxed royal drape.');
    expect(postData.settings.showWhatsAppDirectOrder).toBe(false);
    expect(postData.settings.whatsAppOrderButtonText).toBe('Direct Order on Concierge WhatsApp');
    expect(postData.settings.showRecentlyViewed).toBe(false);
    expect(postData.settings.recentlyViewedTitle).toBe('Previously Explored Ensembles');
    expect(postData.settings.showCodTrustGuarantee).toBe(false);
    expect(postData.settings.codTrustPillar1Title).toBe('Doorstep Verification & Payment');
    expect(postData.settings.showOrderSelfService).toBe(false);

    // 3. Test restoring / adding back sections
    const restorePayload = {
      ...postData.settings,
      showAnnouncementBar: true,
      showHeroCarousel: true,
      showTrustBadges: true,
      showAboutHero: true,
      showContactChannels: true,
      showContactForm: true,
      showSizeRecommender: true,
      showWhatsAppDirectOrder: true,
      showRecentlyViewed: true,
      showCodTrustGuarantee: true,
      showOrderSelfService: true,
    };

    const restoreReq = createJsonRequest(
      'http://localhost:3000/api/settings',
      'POST',
      restorePayload,
      adminAuthHeaders
    );
    const restoreRes = await SettingsAPI.POST(restoreReq);
    const restoreData = await restoreRes.json();

    expect(restoreRes.status).toBe(200);
    expect(restoreData.settings.showAnnouncementBar).toBe(true);
    expect(restoreData.settings.showHeroCarousel).toBe(true);
    expect(restoreData.settings.showTrustBadges).toBe(true);
    expect(restoreData.settings.showAboutHero).toBe(true);
    expect(restoreData.settings.showContactChannels).toBe(true);
    expect(restoreData.settings.showContactForm).toBe(true);
    expect(restoreData.settings.showSizeRecommender).toBe(true);
    expect(restoreData.settings.showWhatsAppDirectOrder).toBe(true);
    expect(restoreData.settings.showRecentlyViewed).toBe(true);
    expect(restoreData.settings.showCodTrustGuarantee).toBe(true);
    expect(restoreData.settings.showOrderSelfService).toBe(true);

    resetSettingsForTesting();
  });

  test('validateBrandingForm correctly validates required branding media and allows custom section metadata', () => {
    const valid = validateBrandingForm({
      logoUrl: '/logo.svg',
      heroBanner: '/images/hero.jpg',
      heroCoords: '/images/coords.jpg',
      heroEthnic: '/images/ethnic.jpg',
      brandStory: '/images/story.jpg',
      igPhotos: ['/images/ig1.jpg', '/images/ig2.jpg'],
    });
    expect(valid.isValid).toBe(true);

    const invalid = validateBrandingForm({
      logoUrl: '',
      heroBanner: '',
      heroCoords: '',
      heroEthnic: '',
      brandStory: '',
      igPhotos: [],
    });
    expect(invalid.isValid).toBe(false);
    expect(invalid.errors.logoUrl).toBeDefined();
    expect(invalid.errors.heroBanner).toBeDefined();
    expect(invalid.errors.igPhotos).toBeDefined();
  });

  test('POST /api/settings safely merges partial updates without wiping other sections', async () => {
    const partialReq = createJsonRequest(
      'http://localhost:3000/api/settings',
      'POST',
      {
        heroSlide1Heading: 'CONTEMPORARY HERITAGE',
      },
      adminAuthHeaders
    );
    const res = await SettingsAPI.POST(partialReq);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.settings.heroSlide1Heading).toBe('CONTEMPORARY HERITAGE');
    // Ensure untouched fields remain populated with defaults
    expect(data.settings.showHeroCarousel).toBe(true);
    expect(data.settings.categorySectionHeading).toBe('Shop By Category');
    expect(data.settings.trustBadge1Title).toBe('Artisan Handcrafted');

    resetSettingsForTesting();
  });
});
