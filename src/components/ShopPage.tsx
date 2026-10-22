'use client';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Check,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Product,
  CollectionFilter,
  GarmentSize,
  CATEGORIES,
} from '../data/products';
import { ProductCard } from './ProductCard';
import type { SiteSettings } from '../app/api/settings/route';

interface ShopPageProps {
  products: Product[];
  selectedCategory: CollectionFilter;
  wishlistIds: string[];
  siteSettings?: SiteSettings | null;
  onSelectCategory: (category: CollectionFilter) => void;
  onSelectProduct: (product: Product) => void;
  onToggleWishlist: (productId: string, e: React.MouseEvent) => void;
  onQuickAdd: (product: Product, size: GarmentSize, e: React.MouseEvent) => void;
}

export type SortOption = 'featured' | 'newest' | 'price-asc' | 'price-desc';

const SORT_OPTIONS: Array<{ value: SortOption; label: string; description: string }> = [
  { value: 'featured', label: 'Curated', description: 'Handpicked house silhouettes' },
  { value: 'newest', label: 'New Arrivals', description: 'Freshly tailored designs' },
  { value: 'price-asc', label: 'Price: Low to High', description: 'Modest to luxury tier' },
  { value: 'price-desc', label: 'Price: High to Low', description: 'Luxury craftsmanship first' },
];

const ITEMS_PER_PAGE = 8;

