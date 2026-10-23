export interface NavLinkItem {
  id: string;
  label: string;
  href: string;
  visible?: boolean;
  openInNewTab?: boolean;
}

export interface FooterLinkItem {
  id: string;
  label: string;
  href: string;
  visible?: boolean;
  openInNewTab?: boolean;
}

export interface FooterColumn {
  id: string;
  title: string;
  visible?: boolean;
  links: FooterLinkItem[];
}

export interface PageSectionItem {
  id: string;
  type: 'hero' | 'story' | 'products' | 'lookbook' | 'faq' | 'text' | 'banner';
  title?: string;
  subtitle?: string;
  content?: string;
  imageUrl?: string;
  mobileImageUrl?: string;
  buttonLabel?: string;
  buttonLink?: string;
  blurPx?: number;
  opacityPercent?: number;
  animationType?: 'fade' | 'slide' | 'zoom' | 'none';
  visible?: boolean;
}

export interface CustomPageItem {
  id: string;
  slug: string; // e.g. "our-craft", "care-guide", "festive-lookbook"
  title: string;
  subtitle?: string;
  heroImage?: string;
  heroImageMobile?: string;
  content: string;
  sections?: PageSectionItem[];
  published: boolean;
  metaTitle?: string;
  metaDescription?: string;
  createdAt?: string;
  updatedAt?: string;
}

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

  // Section Visibility / Add & Remove Flags & Sequence Order
  homeSectionsOrder?: string[];
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
  showBagDrawerWhatsAppOrder?: boolean;

  // 12. Visual Design, Media Sizing & Themes
  heroBannerHeight?: 'fullscreen' | 'standard' | 'compact';
  heroFocalAlignment?: 'top' | 'center' | 'bottom';
  heroOverlayOpacity?: number; // 0 to 90
  heroBannerBlur?: number; // 0 to 20 px
  heroBackdropBlur?: number; // 0 to 20 px
  headerOpacity?: number; // 50 to 100 %
  headerBlur?: number; // 0 to 24 px
  drawerBackdropBlur?: number; // 0 to 16 px
  drawerBackdropOpacity?: number; // 20 to 90 %
  enableGlassBlur?: boolean;
  glassBlurIntensity?: 'none' | 'subtle' | 'rich';
  storefrontBgTint?: string;
  storefrontAccentColor?: string;
  announcementBgColor?: string;
  announcementTextColor?: string;

  // 13. Animations & Performance
  enablePageAnimations?: boolean;
  enableHeroAutoplay?: boolean;
  heroAutoplayInterval?: number; // 3, 5, 7 seconds
  enableImageZoomOnHover?: boolean;
  animationTimingSpeed?: 'fast' | 'smooth' | 'cinematic';

  // 14. Shop Catalog & About Extended Fields
  shopHeaderTitle?: string;
  shopHeaderSubtitle?: string;
  showShopSort?: boolean;
  aboutFoundationalPhoto?: string;

  // 15. Header Navbar Links & Navigation Manager
  navLinks?: NavLinkItem[];

  // 16. Footer Columns & Link Navigation Manager
  footerColumns?: FooterColumn[];
  footerTagline?: string;
  footerCopyright?: string;

  // 17. Custom Dynamic Pages Manager (Add, Edit, Delete Pages)
  customPages?: CustomPageItem[];
}

