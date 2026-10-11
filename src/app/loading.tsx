import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center bg-[#FAF8F5]">
      {/* Editorial Luxury Shimmer Spinner */}
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 border-2 border-[#E0D8CE] rounded-full" />
        <div className="absolute inset-0 border-2 border-[#6E5043] rounded-full border-t-transparent animate-spin" />
        <div className="absolute inset-3 border border-[#E0D8CE] rounded-full animate-ping opacity-40" />
      </div>

      <p className="font-serif text-xl sm:text-2xl font-light text-[#1E1B18] tracking-wider">
        AABHA CLOTHING
      </p>
      
      <p className="text-[11px] uppercase tracking-[0.25em] text-[#7C736A] mt-2 animate-pulse">
        Curating Atelier Silhouettes...
      </p>
    </div>
  );
}
