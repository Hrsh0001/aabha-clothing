'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

import type { SiteSettings } from '../app/api/settings/route';

interface HeroSlide {
  id: string;
  image: string;
  mobileImage?: string;
  alt: string;
  eyebrow: string;
  heading: string;
  subheading: string;
  buttonLabel: string;
  targetCategory: CollectionFilter;
}

interface HomePageProps {
  products: Product[];
  productsLoading?: boolean;
  wishlistIds: string[];
  siteSettings?: SiteSettings | null;
  onShopCollection: (category?: CollectionFilter) => void;
  onSelectProduct: (product: Product) => void;
  onToggleWishlist: (productId: string, e: React.MouseEvent) => void;
  onQuickAdd: (product: Product, size: GarmentSize, e: React.MouseEvent) => void;
  onNavigateAbout: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  products,
  productsLoading = false,
  wishlistIds,
  siteSettings,
  onShopCollection,
  onSelectProduct,
  onToggleWishlist,
  onQuickAdd,
  onNavigateAbout,
}) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showAllInNewArrivals, setShowAllInNewArrivals] = useState(false);
  const [loadedSlides, setLoadedSlides] = useState<Record<string, boolean>>({});

  const heroSlides = useMemo<HeroSlide[]>(() => {
    return [
      {
        id: 'slide-1',
        image: siteSettings?.heroBanner || EDITORIAL_ASSETS.heroBanner,
        mobileImage: siteSettings?.heroBannerMobile,
        alt: 'Graceful Indian models in contemporary ivory and sand Chanderi silk ensembles',
        eyebrow: siteSettings?.heroSlide1Eyebrow !== undefined ? siteSettings.heroSlide1Eyebrow : 'INAUGURAL EDIT · HANDLOOM',
        heading: siteSettings?.heroSlide1Heading !== undefined ? siteSettings.heroSlide1Heading : 'EFFORTLESSLY INDIAN.',
        subheading: siteSettings?.heroSlide1Subheading !== undefined ? siteSettings.heroSlide1Subheading : 'Modern silhouettes. Timeless elegance.',
        buttonLabel: siteSettings?.heroSlide1ButtonLabel !== undefined ? siteSettings.heroSlide1ButtonLabel : 'SHOP THE COLLECTION',
        targetCategory: (siteSettings?.heroSlide1TargetCategory as CollectionFilter) || 'All Collection',
      },
      {
        id: 'slide-2',
        image: siteSettings?.heroCoords || EDITORIAL_ASSETS.heroCoords,
        mobileImage: siteSettings?.heroCoordsMobile,
        alt: 'Indian female model in contemporary tailored khadi-silk co-ord outfit',
        eyebrow: siteSettings?.heroSlide2Eyebrow !== undefined ? siteSettings.heroSlide2Eyebrow : 'THE CO-ORD EDIT',
        heading: siteSettings?.heroSlide2Heading !== undefined ? siteSettings.heroSlide2Heading : 'MODERN. EFFORTLESS. YOURS.',
        subheading: siteSettings?.heroSlide2Subheading !== undefined ? siteSettings.heroSlide2Subheading : 'Contemporary silhouettes designed for everyday elegance.',
        buttonLabel: siteSettings?.heroSlide2ButtonLabel !== undefined ? siteSettings.heroSlide2ButtonLabel : 'SHOP CO-ORDS',
        targetCategory: (siteSettings?.heroSlide2TargetCategory as CollectionFilter) || 'Co-ord Sets',
      },
      {
        id: 'slide-3',
        image: siteSettings?.heroEthnic || EDITORIAL_ASSETS.heroEthnic,
        mobileImage: siteSettings?.heroEthnicMobile,
        alt: 'Indian female model in flowing earthen ochre and champagne Chanderi ethnic silhouette',
        eyebrow: siteSettings?.heroSlide3Eyebrow !== undefined ? siteSettings.heroSlide3Eyebrow : 'TIMELESS INDIAN',
        heading: siteSettings?.heroSlide3Heading !== undefined ? siteSettings.heroSlide3Heading : 'MADE FOR EVERY MOMENT.',
        subheading: siteSettings?.heroSlide3Subheading !== undefined ? siteSettings.heroSlide3Subheading : 'Refined Indian silhouettes for celebrations and everyday occasions.',
        buttonLabel: siteSettings?.heroSlide3ButtonLabel !== undefined ? siteSettings.heroSlide3ButtonLabel : 'EXPLORE THE COLLECTION',
        targetCategory: (siteSettings?.heroSlide3TargetCategory as CollectionFilter) || 'All Collection',
      },
    ];
  }, [siteSettings]);

  const instagramGallery = useMemo(() => {
    if (siteSettings?.igPhotos && siteSettings.igPhotos.length >= 6) {
      return INSTAGRAM_GALLERY.map((post, idx) => ({
        ...post,
        image: siteSettings.igPhotos[idx] || post.image,
      }));
    }
    return INSTAGRAM_GALLERY;
  }, [siteSettings]);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const dragStartX = useRef<number | null>(null);
  const isDragging = useRef<boolean>(false);

  const nextSlide = useCallback(() => {
    setActiveSlide((prev) => (prev + 1) % heroSlides.length);
  }, [heroSlides.length]);

  const prevSlide = useCallback(() => {
    setActiveSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  }, [heroSlides.length]);

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

  const newArrivalsSource = products.filter((p) => p.isNewArrival);
  const baseNewArrivals = newArrivalsSource.length > 0 ? newArrivalsSource : products;
  const newArrivals = showAllInNewArrivals
    ? products
    : baseNewArrivals.slice(0, 8);

  const curatedSource = products.filter((p) => p.isCurated);
  const curatedProducts = (curatedSource.length > 0 ? curatedSource : products).slice(0, 4);

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
      {siteSettings?.showHeroCarousel !== false && (
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
        className="relative w-full h-[70vh] sm:h-[80vh] md:h-[85vh] min-h-[460px] max-h-[880px] overflow-hidden bg-[#F3EFEA] select-none touch-pan-y"
      >
        {heroSlides.map((slide, index) => {
          const isActive = index === activeSlide;
          const hasEyebrow = Boolean(slide.eyebrow && slide.eyebrow.trim());
          const hasHeading = Boolean(slide.heading && slide.heading.trim());
          const hasSubheading = Boolean(slide.subheading && slide.subheading.trim());
          const hasButton = Boolean(slide.buttonLabel && slide.buttonLabel.trim());
          const hasTextContent = hasEyebrow || hasHeading || hasSubheading;
          const isSlideLoaded = Boolean(loadedSlides[slide.id]);

          const handleSlideClick = () => {
            if (!isDragging.current && !hasButton) {
              onShopCollection(slide.targetCategory);
            }
          };

          return (
            <div
              key={slide.id}
              aria-hidden={!isActive}
              onClick={handleSlideClick}
              className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              } ${!hasButton && !hasTextContent ? 'cursor-pointer' : ''}`}
            >
              {slide.mobileImage ? (
                <>
                  <div className="block md:hidden w-full h-full">
                    <EditorialImage
                      src={slide.mobileImage}
                      alt={slide.alt}
                      priority={index === 0}
                      onLoad={() => setLoadedSlides((prev) => ({ ...prev, [slide.id]: true }))}
                      containerClassName="w-full h-full bg-[#F3EFEA]"
                      className={`w-full h-full object-cover object-top transition-transform duration-1000 ease-out ${
                        isActive ? 'scale-100' : 'scale-[1.03]'
                      }`}
                    />
                  </div>
                  <div className="hidden md:block w-full h-full">
                    <EditorialImage
                      src={slide.image}
                      alt={slide.alt}
                      priority={index === 0}
                      onLoad={() => setLoadedSlides((prev) => ({ ...prev, [slide.id]: true }))}
                      containerClassName="w-full h-full bg-[#F3EFEA]"
                      className={`w-full h-full object-cover object-center transition-transform duration-1000 ease-out ${
                        isActive ? 'scale-100' : 'scale-[1.03]'
                      }`}
                    />
                  </div>
                </>
              ) : (
                <EditorialImage
                  src={slide.image}
                  alt={slide.alt}
                  priority={index === 0}
                  onLoad={() => setLoadedSlides((prev) => ({ ...prev, [slide.id]: true }))}
                  containerClassName="w-full h-full bg-[#F3EFEA]"
                  className={`w-full h-full object-cover object-top sm:object-center transition-transform duration-1000 ease-out ${
                    isActive ? 'scale-100' : 'scale-[1.03]'
                  }`}
                />
              )}

              {/* Scrim Overlay: Smoothly fades in only once photo has loaded to eliminate mobile dark flash */}
              <div
                className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
                  isSlideLoaded
                    ? hasTextContent
                      ? 'opacity-100 bg-gradient-to-t from-[#14110E]/85 via-[#14110E]/40 to-black/15'
                      : 'opacity-100 bg-gradient-to-t from-black/55 via-transparent to-transparent'
                    : 'opacity-0'
                }`}
                aria-hidden="true"
              />

              {/* Slide Content Container */}
              {(hasTextContent || hasButton) && (
                <div className="absolute inset-0 flex items-end pointer-events-none">
                  <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 pb-16 sm:pb-24 lg:pb-28">
                    <div
                      className={`max-w-2xl text-[#FAF8F5] transition-all duration-700 ease-out ${
                        isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
                      }`}
                    >
                      {hasEyebrow && (
                        <p className="text-[11px] sm:text-xs tracking-[0.24em] uppercase text-[#E5DDD3] mb-4 sm:mb-5 drop-shadow-sm">
                          {slide.eyebrow}
                        </p>
                      )}
                      {hasHeading && (
                        <h1 className="font-serif text-[28px] xs:text-[34px] sm:text-6xl lg:text-[70px] font-light sm:font-normal tracking-[0.05em] leading-[1.08] text-[#FAF8F5] mb-4 sm:mb-6 break-words drop-shadow-md">
                          {slide.heading}
                        </h1>
                      )}
                      {hasSubheading && (
                        <p className="text-base sm:text-xl text-[#EDE7DF] font-light tracking-[0.02em] leading-relaxed mb-9 sm:mb-11 max-w-lg drop-shadow-sm">
                          {slide.subheading}
                        </p>
                      )}
                      {hasButton && (
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!isDragging.current) {
                                onShopCollection(slide.targetCategory);
                              }
                            }}
                            className="pointer-events-auto inline-flex items-center gap-3.5 px-8 py-4 bg-[#FAF8F5] text-[#1E1B18] text-[11px] sm:text-xs font-medium tracking-[0.2em] uppercase hover:bg-[#EDE7DF] transition-colors whitespace-nowrap cursor-pointer shadow-lg"
                          >
                            <span>{slide.buttonLabel}</span>
                            <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Bottom Navigation Bar: 3 Pagination Dots & Desktop Arrow Controls */}
        <div className="absolute inset-x-0 bottom-6 sm:bottom-9 z-20 pointer-events-none">
          <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 flex items-center justify-between">
            {/* 3 Small Pagination Dots */}
            <div className="flex items-center gap-2.5 pointer-events-auto">
              {heroSlides.map((slide, idx) => {
                const isActive = idx === activeSlide;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={`Go to slide ${idx + 1}: ${slide.heading || slide.eyebrow || 'Featured Collection'}`}
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
      )}

      {/* 2. Shop By Category — Exact 4 Categories with Dynamic Product Thumbnails & Counts */}
      {siteSettings?.showCategorySection !== false && (
      <section className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 sm:mb-14">
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase text-[#7C736A] mb-2">
              {siteSettings?.categorySectionEyebrow || 'The Launch Silhouettes'}
            </p>
            <h2 className="font-serif text-3xl sm:text-[42px] text-[#1E1B18] font-normal leading-tight">
              {siteSettings?.categorySectionHeading || 'Shop By Category'}
            </h2>
            {siteSettings?.categorySectionSubheading && (
              <p className="text-xs sm:text-sm text-[#7C736A] mt-1 font-light">
                {siteSettings.categorySectionSubheading}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onShopCollection('All Collection')}
            className="mt-3 sm:mt-0 self-start sm:self-auto inline-flex items-center gap-2 text-xs tracking-[0.14em] uppercase text-[#4A433D] hover:text-[#1E1B18] pb-1 border-b border-[#D5CCC0] hover:border-[#1E1B18] transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>All Collection</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[1.4]" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-7">
          {CATEGORIES.map((category) => {
            const categoryProducts = products.filter((p) => p.category === category.id);
            const defaultDynamicCover = categoryProducts[0]?.primaryImage || category.image;
            const customCover =
              siteSettings?.categoryImages?.[category.name] ||
              siteSettings?.categoryImages?.[category.id] ||
              defaultDynamicCover;
            const customTagline =
              siteSettings?.categoryTaglines?.[category.name] ||
              siteSettings?.categoryTaglines?.[category.id] ||
              category.tagline;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onShopCollection(category.id)}
                className="group text-left flex flex-col cursor-pointer"
              >
                {/* Reduced-Height Editorial Frame (4:3 on mobile, 5:4 on desktop) */}
                <div className="relative aspect-[4/3] sm:aspect-[5/4] w-full bg-[#F3EFEA] overflow-hidden mb-3.5 sm:mb-4">
                  <EditorialImage
                    src={customCover}
                    alt={`${category.name} — ${customTagline}`}
                    fallbackLabel={category.name}
                    containerClassName="w-full h-full"
                    className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                  />
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-serif text-xl sm:text-[26px] text-[#1E1B18] font-normal group-hover:text-[#6E5043] transition-colors">
                    {category.name}
                  </h3>
                  <span className="text-xs sm:text-sm tracking-[0.1em] text-[#7C736A] group-hover:text-[#1E1B18] transition-colors inline-flex items-center gap-1.5 font-light">
                    <span>Explore</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[1.4] transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </div>
                <p className="hidden sm:block text-xs text-[#7C736A] mt-1 line-clamp-1 font-light">
                  {customTagline}
                </p>
              </button>
            );
          })}
        </div>
      </section>
      )}

      {/* 3. New Arrivals (Dynamic Database Catalog) */}
      {siteSettings?.showNewArrivals !== false && (
      <section
        id="new-arrivals"
        className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 scroll-mt-24"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 sm:mb-14 px-0.5 sm:px-0 gap-4">
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase text-[#7C736A] mb-2">
              {siteSettings?.newArrivalsEyebrow || 'Inaugural Release'}
            </p>
            <h2 className="font-serif text-3xl sm:text-[42px] text-[#1E1B18] font-normal leading-tight">
              {siteSettings?.newArrivalsHeading || 'New Arrivals'}
            </h2>
            {siteSettings?.newArrivalsSubheading && (
              <p className="text-xs sm:text-sm text-[#7C736A] mt-1 font-light">
                {siteSettings.newArrivalsSubheading}
              </p>
            )}
          </div>
          {products.length > 8 && (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setShowAllInNewArrivals((prev) => !prev)}
                className="text-xs tracking-[0.14em] uppercase text-[#4A433D] hover:text-[#1E1B18] pb-1 border-b border-[#D5CCC0] hover:border-[#1E1B18] transition-colors cursor-pointer"
              >
                {showAllInNewArrivals ? 'Show Featured 8' : 'Show All Silhouettes'}
              </button>
            </div>
          )}
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3.5 sm:gap-x-7 lg:gap-x-8 gap-y-10 sm:gap-y-16">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="space-y-3">
                <div className="aspect-[3/4] w-full bg-[#ECE6DD] animate-pulse" />
                <div className="h-3 w-24 bg-[#ECE6DD] animate-pulse" />
                <div className="h-5 w-40 bg-[#ECE6DD] animate-pulse" />
              </div>
            ))}
          </div>
        ) : newArrivals.length === 0 ? (
          <div className="py-16 px-6 text-center bg-[#F3EFEA] border border-dashed border-[#D5CCC0] space-y-2">
            <p className="font-serif text-2xl text-[#1E1B18]">No Garments Published Yet</p>
            <p className="text-xs text-[#7C736A] max-w-md mx-auto">
              New silhouettes added from the Admin Atelier will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3.5 sm:gap-x-7 lg:gap-x-8 gap-y-10 sm:gap-y-16">
            {newArrivals.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={index < 4}
                isWishlisted={wishlistIds.includes(product.id)}
                onSelectProduct={onSelectProduct}
                onToggleWishlist={onToggleWishlist}
                onQuickAdd={onQuickAdd}
              />
            ))}
          </div>
        )}

        <div className="mt-14 sm:mt-20 text-center">
          <button
            type="button"
            onClick={() => onShopCollection('All Collection')}
            className="inline-flex items-center gap-3 px-9 py-4 border border-[#1E1B18]/80 text-[#1E1B18] text-[11px] sm:text-xs font-medium tracking-[0.18em] uppercase hover:bg-[#231F1D] hover:text-[#FAF8F5] hover:border-[#231F1D] transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>Explore Full Collection</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[1.4]" />
          </button>
        </div>
      </section>
      )}

      {/* 4. Brand Story — Generous Editorial Rest Section */}
      {siteSettings?.showBrandStory !== false && (
      <section id="brand-story" className="bg-[#F3EFEA] py-16 sm:py-24 lg:py-32">
        <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            <div className="lg:col-span-7">
              <div className="aspect-[16/10] w-full overflow-hidden bg-[#EAE3DA]">
                <EditorialImage
                  src={siteSettings?.brandStory || EDITORIAL_ASSETS.brandStory}
                  alt="AABHA CLOTHING handloom mulmul and organza silhouette in sunlit sandstone verandah"
                  containerClassName="w-full h-full"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="lg:col-span-5 space-y-6 sm:space-y-7">
              <p className="text-[11px] tracking-[0.2em] uppercase text-[#7C736A]">
                {siteSettings?.brandStoryEyebrow || 'AABHA CLOTHING · Our Philosophy'}
              </p>

              <h2 className="font-serif text-3xl sm:text-4xl lg:text-[44px] leading-[1.14] text-[#1E1B18] font-normal">
                {siteSettings?.brandStoryTitle || 'MADE FOR YOUR EVERYDAY ELEGANCE'}
              </h2>

              <p className="text-[15px] sm:text-base text-[#4A433D] font-light leading-[1.75]">
                {siteSettings?.brandStoryParagraph1 ||
                  'Born from a desire to move beyond heavy occasion-only ornamentation, AABHA reimagines Indian textile heritage for the rhythm of modern life. Our collection brings together panelled Anarkalis, three-piece Chanderi ensembles, tailored Khadi co-ord sets, and authentic hand-embroidered Chikankari.'}
              </p>

              <p className="text-[15px] sm:text-base text-[#4A433D] font-light leading-[1.75]">
                {siteSettings?.brandStoryParagraph2 ||
                  'Every garment is tailored with French seams, deep concealed pockets, and soft cotton mulmul linings—silhouettes that feel as natural in morning light as they do at an intimate evening gathering.'}
              </p>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => {
                    if (siteSettings?.brandStoryButtonLink === 'shop') {
                      onShopCollection('All Collection');
                    } else {
                      onNavigateAbout();
                    }
                  }}
                  className="inline-flex items-center gap-2.5 text-xs font-medium tracking-[0.16em] uppercase text-[#1E1B18] border-b border-[#1E1B18]/60 pb-1.5 hover:text-[#6E5043] hover:border-[#6E5043] transition-colors cursor-pointer"
                >
                  <span>{siteSettings?.brandStoryButtonText || 'Discover Our Craft'}</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[1.4]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* 5. Curated Collection */}
      {siteSettings?.showCuratedSection !== false && curatedProducts.length > 0 && (
        <section id="curated" className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 sm:mb-14 px-0.5 sm:px-0">
            <div>
              <p className="text-[11px] tracking-[0.2em] uppercase text-[#7C736A] mb-2">
                {siteSettings?.curatedEyebrow || 'House Signatures'}
              </p>
              <h2 className="font-serif text-3xl sm:text-[42px] text-[#1E1B18] font-normal leading-tight">
                {siteSettings?.curatedHeading || 'Curated Collection'}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#7C736A] mt-2 sm:mt-0 font-light">
              {siteSettings?.curatedSubheading || 'Signature silhouettes selected from our collection'}
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
      )}

      {/* 6. Instagram-Style Fashion Gallery */}
      {siteSettings?.showInstagramSection !== false && (
      <section className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 sm:mb-12">
            <div>
              <p className="text-[11px] tracking-[0.2em] uppercase text-[#7C736A] mb-2">
                {siteSettings?.igSectionEyebrow || (siteSettings?.instagramHandle ? siteSettings.instagramHandle : '@aabhaclothing')}
              </p>
              <h2 className="font-serif text-3xl sm:text-[42px] text-[#1E1B18] font-normal leading-tight">
                {siteSettings?.igSectionHeading || 'In Quiet Motion'}
              </h2>
            </div>
            <span className="text-xs sm:text-sm text-[#7C736A] font-light mt-2 sm:mt-0">
              {siteSettings?.igSectionSubheading || 'Select any frame to explore the silhouette'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-5">
            {instagramGallery.map((post) => (
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
      </section>
      )}

      {/* 7. Heritage & Trust Badges (4 Pillars) */}
      {siteSettings?.showTrustBadges !== false && (
      <section className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
        <div className="border-t border-[#ECE6DD] pt-14 sm:pt-16 grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
          <div className="space-y-2">
            <Truck className="w-5 h-5 text-[#6E5043] stroke-[1.3]" />
            <h3 className="font-serif text-xl text-[#1E1B18] font-normal">
              {siteSettings?.trustBadge1Title || 'Artisan Handcrafted'}
            </h3>
            <p className="text-xs sm:text-[13px] text-[#7C736A] font-light leading-relaxed">
              {siteSettings?.trustBadge1Subtitle || 'Complimentary insured express delivery across all Indian PIN codes.'}
            </p>
          </div>

          <div className="space-y-2">
            <RotateCcw className="w-5 h-5 text-[#6E5043] stroke-[1.3]" />
            <h3 className="font-serif text-xl text-[#1E1B18] font-normal">
              {siteSettings?.trustBadge2Title || 'French Seams & Mulmul Lining'}
            </h3>
            <p className="text-xs sm:text-[13px] text-[#7C736A] font-light leading-relaxed">
              {siteSettings?.trustBadge2Subtitle || '14-day complimentary doorstep return and size exchange.'}
            </p>
          </div>

          <div className="space-y-2">
            <ShieldCheck className="w-5 h-5 text-[#6E5043] stroke-[1.3]" />
            <h3 className="font-serif text-xl text-[#1E1B18] font-normal">
              {siteSettings?.trustBadge3Title || 'Complimentary Express Delivery & COD'}
            </h3>
            <p className="text-xs sm:text-[13px] text-[#7C736A] font-light leading-relaxed">
              {siteSettings?.trustBadge3Subtitle || 'Zero advance payment. Pay conveniently via cash or UPI upon delivery.'}
            </p>
          </div>

          <div className="space-y-2">
            <Compass className="w-5 h-5 text-[#6E5043] stroke-[1.3]" />
            <h3 className="font-serif text-xl text-[#1E1B18] font-normal">
              {siteSettings?.trustBadge4Title || 'Dedicated Atelier Concierge'}
            </h3>
            <p className="text-xs sm:text-[13px] text-[#7C736A] font-light leading-relaxed">
              {siteSettings?.trustBadge4Subtitle || 'Crafted in India with authentic handloom textiles and artisanal tailoring.'}
            </p>
          </div>
        </div>
      </section>
      )}
    </div>
  );
};
