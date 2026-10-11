import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Compass, Sparkles, Home, ShoppingBag } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1E1B18] font-sans antialiased flex flex-col justify-between p-6 sm:p-12 selection:bg-[#231F1D] selection:text-[#FAF8F5]">
      {/* Top Brand Bar */}
      <header className="flex items-center justify-between max-w-5xl mx-auto w-full border-b border-[#ECE6DD] pb-6">
        <Link href="/" className="inline-block group">
          <span className="font-serif text-2xl tracking-[0.25em] text-[#1E1B18] uppercase">
            AABHA
          </span>
          <span className="block text-[8px] tracking-[0.4em] uppercase text-[#7C736A] group-hover:text-[#6E5043] transition-colors">
            Haute Atelier · 2026
          </span>
        </Link>

        <Link
          href="/"
          className="text-xs uppercase tracking-wider text-[#6E5043] hover:text-[#1E1B18] transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Storefront</span>
        </Link>
      </header>

      {/* Main 404 Hero */}
      <main className="max-w-2xl mx-auto text-center py-16 sm:py-24 space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#F3EFEA] border border-[#ECE6DD] text-[11px] tracking-[0.25em] uppercase text-[#7C736A]">
          <Compass className="w-3.5 h-3.5 text-[#6E5043]" />
          <span>Error Code 404 · Uncharted Route</span>
        </div>

        <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-light text-[#1E1B18] tracking-tight leading-none">
          Silhouette Not Found
        </h1>

        <p className="text-sm sm:text-base text-[#5C544D] font-light max-w-lg mx-auto leading-relaxed">
          The bespoke garment, collection, or atelier page you are looking for has been archived, 
          re-tailored, or does not exist in our digital boutique.
        </p>

        {/* Quick Route Navigations */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="w-full sm:w-auto px-8 py-3.5 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-[0.18em] hover:bg-[#14110E] transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Return to Boutique</span>
          </Link>

          <Link
            href="/my-orders"
            className="w-full sm:w-auto px-8 py-3.5 bg-[#F3EFEA] border border-[#D5CCC0] text-[#1E1B18] text-xs font-medium uppercase tracking-[0.18em] hover:bg-[#ECE6DD] transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4 text-[#6E5043]" />
            <span>Track Orders (COD)</span>
          </Link>
        </div>

        {/* Popular Atelier Collections Shortcuts */}
        <div className="pt-10 border-t border-[#ECE6DD] max-w-md mx-auto">
          <p className="text-xs uppercase tracking-wider text-[#7C736A] mb-3">
            Popular Atelier Collections
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            {['Anarkali Suits', 'Handwoven Chanderi', 'Co-ord Sets', '3-Piece Ensembles'].map((item) => (
              <Link
                key={item}
                href="/"
                className="px-3 py-1 bg-[#FAF8F5] border border-[#E0D8CE] text-[#5C544D] hover:text-[#1E1B18] hover:border-[#1E1B18] transition-colors"
              >
                {item}
              </Link>
            ))}
          </div>
        </div>
      </main>

      {/* Footer Minimal Notice */}
      <footer className="text-center text-xs text-[#7C736A] border-t border-[#ECE6DD] pt-6 max-w-5xl mx-auto w-full">
        <p>© 2026 AABHA CLOTHING · Premium Indian Women&apos;s Ethnic Wear · Cash on Delivery Pan-India</p>
      </footer>
    </div>
  );
}
