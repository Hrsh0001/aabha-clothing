import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
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

function ensureReviewsFile(): void {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(REVIEWS_FILE_PATH)) {
    fs.writeFileSync(REVIEWS_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
  }
}

function readReviews(): StoredReview[] {
  try {
    ensureReviewsFile();
    const data = fs.readFileSync(REVIEWS_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function saveReviews(reviews: StoredReview[]): void {
  ensureReviewsFile();
  fs.writeFileSync(REVIEWS_FILE_PATH, JSON.stringify(reviews, null, 2), 'utf-8');
}

// GET /api/reviews — List reviews (Storefront by productId or All for Admin)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    const reviews = readReviews();
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

    // Strict validation
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

    // 1. Save to data/reviews.json
    const reviews = readReviews();
    reviews.unshift(newReview);
    saveReviews(reviews);

    // 2. Also sync into data/products.json if product exists
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
    } catch (syncErr) {
      console.warn('Failed to sync review into products.json:', syncErr);
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

    const reviews = readReviews();
    const filtered = reviews.filter((r) => r.id !== id);
    saveReviews(filtered);

    return NextResponse.json({ success: true, message: 'Review removed successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete review' }, { status: 500 });
  }
}
