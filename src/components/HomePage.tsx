import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Truck,
  RotateCcw,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import {
  Product,
  CollectionFilter,
  GarmentSize,
  CATEGORIES,
  EDITORIAL_ASSETS,
  INSTAGRAM_GALLERY,
} from '../data/products';
import { EditorialImage } from './EditorialImage';
import { ProductCard } from './ProductCard';

interface HeroSlide {
  id: string;
  image: string;
  alt: string;
  eyebrow: string;
  heading: string;
  subheading: string;
  buttonLabel: string;
  targetCategory: CollectionFilter;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'slide-1',
    image: EDITORIAL_ASSETS.heroBanner,
    alt: 'Graceful Indian models in AABHA CLOTHING contemporary ivory and sand Chanderi silk ensembles',
    eyebrow: 'INAUGURAL 17-PIECE EDIT · HANDLOOM',
    heading: 'EFFORTLESSLY INDIAN.',
    subheading: 'Modern silhouettes. Timeless elegance.',
    buttonLabel: 'SHOP THE COLLECTION',
    targetCategory: 'All Collection',
  },
  {
    id: 'slide-2',
    image: EDITORIAL_ASSETS.heroCoords,
    alt: 'Indian female model in AABHA CLOTHING contemporary tailored khadi-silk co-ord outfit',
    eyebrow: 'THE CO-ORD EDIT',
    heading: 'MODERN. EFFORTLESS. YOURS.',
    subheading: 'Contemporary silhouettes designed for everyday elegance.',
    buttonLabel: 'SHOP CO-ORDS',
    targetCategory: 'Co-ord Sets',
  },
  {
    id: 'slide-3',
    image: EDITORIAL_ASSETS.heroEthnic,
    alt: 'Indian female model in AABHA CLOTHING flowing earthen ochre and champagne Chanderi ethnic silhouette',
    eyebrow: 'TIMELESS INDIAN',
    heading: 'MADE FOR EVERY MOMENT.',
    subheading: 'Refined Indian silhouettes for celebrations and everyday occasions.',
    buttonLabel: 'EXPLORE THE COLLECTION',
    targetCategory: 'All Collection',
  },
];