export const DEFAULT_CUSTOM_PAGES: CustomPageItem[] = [
  {
    id: 'page-our-craft',
    slug: 'our-craft',
    title: 'The Artisanal Weaves of AABHA',
    subtitle: 'Preserving handloom craftsmanship across Rajasthan & Bengal',
    heroImage: '/images/brand_story_editorial_1791119191742.jpg',
    content:
      'Each garment at AABHA is conceived as a living homage to indigenous Indian textile art. From hand-spun Chanderi silk to delicate Mulmul cotton, our karigars spend weeks perfecting each silhouette.\n\nWe employ pure French seams, hand-rolled hems, and skin-friendly natural dyes so that every piece feels effortless against your skin from morning celebrations to midnight soirees.',
    published: true,
    metaTitle: 'Our Craft & Heritage | AABHA CLOTHING',
    metaDescription: 'Discover the artisanal craftsmanship and handloom heritage behind AABHA ethnic wear.',
    createdAt: '2026-01-01',
    updatedAt: '2026-10-22',
  },
  {
    id: 'page-garment-care',
    slug: 'garment-care',
    title: 'Garment Longevity & Mulmul Care Guide',
    subtitle: 'Nurturing your handloom ensembles for years of grace',
    heroImage: '/images/hero_slide_ethnic_1791228741882.jpg',
    content:
      'Natural fibers like Mulmul, Chanderi, and organza are delicate treasures. We recommend gentle hand-washing in cold water with mild organic detergent, or professional dry cleaning for embroidered and zari garments.\n\nAlways air dry in shade to preserve color brilliance, and iron inside out on a low-to-medium silk setting.',
    published: true,
    metaTitle: 'Garment Care & Longevity Guide | AABHA CLOTHING',
    metaDescription: 'Best practices for caring for your hand-spun Chanderi, Mulmul, and artisanal ensembles.',
    createdAt: '2026-01-01',
    updatedAt: '2026-10-22',
  },
];

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
  homeSectionsOrder: [
    'hero',
    'categories',
    'new_arrivals',
    'brand_story',
    'curated',
    'trust_badges',
    'instagram',
  ],
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
  showBagDrawerWhatsAppOrder: true,

  // 12. Visual Design, Media Sizing & Themes Defaults
  heroBannerHeight: 'standard',
  heroFocalAlignment: 'center',
  heroOverlayOpacity: 25,
  heroBannerBlur: 0,
  heroBackdropBlur: 0,
  headerOpacity: 95,
  headerBlur: 8,
  drawerBackdropBlur: 4,
  drawerBackdropOpacity: 60,
  enableGlassBlur: true,
  glassBlurIntensity: 'subtle',
  storefrontBgTint: '#FAF8F5',
  storefrontAccentColor: '#6E5043',
  announcementBgColor: '#231F1D',
  announcementTextColor: '#FAF8F5',

  // 13. Animations & Performance Defaults
  enablePageAnimations: true,
  enableHeroAutoplay: true,
  heroAutoplayInterval: 5,
  enableImageZoomOnHover: true,
  animationTimingSpeed: 'smooth',

  // 14. Shop Catalog & About Extended Defaults
  shopHeaderTitle: 'The Complete Collection',
  shopHeaderSubtitle: 'Artisan handlooms, airy Chanderi silks, and tailored silhouettes for everyday grace.',
  showShopSort: true,
  aboutFoundationalPhoto: '/images/brand_story_editorial_1791119191742.jpg',

  // 15. Header Navbar Links Defaults
  navLinks: [
    { id: 'nav-home', label: 'Home', href: '/', visible: true },
    { id: 'nav-new-arrivals', label: 'New Arrivals', href: '/#new-arrivals', visible: true },
    { id: 'nav-shop', label: 'All Collection', href: '/shop', visible: true },
    { id: 'nav-anarkali', label: 'Anarkali', href: '/shop?category=Anarkali', visible: true },
    { id: 'nav-3piece', label: '3-Piece Dresses', href: '/shop?category=3-Piece Dresses', visible: true },
    { id: 'nav-coord', label: 'Co-ord Sets', href: '/shop?category=Co-ord Sets', visible: true },
    { id: 'nav-chikankari', label: 'Chikankari Suit', href: '/shop?category=Chikankari Suit', visible: true },
    { id: 'nav-about', label: 'About', href: '/about', visible: true },
    { id: 'nav-contact', label: 'Contact', href: '/contact', visible: true },
    { id: 'nav-orders', label: 'Track Orders', href: '/my-orders', visible: true },
  ],

  // 16. Footer Columns & Navigation Defaults
  footerColumns: [
    {
      id: 'col-silhouettes',
      title: 'THE SILHOUETTES',
      visible: true,
      links: [
        { id: 'fl-all', label: 'All Collection', href: '/shop', visible: true },
        { id: 'fl-anarkali', label: 'Anarkali', href: '/shop?category=Anarkali', visible: true },
        { id: 'fl-3piece', label: '3-Piece Dresses', href: '/shop?category=3-Piece Dresses', visible: true },
        { id: 'fl-coord', label: 'Co-ord Sets', href: '/shop?category=Co-ord Sets', visible: true },
        { id: 'fl-chikankari', label: 'Chikankari Suit', href: '/shop?category=Chikankari Suit', visible: true },
      ],
    },
    {
      id: 'col-house',
      title: 'THE HOUSE',
      visible: true,
      links: [
        { id: 'fl-about', label: 'About Atelier', href: '/about', visible: true },
        { id: 'fl-contact', label: 'Contact Atelier', href: '/contact', visible: true },
        { id: 'fl-story', label: 'Brand Philosophy', href: '/#brand-story', visible: true },
        { id: 'fl-curated', label: 'Curated Signatures', href: '/#curated', visible: true },
        { id: 'fl-ig', label: 'Instagram Lookbook', href: 'https://instagram.com/aabhaclothing', visible: true, openInNewTab: true },
      ],
    },
    {
      id: 'col-care',
      title: 'CLIENT CARE',
      visible: true,
      links: [
        { id: 'fl-track', label: 'Track Orders & GST Bills', href: '/my-orders', visible: true },
        { id: 'fl-whatsapp', label: 'WhatsApp Concierge', href: 'whatsapp', visible: true },
        { id: 'fl-email', label: 'care@aabhaclothing.com', href: 'email', visible: true },
        { id: 'fl-shipping', label: 'Shipping Policy', href: '/policy?topic=shipping', visible: true },
        { id: 'fl-returns', label: '14-Day Exchanges & Returns', href: '/policy?topic=returns', visible: true },
        { id: 'fl-faq', label: 'FAQ', href: '/policy?topic=faq', visible: true },
        { id: 'fl-privacy', label: 'Privacy Policy', href: '/policy?topic=privacy', visible: true },
        { id: 'fl-terms', label: 'Terms & Conditions', href: '/policy?topic=terms', visible: true },
      ],
    },
  ],
  footerTagline: 'Premium Indian women’s ethnic wear crafted in small handloom batches with modern silhouettes and timeless elegance.',
  footerCopyright: '© 2026 AABHA CLOTHING. All rights reserved.',
  customPages: DEFAULT_CUSTOM_PAGES,
};

export const DEFAULT_NAV_LINKS: NavLinkItem[] = DEFAULT_SETTINGS.navLinks!;
export const DEFAULT_FOOTER_COLUMNS: FooterColumn[] = DEFAULT_SETTINGS.footerColumns!;

// Client-safe stubs (server environments import from site-settings-server.ts)
export function readLocalSettings(): SiteSettings {
  return DEFAULT_SETTINGS;
}

export function saveLocalSettings(_settings: SiteSettings): void {
  // Client no-op
}

export function resetSettingsForTesting(): void {
  // Client no-op
}
