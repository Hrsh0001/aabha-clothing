'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Product, CollectionFilter, GarmentSize, ProductReview } from '@/src/data/products';
import { Header, ActivePage } from '@/src/components/Header';
import { ProductDetailPage } from '@/src/components/ProductDetailPage';
import { Footer } from '@/src/components/Footer';
import { CartDrawer, WishlistDrawer, SearchModal, CartItem } from '@/src/components/Drawers';
import { useAuth } from '@/src/context/AuthContext';
import type { SiteSettings } from '../../api/settings/route';
import { Package, ArrowLeft, RefreshCw } from 'lucide-react';

interface DynamicProductPageProps {
  params: Promise<{ id: string }>;
}

export default function DynamicProductPage({ params }: DynamicProductPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const productId = resolvedParams.id;

  const [products, setProducts] = useState<Product[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);

  // Cart & Wishlist
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [wishlistDrawerOpen, setWishlistDrawerOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { setAuthModalOpen } = useAuth();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((c) => (c === msg ? null : c));
    }, 2600);
  };

  // Load cart & wishlist from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('aabha_cart_v1');
      if (savedCart) setCartItems(JSON.parse(savedCart));
      const savedWishlist = localStorage.getItem('aabha_wishlist_v1');
      if (savedWishlist) setWishlistIds(JSON.parse(savedWishlist));
    } catch (e) {}
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('aabha_cart_v1', JSON.stringify(cartItems));
    } catch (e) {}
  }, [cartItems]);

  // Save wishlist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('aabha_wishlist_v1', JSON.stringify(wishlistIds));
    } catch (e) {}
  }, [wishlistIds]);

  // Fetch live products and settings from API
  useEffect(() => {
    setLoading(true);
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.products)) {
          setProducts(data.products);
          const found = data.products.find(
            (p: Product) => p.id === productId || p.sku?.toLowerCase() === productId.toLowerCase()
          );
          setProduct(found || null);
        } else {
          setProduct(null);
        }
      })
      .catch(() => {
        setProduct(null);
      })
      .finally(() => {
        setLoading(false);
      });

    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) setSiteSettings(data.settings);
      })
      .catch(() => {});
  }, [productId]);

  const handleAddToCart = (prod: Product, size: GarmentSize, quantity: number = 1, openDrawer = true) => {
    setCartItems((prev) => {
      const existing = prev.findIndex((i) => i.product.id === prod.id && i.size === size);
      if (existing > -1) {
        const updated = [...prev];
        updated[existing] = {
          ...updated[existing],
          quantity: updated[existing].quantity + quantity,
        };
        return updated;
      }
      return [...prev, { product: prod, size, quantity }];
    });

    if (openDrawer) {
      setCartDrawerOpen(true);
    } else {
      showToast(`Added ${prod.name} (Size ${size}) to Shopping Bag`);
    }
  };

  const handleBuyNow = (prod: Product, size: GarmentSize, quantity: number) => {
    handleAddToCart(prod, size, quantity, false);
    // Redirect to root with checkout active
    router.push('/?checkout=1');
  };

  const handleToggleWishlist = (pId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = products.find((p) => p.id === pId) || product;
    setWishlistIds((prev) => {
      if (prev.includes(pId)) {
        if (target) showToast(`Removed ${target.name} from Wishlist`);
        return prev.filter((id) => id !== pId);
      } else {
        if (target) showToast(`Saved ${target.name} to Wishlist`);
        return [...prev, pId];
      }
    });
  };

  const handleQuickAdd = (prod: Product, size: GarmentSize, e: React.MouseEvent) => {
    e.stopPropagation();
    handleAddToCart(prod, size, 1, false);
  };

  const handleAddReview = async (
    pId: string,
    newReview: Omit<ProductReview, 'id' | 'date'>
  ) => {
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: pId,
          productName: product?.name || 'Handloom Silhouette',
          author: newReview.author,
          sizePurchased: newReview.sizePurchased,
          rating: newReview.rating,
          title: newReview.title,
          comment: newReview.comment,
        }),
      });
      const data = await res.json();
      const reviewObj: ProductReview = {
        ...newReview,
        id: data?.review?.id || `rev-${Date.now()}`,
        date: data?.review?.date || 'October 2026',
      };
      if (product) {
        setProduct({
          ...product,
          reviews: [reviewObj, ...(product.reviews || [])],
        });
      }
      showToast('Thank you. Your verified patron review has been recorded.');
    } catch {
      showToast('Thank you. Your review has been submitted.');
    }
  };

  const totalCartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-[#6E5043] animate-spin" />
        <p className="font-serif text-lg text-[#1E1B18]">Loading Handcrafted Silhouette...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Package className="w-12 h-12 text-[#9E948A] stroke-[1.2]" />
        <h1 className="font-serif text-3xl text-[#1E1B18]">Garment Not Found</h1>
        <p className="text-sm text-[#7C736A] max-w-md">
          The requested silhouette "{productId}" could not be located in our launch collection catalog.
        </p>
        <Link
          href="/"
          className="px-6 py-3 bg-[#231F1D] text-[#FAF8F5] text-xs uppercase tracking-wider font-medium hover:bg-[#14110E] transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Storefront</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#1E1B18] font-sans">
      <Header
        activePage="product"
        selectedCategory="All Collection"
        wishlistCount={wishlistIds.length}
        cartCount={totalCartCount}
        products={products}
        onNavigateHome={() => router.push('/')}
        onNavigateNewArrivals={() => router.push('/#new-arrivals')}
        onNavigateShopCategory={(cat) =>
          router.push(
            cat && cat !== 'All Collection'
              ? `/?page=shop&category=${encodeURIComponent(cat)}`
              : '/?page=shop'
          )
        }
        onNavigateAbout={() => router.push('/?page=about')}
        onNavigateContact={() => router.push('/?page=contact')}
        onOpenSearch={() => setSearchModalOpen(true)}
        onOpenWishlist={() => setWishlistDrawerOpen(true)}
        onOpenCart={() => setCartDrawerOpen(true)}
        onOpenAccount={() => setAuthModalOpen(true)}
        logoUrl={siteSettings?.logoUrl}
        announcementText={siteSettings?.announcementText}
        navLinks={siteSettings?.navLinks}
        siteSettings={siteSettings}
        onNavigatePolicy={(topic) => router.push(`/?page=policy&topic=${topic}`)}
      />

      <main className="flex-1">
        <ProductDetailPage
          product={product}
          allProducts={products}
          wishlistIds={wishlistIds}
          onBackToShop={() => router.push('/?page=shop')}
          onSelectCategory={(cat) =>
            router.push(
              cat
                ? `/?page=shop&category=${encodeURIComponent(cat)}`
                : '/?page=shop'
            )
          }
          onSelectProduct={(p) => router.push(`/product/${p.id}`)}
          onAddToCart={(p, sz, qty) => handleAddToCart(p, sz, qty, true)}
          onBuyNow={handleBuyNow}
          onToggleWishlist={handleToggleWishlist}
          onQuickAdd={handleQuickAdd}
          onAddReview={handleAddReview}
        />
      </main>

      <Footer
        onNavigateHome={() => router.push('/')}
        onNavigateCategory={(cat) =>
          router.push(
            cat === 'All Collection'
              ? '/?page=shop'
              : `/?page=shop&category=${encodeURIComponent(cat)}`
          )
        }
        onNavigateAbout={() => router.push('/?page=about')}
        onNavigateContact={() => router.push('/?page=contact')}
        onNavigatePolicy={(topic) => router.push(`/?page=policy&topic=${topic}`)}
        logoUrl={siteSettings?.logoUrl}
        siteSettings={siteSettings}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={cartDrawerOpen}
        items={cartItems}
        onClose={() => setCartDrawerOpen(false)}
        onUpdateQuantity={(pId, sz, delta) => {
          setCartItems((prev) =>
            prev
              .map((it) => (it.product.id === pId && it.size === sz ? { ...it, quantity: it.quantity + delta } : it))
              .filter((it) => it.quantity > 0)
          );
        }}
        onRemoveItem={(pId, sz) => {
          setCartItems((prev) => prev.filter((it) => !(it.product.id === pId && it.size === sz)));
        }}
        onProceedToCheckout={() => {
          setCartDrawerOpen(false);
          router.push('/?checkout=1');
        }}
        onSelectProduct={(p) => router.push(`/product/${p.id}`)}
      />

      {/* Wishlist Drawer */}
      <WishlistDrawer
        isOpen={wishlistDrawerOpen}
        products={products}
        wishlistIds={wishlistIds}
        onClose={() => setWishlistDrawerOpen(false)}
        onRemoveWishlist={handleToggleWishlist}
        onMoveToCart={(p, sz) => {
          handleAddToCart(p, sz, 1, false);
          setWishlistDrawerOpen(false);
          setCartDrawerOpen(true);
        }}
        onSelectProduct={(p) => router.push(`/product/${p.id}`)}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={searchModalOpen}
        products={products}
        onClose={() => setSearchModalOpen(false)}
        onSelectProduct={(p) => {
          setSearchModalOpen(false);
          router.push(`/product/${p.id}`);
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E1B18] text-[#FAF8F5] px-5 py-3 text-xs sm:text-sm tracking-wide shadow-xl border border-[#3D3732]">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