interface HomePageProps {
  products: Product[];
  wishlistIds: string[];
  onShopCollection: (category?: CollectionFilter) => void;
  onSelectProduct: (product: Product) => void;
  onToggleWishlist: (productId: string, e: React.MouseEvent) => void;
  onQuickAdd: (product: Product, size: GarmentSize, e: React.MouseEvent) => void;
  onNavigateAbout: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  products,
  wishlistIds,
  onShopCollection,
  onSelectProduct,
  onToggleWishlist,
  onQuickAdd,
  onNavigateAbout,
}) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showAllInNewArrivals, setShowAllInNewArrivals] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const dragStartX = useRef<number | null>(null);
  const isDragging = useRef<boolean>(false);

  const nextSlide = useCallback(() => {
    setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setActiveSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, []);

  // Auto-slide every 5 seconds when not paused by user interaction
  useEffect(() => {
    if (isPaused) return;
    const timer = window.setInterval(() => {
      nextSlide();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [isPaused, nextSlide]);

  // Mobile Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current !== null && touchEndX.current !== null) {
      const deltaX = touchStartX.current - touchEndX.current;
      if (Math.abs(deltaX) > 45) {
        if (deltaX > 0) {
          nextSlide();
        } else {
          prevSlide();
        }
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Desktop Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartX.current = e.clientX;
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragStartX.current === null) return;
    if (Math.abs(e.clientX - dragStartX.current) > 10) {
      isDragging.current = true;
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (dragStartX.current !== null && isDragging.current) {
      const deltaX = dragStartX.current - e.clientX;
      if (Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          nextSlide();
        } else {
          prevSlide();
        }
      }
    }
    dragStartX.current = null;
    setTimeout(() => {
      isDragging.current = false;
    }, 50);
  };

  const newArrivals = showAllInNewArrivals
    ? products
    : products.filter((p) => p.isNewArrival).slice(0, 8);

  const curatedProducts = products.filter((p) => p.isCurated).slice(0, 4);

  const handleLookbookClick = (productId: string) => {
    const found = products.find((p) => p.id === productId);
    if (found) {
      onSelectProduct(found);
    } else {
      onShopCollection('All Collection');
    }
  };

  return (
    <div className="space-y-24 sm:space-y-36 pb-24 sm:pb-32">
      {/* 1. 3-Slide Swipeable Editorial Hero Carousel */}
      <section
        aria-roledescription="carousel"
        aria-label="Featured Collections"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => {
          setIsPaused(false);
          dragStartX.current = null;
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="relative w-full h-[84vh] min-h-[560px] sm:h-[88vh] max-h-[880px] overflow-hidden bg-[#181512] select-none"
      >
        {HERO_SLIDES.map((slide, index) => {
          const isActive = index === activeSlide;
          return (
            <div
              key={slide.id}
              aria-hidden={!isActive}
              className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <EditorialImage
                src={slide.image}
                alt={slide.alt}
                priority={index === 0}
                containerClassName="w-full h-full"
                className={`w-full h-full object-cover object-center transition-transform duration-1000 ease-out ${
                  isActive ? 'scale-100' : 'scale-[1.03]'
                }`}
              />

              {/* Subtle Dark Overlay Scrim for Readability on Desktop & Mobile */}
              <div
                className="absolute inset-0 bg-gradient-to-t from-[#14110E]/85 via-[#14110E]/40 to-black/15"
                aria-hidden="true"
              />

              {/* Slide Content Container */}
              <div className="absolute inset-0 flex items-end">
                <div className="max-w-[1400px] w-full mx-auto px-5 sm:px-8 lg:px-12 pb-20 sm:pb-24 lg:pb-28">
                  <div
                    className={`max-w-2xl text-[#FAF8F5] transition-all duration-700 ease-out ${
                      isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
                    }`}
                  >
                    <p className="text-[11px] sm:text-xs tracking-[0.24em] uppercase text-[#E5DDD3] mb-4 sm:mb-5">
                      {slide.eyebrow}
                    </p>
                    <h1 className="font-serif text-[36px] sm:text-6xl lg:text-[70px] font-light sm:font-normal tracking-[0.05em] leading-[1.08] text-[#FAF8F5] mb-4 sm:mb-6">
                      {slide.heading}
                    </h1>
                    <p className="text-base sm:text-xl text-[#EDE7DF] font-light tracking-[0.02em] leading-relaxed mb-9 sm:mb-11 max-w-lg">
                      {slide.subheading}
                    </p>
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isDragging.current) {
                            onShopCollection(slide.targetCategory);
                          }
                        }}
                        className="inline-flex items-center gap-3.5 px-8 py-4 bg-[#FAF8F5] text-[#1E1B18] text-[11px] sm:text-xs font-medium tracking-[0.2em] uppercase hover:bg-[#EDE7DF] transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <span>{slide.buttonLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Bottom Navigation Bar: 3 Pagination Dots & Desktop Arrow Controls */}
        <div className="absolute inset-x-0 bottom-6 sm:bottom-9 z-20 pointer-events-none">
          <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12 flex items-center justify-between">
            {/* 3 Small Pagination Dots */}
            <div className="flex items-center gap-2.5 pointer-events-auto">
              {HERO_SLIDES.map((slide, idx) => {
                const isActive = idx === activeSlide;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={`Go to slide ${idx + 1}: ${slide.heading}`}
                    onClick={() => {
                      setIsPaused(true);
                      setActiveSlide(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      isActive
                        ? 'w-7 bg-[#FAF8F5]'
                        : 'w-1.5 bg-[#FAF8F5]/45 hover:bg-[#FAF8F5]/75'
                    }`}
                  />
                );
              })}
            </div>

            {/* Desktop Previous / Next Arrow Controls */}
            <div className="hidden sm:flex items-center gap-2 pointer-events-auto">
              <button
                type="button"
                aria-label="Previous slide"
                onClick={() => {
                  setIsPaused(true);
                  prevSlide();
                }}
                className="w-10 h-10 flex items-center justify-center border border-[#FAF8F5]/30 text-[#FAF8F5] hover:bg-[#FAF8F5] hover:text-[#1E1B18] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 stroke-[1.4]" />
              </button>
              <button
                type="button"
                aria-label="Next slide"
                onClick={() => {
                  setIsPaused(true);
                  nextSlide();
                }}
                className="w-10 h-10 flex items-center justify-center border border-[#FAF8F5]/30 text-[#FAF8F5] hover:bg-[#FAF8F5] hover:text-[#1E1B18] transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 stroke-[1.4]" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Shop By Category — Exact 4 Categories */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 sm:mb-14">
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase text-[#7C736A] mb-2">
              The Launch Silhouettes
            </p>
            <h2 className="font-serif text-3xl sm:text-[42px] text-[#1E1B18] font-normal leading-tight">
              Shop By Category
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onShopCollection('All Collection')}
            className="mt-3 sm:mt-0 self-start sm:self-auto inline-flex items-center gap-2 text-xs tracking-[0.14em] uppercase text-[#4A433D] hover:text-[#1E1B18] pb-1 border-b border-[#D5CCC0] hover:border-[#1E1B18] transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>All Collection (17)</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[1.4]" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-7">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => onShopCollection(category.id)}
              className="group text-left flex flex-col cursor-pointer"
            >
              {/* Reduced-Height Editorial Frame (4:3 on mobile, 5:4 on desktop) */}
              <div className="relative aspect-[4/3] sm:aspect-[5/4] w-full bg-[#F3EFEA] overflow-hidden mb-3.5 sm:mb-4">
                <EditorialImage
                  src={category.image}
                  alt={`${category.name} — ${category.tagline}`}
                  containerClassName="w-full h-full"
                  className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-serif text-xl sm:text-[26px] text-[#1E1B18] font-normal group-hover:text-[#6E5043] transition-colors">
                  {category.name}
                </h3>
                <span className="text-[11px] tracking-[0.1em] text-[#7C736A] tabular-nums group-hover:text-[#1E1B18] transition-colors">
                  {category.pieceCount} {category.pieceCount === 1 ? 'Piece' : 'Pieces'} →
                </span>
              </div>
              <p className="hidden sm:block text-xs text-[#7C736A] mt-1 line-clamp-1 font-light">
                {category.tagline}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* 3. New Arrivals (From the 17-Product Launch Collection) */}
      <section
        id="new-arrivals"
        className="max-w-[1400px] mx-auto px-3.5 sm:px-8 lg:px-12 scroll-mt-24"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 sm:mb-14 px-0.5 sm:px-0 gap-4">
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase text-[#7C736A] mb-2">
              Inaugural Release
            </p>
            <h2 className="font-serif text-3xl sm:text-[42px] text-[#1E1B18] font-normal leading-tight">
              New Arrivals
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowAllInNewArrivals((prev) => !prev)}
              className="text-xs tracking-[0.14em] uppercase text-[#4A433D] hover:text-[#1E1B18] pb-1 border-b border-[#D5CCC0] hover:border-[#1E1B18] transition-colors cursor-pointer"
            >
              {showAllInNewArrivals ? 'Show Featured 8' : 'Show All 17 Products'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3.5 sm:gap-x-7 lg:gap-x-8 gap-y-10 sm:gap-y-16">
          {newArrivals.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isWishlisted={wishlistIds.includes(product.id)}
              onSelectProduct={onSelectProduct}
              onToggleWishlist={onToggleWishlist}
              onQuickAdd={onQuickAdd}
            />
          ))}
        </div>

        <div className="mt-14 sm:mt-20 text-center">
          <button
            type="button"
            onClick={() => onShopCollection('All Collection')}
            className="inline-flex items-center gap-3 px-9 py-4 border border-[#1E1B18]/80 text-[#1E1B18] text-[11px] sm:text-xs font-medium tracking-[0.18em] uppercase hover:bg-[#231F1D] hover:text-[#FAF8F5] hover:border-[#231F1D] transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>Explore Full Collection (17 Products)</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[1.4]" />
          </button>
        </div>
      </section>

      {/* 4. Brand Story — Generous Editorial Rest Section */}
      <section className="bg-[#F3EFEA] py-20 sm:py-32">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-7">
              <div className="aspect-[16/10] w-full overflow-hidden bg-[#EAE3DA]">
                <EditorialImage
                  src={EDITORIAL_ASSETS.brandStory}
                  alt="AABHA CLOTHING handloom mulmul and organza silhouette in sunlit sandstone verandah"
                  containerClassName="w-full h-full"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="lg:col-span-5 space-y-6 sm:space-y-7">
              <p className="text-[11px] tracking-[0.2em] uppercase text-[#7C736A]">
                AABHA CLOTHING · Our Philosophy
              </p>

              <h2 className="font-serif text-3xl sm:text-4xl lg:text-[44px] leading-[1.14] text-[#1E1B18] font-normal">
                MADE FOR YOUR EVERYDAY ELEGANCE
              </h2>

              <p className="text-[15px] sm:text-base text-[#4A433D] font-light leading-[1.75]">
                Born from a desire to move beyond heavy occasion-only ornamentation, AABHA reimagines Indian textile heritage for the rhythm of modern life. Our inaugural 17-piece launch collection brings together panelled Anarkalis, three-piece Chanderi ensembles, tailored Khadi co-ord sets, and authentic hand-embroidered Chikankari.
              </p>

              <p className="text-[15px] sm:text-base text-[#4A433D] font-light leading-[1.75]">
                Every garment is tailored with French seams, deep concealed pockets, and soft cotton mulmul linings—silhouettes that feel as natural in morning light as they do at an intimate evening gathering.
              </p>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={onNavigateAbout}
                  className="inline-flex items-center gap-2.5 text-xs font-medium tracking-[0.16em] uppercase text-[#1E1B18] border-b border-[#1E1B18]/60 pb-1.5 hover:text-[#6E5043] hover:border-[#6E5043] transition-colors cursor-pointer"
                >
                  <span>Discover Our Craft</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[1.4]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Curated Collection (4 Selected Products from the 17 Products) */}
      <section className="max-w-[1400px] mx-auto px-3.5 sm:px-8 lg:px-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 sm:mb-14 px-0.5 sm:px-0">
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase text-[#7C736A] mb-2">
              House Signatures
            </p>
            <h2 className="font-serif text-3xl sm:text-[42px] text-[#1E1B18] font-normal leading-tight">
              Curated Collection
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#7C736A] mt-2 sm:mt-0 font-light">
            Four signature silhouettes selected from our 17-piece collection
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3.5 sm:gap-x-7 lg:gap-x-8 gap-y-10 sm:gap-y-14">
          {curatedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isWishlisted={wishlistIds.includes(product.id)}
              onSelectProduct={onSelectProduct}
              onToggleWishlist={onToggleWishlist}
              onQuickAdd={onQuickAdd}
            />
          ))}
        </div>
      </section>

      {/* 6. Instagram-Style Fashion Gallery & 7. Minimal Trust Section */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 space-y-20 sm:space-y-28">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 sm:mb-12">
            <div>
              <p className="text-[11px] tracking-[0.2em] uppercase text-[#7C736A] mb-2">
                @aabhaclothing
              </p>
              <h2 className="font-serif text-3xl sm:text-[42px] text-[#1E1B18] font-normal leading-tight">
                In Quiet Motion
              </h2>
            </div>
            <span className="text-xs sm:text-sm text-[#7C736A] font-light mt-2 sm:mt-0">
              Select any frame to explore the silhouette
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-5">
            {INSTAGRAM_GALLERY.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => handleLookbookClick(post.productId)}
                className="group relative aspect-[4/5] overflow-hidden bg-[#F3EFEA] text-left cursor-pointer"
              >
                <EditorialImage
                  src={post.image}
                  alt={post.caption}
                  containerClassName="w-full h-full"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-4">
                  <p className="text-[11px] text-[#E5DDD3]">{post.handle}</p>
                  <p className="text-xs font-normal text-white mt-0.5 line-clamp-2">
                    {post.productName}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 7. Trust Section — Airy, Uncluttered, Minimal */}
        <div className="border-t border-[#ECE6DD] pt-14 sm:pt-16 grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
          <div className="space-y-2">
            <Truck className="w-5 h-5 text-[#6E5043] stroke-[1.3]" />
            <h3 className="font-serif text-xl text-[#1E1B18] font-normal">Free Shipping</h3>
            <p className="text-xs sm:text-[13px] text-[#7C736A] font-light leading-relaxed">
              Complimentary insured express delivery across all Indian PIN codes.
            </p>
          </div>

          <div className="space-y-2">
            <RotateCcw className="w-5 h-5 text-[#6E5043] stroke-[1.3]" />
            <h3 className="font-serif text-xl text-[#1E1B18] font-normal">Easy Returns</h3>
            <p className="text-xs sm:text-[13px] text-[#7C736A] font-light leading-relaxed">
              14-day complimentary doorstep return and size exchange.
            </p>
          </div>

          <div className="space-y-2">
            <ShieldCheck className="w-5 h-5 text-[#6E5043] stroke-[1.3]" />
            <h3 className="font-serif text-xl text-[#1E1B18] font-normal">Secure Payments</h3>
            <p className="text-xs sm:text-[13px] text-[#7C736A] font-light leading-relaxed">
              Encrypted checkout supporting UPI, Cards, NetBanking & COD.
            </p>
          </div>

          <div className="space-y-2">
            <Compass className="w-5 h-5 text-[#6E5043] stroke-[1.3]" />
            <h3 className="font-serif text-xl text-[#1E1B18] font-normal">Made in India</h3>
            <p className="text-xs sm:text-[13px] text-[#7C736A] font-light leading-relaxed">
              Crafted in India with authentic handloom textiles and artisanal tailoring.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
