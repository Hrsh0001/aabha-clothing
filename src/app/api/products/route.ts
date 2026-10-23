import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../../lib/db';
import { isAuthorizedAdmin } from '../../../lib/auth-guard';
import { persistImageUrlForCloud } from '../../../lib/image-store';

const PRODUCTS_FILE_PATH = path.join(process.cwd(), 'data', 'products.json');

const LEGACY_STATIC_PRODUCT_IDS = [
  'anarkali-01',
  'anarkali-02',
  'dress-01',
  'dress-02',
  'dress-03',
  'dress-04',
  'dress-05',
  'coord-01',
  'coord-02',
  'coord-03',
  'coord-04',
  'coord-05',
  'coord-06',
  'coord-07',
  'coord-08',
  'coord-09',
  'chikankari-01',
];

function ensureProductsFile(): void {
  try {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(PRODUCTS_FILE_PATH)) {
      fs.writeFileSync(PRODUCTS_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch {
    // Read-only filesystem in cloud deployment
  }
}

// In-memory fallback cache for environments where local filesystem is read-only and DB is absent
let inMemoryProductsCache: any[] | null = null;
let isDbInitializedThisInstance = false;

function readLocalProducts(): any[] {
  if (inMemoryProductsCache !== null) {
    return inMemoryProductsCache;
  }
  try {
    ensureProductsFile();
    if (fs.existsSync(PRODUCTS_FILE_PATH)) {
      const data = fs.readFileSync(PRODUCTS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      inMemoryProductsCache = Array.isArray(parsed)
        ? parsed.filter((p: any) => !LEGACY_STATIC_PRODUCT_IDS.includes(p?.id))
        : [];
      return inMemoryProductsCache;
    }
    inMemoryProductsCache = [];
    return inMemoryProductsCache;
  } catch {
    return inMemoryProductsCache || [];
  }
}

function saveLocalProducts(products: any[]): void {
  inMemoryProductsCache = products;
  try {
    ensureProductsFile();
    fs.writeFileSync(PRODUCTS_FILE_PATH, JSON.stringify(products, null, 2), 'utf-8');
  } catch {
    // Kept in memory cache on serverless
  }
}

/**
 * Validates an image URL and rejects truncated/corrupted test Data URLs (< 64 chars),
 * while routing any legacy localhost `/images/garment_*` paths through `/api/images/*`.
 * Never substitutes a static placeholder image when URL is empty.
 */
function sanitizeImageUrl(url: any, fallback: string = ''): string {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;
  if (
    trimmed.startsWith('data:image/') &&
    !trimmed.startsWith('data:image/svg') &&
    trimmed.length < 64
  ) {
    return fallback;
  }
  if (trimmed.startsWith('/images/garment_')) {
    return `/api/images/${path.basename(trimmed)}`;
  }
  return trimmed;
}

function parseGalleryArray(
  rawGallery: any,
  primaryImage: string,
  secondaryImage?: string | null
): { url: string; label: string; focalClass: string }[] {
  const lead = sanitizeImageUrl(primaryImage, '');
  if (!Array.isArray(rawGallery) || rawGallery.length === 0) {
    if (!lead) return [];
    const fallback = [
      { url: lead, label: 'Full Studio Silhouette', focalClass: 'object-center' },
    ];
    const cleanSecondary = secondaryImage ? sanitizeImageUrl(secondaryImage, '') : '';
    if (cleanSecondary && cleanSecondary !== lead) {
      fallback.push({
        url: cleanSecondary,
        label: 'Editorial Daylight Drape',
        focalClass: 'object-center',
      });
    }
    return fallback;
  }

  const parsed = rawGallery
    .map((item: any, idx: number) => {
      if (typeof item === 'object' && item !== null) {
        const cleanUrl = sanitizeImageUrl(item.url, lead);
        if (!cleanUrl) return null;
        return {
          url: cleanUrl,
          label:
            item.label?.trim() ||
            (idx === 0 ? 'Full Studio Silhouette' : `Studio Angle ${idx + 1}`),
          focalClass: item.focalClass || 'object-center',
        };
      }
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (trimmed.startsWith('{')) {
          try {
            const obj = JSON.parse(trimmed);
            if (obj && obj.url) {
              const cleanUrl = sanitizeImageUrl(String(obj.url), lead);
              if (!cleanUrl) return null;
              return {
                url: cleanUrl,
                label:
                  obj.label?.trim() ||
                  (idx === 0 ? 'Full Studio Silhouette' : `Studio Angle ${idx + 1}`),
                focalClass: obj.focalClass || 'object-center',
              };
            }
          } catch {
            // Fall through to plain URL string handling
          }
        }
        if (trimmed) {
          const cleanUrl = sanitizeImageUrl(trimmed, lead);
          if (!cleanUrl) return null;
          return {
            url: cleanUrl,
            label: idx === 0 ? 'Full Studio Silhouette' : `Studio Angle ${idx + 1}`,
            focalClass: 'object-center',
          };
        }
      }
      return null;
    })
    .filter(Boolean) as { url: string; label: string; focalClass: string }[];

  if (parsed.length > 0) return parsed;
  return lead ? [{ url: lead, label: 'Full Studio Silhouette', focalClass: 'object-center' }] : [];
}

function serializeGalleryForDb(
  gallery: any,
  primaryImage: string,
  secondaryImage?: string | null
): string[] {
  const structured = parseGalleryArray(gallery, primaryImage, secondaryImage);
  return structured.map((g) =>
    JSON.stringify({
      url: g.url,
      label: g.label,
      focalClass: g.focalClass || 'object-center',
    })
  );
}

function normalizeProduct(raw: any): any {
  const lead = sanitizeImageUrl(raw.primaryImage, '');
  const rawSec = sanitizeImageUrl(raw.secondaryImage, lead);
  const gallery = parseGalleryArray(raw.gallery, lead, rawSec);
  const primaryImage = sanitizeImageUrl(gallery[0]?.url, lead);
  const secondaryImage = sanitizeImageUrl(
    raw.secondaryImage,
    gallery[1]?.url || primaryImage
  );
  const fabric = raw.fabric || 'Pure Handloom Chanderi Silk';
  const category = raw.category || 'Anarkali';

  let colors: Array<{ name: string; hex: string; imageUrl?: string; inStock?: boolean; stockQuantity?: number }> | undefined = undefined;
  if (Array.isArray(raw.colors) && raw.colors.length > 0) {
    colors = raw.colors.map((c: any) => ({
      name: String(c?.name || 'Artisan Shade').trim(),
      hex: String(c?.hex || '#6E5043').trim(),
      ...(c?.imageUrl ? { imageUrl: sanitizeImageUrl(c.imageUrl, '') } : {}),
      inStock: typeof c?.inStock === 'boolean' ? c.inStock : (typeof raw.inStock === 'boolean' ? raw.inStock : true),
      stockQuantity: typeof c?.stockQuantity === 'number' ? c.stockQuantity : (raw.inStock === false ? 0 : 10),
    }));
  } else if (Array.isArray(raw.highlights)) {
    const colorMarker = raw.highlights.find(
      (h: any) => typeof h === 'string' && h.startsWith('__COLORS__:')
    );
    if (colorMarker) {
      try {
        colors = JSON.parse(colorMarker.slice('__COLORS__:'.length));
      } catch {}
    }
  }

  // Parse sizeStock
  let sizeStock: Record<string, { inStock: boolean; quantity?: number }> | undefined = undefined;
  if (raw.sizeStock && typeof raw.sizeStock === 'object') {
    sizeStock = raw.sizeStock;
  } else if (Array.isArray(raw.highlights)) {
    const sizeMarker = raw.highlights.find(
      (h: any) => typeof h === 'string' && h.startsWith('__SIZE_STOCK__:')
    );
    if (sizeMarker) {
      try {
        sizeStock = JSON.parse(sizeMarker.slice('__SIZE_STOCK__:'.length));
      } catch {}
    }
  }

  const rawSizes =
    Array.isArray(raw.sizes) && raw.sizes.length > 0
      ? raw.sizes.map((s: any) => String(s).trim().toUpperCase()).filter(Boolean)
      : ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  const resolvedMasterInStock = typeof raw.inStock === 'boolean' ? raw.inStock : true;

  if (!sizeStock || typeof sizeStock !== 'object') {
    sizeStock = {};
    rawSizes.forEach((s: string) => {
      sizeStock![s] = {
        inStock: resolvedMasterInStock,
        quantity: resolvedMasterInStock ? 10 : 0,
      };
    });
  } else {
    // Ensure every size has an entry
    rawSizes.forEach((s: string) => {
      if (!sizeStock![s]) {
        sizeStock![s] = {
          inStock: resolvedMasterInStock,
          quantity: resolvedMasterInStock ? 10 : 0,
        };
      }
    });
  }

  const highlights = Array.isArray(raw.highlights)
    ? raw.highlights.filter(
        (h: any) =>
          typeof h === 'string' &&
          !h.startsWith('__COLORS__:') &&
          !h.startsWith('__SIZE_STOCK__:')
      )
    : [
        'Handcrafted artisan detailing',
        'Breathable natural luxury weave',
        'Deep concealed side-seam pockets',
      ];

  return {
    id: raw.id,
    sku: raw.sku || `AB-${String(raw.id).toUpperCase().slice(0, 8)}`,
    name: raw.name || 'Handcrafted Silhouette',
    subtitle: raw.subtitle || `${fabric} ${category} silhouette`,
    category,
    price: Number(raw.price) || 0,
    originalPrice:
      raw.originalPrice !== null && raw.originalPrice !== undefined && Number(raw.originalPrice) > 0
        ? Number(raw.originalPrice)
        : undefined,
    colorName:
      raw.colorName ||
      fabric.split(' ').slice(0, 2).join(' ') ||
      'Artisan Handloom',
    colorHex: raw.colorHex || '#6E5043',
    colors: colors && colors.length > 0 ? colors : undefined,
    sizeStock,
    fabric,
    isNewArrival: typeof raw.isNewArrival === 'boolean' ? raw.isNewArrival : true,
    isCurated: typeof raw.isCurated === 'boolean' ? raw.isCurated : false,
    inStock: resolvedMasterInStock,
    sizes: rawSizes,
    primaryImage,
    secondaryImage,
    gallery,
    description:
      raw.description ||
      'Exquisite handcrafted Indian silhouette tailored in breathable natural fibers.',
    highlights: highlights.length > 0 ? highlights : ['Handcrafted artisan detailing'],
    fabricAndCare:
      Array.isArray(raw.fabricAndCare) && raw.fabricAndCare.length > 0
        ? raw.fabricAndCare
        : [
            'Dry clean recommended to preserve natural sheen',
            'Store in breathable cotton muslin bag',
          ],
    sizeAndFit:
      raw.sizeAndFit || [
        'Relaxed tailored silhouette',
        'Model is 5\'8" (173 cm) and wears size S',
      ],
    deliveryInfo:
      raw.deliveryInfo ||
      'Complimentary insured express shipping across India. Dispatched within 24–48 business hours.',
    returnsInfo:
      raw.returnsInfo ||
      'Complimentary 14-day easy returns and doorstep size exchanges.',
    reviews: Array.isArray(raw.reviews) ? raw.reviews : [],
  };
}

/**
 * Ensures the PostgreSQL Product table is accessible and purges any legacy auto-seeded static products.
 * Does not run DDL statements directly to protect PgBouncer connection stability.
 */
async function ensureProductsDatabaseReady(): Promise<boolean> {
  if (!process.env.DATABASE_URL || !prisma) return false;
  if (isDbInitializedThisInstance) return true;

  try {
    await prisma.product.deleteMany({
      where: { id: { in: LEGACY_STATIC_PRODUCT_IDS } },
    });
    isDbInitializedThisInstance = true;
    return true;
  } catch (err) {
    console.warn('Database initialization notice:', err);
    isDbInitializedThisInstance = true;
    return true;
  }
}

// GET /api/products — List all dynamic database products or query single product by ?id=
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const dbReady = await ensureProductsDatabaseReady();

    if (dbReady && prisma) {
      try {
        if (id) {
          const single = await prisma.product.findFirst({
            where: {
              OR: [{ id }, { sku: id }],
            },
          });
          if (single) {
            return NextResponse.json({
              success: true,
              product: normalizeProduct(single),
            });
          }
          return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
        } else {
          const dbProducts = await prisma.product.findMany({
            orderBy: { createdAt: 'desc' },
          });
          return NextResponse.json({
            success: true,
            products: dbProducts.map(normalizeProduct),
          });
        }
      } catch (e) {
        console.warn('Prisma fetch notice, falling back to local cache:', e);
      }
    }

    const localProducts = readLocalProducts().map(normalizeProduct);
    if (id) {
      const matched = localProducts.find(
        (p: any) => p.id === id || p.sku?.toLowerCase() === id.toLowerCase()
      );
      if (matched) {
        return NextResponse.json({ success: true, product: matched });
      }
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, products: localProducts });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST /api/products — Add a new product (Admin)
export async function POST(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Administrator access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      sku: customSku,
      category,
      price,
      originalPrice,
      inStock,
      primaryImage,
      secondaryImage,
      gallery,
      description,
      fabric,
      colorName,
      colors,
      sizes,
      sizeStock,
    } = body;

    const fieldErrors: Record<string, string> = {};
    if (!name || !String(name).trim()) {
      fieldErrors.name = 'Garment silhouette name is required.';
    } else if (String(name).trim().length < 3) {
      fieldErrors.name = 'Garment silhouette name must be at least 3 characters.';
    }
    if (!category || !String(category).trim()) {
      fieldErrors.category = 'Collection category is required.';
    }
    const parsedPrice = Number(price);
    if (price === undefined || price === null || price === '' || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      fieldErrors.price = 'Selling price must be a valid amount greater than ₹0.';
    }
    if (originalPrice !== undefined && originalPrice !== null && originalPrice !== '') {
      const parsedOriginal = Number(originalPrice);
      if (Number.isNaN(parsedOriginal) || parsedOriginal <= 0) {
        fieldErrors.originalPrice = 'MRP / Original price must be a valid positive amount in ₹ INR.';
      } else if (!Number.isNaN(parsedPrice) && parsedPrice > 0 && parsedOriginal < parsedPrice) {
        fieldErrors.originalPrice = `MRP / Original price (₹${parsedOriginal}) must be greater than or equal to selling price (₹${parsedPrice}).`;
      }
    }
    const maxDataUrlLength = Math.ceil(5 * 1024 * 1024 * 1.37) + 256;
    if (Array.isArray(gallery) && gallery.length > 10) {
      fieldErrors.gallery = 'Gallery cannot exceed 10 photos per garment.';
    } else if (Array.isArray(gallery)) {
      const oversizedIdx = gallery.findIndex((g: any) => {
        const u = typeof g === 'string' ? g : g?.url;
        return typeof u === 'string' && u.startsWith('data:image/') && u.length > maxDataUrlLength;
      });
      if (oversizedIdx !== -1) {
        fieldErrors.gallery = `Photo #${oversizedIdx + 1} exceeds the 5 MB image size limit.`;
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: Object.values(fieldErrors).join(' '),
          errors: fieldErrors,
        },
        { status: 400 }
      );
    }

    // Persist any inline Data URLs or local garment paths into cloud PostgreSQL image store
    const rawLead = (await persistImageUrlForCloud(primaryImage)) || '';
    const parsedGallery = parseGalleryArray(gallery, rawLead, secondaryImage);
    const cloudGallery: { url: string; label: string; focalClass: string }[] = [];
    for (const item of parsedGallery) {
      const cloudUrl = (await persistImageUrlForCloud(item.url)) || rawLead;
      if (cloudUrl) {
        cloudGallery.push({
          url: cloudUrl,
          label: item.label,
          focalClass: item.focalClass || 'object-center',
        });
      }
    }

    const leadImg = cloudGallery[0]?.url || rawLead;
    if (cloudGallery.length > 0 && leadImg && cloudGallery[0].url !== leadImg) {
      cloudGallery[0] = { ...cloudGallery[0], url: leadImg };
    }

    const persistedSecondary = await persistImageUrlForCloud(secondaryImage);
    const drapeImg = persistedSecondary || cloudGallery[1]?.url || leadImg;

    const cleanCategoryCode =
      category
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 3) || 'GAR';
    const baseSku =
      customSku && String(customSku).trim()
        ? String(customSku).trim().toUpperCase()
        : `AB-${cleanCategoryCode}-${Math.floor(100 + Math.random() * 899)}`;

    const resolvedInStock = typeof inStock === 'boolean' ? inStock : true;
    const resolvedFabric = fabric?.trim() || 'Pure Handloom Chanderi Silk';
    const resolvedColorName =
      colorName?.trim() ||
      resolvedFabric.split(' ').slice(0, 2).join(' ') ||
      'Artisan Handloom';
    const resolvedSizes =
      Array.isArray(sizes) && sizes.length > 0
        ? sizes.map((s: any) => String(s).trim().toUpperCase()).filter(Boolean)
        : ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

    const resolvedColors = Array.isArray(colors)
      ? colors
          .filter((c: any) => c && typeof c.name === 'string' && c.name.trim().length > 0)
          .map((c: any) => ({
            name: String(c.name).trim(),
            hex: String(c.hex || '#6E5043').trim(),
            ...(c.imageUrl ? { imageUrl: String(c.imageUrl).trim() } : {}),
            inStock: typeof c.inStock === 'boolean' ? c.inStock : true,
            stockQuantity: typeof c.stockQuantity === 'number' ? c.stockQuantity : 10,
          }))
      : undefined;

    const newProduct = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sku: baseSku,
      name: name.trim(),
      subtitle: `${resolvedFabric} ${category} silhouette`,
      category,
      price: Number(price),
      originalPrice:
        originalPrice !== undefined && originalPrice !== null && Number(originalPrice) > 0
          ? Number(originalPrice)
          : undefined,
      inStock: resolvedInStock,
      isNewArrival: true,
      isCurated: false,
      primaryImage: leadImg,
      secondaryImage: drapeImg,
      gallery: cloudGallery,
      sizes: resolvedSizes,
      description: description?.trim() || 'Exquisite handcrafted Indian silhouette.',
      fabric: resolvedFabric,
      colorName: resolvedColorName,
      colors: resolvedColors,
      sizeStock: sizeStock && typeof sizeStock === 'object' ? sizeStock : undefined,
      highlights: ['Handcrafted detailing', 'Breathable luxury weave', 'Side seam pockets'],
      fabricAndCare: ['Dry clean only', 'Store in cotton muslin bag'],
      sizeAndFit: ['Relaxed tailored silhouette', 'Model is 5ft 8in wearing Size S'],
      deliveryInfo: 'Dispatched within 24–48 hours via express courier.',
      returnsInfo: '14-day doorstep size exchange.',
      reviews: [],
    };

    const dbReady = await ensureProductsDatabaseReady();

    if (dbReady && prisma) {
      try {
        // Ensure SKU uniqueness in PostgreSQL to prevent unique constraint failure
        let finalSku = newProduct.sku;
        const existingSku = await prisma.product.findUnique({
          where: { sku: finalSku },
        });
        if (existingSku) {
          finalSku = `${finalSku}-${Math.floor(100 + Math.random() * 899)}`;
          newProduct.sku = finalSku;
        }

        const serializedGallery = serializeGalleryForDb(
          newProduct.gallery,
          newProduct.primaryImage,
          newProduct.secondaryImage
        );

        let dbHighlights = resolvedColors && resolvedColors.length > 0
          ? [...newProduct.highlights, `__COLORS__:${JSON.stringify(resolvedColors)}`]
          : newProduct.highlights;

        if (newProduct.sizeStock) {
          dbHighlights = [...dbHighlights, `__SIZE_STOCK__:${JSON.stringify(newProduct.sizeStock)}`];
        }

        const created = await prisma.product.create({
          data: {
            id: newProduct.id,
            sku: finalSku,
            name: newProduct.name,
            category: newProduct.category,
            price: newProduct.price,
            originalPrice: newProduct.originalPrice ?? null,
            inStock: newProduct.inStock,
            isNewArrival: true,
            isCurated: false,
            primaryImage: newProduct.primaryImage,
            secondaryImage: newProduct.secondaryImage,
            gallery: serializedGallery,
            description: newProduct.description,
            fabric: newProduct.fabric,
            colorName: newProduct.colorName,
            sizes: newProduct.sizes,
            highlights: dbHighlights,
            fabricAndCare: newProduct.fabricAndCare,
          },
        });

        const normalized = normalizeProduct(created);
        const localProducts = readLocalProducts();
        localProducts.unshift(normalized);
        saveLocalProducts(localProducts);

        return NextResponse.json({ success: true, product: normalized });
      } catch (dbErr) {
        console.warn('Prisma create fallback notice:', dbErr);
      }
    }

    const localProducts = readLocalProducts();
    localProducts.unshift(newProduct);
    saveLocalProducts(localProducts);

    return NextResponse.json({ success: true, product: normalizeProduct(newProduct) });
  } catch (error: any) {
    console.error('Error adding product:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to create product',
        details: String(error),
      },
      { status: 500 }
    );
  }
}

