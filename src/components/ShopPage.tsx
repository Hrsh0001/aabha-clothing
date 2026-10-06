import React, { useState, useMemo } from 'react';
import {
  Product,
  CollectionFilter,
  GarmentSize,
  CATEGORIES,
} from '../data/products';
import { ProductCard } from './ProductCard';

interface ShopPageProps {
  products: Product[];
  selectedCategory: CollectionFilter;
  wishlistIds: string[];
  onSelectCategory: (category: CollectionFilter) => void;
  onSelectProduct: (product: Product) => void;
  onToggleWishlist: (productId: string, e: React.MouseEvent) => void;
  onQuickAdd: (product: Product, size: GarmentSize, e: React.MouseEvent) => void;
}

type SortOption = 'featured' | 'newest' | 'price-asc' | 'price-desc';

const CATEGORY_TABS: Array<{ id: CollectionFilter; label: string; count: number }> = [
  { id: 'All Collection', label: 'All Collection – 17', count: 17 },
  { id: 'Anarkali', label: 'Anarkali – 2', count: 2 },
  { id: '3-Piece Dresses', label: '3-Piece Dresses – 5', count: 5 },
  { id: 'Co-ord Sets', label: 'Co-ord Sets – 9', count: 9 },
  { id: 'Chikankari Suit', label: 'Chikankari Suit – 1', count: 1 },
];

export const ShopPage: React.FC<ShopPageProps> = ({
  products,
  selectedCategory,
  wishlistIds,
  onSelectCategory,
  onSelectProduct,
  onToggleWishlist,
  onQuickAdd,
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  const activeCategoryMeta = useMemo(() => {
    if (selectedCategory === 'All Collection') {
      return {
        title: 'All Collection',
        subtitle:
          'The AABHA CLOTHING inaugural 17-piece collection: 2 Anarkalis, 5 Three-Piece Dresses, 9 Co-ord Sets, and 1 Chikankari Suit.',
      };
    }
    const found = CATEGORIES.find((c) => c.id === selectedCategory);
    return {
      title: selectedCategory,
      subtitle: found?.tagline || 'Contemporary Indian silhouettes crafted in small batches.',
    };
  }, [selectedCategory]);

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

  return (
    <div className="max-w-[1400px] mx-auto px-3.5 sm:px-8 lg:px-12 py-12 sm:py-20">
      {/* Editorial Category Header */}
      <div className="pb-10 sm:pb-12 px-0.5 sm:px-0">
        <p className="text-[11px] tracking-[0.2em] uppercase text-[#7C736A] mb-3">
          AABHA CLOTHING · {selectedCategory}
        </p>
        <h1 className="font-serif text-3xl sm:text-5xl text-[#1E1B18] font-normal leading-tight">
          {activeCategoryMeta.title}
        </h1>
        <p className="text-sm sm:text-base text-[#5C544D] font-light mt-3 max-w-2xl leading-relaxed">
          {activeCategoryMeta.subtitle}
        </p>
      </div>

      {/* Minimal Editorial Filter & Sort Bar */}
      <div className="py-4 border-y border-[#ECE6DD] flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-0.5 sm:px-0">
        {/* Clean Minimal Category Filter Tabs with Exact Counts */}
        <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto no-scrollbar">
          {CATEGORY_TABS.map((tab) => {
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

        {/* Minimal Sort Select & Product Count */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 sm:gap-6 text-xs text-[#5C544D]">
          <div className="flex items-center gap-2">
            <label htmlFor="sort-select" className="text-[#7C736A] whitespace-nowrap">
              Sort:
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent border-b border-[#D5CCC0] pb-0.5 text-xs text-[#1E1B18] focus:outline-none focus:border-[#1E1B18] cursor-pointer"
            >
              <option value="featured">Curated</option>
              <option value="newest">New Arrivals</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>

          <span className="text-xs text-[#7C736A] tabular-nums">
            Showing {filteredProducts.length} of 17 Products
          </span>
        </div>
      </div>

      {/* Clean 2-Column Mobile / 4-Column Desktop Product Grid with Subtle Category Fade-In */}
      <div
        key={`${selectedCategory}-${sortBy}`}
        className="mt-10 sm:mt-14 grid grid-cols-2 lg:grid-cols-4 gap-x-3.5 sm:gap-x-7 lg:gap-x-8 gap-y-10 sm:gap-y-16 animate-page-fade"
      >
        {filteredProducts.map((product) => (
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
    </div>
  );
};
