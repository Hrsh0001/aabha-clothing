/**
 * AABHA CLOTHING — LAUNCH COLLECTION DATA (EXACTLY 17 PRODUCTS)
 * =============================================================
 * Brand Name: AABHA
 * Full Brand Identity: AABHA CLOTHING
 *
 * Collection Breakdown:
 * - Anarkali: 2 products (Anarkali 01 – Anarkali 02)
 * - 3-Piece Dresses: 5 products (Three-Piece Dress 01 – Three-Piece Dress 05)
 * - Co-ord Sets: 9 products (Co-ord Set 01 – Co-ord Set 09)
 * - Chikankari Suit: 1 product (Chikankari Suit 01)
 *
 * Edit the product names, prices, or image paths below when final SKU names are confirmed.
 */

export const BRAND_CONFIG = {
  name: 'AABHA',
  fullName: 'AABHA CLOTHING',
  category: "Premium Indian Women's Ethnic Wear",
  logoUrl: '/logo.svg',
  footerLogoUrl: '/logo.svg',
  instagramHandle: '@aabhaclothing',
};

export type ProductCategory =
  | 'Anarkali'
  | '3-Piece Dresses'
  | 'Co-ord Sets'
  | 'Chikankari Suit';

export type CollectionFilter = 'All Collection' | ProductCategory;

export type GarmentSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';

export interface ProductColorVariant {
  name: string;
  hex: string;
  imageUrl?: string;
  inStock?: boolean;
  stockQuantity?: number;
}

export interface SizeStockItem {
  inStock: boolean;
  quantity?: number;
}

export interface ProductGalleryItem {
  url: string;
  label: string;
  focalClass?: string;
}

export interface ProductReview {
  id: string;
  author: string;
  sizePurchased: GarmentSize;
  rating: number;
  date: string;
  title: string;
  comment: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  subtitle: string;
  category: ProductCategory;
  price: number;
  originalPrice?: number;
  colorName: string;
  colorHex: string;
  colors?: ProductColorVariant[];
  sizeStock?: Record<string, SizeStockItem>;
  fabric: string;
  isNewArrival: boolean;
  isCurated: boolean;
  inStock: boolean;
  sizes: GarmentSize[];
  primaryImage: string;
  secondaryImage: string;
  gallery: ProductGalleryItem[];
  description: string;
  highlights: string[];
  fabricAndCare: string[];
  sizeAndFit: string[];
  deliveryInfo: string;
  returnsInfo: string;
  reviews: ProductReview[];
}

/**
 * Returns a normalized size inventory map for a product, ensuring every size in product.sizes
 * has an explicit inStock flag and stock quantity.
 */
export function getProductSizeStock(product: Product): Record<string, SizeStockItem> {
  const result: Record<string, SizeStockItem> = {};
  const sizes = (product.sizes && product.sizes.length > 0)
    ? product.sizes
    : ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  sizes.forEach((s) => {
    if (product.sizeStock && product.sizeStock[s]) {
      result[s] = {
        inStock:
          typeof product.sizeStock[s].inStock === 'boolean'
            ? product.sizeStock[s].inStock && product.inStock
            : product.inStock,
        quantity:
          typeof product.sizeStock[s].quantity === 'number'
            ? product.sizeStock[s].quantity!
            : product.inStock
            ? 10
            : 0,
      };
    } else {
      result[s] = {
        inStock: product.inStock,
        quantity: product.inStock ? 10 : 0,
      };
    }
  });

  return result;
}

/**
 * Checks whether a specific size is available for purchase in a given product.
 */
export function isSizeInStock(product: Product, size: string): boolean {
  if (!product.inStock) return false;
  if (!product.sizeStock) return true;
  const item = product.sizeStock[size];
  if (!item) return true;
  return item.inStock !== false && (item.quantity === undefined || item.quantity > 0);
}

/**
 * Checks whether a specific color variant is in stock.
 */
export function isColorInStock(variant: ProductColorVariant | undefined, masterInStock: boolean): boolean {
  if (!masterInStock) return false;
  if (!variant) return true;
  return variant.inStock !== false && (variant.stockQuantity === undefined || variant.stockQuantity > 0);
}

export const EDITORIAL_ASSETS = {
  heroBanner: '/images/hero_editorial_banner_1791119088652.jpg',
  heroCoords: '/images/hero_slide_coords_1791228726563.jpg',
  heroEthnic: '/images/hero_slide_ethnic_1791228741882.jpg',
  brandStory: '/images/brand_story_editorial_1791119191742.jpg',
  kurtaIvory: '/images/product_kurta_ivory_1791119105107.jpg',
  kurtaOlive: '/images/product_kurta_olive_1791119121380.jpg',
  kurtaSetSand: '/images/product_kurtaset_sand_1791119136277.jpg',
  kurtaSetRosewood: '/images/product_kurtaset_rosewood_1791119152298.jpg',
  dressOchre: '/images/product_dress_ochre_1791119165890.jpg',
  coordsCharcoal: '/images/product_coords_charcoal_1791119178003.jpg',
};

export interface CategoryInfo {
  id: ProductCategory;
  index: string;
  name: ProductCategory;
  tagline: string;
  image: string;
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'Anarkali',
    index: '01',
    name: 'Anarkali',
    tagline: 'Fluid panelled silhouettes with understated heirloom grace',
    image: EDITORIAL_ASSETS.dressOchre,
  },
  {
    id: '3-Piece Dresses',
    index: '02',
    name: '3-Piece Dresses',
    tagline: 'Complete Chanderi silk & organza three-piece ensembles',
    image: EDITORIAL_ASSETS.kurtaSetSand,
  },
  {
    id: 'Co-ord Sets',
    index: '03',
    name: 'Co-ord Sets',
    tagline: 'Contemporary tailored khadi, linen & raw silk twin-sets',
    image: EDITORIAL_ASSETS.coordsCharcoal,
  },
  {
    id: 'Chikankari Suit',
    index: '04',
    name: 'Chikankari Suit',
    tagline: 'Hand-embroidered heritage threadwork on fine mulmul',
    image: EDITORIAL_ASSETS.kurtaIvory,
  },
];