// PUT /api/products — Edit existing product (Price, Stock toggle, Name, Gallery Images, SKU)
export async function PUT(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Administrator access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Product ID required' }, { status: 400 });
    }

    const putErrors: Record<string, string> = {};
    if (updates.name !== undefined && !String(updates.name).trim()) {
      putErrors.name = 'Garment silhouette name cannot be empty.';
    }
    if (updates.price !== undefined) {
      const p = Number(updates.price);
      if (updates.price === '' || updates.price === null || Number.isNaN(p) || p <= 0) {
        putErrors.price = 'Selling price must be a valid amount greater than ₹0.';
      }
    }
    if (updates.originalPrice !== undefined && updates.originalPrice !== null && updates.originalPrice !== '') {
      const orig = Number(updates.originalPrice);
      const sell = updates.price !== undefined ? Number(updates.price) : NaN;
      if (Number.isNaN(orig) || orig <= 0) {
        putErrors.originalPrice = 'MRP / Original price must be a valid positive amount.';
      } else if (!Number.isNaN(sell) && sell > 0 && orig < sell) {
        putErrors.originalPrice = `MRP / Original price (₹${orig}) must be greater than or equal to selling price (₹${sell}).`;
      }
    }
    if (Array.isArray(updates.gallery) && updates.gallery.length > 10) {
      putErrors.gallery = 'Gallery cannot exceed 10 photos per garment.';
    }
    if (Object.keys(putErrors).length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: Object.values(putErrors).join(' '),
          errors: putErrors,
        },
        { status: 400 }
      );
    }

    // Persist any incoming Data URLs or local garment paths to cloud PostgreSQL image store
    if (updates.primaryImage !== undefined) {
      updates.primaryImage =
        (await persistImageUrlForCloud(updates.primaryImage)) || updates.primaryImage;
    }
    if (updates.secondaryImage !== undefined) {
      updates.secondaryImage =
        (await persistImageUrlForCloud(updates.secondaryImage)) || updates.secondaryImage;
    }
    if (Array.isArray(updates.gallery) && updates.gallery.length > 0) {
      const processedGallery: any[] = [];
      for (const g of updates.gallery) {
        if (typeof g === 'object' && g !== null && g.url) {
          const cloudUrl = (await persistImageUrlForCloud(g.url)) || g.url;
          processedGallery.push({ ...g, url: cloudUrl });
        } else if (typeof g === 'string') {
          const cloudUrl = (await persistImageUrlForCloud(g)) || g;
          processedGallery.push(cloudUrl);
        }
      }
      updates.gallery = processedGallery;
    }

    const dbReady = await ensureProductsDatabaseReady();

    if (dbReady && prisma) {
      try {
        const existingDb = await prisma.product.findUnique({ where: { id } });
        const base = existingDb ? normalizeProduct(existingDb) : null;

        const mergedName =
          updates.name !== undefined ? String(updates.name).trim() : base?.name || 'Garment';
        const mergedCategory =
          updates.category !== undefined ? updates.category : base?.category || 'Anarkali';
        const mergedPrice =
          updates.price !== undefined ? Number(updates.price) : Number(base?.price || 0);
        const mergedOriginalPrice =
          updates.originalPrice !== undefined
            ? updates.originalPrice && Number(updates.originalPrice) > 0
              ? Number(updates.originalPrice)
              : null
            : base?.originalPrice ?? null;
        const mergedInStock =
          updates.inStock !== undefined ? Boolean(updates.inStock) : Boolean(base?.inStock ?? true);
        const mergedPrimaryImage =
          updates.primaryImage !== undefined
            ? updates.primaryImage
            : base?.primaryImage || '';
        const mergedSecondaryImage =
          updates.secondaryImage !== undefined
            ? updates.secondaryImage
            : base?.secondaryImage || mergedPrimaryImage;
        const mergedGallery =
          Array.isArray(updates.gallery) && updates.gallery.length > 0
            ? updates.gallery
            : base?.gallery || [];
        const mergedSizes =
          Array.isArray(updates.sizes) && updates.sizes.length > 0
            ? updates.sizes
            : base?.sizes || ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
        const mergedDescription =
          updates.description !== undefined ? updates.description : base?.description || '';
        const mergedFabric =
          updates.fabric !== undefined ? updates.fabric : base?.fabric || '';
        const mergedColorName =
          updates.colorName !== undefined
            ? updates.colorName
            : base?.colorName || mergedFabric.split(' ').slice(0, 2).join(' ') || 'Artisan Handloom';

        let mergedSku =
          updates.sku !== undefined && String(updates.sku).trim()
            ? String(updates.sku).trim().toUpperCase()
            : base?.sku || `AB-${String(id).toUpperCase().slice(0, 8)}`;

        // Prevent unique SKU collision with a different product
        const skuCollision = await prisma.product.findUnique({
          where: { sku: mergedSku },
        });
        if (skuCollision && skuCollision.id !== id) {
          mergedSku = `${mergedSku}-${Math.floor(100 + Math.random() * 899)}`;
        }

        const serializedGallery = serializeGalleryForDb(
          mergedGallery,
          mergedPrimaryImage,
          mergedSecondaryImage
        );

        const incomingColors = Array.isArray(updates.colors)
          ? updates.colors
              .filter((c: any) => c && typeof c.name === 'string' && c.name.trim().length > 0)
              .map((c: any) => ({
                name: String(c.name).trim(),
                hex: String(c.hex || '#6E5043').trim(),
                ...(c.imageUrl ? { imageUrl: String(c.imageUrl).trim() } : {}),
                inStock: typeof c.inStock === 'boolean' ? c.inStock : true,
                stockQuantity: typeof c.stockQuantity === 'number' ? c.stockQuantity : 10,
              }))
          : base?.colors;

        const incomingSizeStock = updates.sizeStock !== undefined ? updates.sizeStock : base?.sizeStock;

        const baseHighlights = (base?.highlights || ['Handcrafted detailing', 'Breathable luxury weave'])
          .filter(
            (h: any) =>
              typeof h === 'string' &&
              !h.startsWith('__COLORS__:') &&
              !h.startsWith('__SIZE_STOCK__:')
          );

        let highlightsWithMarkers = incomingColors && incomingColors.length > 0
          ? [...baseHighlights, `__COLORS__:${JSON.stringify(incomingColors)}`]
          : baseHighlights;

        if (incomingSizeStock && typeof incomingSizeStock === 'object') {
          highlightsWithMarkers = [...highlightsWithMarkers, `__SIZE_STOCK__:${JSON.stringify(incomingSizeStock)}`];
        }

        const prismaData = {
          sku: mergedSku,
          name: mergedName,
          category: mergedCategory,
          price: mergedPrice,
          originalPrice: mergedOriginalPrice,
          inStock: mergedInStock,
          primaryImage: mergedPrimaryImage,
          secondaryImage: mergedSecondaryImage,
          gallery: serializedGallery,
          sizes: mergedSizes,
          description: mergedDescription,
          fabric: mergedFabric,
          colorName: mergedColorName,
          highlights: highlightsWithMarkers,
        };

        const updated = await prisma.product.upsert({
          where: { id },
          update: prismaData,
          create: {
            id,
            ...prismaData,
            highlights: highlightsWithMarkers,
            fabricAndCare: base?.fabricAndCare || ['Dry clean recommended'],
          },
        });

        const normalized = normalizeProduct(updated);
        const localProducts = readLocalProducts();
        const lIdx = localProducts.findIndex((p: any) => p.id === id);
        if (lIdx !== -1) {
          localProducts[lIdx] = normalized;
        } else {
          localProducts.unshift(normalized);
        }
        saveLocalProducts(localProducts);

        return NextResponse.json({ success: true, product: normalized });
      } catch (dbErr) {
        console.warn('Prisma upsert fallback notice:', dbErr);
      }
    }

    const localProducts = readLocalProducts();
    const index = localProducts.findIndex((p: any) => p.id === id);
    if (index === -1) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const existing = localProducts[index];
    let nextGallery = existing.gallery || [];

    if (Array.isArray(updates.gallery) && updates.gallery.length > 0) {
      nextGallery = updates.gallery;
    } else if (updates.primaryImage) {
      const newPrimary = updates.primaryImage.trim();
      if (Array.isArray(nextGallery) && nextGallery.length > 0) {
        nextGallery = [
          { ...(typeof nextGallery[0] === 'object' ? nextGallery[0] : {}), url: newPrimary },
          ...nextGallery.slice(1),
        ];
      } else {
        nextGallery = [
          { url: newPrimary, label: 'Full Studio Silhouette', focalClass: 'object-center' },
        ];
      }
    }

    localProducts[index] = normalizeProduct({
      ...existing,
      ...updates,
      gallery: nextGallery,
      ...(updates.colors !== undefined ? { colors: updates.colors } : {}),
      ...(updates.sizeStock !== undefined ? { sizeStock: updates.sizeStock } : {}),
    });
    saveLocalProducts(localProducts);

    return NextResponse.json({ success: true, product: localProducts[index] });
  } catch (error: any) {
    console.error('PUT /api/products error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to update product',
        details: String(error),
      },
      { status: 500 }
    );
  }
}

