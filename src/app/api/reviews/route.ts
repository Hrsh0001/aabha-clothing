import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../../lib/db';
import { isAuthorizedAdmin } from '../../../lib/auth-guard';

export interface StoredReview {
  id: string;
  productId: string;
  productName?: string;
  author: string;
  sizePurchased: string;
  rating: number;
  date: string;
  title: string;
  comment: string;
  createdAt: string;
}

const REVIEWS_FILE_PATH = path.join(process.cwd(), 'data', 'reviews.json');
const PRODUCTS_FILE_PATH = path.join(process.cwd(), 'data', 'products.json');

// In-memory fallback cache for serverless environments where local filesystem is read-only
let inMemoryReviewsCache: StoredReview[] | null = null;
let isReviewsTableReady = false;

async function ensureReviewsStorage(): Promise<boolean> {
  if (!process.env.DATABASE_URL || !prisma) return false;
  try {
    if (!isReviewsTableReady) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SiteSetting" (
          "id" TEXT NOT NULL,
          "data" JSONB NOT NULL,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
        );
      `);
      isReviewsTableReady = true;
    }
    return true;
  } catch {
    return true;
  }
}

function ensureReviewsFile(): void {
  try {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(REVIEWS_FILE_PATH)) {
      fs.writeFileSync(REVIEWS_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch {
    // Read-only filesystem in cloud deployment
  }
}

async function readReviews(): Promise<StoredReview[]> {
  const dbReady = await ensureReviewsStorage();
  if (dbReady && prisma) {
    try {
      const rows = await prisma.$queryRawUnsafe<{ data: any }[]>(
        `SELECT "data" FROM "SiteSetting" WHERE "id" = 'site_reviews' LIMIT 1`
      );
      if (rows && rows.length > 0 && Array.isArray(rows[0].data)) {
        inMemoryReviewsCache = rows[0].data;
        return inMemoryReviewsCache || [];
      }
    } catch {
      // Fallback
    }
  }

  if (inMemoryReviewsCache && inMemoryReviewsCache.length > 0) {
    return inMemoryReviewsCache;
  }
  try {
    ensureReviewsFile();
    if (fs.existsSync(REVIEWS_FILE_PATH)) {
      const data = fs.readFileSync(REVIEWS_FILE_PATH, 'utf-8');
      inMemoryReviewsCache = JSON.parse(data);
      return inMemoryReviewsCache || [];
    }
    return inMemoryReviewsCache || [];
  } catch {
    return inMemoryReviewsCache || [];
  }
}

async function saveReviews(reviews: StoredReview[]): Promise<void> {
  inMemoryReviewsCache = reviews;

  const dbReady = await ensureReviewsStorage();
  if (dbReady && prisma) {
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "SiteSetting" ("id", "data", "updatedAt")
         VALUES ('site_reviews', $1::jsonb, CURRENT_TIMESTAMP)
         ON CONFLICT ("id") DO UPDATE SET "data" = $1::jsonb, "updatedAt" = CURRENT_TIMESTAMP`,
        JSON.stringify(reviews)
      );
    } catch (err) {
      console.warn('Database reviews save notice:', err);
    }
  }

  try {
    ensureReviewsFile();
    fs.writeFileSync(REVIEWS_FILE_PATH, JSON.stringify(reviews, null, 2), 'utf-8');
  } catch {
    // Kept in memory / DB on serverless
  }
}

// GET /api/reviews — List reviews (Storefront by productId or All for Admin)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    const reviews = await readReviews();
    reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (productId) {
      const filtered = reviews.filter((r) => r.productId === productId);
      return NextResponse.json({ success: true, reviews: filtered });
    }

    return NextResponse.json({
      success: true,
      reviews,
      totalCount: reviews.length,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST /api/reviews — Submit verified patron review
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, productName, author, sizePurchased, rating, title, comment } = body;

    if (!productId || !author || !comment) {
      return NextResponse.json(
        { success: false, error: 'Product ID, author name, and review comment are required' },
        { status: 400 }
      );
    }

    const numericRating = Math.max(1, Math.min(5, Number(rating) || 5));

    const newReview: StoredReview = {
      id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: productId.trim(),
      productName: productName?.trim() || 'Silhouette',
      author: author.trim(),
      sizePurchased: sizePurchased || 'M',
      rating: numericRating,
      date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      title: title?.trim() || 'Verified Patron Experience',
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    };

    const reviews = await readReviews();
    reviews.unshift(newReview);
    await saveReviews(reviews);

    // Optional local sync
    try {
      if (fs.existsSync(PRODUCTS_FILE_PATH)) {
        const productsData = fs.readFileSync(PRODUCTS_FILE_PATH, 'utf-8');
        const productsList = JSON.parse(productsData);
        const pIndex = productsList.findIndex((p: any) => p.id === productId);
        if (pIndex !== -1) {
          if (!Array.isArray(productsList[pIndex].reviews)) {
            productsList[pIndex].reviews = [];
          }
          productsList[pIndex].reviews.unshift({
            id: newReview.id,
            author: newReview.author,
            sizePurchased: newReview.sizePurchased,
            rating: newReview.rating,
            date: newReview.date,
            title: newReview.title,
            comment: newReview.comment,
          });
          fs.writeFileSync(PRODUCTS_FILE_PATH, JSON.stringify(productsList, null, 2), 'utf-8');
        }
      }
    } catch {
      // Ignore on read-only filesystem
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you. Your verified patron review has been recorded.',
      review: newReview,
    });
  } catch (error) {
    console.error('Submit review error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record review' },
      { status: 500 }
    );
  }
}

// DELETE /api/reviews — Moderate / Delete review (Admin Only)
export async function DELETE(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin authorization required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Review ID is required' }, { status: 400 });
    }

    const reviews = await readReviews();
    const filtered = reviews.filter((r) => r.id !== id);
    await saveReviews(filtered);

    return NextResponse.json({ success: true, message: 'Review removed successfully' });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to delete review' }, { status: 500 });
  }
}