const DEFAULT_SIZES: GarmentSize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const STANDARD_DELIVERY =
  'Complimentary insured express shipping across India. Dispatched within 24–48 business hours. Estimated delivery in 3–5 business days.';

const STANDARD_RETURNS =
  'Complimentary 14-day easy returns and size exchanges. Garments must be unworn with original tags intact. Doorstep reverse pick-up arranged upon request.';

/**
 * EXACT 17-PRODUCT LAUNCH COLLECTION
 * - Anarkali (2): Anarkali 01 – Anarkali 02
 * - 3-Piece Dresses (5): Three-Piece Dress 01 – Three-Piece Dress 05
 * - Co-ord Sets (9): Co-ord Set 01 – Co-ord Set 09
 * - Chikankari Suit (1): Chikankari Suit 01
 */
export const PRODUCTS: Product[] = [
  // ======================== ANARKALI (2 PRODUCTS) ========================
  {
    id: 'anarkali-01',
    sku: 'AB-AN-01',
    name: 'Anarkali 01',
    subtitle: '16-panelled earthen ochre kora silk-cotton Anarkali silhouette',
    category: 'Anarkali',
    price: 9490,
    originalPrice: 10800,
    colorName: 'Earthen Ochre',
    colorHex: '#B87B44',
    colors: [
      { name: 'Earthen Ochre', hex: '#B87B44', imageUrl: EDITORIAL_ASSETS.dressOchre },
      { name: 'Ivory Mulmul', hex: '#FAF6EE', imageUrl: EDITORIAL_ASSETS.kurtaIvory },
      { name: 'Rosewood', hex: '#8C4343', imageUrl: EDITORIAL_ASSETS.kurtaSetRosewood },
    ],
    fabric: 'Handwoven Kora Silk-Cotton',
    isNewArrival: true,
    isCurated: true,
    inStock: true,
    sizes: DEFAULT_SIZES,
    primaryImage: EDITORIAL_ASSETS.dressOchre,
    secondaryImage: EDITORIAL_ASSETS.brandStory,
    gallery: [
      { url: EDITORIAL_ASSETS.dressOchre, label: 'Full Studio Silhouette', focalClass: 'object-center' },
      { url: EDITORIAL_ASSETS.dressOchre, label: 'Pleated Bodice & Yoke Detail', focalClass: 'object-top scale-125' },
      { url: EDITORIAL_ASSETS.dressOchre, label: 'Kalidar Flare & Zari Selvedge', focalClass: 'object-bottom scale-120' },
      { url: EDITORIAL_ASSETS.brandStory, label: 'Editorial Daylight Drape', focalClass: 'object-center' },
    ],
    description:
      'Cut with sixteen narrow godet panels (kalis) that flare gracefully from a high empire waist without adding bulk, Anarkali 01 pairs architectural tailoring with luminous earthen ochre kora silk-cotton and a whisper of antique zari at the hem.',
    highlights: [
      '16-panel hand-joined kalidar construction with tonal piping',
      'Hand-tucked pleated bodice for structured elegance',
      'Deep concealed side-seam pockets integrated into the flare',
      'Fully lined in breathable pre-shrunk organic cotton mulmul',
    ],
    fabricAndCare: [
      'Composition: 50% Kora Silk, 50% Organic Cotton',
      'Lining: 100% Soft Cotton Voile',
      'Care: Dry clean recommended to preserve natural silk sheen',
      'Steam iron on reverse at low heat',
    ],
    sizeAndFit: [
      'Fitted through shoulders and bust; fluid kalidar flare below high waist',
      'Garment length: 50 inches across all sizes',
      'Model is 5\'9" (175 cm) and wears size S',
    ],
    deliveryInfo: STANDARD_DELIVERY,
    returnsInfo: STANDARD_RETURNS,
    reviews: [
      {
        id: 'rev-an-01',
        author: 'Nandini R.',
        sizePurchased: 'S',
        rating: 5,
        date: 'September 2026',
        title: 'Statuesque movement without feeling heavy',
        comment:
          'The 16-panel flare falls like liquid silk yet feels featherlight for an entire evening. The ochre tone is warm and deeply flattering.',
      },
    ],
  },
  {
    id: 'anarkali-02',
    sku: 'AB-AN-02',
    name: 'Anarkali 02',
    subtitle: 'Alabaster ivory mulmul & sheer silk organza panelled Anarkali',
    category: 'Anarkali',
    price: 8990,
    colorName: 'Alabaster Ivory',
    colorHex: '#F3EFEA',
    colors: [
      { name: 'Alabaster Ivory', hex: '#F3EFEA', imageUrl: EDITORIAL_ASSETS.brandStory },
      { name: 'Ivory Mulmul', hex: '#FAF6EE', imageUrl: EDITORIAL_ASSETS.kurtaIvory },
      { name: 'Warm Sand', hex: '#D6C5B3', imageUrl: EDITORIAL_ASSETS.kurtaSetSand },
    ],
    fabric: 'Handwoven Mulmul & Pure Silk Organza',
    isNewArrival: true,
    isCurated: false,
    inStock: true,
    sizes: DEFAULT_SIZES,
    primaryImage: EDITORIAL_ASSETS.brandStory,
    secondaryImage: EDITORIAL_ASSETS.kurtaIvory,
    gallery: [
      { url: EDITORIAL_ASSETS.brandStory, label: 'Archway Editorial View', focalClass: 'object-center' },
      { url: EDITORIAL_ASSETS.brandStory, label: 'Organza Sleeve & Bodice Detail', focalClass: 'object-left scale-120' },
      { url: EDITORIAL_ASSETS.kurtaIvory, label: 'Ivory Weave Close-Up', focalClass: 'object-center' },
    ],
    description:
      'Inspired by serene summer whites, Anarkali 02 layers airy handwoven mulmul with translucent silk organza hem panels that move effortlessly in natural light.',
    highlights: [
      'Double-layered opaque mulmul bodice with sheer organza hem border',
      'Delicate mother-of-pearl buttons along the back keyhole',
      'Functional side pockets and ankle-skimming flare',
    ],
    fabricAndCare: [
      'Composition: 85% Handloom Cotton Mulmul, 15% Silk Organza',
      'Care: Gentle cold hand wash or professional dry clean',
    ],
    sizeAndFit: [
      'Relaxed empire-waist kalidar silhouette',
      'Garment length: 51 inches',
      'Model is 5\'9" (175 cm) and wears size S',
    ],
    deliveryInfo: STANDARD_DELIVERY,
    returnsInfo: STANDARD_RETURNS,
    reviews: [],
  },

  // ======================== 3-PIECE DRESSES (5 PRODUCTS) ========================
  {
    id: 'three-piece-01',
    sku: 'AB-3P-01',
    name: 'Three-Piece Dress 01',
    subtitle: 'Champagne sand Chanderi silk kurta, wide trousers & organza dupatta',
    category: '3-Piece Dresses',
    price: 8990,
    originalPrice: 10400,
    colorName: 'Champagne Sand',
    colorHex: '#DDD0BE',
    fabric: 'Pure Chanderi Silk with Silk Organza Dupatta',
    isNewArrival: true,
    isCurated: true,
    inStock: true,
    sizes: DEFAULT_SIZES,
    primaryImage: EDITORIAL_ASSETS.kurtaSetSand,
    secondaryImage: EDITORIAL_ASSETS.heroBanner,
    gallery: [
      { url: EDITORIAL_ASSETS.kurtaSetSand, label: 'Full 3-Piece Ensemble', focalClass: 'object-center' },
      { url: EDITORIAL_ASSETS.kurtaSetSand, label: 'Organza Dupatta & Neckline', focalClass: 'object-top scale-125' },
      { url: EDITORIAL_ASSETS.kurtaSetSand, label: 'Wide-Leg Trouser Fall', focalClass: 'object-bottom scale-120' },
      { url: EDITORIAL_ASSETS.heroBanner, label: 'Campaign Look', focalClass: 'object-center' },
    ],
    description:
      'Our signature three-piece ensemble crafted for understated celebrations and elevated gatherings. Three-Piece Dress 01 pairs a luminous champagne-sand Chanderi silk tunic with fluid wide-leg trousers and a gossamer silk organza dupatta edged in muted gold zari.',
    highlights: [
      'Complete 3-piece set: Straight Kurta, Wide-Leg Palazzos, and Organza Dupatta',
      'Handwoven Chanderi silk with natural pearl-like sheen',
      'Trousers feature a flat front waistband, elasticated back, and deep pockets',
      '2.5-meter featherweight silk organza dupatta with hand-rolled hems',
    ],
    fabricAndCare: [
      'Kurta & Trousers: 60% Mulberry Silk, 40% Mercerized Cotton',
      'Dupatta: 100% Pure Silk Organza with Zari Selvedge',
      'Lining: 100% Soft Cotton Voile',
      'Care: Dry clean only; store wrapped in unbleached muslin',
    ],
    sizeAndFit: [
      'Classic tailored fit through shoulders; fluid drape through the hem',
      'Kurta length: 47 inches · Trouser length: 39 inches',
      'Model is 5\'9" (175 cm) and wears size S',
    ],
    deliveryInfo: STANDARD_DELIVERY,
    returnsInfo: STANDARD_RETURNS,
    reviews: [
      {
        id: 'rev-3p-01',
        author: 'Radhika M.',
        sizePurchased: 'S',
        rating: 5,
        date: 'September 2026',
        title: 'Understated luxury for intimate occasions',
        comment:
          'The champagne sand Chanderi silk catches the light beautifully without feeling loud or heavy. The trouser cut is impeccable.',
      },
    ],
  },
  {
    id: 'three-piece-02',
    sku: 'AB-3P-02',
    name: 'Three-Piece Dress 02',
    subtitle: 'Deep rosewood silk-cotton tunic, straight pants & zari stole',
    category: '3-Piece Dresses',
    price: 8490,
    colorName: 'Deep Rosewood',
    colorHex: '#5C3A32',
    fabric: 'Handwoven Silk-Cotton Blend',
    isNewArrival: true,
    isCurated: false,
    inStock: true,
    sizes: DEFAULT_SIZES,
    primaryImage: EDITORIAL_ASSETS.kurtaSetRosewood,
    secondaryImage: EDITORIAL_ASSETS.kurtaSetSand,
    gallery: [
      { url: EDITORIAL_ASSETS.kurtaSetRosewood, label: 'Full Studio Look', focalClass: 'object-center' },
      { url: EDITORIAL_ASSETS.kurtaSetRosewood, label: 'Zari Border Detail', focalClass: 'object-top scale-125' },
      { url: EDITORIAL_ASSETS.kurtaSetRosewood, label: 'Tailored Ankle Trouser Fit', focalClass: 'object-bottom scale-120' },
      { url: EDITORIAL_ASSETS.brandStory, label: 'Editorial Drape', focalClass: 'object-center' },
    ],
    description:
      'Three-Piece Dress 02 features a rich clove-rosewood palette accented by a micro-zari border along the cuffs, hemline, and matching handwoven stole.',
    highlights: [
      'Includes Kurta, Ankle-Grazer Cigarette Pants, and Handwoven Silk Stole',
      'Reversible geometric woven border in antique bronze zari',
      'Breathable all-season silk-cotton weave',
    ],
    fabricAndCare: [
      'Composition: 55% Silk, 45% Combed Cotton',
      'Lining: 100% Breathable Mulmul',
      'Care: Dry clean only',
    ],
    sizeAndFit: [
      'Structured straight fit',
      'Kurta length: 46 inches · Pant length: 38 inches',
      'Model is 5\'8" and wears size S',
    ],
    deliveryInfo: STANDARD_DELIVERY,
    returnsInfo: STANDARD_RETURNS,
    reviews: [],
  },
  {
    id: 'three-piece-03',
    sku: 'AB-3P-03',
    name: 'Three-Piece Dress 03',
    subtitle: 'Warm sandstone Chanderi ensemble with tapered trousers & tissue dupatta',
    category: '3-Piece Dresses',
    price: 9290,
    colorName: 'Warm Sandstone',
    colorHex: '#D6C4AE',
    fabric: 'Handloom Chanderi Silk',
    isNewArrival: false,
    isCurated: false,
    inStock: true,
    sizes: DEFAULT_SIZES,
    primaryImage: EDITORIAL_ASSETS.heroBanner,
    secondaryImage: EDITORIAL_ASSETS.kurtaSetSand,
    gallery: [
      { url: EDITORIAL_ASSETS.heroBanner, label: 'Editorial Campaign Look', focalClass: 'object-center' },
      { url: EDITORIAL_ASSETS.kurtaSetSand, label: 'Studio Drape View', focalClass: 'object-center' },
    ],
    description:
      'Woven on traditional pit looms in warm sandstone, Three-Piece Dress 03 combines a softly gathered Chanderi tunic with tailored tapered trousers and a sheer tissue-silk dupatta.',
    highlights: [
      'Complete 3-piece festive and evening ensemble',
      'Subtle antique gold tissue selvedge along the neckline and dupatta',
      'Fully lined in soft organic cotton voile',
    ],
    fabricAndCare: [
      'Composition: Pure Handloom Chanderi Silk',
      'Care: Dry clean only',
    ],
    sizeAndFit: [
      'Relaxed straight fit through the body',
      'Kurta length: 46.5 inches · Trouser length: 38.5 inches',
    ],
    deliveryInfo: STANDARD_DELIVERY,
    returnsInfo: STANDARD_RETURNS,
    reviews: [],
  },
  {
    id: 'three-piece-04',
    sku: 'AB-3P-04',
    name: 'Three-Piece Dress 04',
    subtitle: 'Botanical sage raw silk tunic, straight trousers & handwoven silk stole',
    category: '3-Piece Dresses',
    price: 8690,
    originalPrice: 9600,
    colorName: 'Botanical Sage',
    colorHex: '#848C74',
    fabric: 'Mulberry & Tussar Silk Blend',
    isNewArrival: false,
    isCurated: false,
    inStock: true,
    sizes: DEFAULT_SIZES,
    primaryImage: EDITORIAL_ASSETS.kurtaOlive,
    secondaryImage: EDITORIAL_ASSETS.kurtaSetSand,
    gallery: [
      { url: EDITORIAL_ASSETS.kurtaOlive, label: 'Front Studio View', focalClass: 'object-center' },
      { url: EDITORIAL_ASSETS.kurtaOlive, label: 'Neckline Stitch Detail', focalClass: 'object-top scale-120' },
      { url: EDITORIAL_ASSETS.kurtaSetSand, label: 'Trouser Silhouette Reference', focalClass: 'object-bottom' },
    ],
    description:
      'A study in monochromatic serenity, Three-Piece Dress 04 pairs our sage-olive raw silk tunic with tailored ankle-length trousers and a tonal handwoven silk stole finished with fine running stitches.',
    highlights: [
      '3-piece tonal sage-olive ensemble',
      'Hand-worked stitch accents at mandarin collar and cuffs',
      'Concealed side pockets in both kurta and trousers',
    ],
    fabricAndCare: [
      'Composition: 80% Tussar & Mulberry Silk, 20% Cotton',
      'Care: Dry clean only',
    ],
    sizeAndFit: [
      'Tailored shoulder with slight A-line ease',
      'Kurta length: 47 inches · Trouser length: 38 inches',
    ],
    deliveryInfo: STANDARD_DELIVERY,
    returnsInfo: STANDARD_RETURNS,
    reviews: [],
  },
  {
    id: 'three-piece-05',
    sku: 'AB-3P-05',
    name: 'Three-Piece Dress 05',
    subtitle: 'Ivory pintuck linen-silk kurta, wide palazzos & kora organza dupatta',
    category: '3-Piece Dresses',
    price: 8190,
    colorName: 'Warm Ivory',
    colorHex: '#EFECE6',
    fabric: 'Handloom Linen-Silk & Kora Organza',
    isNewArrival: false,
    isCurated: false,
    inStock: true,
    sizes: DEFAULT_SIZES,
    primaryImage: EDITORIAL_ASSETS.kurtaIvory,
    secondaryImage: EDITORIAL_ASSETS.brandStory,
    gallery: [
      { url: EDITORIAL_ASSETS.kurtaIvory, label: 'Studio Front Detail', focalClass: 'object-center' },
      { url: EDITORIAL_ASSETS.brandStory, label: 'Editorial Archway Drape', focalClass: 'object-center' },
    ],
    description:
      'Designed for daytime elegance and sunlit gatherings, Three-Piece Dress 05 combines a knife-pleated pintuck linen-silk tunic with wide-flared palazzos and an unbleached kora organza dupatta.',
    highlights: [
      '3-piece breathable daytime luxury ensemble',
      'Mother-of-pearl buttons and vertical pintuck bodice',
      'Deep functional pockets in palazzos',
    ],
    fabricAndCare: [
      'Composition: 70% Linen, 30% Mulberry Silk',
      'Care: Dry clean or gentle cold wash',
    ],
    sizeAndFit: [
      'Relaxed straight fit',
      'Kurta length: 46 inches · Palazzo length: 39.5 inches',
    ],
    deliveryInfo: STANDARD_DELIVERY,
    returnsInfo: STANDARD_RETURNS,
    reviews: [],
  },

  // ======================== CO-ORD SETS (9 PRODUCTS) ========================
  {
    id: 'coord-set-01',
    sku: 'AB-CO-01',
    name: 'Co-ord Set 01',
    subtitle: 'Deep charcoal khadi silk wrap tunic & wide culotte twin-set',
    category: 'Co-ord Sets',
    price: 7490,
    originalPrice: 8500,
    colorName: 'Deep Charcoal',
    colorHex: '#282625',
    fabric: 'Artisanal Spun Khadi Silk',
    isNewArrival: true,
    isCurated: true,
    inStock: true,
    sizes: DEFAULT_SIZES,
    primaryImage: EDITORIAL_ASSETS.coordsCharcoal,
    secondaryImage: EDITORIAL_ASSETS.kurtaIvory,
    gallery: [
      { url: EDITORIAL_ASSETS.coordsCharcoal, label: 'Full Co-ord Studio Look', focalClass: 'object-center' },
      { url: EDITORIAL_ASSETS.coordsCharcoal, label: 'Wrap Lapel & Ecru Embroidery', focalClass: 'object-top scale-125' },
      { url: EDITORIAL_ASSETS.coordsCharcoal, label: 'Wide Cropped Culotte Tailoring', focalClass: 'object-bottom scale-120' },
      { url: EDITORIAL_ASSETS.brandStory, label: 'Architectural Contrast Styling', focalClass: 'object-center' },
    ],
    description:
      'Where architectural tailoring meets Indian handloom artistry. Co-ord Set 01 pairs a structured wrap-front kimono tunic with wide tailored culottes in deep charcoal khadi silk, accented by linear ecru Resham threadwork along the lapels and cuffs.',
    highlights: [
      '2-piece tailored twin-set: Structured Wrap Tunic & Wide-Leg Culottes',
      'Hand-guided linear Resham embroidery in contrasting raw ecru thread',
      'Culottes feature front knife pleats, belt loops, and deep slant pockets',
      'Versatile separates that can be styled together or independently',
    ],
    fabricAndCare: [
      'Composition: 65% Spun Khadi Silk, 35% Fine Handloom Cotton',
      'Care: Dry clean only to protect dark pigment and ecru contrast stitching',
    ],
    sizeAndFit: [
      'Tailored wrap fit on top; high-waisted wide-leg culottes',
      'Tunic length: 30 inches · Culotte length: 37 inches',
      'Model is 5\'9" (175 cm) and wears size S',
    ],
    deliveryInfo: STANDARD_DELIVERY,
    returnsInfo: STANDARD_RETURNS,
    reviews: [
      {
        id: 'rev-co-01',
        author: 'Kavya N.',
        sizePurchased: 'M',
        rating: 5,
        date: 'September 2026',
        title: 'Sharp, modern, and unmistakably Indian',
        comment:
          'Wore this to a design conference and received endless compliments. The khadi silk has a remarkable structure.',
      },
    ],
  },
  {
    id: 'coord-set-02',
    sku: 'AB-CO-02',
    name: 'Co-ord Set 02',
    subtitle: 'Warm alabaster handwoven linen longline tunic & fluid trouser set',
    category: 'Co-ord Sets',
    price: 6690,
    colorName: 'Warm Alabaster',
    colorHex: '#EFECE6',
    fabric: '100% Handwoven Pure Linen',
    isNewArrival: true,
    isCurated: false,
    inStock: true,
    sizes: DEFAULT_SIZES,
    primaryImage: EDITORIAL_ASSETS.kurtaIvory,
    secondaryImage: EDITORIAL_ASSETS.coordsCharcoal,
    gallery: [
      { url: EDITORIAL_ASSETS.kurtaIvory, label: 'Ivory Linen Texture & Cut', focalClass: 'object-center' },
      { url: EDITORIAL_ASSETS.kurtaIvory, label: 'Pintuck Placket & Collar Detail', focalClass: 'object-top scale-120' },
      { url: EDITORIAL_ASSETS.coordsCharcoal, label: 'Co-ord Trouser Proportions', focalClass: 'object-bottom' },
    ],
    description:
      'Tailored from heavyweight 180 GSM handwoven linen in warm alabaster, Co-ord Set 02 pairs a pintuck straight tunic with relaxed wide-leg linen trousers.',
    highlights: [
      '2-piece pure handwoven linen twin-set with mother-of-pearl buttons',
      'French-seamed interiors for unlined breathability',
      'High-waisted trousers with concealed side zip and back elastic panel',
    ],
    fabricAndCare: [
      'Composition: 100% Pure Handwoven Linen',
      'Care: Gentle cold wash or dry clean',
    ],
    sizeAndFit: [
      'Relaxed architectural fit',
      'Tunic length: 36 inches · Trouser length: 40 inches',
    ],
    deliveryInfo: STANDARD_DELIVERY,
    returnsInfo: STANDARD_RETURNS,
    reviews: [],
  },
  {
    id: 'coord-set-03',
    sku: 'AB-CO-03',
    name: 'Co-ord Set 03',
    subtitle: 'Sage-olive raw silk bandhgala shirt-jacket & straight trouser set',
    category: 'Co-ord Sets',
    price: 7690,
    originalPrice: 8600,
    colorName: 'Sage Olive',
    colorHex: '#7A826C',
    fabric: 'Mulberry Raw Silk & Cotton',
    isNewArrival: true,
    isCurated: false,
    inStock: true,
    sizes: DEFAULT_SIZES,
    primaryImage: EDITORIAL_ASSETS.kurtaOlive,
    secondaryImage: EDITORIAL_ASSETS.coordsCharcoal,
    gallery: [
      { url: EDITORIAL_ASSETS.kurtaOlive, label: 'Sage Olive Raw Silk Weave', focalClass: 'object-center' },
      { url: EDITORIAL_ASSETS.kurtaOlive, label: 'Mandarin Collar Stitch Detail', focalClass: 'object-top scale-125' },
      { url: EDITORIAL_ASSETS.coordsCharcoal, label: 'Co-ord Silhouette Reference', focalClass: 'object-center' },
    ],
    description:
      'A relaxed interpretation of the classic Indian bandhgala jacket, softened in sage raw silk with tonal topstitching and paired with easy straight-leg trousers.',
    highlights: [
      '2-piece set: Bandhgala Tunic-Shirt & Straight Trousers',
      'Hand-worked tonal stitch detailing along collar and placket',
      'Ideal for travel, art previews, and modern festive hosting',
    ],
    fabricAndCare: [
      'Composition: 70% Mulberry Raw Silk, 30% Cotton',
      'Care: Dry clean only',
    ],
    sizeAndFit: [
      'Relaxed tailored fit',
      'Top length: 34 inches · Trouser length: 39 inches',
    ],
    deliveryInfo: STANDARD_DELIVERY,
    returnsInfo: STANDARD_RETURNS,
    reviews: [],
  },
  {
    id: 'coord-set-04',
    sku: 'AB-CO-04',
    name: 'Co-ord Set 04',
    subtitle: 'Earthen ochre kora silk pleated tunic & cropped cigarette pant set',
    category: 'Co-ord Sets',
    price: 6990,
    colorName: 'Earthen Ochre',
    colorHex: '#B87B44',
    fabric: 'Kora Silk-Cotton',
    isNewArrival: true,
    isCurated: false,
    inStock: true,
    sizes: DEFAULT_SIZES,
    primaryImage: EDITORIAL_ASSETS.dressOchre,
    secondaryImage: EDITORIAL_ASSETS.coordsCharcoal,
    gallery: [
      { url: EDITORIAL_ASSETS.dressOchre, label: 'Ochre Kora Bodice & Weave', focalClass: 'object-top' },
      { url: EDITORIAL_ASSETS.coordsCharcoal, label: 'Tailored Co-ord Structure', focalClass: 'object-center' },
    ],
    description:
      'Featuring a hand-pleated bodice reimagined as a hip-skimming tunic paired with razor-sharp ankle cigarette trousers in warm earthen ochre.',
    highlights: [
      '2-piece contemporary festive co-ord',
      'Subtle antique zari selvedge at sleeve cuffs and trouser ankles',
      'Side pockets in trousers',
    ],
    fabricAndCare: [
      'Composition: 50% Silk, 50% Cotton',
      'Care: Dry clean recommended',
    ],
    sizeAndFit: [
      'Fitted bust; gently flared waist; slim ankle trousers',
      'Tunic length: 33 inches · Pant length: 37.5 inches',
    ],
    deliveryInfo: STANDARD_DELIVERY,
    returnsInfo: STANDARD_RETURNS,
    reviews: [],
  },
  {
    id: 'coord-set-05',
    sku: 'AB-CO-05',
    name: 'Co-ord Set 05',
    subtitle: 'Rosewood clove silk-linen kimono tunic & wide palazzo co-ord',
    category: 'Co-ord Sets',
    price: 7290,
    colorName: 'Rosewood Clove',
    colorHex: '#5C3A32',
    fabric: 'Silk-Linen Blend with Zari Piping',
    isNewArrival: false,
    isCurated: false,
    inStock: true,
    sizes: DEFAULT_SIZES,
    primaryImage: EDITORIAL_ASSETS.kurtaSetRosewood,
    secondaryImage: EDITORIAL_ASSETS.coordsCharcoal,
    gallery: [
      { url: EDITORIAL_ASSETS.kurtaSetRosewood, label: 'Rosewood Clove Studio View', focalClass: 'object-center' },
      { url: EDITORIAL_ASSETS.coordsCharcoal, label: 'Wide Trouser Proportions', focalClass: 'object-bottom' },
    ],
    description:
      'Designed for effortless movement from intimate dinners to festive evenings, Co-ord Set 05 combines the fluid drape of silk with the crisp structure of linen in a rich rosewood-clove hue.',
    highlights: [
      '2-piece kimono-sleeve tunic and wide-leg palazzo set',
      'Delicate antique gold piping along the neckline and cuffs',
      'Deep side pockets and breathable mulmul lining',
    ],
    fabricAndCare: [
      'Composition: 55% Silk, 45% Linen',
      'Care: Dry clean only',
    ],
    sizeAndFit: [
      'Fluid relaxed fit',
      'Tunic length: 34 inches · Palazzo length: 39.5 inches',
    ],
    deliveryInfo: STANDARD_DELIVERY,
    returnsInfo: STANDARD_RETURNS,
    reviews: [],
  },
  {
    id: 'coord-set-06',
    sku: 'AB-CO-06',
    name: 'Co-ord Set 06',
    subtitle: 'Champagne ecru Chanderi box-pleat tunic & wide trouser set',
    category: 'Co-ord Sets',
    price: 7190,
    originalPrice: 7990,
    colorName: 'Champagne Ecru',
    colorHex: '#E3D7C5',
    fabric: 'Handwoven Chanderi Silk-Cotton',
    isNewArrival: false,
    isCurated: false,
    inStock: true,
    sizes: DEFAULT_SIZES,
    primaryImage: EDITORIAL_ASSETS.kurtaSetSand,
    secondaryImage: EDITORIAL_ASSETS.kurtaIvory,
    gallery: [
      { url: EDITORIAL_ASSETS.kurtaSetSand, label: 'Champagne Ecru Studio Look', focalClass: 'object-center' },
      { url: EDITORIAL_ASSETS.kurtaIvory, label: 'Tonal Weave Detail', focalClass: 'object-center' },
    ],
    description:
      'A luminous two-piece co-ord crafted in handwoven Chanderi silk-cotton, pairing a box-pleated yoke tunic with matching wide-leg trousers.',
    highlights: [
      '2-piece Chanderi silk-cotton set',
      'Soft mulmul cotton lining throughout',
      'Elasticated back waistband with drawstring and deep pockets',
    ],
    fabricAndCare: [
      'Composition: 55% Silk, 45% Mercerized Cotton',
      'Care: Dry clean recommended',
    ],
    sizeAndFit: [
      'Relaxed straight silhouette',
      'Tunic length: 35 inches · Trouser length: 39 inches',
    ],
    deliveryInfo: STANDARD_DELIVERY,
    returnsInfo: STANDARD_RETURNS,
    reviews: [],
  },
  {
    id: 'coord-set-07',
    sku: 'AB-CO-07',
    name: 'Co-ord Set 07',
    subtitle: 'Charcoal slate 100-count fine spun khadi angarkha co-ord',
    category: 'Co-ord Sets',
    price: 6890,
    colorName: 'Charcoal Slate',
    colorHex: '#2E2D2B',
    fabric: '100-Count Fine Spun Cotton Khadi',
    isNewArrival: false,
    isCurated: false,
    inStock: true,
    sizes: DEFAULT_SIZES,
    primaryImage: EDITORIAL_ASSETS.coordsCharcoal,
    secondaryImage: EDITORIAL_ASSETS.kurtaOlive,
    gallery: [
      { url: EDITORIAL_ASSETS.coordsCharcoal, label: 'Front Overlap Silhouette', focalClass: 'object-center' },
      { url: EDITORIAL_ASSETS.coordsCharcoal, label: 'Asymmetric Tie Detail', focalClass: 'object-top scale-125' },
    ],
    description:
      'An architectural take on Indian workwear. Co-ord Set 07 pairs an overlapping angarkha-inspired tunic fastened with a brushed-brass aglet tie and tapered cropped trousers.',
    highlights: [
      'Featherlight 100-count handspun khadi',
      'Ecru whipstitch border along the overlap lapel',
      'Functional side-seam pockets in both top and trousers',
    ],
    fabricAndCare: [
      'Composition: 100% Handspun Cotton Khadi',
      'Care: Gentle cold hand wash separately; dry in shade',
    ],
    sizeAndFit: [
      'Structured overlap fit through the bust; relaxed tapered trousers',
      'Tunic length: 32 inches · Trouser length: 37.5 inches',
    ],
    deliveryInfo: STANDARD_DELIVERY,
    returnsInfo: STANDARD_RETURNS,
    reviews: [],
  },
  {
    id: 'coord-set-08',
    sku: 'AB-CO-08',
    name: 'Co-ord Set 08',
    subtitle: 'Sage linen-silk mandarin collar shirt-tunic & belted trouser set',
    category: 'Co-ord Sets',
    price: 6790,
    colorName: 'Sage Olive',
    colorHex: '#7A826C',
    fabric: 'Pure Handloom Linen-Silk',
    isNewArrival: false,
    isCurated: false,
    inStock: true,
    sizes: DEFAULT_SIZES,
    primaryImage: EDITORIAL_ASSETS.kurtaOlive,
    secondaryImage: EDITORIAL_ASSETS.kurtaIvory,
    gallery: [
      { url: EDITORIAL_ASSETS.kurtaOlive, label: 'Studio Portrait', focalClass: 'object-center' },
      { url: EDITORIAL_ASSETS.kurtaIvory, label: 'Linen Weave Detail', focalClass: 'object-center' },
    ],
    description:
      'Bridging crisp shirtmaker tailoring with Indian handloom linen-silk, Co-ord Set 08 features a concealed-placket tunic with a braided silk dori belt and matching straight trousers.',
    highlights: [
      '2-piece linen-silk co-ord with detachable braided dori belt',
      'Can be worn belted or open as a summer layering piece',
      'Deep side pockets',
    ],
    fabricAndCare: [
      'Composition: 80% Linen, 20% Tussar Silk',
      'Care: Dry clean or gentle cold hand wash',
    ],
    sizeAndFit: [
      'Relaxed column fit',
      'Tunic length: 35 inches · Trouser length: 39 inches',
    ],
    deliveryInfo: STANDARD_DELIVERY,
    returnsInfo: STANDARD_RETURNS,
    reviews: [],
  },
  {
    id: 'coord-set-09',
    sku: 'AB-CO-09',
    name: 'Co-ord Set 09',
    subtitle: 'Deep clove Matka silk straight tunic & wide-leg trouser set',
    category: 'Co-ord Sets',
    price: 7590,
    colorName: 'Rosewood Clove',
    colorHex: '#633F37',
    fabric: 'Pure Handspun Matka Silk',
    isNewArrival: false,
    isCurated: false,
    inStock: true,
    sizes: DEFAULT_SIZES,
    primaryImage: EDITORIAL_ASSETS.kurtaSetRosewood,
    secondaryImage: EDITORIAL_ASSETS.kurtaSetSand,
    gallery: [
      { url: EDITORIAL_ASSETS.kurtaSetRosewood, label: 'Studio Front View', focalClass: 'object-center' },
      { url: EDITORIAL_ASSETS.kurtaSetRosewood, label: 'Neckline & Matka Texture', focalClass: 'object-top scale-125' },
    ],
    description:
      'Dyed in a botanical rosewood-clove tone, Co-ord Set 09 showcases organic Matka silk slubs in a clean jewel-split neck tunic and fluid wide-leg trousers.',
    highlights: [
      '2-piece 100% pure Matka silk ensemble',
      'Clean French seams and minimal split V-neckline',
      'Side pockets in trousers',
    ],
    fabricAndCare: [
      'Composition: 100% Pure Matka Silk',
      'Care: Professional dry clean only',
    ],
    sizeAndFit: [
      'Tailored straight fit',
      'Tunic length: 36 inches · Trouser length: 39 inches',
    ],
    deliveryInfo: STANDARD_DELIVERY,
    returnsInfo: STANDARD_RETURNS,
    reviews: [],
  },

  // ======================== CHIKANKARI SUIT (1 PRODUCT) ========================
  {
    id: 'chikankari-01',
    sku: 'AB-CK-01',
    name: 'Chikankari Suit 01',
    subtitle: 'Hand-embroidered Tepchi & Bakhiya Chikankari on warm ivory mulmul',
    category: 'Chikankari Suit',
    price: 9890,
    originalPrice: 11200,
    colorName: 'Warm Alabaster Ivory',
    colorHex: '#F5F1EA',
    fabric: 'Handloom Organic Mulmul & Chanderi Dupatta',
    isNewArrival: true,
    isCurated: true,
    inStock: true,
    sizes: DEFAULT_SIZES,
    primaryImage: EDITORIAL_ASSETS.kurtaIvory,
    secondaryImage: EDITORIAL_ASSETS.brandStory,
    gallery: [
      { url: EDITORIAL_ASSETS.kurtaIvory, label: 'Full Studio Silhouette', focalClass: 'object-center' },
      { url: EDITORIAL_ASSETS.kurtaIvory, label: 'Tonal Chikankari Placket & Yoke', focalClass: 'object-top scale-125' },
      { url: EDITORIAL_ASSETS.kurtaIvory, label: 'Cuff Threadwork Detail', focalClass: 'object-bottom scale-115' },
      { url: EDITORIAL_ASSETS.brandStory, label: 'Editorial Daylight Drape', focalClass: 'object-center' },
    ],
    description:
      'An heirloom-grade study in tonal restraint. Chikankari Suit 01 is hand-embroidered over 32 artisan hours using fine ecru cotton thread on soft ivory handloom mulmul, paired with tailored straight trousers and a sheer Chanderi dupatta.',
    highlights: [
      'Authentic hand-worked Bakhiya (shadow work) and Tepchi stitches',
      'Includes Straight Kurta, Tailored Cotton Trousers, and Chanderi Silk-Cotton Dupatta',
      'Finished with genuine mother-of-pearl buttons and deep side pockets',
      'Includes a complimentary pure cotton voile inner slip',
    ],
    fabricAndCare: [
      'Composition: 100% Superfine Handloom Mulmul with Pure Cotton Resham Embroidery',
      'Dupatta: Handwoven Chanderi Silk-Cotton',
      'Care: Gentle cold hand wash with mild detergent or dry clean',
      'Iron on reverse over a soft towel to preserve raised threadwork',
    ],
    sizeAndFit: [
      'Relaxed straight fit; designed to skim the frame gracefully',
      'Kurta length: 46.5 inches · Trouser length: 38.5 inches',
      'Model is 5\'9" (175 cm) and wears size S',
    ],
    deliveryInfo: STANDARD_DELIVERY,
    returnsInfo: STANDARD_RETURNS,
    reviews: [
      {
        id: 'rev-ck-01',
        author: 'Meenakshi I.',
        sizePurchased: 'M',
        rating: 5,
        date: 'September 2026',
        title: 'Authentic shadow-work without a trace of excess',
        comment:
          'Finding genuine hand-done Chikankari on pure breathable mulmul without synthetic nets or loud sequins is so rare. This piece is pure poetry.',
      },
    ],
  },
];