// PATCH /api/products — Fast 1-click stock status toggling (size-wise, color-wise, or master)
export async function PATCH(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Administrator access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, size, inStock, quantity, colorName, sizeStock, colors } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Product ID required' }, { status: 400 });
    }

    const dbReady = await ensureProductsDatabaseReady();
    let currentProduct: any = null;

    if (dbReady && prisma) {
      try {
        const p = await prisma.product.findUnique({ where: { id } });
        if (p) currentProduct = normalizeProduct(p);
      } catch {}
    }

    if (!currentProduct) {
      const localProducts = readLocalProducts();
      const found = localProducts.find((p: any) => p.id === id);
      if (found) currentProduct = normalizeProduct(found);
    }

    if (!currentProduct) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const updates: any = {};

    // 1. Overall inStock toggle
    if (inStock !== undefined && size === undefined && colorName === undefined && sizeStock === undefined) {
      updates.inStock = Boolean(inStock);
    }

    // 2. Specific size toggle / quantity update
    if (size) {
      const currentSizeStock = { ...(currentProduct.sizeStock || {}) };
      const cur = currentSizeStock[size] || { inStock: true, quantity: 10 };
      currentSizeStock[size] = {
        inStock: inStock !== undefined ? Boolean(inStock) : !cur.inStock,
        quantity: quantity !== undefined ? Number(quantity) : (cur.quantity ?? 10),
      };
      updates.sizeStock = currentSizeStock;
    }

    // 3. Full sizeStock map
    if (sizeStock && typeof sizeStock === 'object') {
      updates.sizeStock = sizeStock;
    }

    // 4. Specific color toggle / quantity update
    if (colorName) {
      let currentColors = [...(currentProduct.colors || [])];
      if (currentColors.length === 0 && currentProduct.colorName) {
        currentColors = [
          {
            name: currentProduct.colorName,
            hex: currentProduct.colorHex || '#6E5043',
            inStock: true,
            stockQuantity: 10,
          },
        ];
      }
      const cIdx = currentColors.findIndex(
        (c: any) => String(c.name).toLowerCase() === String(colorName).toLowerCase()
      );
      if (cIdx !== -1) {
        currentColors[cIdx] = {
          ...currentColors[cIdx],
          inStock: inStock !== undefined ? Boolean(inStock) : !currentColors[cIdx].inStock,
          ...(quantity !== undefined ? { stockQuantity: Number(quantity) } : {}),
        };
        updates.colors = currentColors;
      }
    }

    // 5. Full colors array
    if (colors && Array.isArray(colors)) {
      updates.colors = colors;
    }

    const synthesizedReq = new Request('http://localhost/api/products', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') || '',
      },
      body: JSON.stringify({ id, ...updates }),
    });

    return PUT(synthesizedReq);
  } catch (error: any) {
    console.error('PATCH /api/products error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to patch product stock',
        details: String(error),
      },
      { status: 500 }
    );
  }
}

// DELETE /api/products — Delete a product
export async function DELETE(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Administrator access required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Product ID required' }, { status: 400 });
    }

    const dbReady = await ensureProductsDatabaseReady();

    if (dbReady && prisma) {
      try {
        await prisma.product.deleteMany({ where: { id } });
      } catch (dbErr) {
        console.warn('Prisma delete fallback notice:', dbErr);
      }
    }

    const localProducts = readLocalProducts();
    const filtered = localProducts.filter((p: any) => p.id !== id);
    saveLocalProducts(filtered);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/products error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to delete product',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
