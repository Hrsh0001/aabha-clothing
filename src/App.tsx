/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  PRODUCTS,
  Product,
  CollectionFilter,
  GarmentSize,
  ProductReview,
} from './data/products';
import { Header, ActivePage } from './components/Header';
import { HomePage } from './components/HomePage';
import { ShopPage } from './components/ShopPage';
import { ProductDetailPage } from './components/ProductDetailPage';
import { CartDrawer, WishlistDrawer, SearchModal, CartItem } from './components/Drawers';
import { CheckoutPage } from './components/CheckoutPage';
import { AboutPage, ContactPage, PolicyPage, PolicyTopic } from './components/InfoPages';
import { Footer } from './components/Footer';

export default function App() {
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [selectedCategory, setSelectedCategory] = useState<CollectionFilter>('All Collection');
  const [selectedProductId, setSelectedProductId] = useState<string>(PRODUCTS[0].id);
  const [policyTopic, setPolicyTopic] = useState<PolicyTopic>('shipping');

  // Persistent Wishlist & Cart for AABHA CLOTHING 17-piece collection
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('aabha_wishlist_v1');
      return saved ? JSON.parse(saved) : ['anarkali-01', 'chikankari-01'];
    } catch {
      return ['anarkali-01', 'chikankari-01'];
    }
  });

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('aabha_cart_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [{ product: PRODUCTS[0], size: 'S', quantity: 1 }];
  });

  // Drawers & Modals
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [wishlistDrawerOpen, setWishlistDrawerOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('aabha_wishlist_v1', JSON.stringify(wishlistIds));
    } catch {
      // ignore
    }
  }, [wishlistIds]);

  useEffect(() => {
    try {
      localStorage.setItem('aabha_cart_v1', JSON.stringify(cartItems));
    } catch {
      // ignore
    }
  }, [cartItems]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2600);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateHome = () => {
    setActivePage('home');
    scrollToTop();
  };

  const handleNavigateNewArrivals = () => {
    if (activePage !== 'home') {
      setActivePage('home');
      setTimeout(() => {
        const el = document.getElementById('new-arrivals');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    } else {
      const el = document.getElementById('new-arrivals');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNavigateShopCategory = (category: CollectionFilter = 'All Collection') => {
    setSelectedCategory(category);
    setActivePage('shop');
    scrollToTop();
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProductId(product.id);
    setActivePage('product');
    scrollToTop();
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
    openDrawer: boolean = true
  ) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.size === size
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }
      return [...prev, { product, size, quantity }];
    });

    if (openDrawer) {
      setCartDrawerOpen(true);
    } else {
      showToast(`Added ${product.name} (Size ${size}) to Shopping Bag`);
    }
  };

  const handleQuickAdd = (product: Product, size: GarmentSize, e: React.MouseEvent) => {
    e.stopPropagation();
    handleAddToCart(product, size, 1, false);
  };

  const handleBuyNow = (product: Product, size: GarmentSize, quantity: number) => {
    handleAddToCart(product, size, quantity, false);
    setCartDrawerOpen(false);
    setActivePage('checkout');
    scrollToTop();
  };

  const handleUpdateCartQuantity = (productId: string, size: GarmentSize, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId && item.size === size) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveCartItem = (productId: string, size: GarmentSize) => {
    setCartItems((prev) =>
      prev.filter((item) => !(item.product.id === productId && item.size === size))
    );
  };

  const handleMoveWishlistToCart = (product: Product, size: GarmentSize) => {
    handleAddToCart(product, size, 1, false);
    setWishlistDrawerOpen(false);
    setCartDrawerOpen(true);
  };

  const handleAddReview = (
    productId: string,
    newReview: Omit<ProductReview, 'id' | 'date'>
  ) => {
    const reviewObj: ProductReview = {
      ...newReview,
      id: `rev-${Date.now()}`,
      date: 'October 2026',
    };
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, reviews: [reviewObj, ...p.reviews] } : p))
    );
    showToast('Thank you. Your verified patron review has been published.');
  };

  const selectedProduct =
    products.find((p) => p.id === selectedProductId) || products[0];

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const pageTransitionKey =
    activePage === 'product'
      ? `product-${selectedProduct.id}`
      : activePage === 'policy'
      ? `policy-${policyTopic}`
      : activePage;

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#1E1B18]">
      {/* Top Bar Contract Header */}
      <Header
        activePage={activePage}
        selectedCategory={selectedCategory}
        wishlistCount={wishlistIds.length}
        cartCount={totalCartCount}
        onNavigateHome={handleNavigateHome}
        onNavigateNewArrivals={handleNavigateNewArrivals}
        onNavigateShopCategory={handleNavigateShopCategory}
        onNavigateAbout={() => {
          setActivePage('about');
          scrollToTop();
        }}
        onNavigateContact={() => {
          setActivePage('contact');
          scrollToTop();
        }}
        onOpenSearch={() => setSearchModalOpen(true)}
        onOpenWishlist={() => setWishlistDrawerOpen(true)}
        onOpenCart={() => setCartDrawerOpen(true)}
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
              wishlistIds={wishlistIds}
              onShopCollection={handleNavigateShopCategory}
              onSelectProduct={handleSelectProduct}
              onToggleWishlist={handleToggleWishlist}
              onQuickAdd={handleQuickAdd}
              onNavigateAbout={() => {
                setActivePage('about');
                scrollToTop();
              }}
            />
          )}

          {activePage === 'shop' && (
            <ShopPage
              products={products}
              selectedCategory={selectedCategory}
              wishlistIds={wishlistIds}
              onSelectCategory={(cat) => setSelectedCategory(cat)}
              onSelectProduct={handleSelectProduct}
              onToggleWishlist={handleToggleWishlist}
              onQuickAdd={handleQuickAdd}
            />
          )}

          {activePage === 'product' && (
            <ProductDetailPage
              product={selectedProduct}
              allProducts={products}
              wishlistIds={wishlistIds}
              onBackToShop={() => {
                setActivePage('shop');
                scrollToTop();
              }}
              onSelectCategory={(cat) => handleNavigateShopCategory(cat)}
              onSelectProduct={handleSelectProduct}
              onAddToCart={(prod, size, qty) => handleAddToCart(prod, size, qty, true)}
              onBuyNow={handleBuyNow}
              onToggleWishlist={handleToggleWishlist}
              onQuickAdd={handleQuickAdd}
              onAddReview={handleAddReview}
            />
          )}

          {activePage === 'checkout' && (
            <CheckoutPage
              items={cartItems}
              onBackToShopping={() => handleNavigateShopCategory('All Collection')}
              onClearCart={() => setCartItems([])}
            />
          )}

          {activePage === 'about' && (
            <AboutPage onExploreCollection={() => handleNavigateShopCategory('All Collection')} />
          )}

          {activePage === 'contact' && <ContactPage />}

          {activePage === 'policy' && (
            <PolicyPage
              topic={policyTopic}
              onSelectTopic={(topic) => setPolicyTopic(topic)}
            />
          )}
        </motion.div>
      </main>

      {/* Premium Footer */}
      <Footer
        onNavigateHome={handleNavigateHome}
        onNavigateCategory={handleNavigateShopCategory}
        onNavigateAbout={() => {
          setActivePage('about');
          scrollToTop();
        }}
        onNavigateContact={() => {
          setActivePage('contact');
          scrollToTop();
        }}
        onNavigatePolicy={(topic) => {
          setPolicyTopic(topic);
          setActivePage('policy');
          scrollToTop();
        }}
      />

      {/* Interactive Drawers & Search Overlay */}
      <CartDrawer
        isOpen={cartDrawerOpen}
        items={cartItems}
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