export interface LookbookPost {
  id: string;
  image: string;
  handle: string;
  caption: string;
  productId: string;
  productName: string;
}

export const INSTAGRAM_GALLERY: LookbookPost[] = [
  {
    id: 'ig-01',
    image: EDITORIAL_ASSETS.kurtaIvory,
    handle: '@aabhaclothing',
    caption: 'Thirty-two hours of tonal hand-embroidery on Chikankari Suit 01.',
    productId: 'chikankari-01',
    productName: 'Chikankari Suit 01',
  },
  {
    id: 'ig-02',
    image: EDITORIAL_ASSETS.kurtaSetSand,
    handle: '@aabhaclothing',
    caption: 'Champagne sand Chanderi silk woven on pit looms for Three-Piece Dress 01.',
    productId: 'three-piece-01',
    productName: 'Three-Piece Dress 01',
  },
  {
    id: 'ig-03',
    image: EDITORIAL_ASSETS.dressOchre,
    handle: '@aabhaclothing',
    caption: 'Sixteen hand-joined kalis in earthen ochre kora silk — Anarkali 01.',
    productId: 'anarkali-01',
    productName: 'Anarkali 01',
  },
  {
    id: 'ig-04',
    image: EDITORIAL_ASSETS.coordsCharcoal,
    handle: '@aabhaclothing',
    caption: 'Architectural khadi silk tailoring in Co-ord Set 01.',
    productId: 'coord-set-01',
    productName: 'Co-ord Set 01',
  },
  {
    id: 'ig-05',
    image: EDITORIAL_ASSETS.kurtaOlive,
    handle: '@aabhaclothing',
    caption: 'Botanical sage raw silk with tonal stitchwork — Co-ord Set 03.',
    productId: 'coord-set-03',
    productName: 'Co-ord Set 03',
  },
  {
    id: 'ig-06',
    image: EDITORIAL_ASSETS.kurtaSetRosewood,
    handle: '@aabhaclothing',
    caption: 'Deep clove-rosewood silk for dusk gatherings — Three-Piece Dress 02.',
    productId: 'three-piece-02',
    productName: 'Three-Piece Dress 02',
  },
];

