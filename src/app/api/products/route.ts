import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../../lib/db';
import { PRODUCTS } from '../../../data/products';
import { isAuthorizedAdmin } from '../../../lib/auth-guard';

const PRODUCTS_FILE_PATH = path.join(process.cwd(), 'data', 'products.json');

function ensureProductsFile(): void {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(PRODUCTS_FILE_PATH)) {
    // Seed with the inaugural 17 products
    fs.writeFileSync(PRODUCTS_FILE_PATH, JSON.stringify(PRODUCTS, null, 2), 'utf-8');
  }
}

// In-memory fallback cache for serverless environments where local filesystem is read-only
let inMemoryProductsCache: any[] | null = null;

function readLocalProducts(): any[] {
  if (inMemoryProductsCache && inMemoryProductsCache.length > 0) {
    return inMemoryProductsCache;
  }
  try {
    ensureProductsFile();
    const data = fs.readFileSync(PRODUCTS_FILE_PATH, 'utf-8');
    inMemoryProductsCache = JSON.parse(data);
    return inMemoryProductsCache;
  } catch (err) {
    return inMemoryProductsCache || PRODUCTS;
  }
}

function saveLocalProducts(products: any[]): void {
  inMemoryProductsCache = products;
  try {
    ensureProductsFile();
    fs.writeFileSync(PRODUCTS_FILE_PATH, JSON.stringify(products, null, 2), 'utf-8');
  } catch (fsErr) {
    console.warn('Serverless filesystem notice (kept in memory cache):', fsErr);
  }
}

// GET /api/products — List all products or query single product by ?id= (Storefront & Admin)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (process.env.DATABASE_URL && prisma) {
      try {
        if (id) {
          const single = await prisma.product.findUnique({ where: { id } });
          if (single) {
            return NextResponse.json({ success: true, product: single });
          }
        } else {
          const dbProducts = await prisma.product.findMany({
            orderBy: { createdAt: 'desc' },
          });
          if (dbProducts.length > 0) {
            return NextResponse.json({ success: true, products: dbProducts });
          }
        }
      } catch (e) {
        console.warn('Prisma fetch notice, falling back to local file:', e);
      }
    }

    const localProducts = readLocalProducts();
    if (id) {
      const matched = localProducts.find((p: any) => p.id === id || p.sku === id);
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
      category,
      price,
      originalPrice,
      primaryImage,
      secondaryImage,
      gallery,
      description,
      fabric,
      sizes,
    } = body;

    if (!name || !category || !price) {
      return NextResponse.json(
        { success: false, error: 'Name, category, and price are required' },
        { status: 400 }
      );
    }

    const leadImg = primaryImage?.trim() || '/images/hero_editorial_banner_1791119088652.jpg';
    const drapeImg = secondaryImage?.trim() || leadImg;

    // Build dynamic gallery array
    let resolvedGallery = Array.isArray(gallery) && gallery.length > 0 ? gallery : [];
    if (resolvedGallery.length === 0) {
      resolvedGallery = [
        { url: leadImg, label: 'Full Studio Silhouette', focalClass: 'object-center' },
        { url: drapeImg, label: 'Editorial Drape', focalClass: 'object-center' },
      ];
    } else {
      // Ensure first item is primary image
      if (resolvedGallery[0]?.url !== leadImg) {
        resolvedGallery[0] = { ...resolvedGallery[0], url: leadImg };
      }
    }

    const sku = `AB-${category.toUpperCase().replace(/\s+/g, '').slice(0, 3)}-${Math.floor(100 + Math.random() * 899)}`;
    const newProduct = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sku,
      name: name.trim(),
      subtitle: `${fabric || 'Handloom'} ${category} silhouette`,
      category,
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      inStock: true,
      isNewArrival: true,
      isCurated: false,
      primaryImage: leadImg,
      secondaryImage: drapeImg,
      gallery: resolvedGallery,
      sizes: sizes && sizes.length > 0 ? sizes : ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      description: description?.trim() || 'Exquisite handcrafted Indian silhouette.',
      fabric: fabric?.trim() || 'Pure Handloom Chanderi Silk',
      highlights: ['Handcrafted detailing', 'Breathable luxury weave', 'Side seam pockets'],
      fabricAndCare: ['Dry clean only', 'Store in cotton muslin bag'],
      sizeAndFit: ['Relaxed tailored silhouette', 'Model is 5ft 8in wearing Size S'],
      deliveryInfo: 'Dispatched within 24–48 hours via express courier.',
      returnsInfo: '14-day doorstep size exchange.',
      reviews: [],
    };

    if (process.env.DATABASE_URL && prisma) {
      try {
        const created = await prisma.product.create({
          data: {
            sku: newProduct.sku,
            name: newProduct.name,
            category: newProduct.category,
            price: newProduct.price,
            originalPrice: newProduct.originalPrice,
            inStock: true,
            primaryImage: newProduct.primaryImage,
            description: newProduct.description,
            fabric: newProduct.fabric,
            sizes: newProduct.sizes,
          },
        });
        return NextResponse.json({ success: true, product: created });
      } catch (dbErr) {
        console.warn('Prisma create fallback notice:', dbErr);
      }
    }

    const localProducts = readLocalProducts();
    localProducts.unshift(newProduct);
    saveLocalProducts(localProducts);

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error) {
    console.error('Error adding product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create product' },
      { status: 500 }
    );
  }
}

// PUT /api/products — Edit existing product (Price, Stock toggle, Name, Gallery Images)
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

    if (process.env.DATABASE_URL && prisma) {
      try {
        const galleryUrls: string[] = Array.isArray(updates.gallery)
          ? updates.gallery
              .map((g: any) => (typeof g === 'string' ? g : g?.url || ''))
              .filter(Boolean)
          : [];

        const prismaData: any = {
          name: updates.name,
          category: updates.category,
          price: Number(updates.price),
          originalPrice: updates.originalPrice ? Number(updates.originalPrice) : null,
          inStock: updates.inStock !== undefined ? Boolean(updates.inStock) : true,
          primaryImage: updates.primaryImage || '',
          secondaryImage: updates.secondaryImage || null,
          gallery: galleryUrls,
          sizes: Array.isArray(updates.sizes) ? updates.sizes : ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
          description: updates.description || '',
          fabric: updates.fabric || '',
        };

        const updated = await prisma.product.upsert({
          where: { id },
          update: prismaData,
          create: {
            id,
            sku: updates.sku || `AB-${id.toUpperCase().slice(0, 8)}`,
            ...prismaData,
          },
        });
        return NextResponse.json({ success: true, product: updated });
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
          { ...nextGallery[0], url: newPrimary },
          ...nextGallery.slice(1),
        ];
      } else {
        nextGallery = [
          { url: newPrimary, label: 'Full Studio Silhouette', focalClass: 'object-center' },
        ];
      }
    }

    localProducts[index] = {
      ...existing,
      ...updates,
      gallery: nextGallery,
    };
    saveLocalProducts(localProducts);

    return NextResponse.json({ success: true, product: localProducts[index] });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update product' }, { status: 500 });
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

    if (process.env.DATABASE_URL && prisma) {
      try {
        await prisma.product.delete({ where: { id } });
        return NextResponse.json({ success: true });
      } catch (dbErr) {
        console.warn('Prisma delete fallback notice:', dbErr);
      }
    }

    const localProducts = readLocalProducts();
    const filtered = localProducts.filter((p: any) => p.id !== id);
    saveLocalProducts(filtered);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete product' }, { status: 500 });
  }
}