export const ShopPage: React.FC<ShopPageProps> = ({
  products,
  selectedCategory,
  wishlistIds,
  siteSettings,
  onSelectCategory,
  onSelectProduct,
  onToggleWishlist,
  onQuickAdd,
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [sortOpen, setSortOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close custom dropdown on outside click or escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setSortOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSortOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Reset pagination when category or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, sortBy]);

  const activeCategoryMeta = useMemo(() => {
    if (selectedCategory === 'All Collection') {
      return {
        title: 'All Collection',
        subtitle:
          siteSettings?.categorySectionSubheading ||
          'The AABHA CLOTHING curated collection: handcrafted Anarkalis, Three-Piece Dresses, Co-ord Sets, and Chikankari Suits in Chanderi silk and fine linen.',
      };
    }
    const found = CATEGORIES.find((c) => c.id === selectedCategory);
    const customTagline =
      siteSettings?.categoryTaglines?.[selectedCategory] ||
      (found ? siteSettings?.categoryTaglines?.[found.name] : undefined);
    return {
      title: selectedCategory,
      subtitle:
        customTagline ||
        found?.tagline ||
        'Contemporary Indian silhouettes crafted in small batches.',
    };
  }, [selectedCategory, siteSettings]);

  const categoryTabs = useMemo(() => {
    return [
      {
        id: 'All Collection' as CollectionFilter,
        label: 'All Collection',
      },
      {
        id: 'Anarkali' as CollectionFilter,
        label: 'Anarkali',
      },
      {
        id: '3-Piece Dresses' as CollectionFilter,
        label: '3-Piece Dresses',
      },
      {
        id: 'Co-ord Sets' as CollectionFilter,
        label: 'Co-ord Sets',
      },
      {
        id: 'Chikankari Suit' as CollectionFilter,
        label: 'Chikankari Suit',
      },
    ];
  }, []);

  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (selectedCategory !== 'All Collection') {
      list = list.filter((p) => p.category === selectedCategory);
    }

    if (sortBy === 'newest') {
      list.sort((a, b) => Number(b.isNewArrival) - Number(a.isNewArrival));
    } else if (sortBy === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    }

    return list;
  }, [products, selectedCategory, sortBy]);

  // Paginated visible products
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, currentPage * ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const selectedSortMeta = useMemo(() => {
    return SORT_OPTIONS.find((s) => s.value === sortBy) || SORT_OPTIONS[0];
  }, [sortBy]);

  return (
    <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-8 sm:py-14 lg:py-20">
      {/* Editorial Category Header */}
      {siteSettings?.showShopHeader !== false && (
        <div className="pb-8 sm:pb-12 px-0.5 sm:px-0">
          <p className="text-[11px] tracking-[0.2em] uppercase text-[#7C736A] mb-3">
            AABHA CLOTHING · {selectedCategory}
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#1E1B18] font-normal leading-tight">
            {activeCategoryMeta.title}
          </h1>
          <p className="text-sm sm:text-base text-[#5C544D] font-light mt-3 max-w-2xl leading-relaxed">
            {activeCategoryMeta.subtitle}
          </p>
        </div>
      )}

      {/* Minimal Editorial Filter & Custom Sort Bar */}
      {siteSettings?.showShopFilters !== false && (
        <div className="py-4 border-y border-[#ECE6DD] flex flex-col md:flex-row md:items-center justify-between gap-4 px-0.5 sm:px-0 relative z-20">
        {/* Clean Minimal Category Filter Tabs with Exact Counts */}
        <div className="flex items-center gap-4 sm:gap-6 md:gap-8 overflow-x-auto no-scrollbar py-1">
          {categoryTabs.map((tab) => {
            const active = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectCategory(tab.id)}
                className={`py-1.5 text-xs sm:text-[13px] tracking-[0.06em] border-b transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
                  active
                    ? 'border-[#1E1B18] text-[#1E1B18] font-medium'
                    : 'border-transparent text-[#7C736A] hover:text-[#1E1B18]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Custom Luxury Sort Menu & Product Count */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-4 sm:gap-6 text-xs text-[#5C544D]">
          {/* Custom Luxury Editorial Dropdown */}
          <div ref={sortRef} className="relative">
            <button
              type="button"
              onClick={() => setSortOpen((prev) => !prev)}
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
              className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#E0D8CE] bg-[#FAF8F5] text-xs text-[#1E1B18] hover:border-[#1E1B18] transition-colors cursor-pointer group"
            >
              <span className="text-[#7C736A] font-light">Sort:</span>
              <span className="font-medium text-[#1E1B18]">{selectedSortMeta.label}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#7C736A] transition-transform duration-200 ${
                  sortOpen ? 'rotate-180 text-[#1E1B18]' : ''
                }`}
              />
            </button>

            {/* Custom Luxury Dropdown Menu */}
            {sortOpen && (
              <div
                role="listbox"
                className="absolute right-0 top-full mt-2 w-64 bg-[#FAF8F5] border border-[#ECE6DD] shadow-2xl py-2 z-50 animate-fadeIn"
              >
                <div className="px-3 py-2 border-b border-[#ECE6DD] text-[10px] uppercase tracking-widest text-[#7C736A] font-medium">
                  Sort Silhouettes
                </div>
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = sortBy === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setSortBy(opt.value);
                        setSortOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#F3EFEA] text-[#1E1B18] font-medium'
                          : 'text-[#5C544D] hover:bg-[#F3EFEA]/60 hover:text-[#1E1B18]'
                      }`}
                    >
                      <div>
                        <p className="text-xs">{opt.label}</p>
                        <p className="text-[10px] text-[#8C8278] font-light mt-0.5">
                          {opt.description}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#6E5043] shrink-0 stroke-[1.8]" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <span className="text-xs text-[#7C736A] tabular-nums">
            Showing {displayedProducts.length}{' '}
            {displayedProducts.length === 1 ? 'Silhouette' : 'Silhouettes'}
          </span>
        </div>
      </div>
      )}

      {/* Clean 2-Column Mobile / 3-Column Tablet / 4-Column Desktop Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-[#ECE6DD] bg-[#F3EFEA] mt-8 sm:mt-12 space-y-4 px-4">
          <p className="font-serif text-2xl text-[#1E1B18]">No garments found in this category</p>
          <p className="text-xs text-[#7C736A] max-w-md mx-auto leading-relaxed">
            We could not find any active silhouettes in "{selectedCategory}". Explore our full collection of handcrafted Indian ethnic wear.
          </p>
          <button
            type="button"
            onClick={() => onSelectCategory('All Collection')}
            className="px-6 py-2.5 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-[0.16em] hover:bg-[#14110E] transition-colors cursor-pointer"
          >
            Explore All Collection
          </button>
        </div>
      ) : (
        <>
          <div
            key={`${selectedCategory}-${sortBy}`}
            className="mt-8 sm:mt-12 lg:mt-14 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3.5 sm:gap-x-6 lg:gap-x-8 gap-y-8 sm:gap-y-12 lg:gap-y-16 animate-page-fade"
          >
            {displayedProducts.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={idx < 4}
                isWishlisted={wishlistIds.includes(product.id)}
                onSelectProduct={onSelectProduct}
                onToggleWishlist={onToggleWishlist}
                onQuickAdd={onQuickAdd}
              />
            ))}
          </div>

          {/* Smooth Pagination & Load More Controls */}
          {displayedProducts.length < filteredProducts.length && (
            <div className="mt-14 sm:mt-20 flex flex-col items-center justify-center space-y-4 border-t border-[#ECE6DD] pt-12">
              <p className="text-xs text-[#7C736A] font-light">
                Viewing {displayedProducts.length} curated garments
              </p>
              {/* Progress bar */}
              <div className="w-48 h-1 bg-[#ECE6DD] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#231F1D] transition-all duration-300"
                  style={{
                    width: `${Math.round((displayedProducts.length / filteredProducts.length) * 100)}%`,
                  }}
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className="px-8 py-3.5 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium tracking-[0.18em] uppercase hover:bg-[#14110E] transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>Load More Silhouettes</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  className="px-5 py-3.5 border border-[#E0D8CE] bg-transparent text-[#1E1B18] text-xs font-medium tracking-[0.16em] uppercase hover:border-[#1E1B18] transition-colors cursor-pointer"
                >
                  View All Silhouettes
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