export interface SizeChartRow {
  size: GarmentSize;
  ukSize: string;
  bustIn: string;
  waistIn: string;
  hipIn: string;
  shoulderIn: string;
  bustCm: string;
  waistCm: string;
  hipCm: string;
  shoulderCm: string;
}

export const SIZE_CHART: SizeChartRow[] = [
  { size: 'XS', ukSize: 'UK 6', bustIn: '33"', waistIn: '27"', hipIn: '36"', shoulderIn: '13.5"', bustCm: '84 cm', waistCm: '68.5 cm', hipCm: '91.5 cm', shoulderCm: '34.3 cm' },
  { size: 'S', ukSize: 'UK 8', bustIn: '35"', waistIn: '29"', hipIn: '38"', shoulderIn: '14.0"', bustCm: '89 cm', waistCm: '73.5 cm', hipCm: '96.5 cm', shoulderCm: '35.5 cm' },
  { size: 'M', ukSize: 'UK 10', bustIn: '37"', waistIn: '31"', hipIn: '40"', shoulderIn: '14.5"', bustCm: '94 cm', waistCm: '78.5 cm', hipCm: '101.5 cm', shoulderCm: '36.8 cm' },
  { size: 'L', ukSize: 'UK 12', bustIn: '39"', waistIn: '33"', hipIn: '42"', shoulderIn: '15.0"', bustCm: '99 cm', waistCm: '84.0 cm', hipCm: '106.5 cm', shoulderCm: '38.1 cm' },
  { size: 'XL', ukSize: 'UK 14', bustIn: '42"', waistIn: '36"', hipIn: '45"', shoulderIn: '15.5"', bustCm: '106.5 cm', waistCm: '91.5 cm', hipCm: '114.5 cm', shoulderCm: '39.4 cm' },
  { size: 'XXL', ukSize: 'UK 16', bustIn: '45"', waistIn: '39"', hipIn: '48"', shoulderIn: '16.0"', bustCm: '114.5 cm', waistCm: '99.0 cm', hipCm: '122.0 cm', shoulderCm: '40.6 cm' },
];

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}
