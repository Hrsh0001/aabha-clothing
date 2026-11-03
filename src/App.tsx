'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Product,
  CollectionFilter,
  GarmentSize,
  ProductReview,
} from './data/products';
import { PRODUCTS } from './data/products';
import { Header, ActivePage } from './components/Header';
import { HomePage } from './components/HomePage';
import { ShopPage } from './components/ShopPage';
import { ProductDetailPage } from './components/ProductDetailPage';
import { CartDrawer, WishlistDrawer, SearchModal, CartItem } from './components/Drawers';
import { CheckoutPage } from './components/CheckoutPage';
import { AboutPage, ContactPage, PolicyPage, PolicyTopic } from './components/InfoPages';
import { CustomPageView } from './components/CustomPageView';
import { Footer } from './components/Footer';
import { AtelierSkeleton } from './components/AtelierSkeleton';
import { useAuth } from './context/AuthContext';
import { type SiteSettings, DEFAULT_SETTINGS } from './lib/site-settings';

const getInitialProducts = (): Product[] => {
  if (typeof window === 'undefined') return PRODUCTS;
  try {
    const local = localStorage.getItem('aabha_products_cache_v2');
    if (local) {
      const p = JSON.parse(local);
      if (Array.isArray(p) && p.length > 0) return p;
    }
    const session = sessionStorage.getItem('aabha_products_cache');
    if (session) {
      const p = JSON.parse(session);
      if (Array.isArray(p) && p.length > 0) return p;
    }
  } catch {}
  return PRODUCTS;
};

const getInitialSettings = (): SiteSettings => {
  try {
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('aabha_settings_cache_v2');
      if (local) {
        const s = JSON.parse(local);
        if (s) return { ...DEFAULT_SETTINGS, ...s };
      }
      const session = sessionStorage.getItem('aabha_settings_cache');
      if (session) {
        const s = JSON.parse(session);
        if (s) return { ...DEFAULT_SETTINGS, ...s };
      }
    }
  } catch {}
  return DEFAULT_SETTINGS;
};

