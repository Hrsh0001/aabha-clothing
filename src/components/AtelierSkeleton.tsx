'use client';
import React from 'react';

/**
 * Atelier Loading Skeleton
 * Renders a pixel-faithful luxury layout skeleton while initial catalog data
 * and branding settings are being retrieved, preventing blank flashes,
 * centered spinner jumps, and layout shifts.
 */
export const AtelierSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1E1B18] flex flex-col font-sans select-none overflow-x-hidden">
      {/* 1. Announcement Bar Skeleton */}
      <div className="h-8 bg-[#ECE6DD] flex items-center justify-center px-4">
        <div className="h-2.5 w-64 sm:w-96 bg-[#D5CCC0] rounded-xs animate-pulse" />
      </div>

      {/* 2. Haute Atelier Header Skeleton */}
      <header className="h-16 sm:h-20 border-b border-[#ECE6DD] bg-[#FAF8F5] px-4 sm:px-8 lg:px-12 flex items-center justify-between sticky top-0 z-30">
        {/* Left Navigation Placeholders */}
        <div className="hidden lg:flex items-center gap-6">
          <div className="h-3 w-16 bg-[#E0D8CE] animate-pulse rounded-xs" />
          <div className="h-3 w-20 bg-[#E0D8CE] animate-pulse rounded-xs" />
          <div className="h-3 w-18 bg-[#E0D8CE] animate-pulse rounded-xs" />
        </div>
        <div className="lg:hidden flex items-center gap-3">
          <div className="w-5 h-5 bg-[#E0D8CE] animate-pulse rounded-xs" />
        </div>

        {/* Center Brand Identity */}
        <div className="flex flex-col items-center">
          <span className="font-serif text-2xl sm:text-3xl tracking-[0.28em] text-[#1E1B18] uppercase">
            Aabha
          </span>
          <span className="text-[9px] tracking-[0.25em] text-[#7C736A] uppercase font-light -mt-0.5">
            Haute Atelier
          </span>
        </div>

        {/* Right Action Icons Placeholders */}
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="w-4 h-4 bg-[#E0D8CE] animate-pulse rounded-full" />
          <div className="w-4 h-4 bg-[#E0D8CE] animate-pulse rounded-full" />
          <div className="w-4 h-4 bg-[#E0D8CE] animate-pulse rounded-full" />
        </div>
      </header>

      {/* 3. Hero Carousel Banner Skeleton (Warm Luxury Ivory/Beige — Eliminates Mobile Black Box) */}
      <section className="relative w-full h-[70vh] sm:h-[80vh] md:h-[85vh] min-h-[460px] max-h-[880px] bg-[#F3EFEA] overflow-hidden flex items-end">
        {/* Shimmer Background */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#EAE4DC] via-[#F3EFEA] to-[#E5DDD3] animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#EAE4DC]/80 via-transparent to-transparent" />

        <div className="relative max-w-[1920px] w-full mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 pb-16 sm:pb-24 lg:pb-28">
          <div className="max-w-2xl space-y-4">
            <div className="h-3 w-40 bg-[#D5CCC0] rounded-xs animate-pulse" />
            <div className="h-10 sm:h-14 w-3/4 bg-[#D5CCC0] rounded-xs animate-pulse" />
            <div className="h-4 w-1/2 bg-[#DCD4C8] rounded-xs animate-pulse" />
            <div className="pt-2">
              <div className="h-11 w-44 bg-[#D5CCC0] rounded-xs animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Curated Silhouettes Catalog Skeleton */}
      <section className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-16 sm:py-24 space-y-8">
        <div className="flex items-end justify-between border-b border-[#ECE6DD] pb-4">
          <div className="space-y-2">
            <div className="h-3 w-28 bg-[#E0D8CE] animate-pulse rounded-xs" />
            <div className="h-7 w-52 bg-[#D5CCC0] animate-pulse rounded-xs" />
          </div>
          <div className="h-3 w-24 bg-[#E0D8CE] animate-pulse rounded-xs hidden sm:block" />
        </div>

        {/* 4-Column Product Grid Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="space-y-3">
              {/* 3:4 Portrait Ratio */}
              <div className="relative aspect-[3/4] w-full bg-[#EAE4DC] animate-pulse overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#F3EFEA]/30 to-transparent animate-pulse" />
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="h-2.5 w-20 bg-[#E0D8CE] animate-pulse rounded-xs" />
                <div className="h-4 w-36 bg-[#D5CCC0] animate-pulse rounded-xs" />
                <div className="h-3 w-16 bg-[#E0D8CE] animate-pulse rounded-xs" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