export default function App() {
  const [products, setProducts] = useState<Product[]>(getInitialProducts);
  const [productsLoading, setProductsLoading] = useState<boolean>(false);
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [selectedCategory, setSelectedCategory] = useState<CollectionFilter>('All Collection');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [policyTopic, setPolicyTopic] = useState<PolicyTopic>('shipping');

  // Hydration-safe Persistent Wishlist & Cart
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(getInitialSettings);
  const [customPageSlug, setCustomPageSlug] = useState<string>('our-craft');

  const { setAuthModalOpen } = useAuth();

  // Drawers & Modals
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [wishlistDrawerOpen, setWishlistDrawerOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedWishlist = localStorage.getItem('aabha_wishlist_v1');
      if (savedWishlist) {
        setWishlistIds(JSON.parse(savedWishlist));
      }
      const savedCart = localStorage.getItem('aabha_cart_v1');
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      }
      const params = new URLSearchParams(window.location.search);
      const path = typeof window !== 'undefined' ? window.location.pathname : '/';

      let initialPage: ActivePage = 'home';
      let initialProductId = '';
      let initialCategory: CollectionFilter = 'All Collection';
      let initialSlug = 'our-craft';
      let initialTopic: PolicyTopic = 'shipping';

      const prodParam = params.get('product') || params.get('productId');
      if (prodParam) {
        initialPage = 'product';
        initialProductId = prodParam;
        setSelectedProductId(prodParam);
        setActivePage('product');
      } else if (params.get('checkout') === '1' || path === '/checkout') {
        initialPage = 'checkout';
        setActivePage('checkout');
      } else {
        const pageParam = params.get('page');
        if (pageParam === 'custom') {
          initialPage = 'custom';
          setActivePage('custom');
          const slugParam = params.get('slug');
          if (slugParam) {
            initialSlug = slugParam;
            setCustomPageSlug(slugParam);
          }
        } else if (path.startsWith('/pages/') || path.startsWith('/page/')) {
          const match = path.match(/\/pages?\/([^?#/]+)/);
          if (match) {
            initialPage = 'custom';
            initialSlug = match[1];
            setActivePage('custom');
            setCustomPageSlug(match[1]);
          }
        } else if (
          pageParam === 'about' ||
          pageParam === 'contact' ||
          pageParam === 'policy' ||
          pageParam === 'shop'
        ) {
          initialPage = pageParam;
          setActivePage(pageParam);
        } else if (path === '/shop') {
          initialPage = 'shop';
          setActivePage('shop');
        } else if (path === '/about') {
          initialPage = 'about';
          setActivePage('about');
        } else if (path === '/contact') {
          initialPage = 'contact';
          setActivePage('contact');
        } else if (path === '/policy') {
          initialPage = 'policy';
          setActivePage('policy');
        }
      }

      const catParam = params.get('category');
      if (catParam) {
        const decodedCat = decodeURIComponent(catParam) as CollectionFilter;
        initialCategory = decodedCat;
        setSelectedCategory(decodedCat);
        if (!prodParam) {
          initialPage = 'shop';
          setActivePage('shop');
        }
      }

      const topicParam = params.get('topic');
      if (topicParam) {
        initialTopic = topicParam as PolicyTopic;
        setPolicyTopic(topicParam as PolicyTopic);
        if (!prodParam) {
          initialPage = 'policy';
          setActivePage('policy');
        }
      }

      // Initialize browser history entry so mobile hardware/swipe Back button works reliably
      if (typeof window !== 'undefined') {
        if (!window.history.state || !window.history.state.page) {
          window.history.replaceState(
            {
              page: initialPage,
              productId: initialProductId,
              category: initialCategory,
              customPageSlug: initialSlug,
              topic: initialTopic,
            },
            ''
          );
        }

        // Smooth scroll if URL has a hash anchor on load
        if (window.location.hash) {
          const targetId = window.location.hash.replace('#', '');
          setTimeout(() => {
            const el = document.getElementById(targetId);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 150);
        }

        const handlePopState = (event: PopStateEvent) => {
          const state = event.state;
          if (state && state.page) {
            setActivePage(state.page);
            if (state.productId !== undefined) setSelectedProductId(state.productId);
            if (state.category !== undefined) setSelectedCategory(state.category);
            if (state.customPageSlug !== undefined) setCustomPageSlug(state.customPageSlug);
            if (state.topic !== undefined) setPolicyTopic(state.topic);
          } else {
            // Reverted back to the root entry point: return to homepage
            setActivePage('home');
            setSelectedProductId('');
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
      }
    } catch {
      // ignore
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem('aabha_wishlist_v1', JSON.stringify(wishlistIds));
    } catch {
      // ignore
    }
  }, [wishlistIds, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem('aabha_cart_v1', JSON.stringify(cartItems));
    } catch {
      // ignore
    }
  }, [cartItems, isHydrated]);

  useEffect(() => {
    // 1. Immediate cache rehydration from localStorage / sessionStorage
    try {
      const localP = localStorage.getItem('aabha_products_cache_v2');
      const sessionP = sessionStorage.getItem('aabha_products_cache');
      const cachedP = localP || sessionP;
      if (cachedP) {
        const p = JSON.parse(cachedP);
        if (Array.isArray(p) && p.length > 0) {
          setProducts(p);
        }
      }
      const localS = localStorage.getItem('aabha_settings_cache_v2');
      const sessionS = sessionStorage.getItem('aabha_settings_cache');
      const cachedS = localS || sessionS;
      if (cachedS) {
        const s = JSON.parse(cachedS);
        if (s) setSiteSettings(s);
      }
    } catch {}

    // 2. Preload the primary hero image for immediate 0s first paint on mobile
    if (typeof window !== 'undefined') {
      const bannerToPreload = siteSettings.heroBanner || '/images/hero_editorial_banner_1791119088652.jpg';
      const preloadImg = new Image();
      preloadImg.src = bannerToPreload;
    }

    // 3. Background revalidation from database API (non-blocking, always fresh)
    const refreshLiveCatalog = () => {
      fetch('/api/products?t=' + Date.now(), { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.products) && data.products.length > 0) {
            setProducts(data.products);
            try {
              localStorage.setItem('aabha_products_cache_v2', JSON.stringify(data.products));
              sessionStorage.setItem('aabha_products_cache', JSON.stringify(data.products));
            } catch {}
          }
        })
        .catch((err) => {
          console.warn('Live products sync notice:', err);
        });

      fetch('/api/settings?t=' + Date.now(), { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.settings) {
            setSiteSettings(data.settings);
            try {
              localStorage.setItem('aabha_settings_cache_v2', JSON.stringify(data.settings));
              sessionStorage.setItem('aabha_settings_cache', JSON.stringify(data.settings));
            } catch {}
          }
        })
        .catch((err) => console.warn('Live settings sync notice:', err));
    };

    refreshLiveCatalog();

    // Listen for live updates dispatched by admin panel (products or settings saved)
    const handleLiveUpdate = () => {
      refreshLiveCatalog();
    };

    window.addEventListener('aabha:products_updated', handleLiveUpdate);
    window.addEventListener('aabha:settings_updated', handleLiveUpdate);
    window.addEventListener('storage', handleLiveUpdate);

    return () => {
      window.removeEventListener('aabha:products_updated', handleLiveUpdate);
      window.removeEventListener('aabha:settings_updated', handleLiveUpdate);
      window.removeEventListener('storage', handleLiveUpdate);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2600);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pushNavState = (
    page: ActivePage,
    opts?: { productId?: string; category?: CollectionFilter; customPageSlug?: string; topic?: PolicyTopic }
  ) => {
    if (typeof window === 'undefined') return;
    let url = '/';
    if (page === 'product' && (opts?.productId || selectedProductId)) {
      const pid = opts?.productId || selectedProductId;
      url = `?product=${encodeURIComponent(pid)}`;
    } else if (page === 'shop') {
      const cat = opts?.category !== undefined ? opts.category : selectedCategory;
      url = cat && cat !== 'All Collection' ? `/shop?category=${encodeURIComponent(cat)}` : '/shop';
    } else if (page === 'custom' && (opts?.customPageSlug || customPageSlug)) {
      url = `/pages/${opts?.customPageSlug || customPageSlug}`;
    } else if (page === 'policy') {
      url = opts?.topic ? `/policy?topic=${opts.topic}` : '/policy';
    } else if (page !== 'home') {
      url = `/${page}`;
    }

    const state = {
      page,
      productId: opts?.productId || '',
      category: opts?.category || 'All Collection',
      customPageSlug: opts?.customPageSlug || '',
      topic: opts?.topic || 'shipping',
    };

    window.history.pushState(state, '', url);
  };

  const handleNavigateHome = (push = true) => {
    setSelectedProductId('');
    setActivePage('home');
    scrollToTop();
    if (push) pushNavState('home');
  };

  const handleNavigateNewArrivals = () => {
    if (activePage !== 'home') {
      handleNavigateHome(true);
      setTimeout(() => {
        const el = document.getElementById('new-arrivals');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 120);
    } else {
      const el = document.getElementById('new-arrivals');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNavigateShopCategory = (category: CollectionFilter = 'All Collection', push = true) => {
    setSelectedProductId('');
    setSelectedCategory(category);
    setActivePage('shop');
    scrollToTop();
    if (push) pushNavState('shop', { category });
  };

  const handleNavigateCustomPage = (slug: string, push = true) => {
    setSelectedProductId('');
    setCustomPageSlug(slug);
    setActivePage('custom');
    scrollToTop();
    if (push) pushNavState('custom', { customPageSlug: slug });
  };

  const handleSelectProduct = (product: Product, push = true) => {
    setSelectedProductId(product.id);
    setActivePage('product');
    scrollToTop();
    if (push) pushNavState('product', { productId: product.id });
  };

  const handleToggleWishlist = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetProduct = products.find((p) => p.id === productId);
    setWishlistIds((prev) => {
      const exists = prev.includes(productId);
      if (exists) {
        if (targetProduct) showToast(`Removed ${targetProduct.name} from Wishlist`);
        return prev.filter((id) => id !== productId);
      } else {
        if (targetProduct) showToast(`Saved ${targetProduct.name} to Wishlist`);
        return [...prev, productId];
      }
    });
  };

  const handleAddToCart = (
    product: Product,
    size: GarmentSize,
    quantity: number = 1,
    openDrawer: boolean = true,
    selectedColor?: string
  ) => {
    if (!product.inStock) {
      showToast(`${product.name} is currently out of stock`);
      return;
    }

    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.size === size &&
          (item.selectedColor || '') === (selectedColor || '')
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }
      return [...prev, { product, size, quantity, selectedColor }];
    });

    if (openDrawer) {
      setCartDrawerOpen(true);
    } else {
      showToast(
        `Added ${product.name} (Size ${size}${selectedColor ? `, ${selectedColor}` : ''}) to Shopping Bag`
      );
    }
  };

  const handleQuickAdd = (product: Product, size: GarmentSize, e: React.MouseEvent) => {
    e.stopPropagation();
    const defaultColor = product.colors && product.colors.length > 0 ? product.colors[0].name : undefined;
    handleAddToCart(product, size, 1, false, defaultColor);
  };

  const handleBuyNow = (
    product: Product,
    size: GarmentSize,
    quantity: number,
    selectedColor?: string
  ) => {
    handleAddToCart(product, size, quantity, false, selectedColor);
    setCartDrawerOpen(false);
    setActivePage('checkout');
    scrollToTop();
  };

  const handleUpdateCartQuantity = (
    productId: string,
    size: GarmentSize,
    delta: number,
    color?: string
  ) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (
            item.product.id === productId &&
            item.size === size &&
            (color === undefined || (item.selectedColor || '') === (color || ''))
          ) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveCartItem = (productId: string, size: GarmentSize, color?: string) => {
    setCartItems((prev) =>
      prev.filter(
        (item) =>
          !(
            item.product.id === productId &&
            item.size === size &&
            (color === undefined || (item.selectedColor || '') === (color || ''))
          )
      )
    );
  };

  const handleMoveWishlistToCart = (product: Product, size: GarmentSize) => {
    handleAddToCart(product, size, 1, false);
    setWishlistDrawerOpen(false);
    setCartDrawerOpen(true);
  };

  const handleAddReview = async (
    productId: string,
    newReview: Omit<ProductReview, 'id' | 'date'>
  ) => {
    const targetProduct = products.find((p) => p.id === productId);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          productName: targetProduct?.name || 'Handloom Silhouette',
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
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, reviews: [reviewObj, ...p.reviews] } : p))
      );
      showToast('Thank you. Your verified patron review has been recorded.');
    } catch (err) {
      // Offline / network fallback
      const reviewObj: ProductReview = {
        ...newReview,
        id: `rev-${Date.now()}`,
        date: 'October 2026',
      };
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, reviews: [reviewObj, ...p.reviews] } : p))
      );
      showToast('Thank you. Your verified patron review has been recorded.');
    }
  };

  const selectedProduct =
    products.find((p) => p.id === selectedProductId) || products[0] || null;

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const pageTransitionKey =
    activePage === 'product'
      ? `product-${selectedProduct?.id || 'none'}`
      : activePage === 'policy'
      ? `policy-${policyTopic}`
      : activePage === 'custom'
      ? `custom-${customPageSlug}`
      : activePage;

  if (!isHydrated || (productsLoading && products.length === 0)) {
    return <AtelierSkeleton />;
  }

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#1E1B18]">
      {/* Top Bar Contract Header */}
      <Header
        activePage={activePage}
        selectedCategory={selectedCategory}
        wishlistCount={wishlistIds.length}
        cartCount={totalCartCount}
        products={products}
        onNavigateHome={() => handleNavigateHome(true)}
        onNavigateNewArrivals={handleNavigateNewArrivals}
        onNavigateShopCategory={(cat) => handleNavigateShopCategory(cat, true)}
        onNavigateAbout={() => {
          setSelectedProductId('');
          setActivePage('about');
          scrollToTop();
          pushNavState('about');
        }}
        onNavigateContact={() => {
          setSelectedProductId('');
          setActivePage('contact');
          scrollToTop();
          pushNavState('contact');
        }}
        onOpenSearch={() => setSearchModalOpen(true)}
        onOpenWishlist={() => setWishlistDrawerOpen(true)}
        onOpenCart={() => setCartDrawerOpen(true)}
        onOpenAccount={() => setAuthModalOpen(true)}
        logoUrl={siteSettings?.logoUrl}
        announcementText={siteSettings?.announcementText}
        showAnnouncementBar={siteSettings?.showAnnouncementBar}
        showNewArrivals={siteSettings?.showNewArrivals}
        navLinks={siteSettings?.navLinks}
        siteSettings={siteSettings}
        onNavigatePolicy={(topic) => {
          setSelectedProductId('');
          setPolicyTopic(topic);
          setActivePage('policy');
          scrollToTop();
          pushNavState('policy', { topic });
        }}
        onNavigateCustomPage={(slug) => handleNavigateCustomPage(slug, true)}
      />

      {/* Main Content View Router with Subtle Editorial Fade-In Transition */}
      <main className="flex-1">
        <motion.div
          key={pageTransitionKey}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="animate-page-fade"
        >
          {activePage === 'home' && (
            <HomePage
              products={products}
              productsLoading={productsLoading}
              wishlistIds={wishlistIds}
              siteSettings={siteSettings}
              onShopCollection={handleNavigateShopCategory}
              onSelectProduct={handleSelectProduct}
              onToggleWishlist={handleToggleWishlist}
              onQuickAdd={handleQuickAdd}
              onNavigateAbout={() => {
                setSelectedProductId('');
                setActivePage('about');
                scrollToTop();
                pushNavState('about');
              }}
            />
          )}

          {activePage === 'shop' && (
            <ShopPage
              products={products}
              selectedCategory={selectedCategory}
              wishlistIds={wishlistIds}
              siteSettings={siteSettings}
              onSelectCategory={(cat) => setSelectedCategory(cat)}
              onSelectProduct={handleSelectProduct}
              onToggleWishlist={handleToggleWishlist}
              onQuickAdd={handleQuickAdd}
            />
          )}

          {activePage === 'product' && selectedProduct && (
            <ProductDetailPage
              product={selectedProduct}
              allProducts={products}
              wishlistIds={wishlistIds}
              onBackToShop={() => {
                if (typeof window !== 'undefined' && window.history.state?.page) {
                  window.history.back();
                } else {
                  handleNavigateShopCategory('All Collection', true);
                }
              }}
              onSelectCategory={(cat) => handleNavigateShopCategory(cat)}
              onSelectProduct={handleSelectProduct}
              onAddToCart={(prod, size, qty, color) => handleAddToCart(prod, size, qty, true, color)}
              onBuyNow={(prod, size, qty, color) => handleBuyNow(prod, size, qty, color)}
              onToggleWishlist={handleToggleWishlist}
              onQuickAdd={handleQuickAdd}
              onAddReview={handleAddReview}
              siteSettings={siteSettings}
            />
          )}

          {activePage === 'product' && !selectedProduct && (
            <div className="py-24 px-4 text-center space-y-4">
              <p className="font-serif text-3xl text-[#1E1B18]">Garment Not Found</p>
              <p className="text-xs text-[#7C736A]">
                No garment is currently selected or available in the catalog.
              </p>
              <button
                type="button"
                onClick={() => handleNavigateShopCategory('All Collection')}
                className="px-6 py-3 bg-[#231F1D] text-[#FAF8F5] text-xs uppercase tracking-wider font-medium hover:bg-[#14110E] transition-colors cursor-pointer"
              >
                Return to Collection
              </button>
            </div>
          )}

          {activePage === 'checkout' && (
            <CheckoutPage
              items={cartItems}
              siteSettings={siteSettings}
              onBackToShopping={() => handleNavigateShopCategory('All Collection')}
              onClearCart={() => setCartItems([])}
            />
          )}

          {activePage === 'about' && (
            <AboutPage
              onExploreCollection={() => handleNavigateShopCategory('All Collection')}
              siteSettings={siteSettings}
            />
          )}

          {activePage === 'contact' && <ContactPage siteSettings={siteSettings} />}

          {activePage === 'policy' && (
            <PolicyPage
              topic={policyTopic}
              onSelectTopic={(topic) => setPolicyTopic(topic)}
            />
          )}

          {activePage === 'custom' && (
            <CustomPageView
              slug={customPageSlug}
              siteSettings={siteSettings}
              onBackToShop={() => handleNavigateShopCategory('All Collection')}
            />
          )}
        </motion.div>
      </main>

      {/* Premium Footer */}
      <Footer
        onNavigateHome={() => handleNavigateHome(true)}
        onNavigateCategory={(cat) => handleNavigateShopCategory(cat, true)}
        onNavigateAbout={() => {
          setSelectedProductId('');
          setActivePage('about');
          scrollToTop();
          pushNavState('about');
        }}
        onNavigateContact={() => {
          setSelectedProductId('');
          setActivePage('contact');
          scrollToTop();
          pushNavState('contact');
        }}
        onNavigatePolicy={(topic) => {
          setSelectedProductId('');
          setPolicyTopic(topic);
          setActivePage('policy');
          scrollToTop();
          pushNavState('policy', { topic });
        }}
        logoUrl={siteSettings?.logoUrl}
        siteSettings={siteSettings}
      />

      {/* Interactive Drawers & Search Overlay */}
      <CartDrawer
        isOpen={cartDrawerOpen}
        items={cartItems}
        siteSettings={siteSettings}
        onClose={() => setCartDrawerOpen(false)}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onProceedToCheckout={() => {
          setCartDrawerOpen(false);
          setActivePage('checkout');
          scrollToTop();
        }}
        onSelectProduct={handleSelectProduct}
      />

      <WishlistDrawer
        isOpen={wishlistDrawerOpen}
        products={products}
        wishlistIds={wishlistIds}
        onClose={() => setWishlistDrawerOpen(false)}
        onRemoveWishlist={handleToggleWishlist}
        onMoveToCart={handleMoveWishlistToCart}
        onSelectProduct={handleSelectProduct}
      />

      <SearchModal
        isOpen={searchModalOpen}
        products={products}
        onClose={() => setSearchModalOpen(false)}
        onSelectProduct={handleSelectProduct}
      />

      {/* Subtle Feedback Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E1B18] text-[#FAF8F5] px-5 py-3 text-xs sm:text-sm tracking-wide shadow-xl border border-[#3D3732] transition-opacity">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
