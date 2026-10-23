'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Shield, Clock, RefreshCw } from 'lucide-react';
import { SiteSettings, CustomPageItem } from '../lib/site-settings';

interface CustomPageViewProps {
  slug: string;
  siteSettings: SiteSettings | null;
  onBackToShop: () => void;
}

export const CustomPageView: React.FC<CustomPageViewProps> = ({
  slug,
  siteSettings,
  onBackToShop,
}) => {
  const pages: CustomPageItem[] = siteSettings?.customPages || [];
  const page = pages.find((p) => p.slug === slug || p.id === slug);

  if (!page) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-20 text-center bg-[#FAF8F5]">
        <div className="w-12 h-12 rounded-full bg-[#F3EFEA] border border-[#ECE6DD] flex items-center justify-center text-[#6E5043] mb-4">
          <Sparkles className="w-5 h-5 stroke-[1.4]" />
        </div>
        <span className="text-[10px] uppercase tracking-[0.25em] text-[#7C736A] font-medium block mb-2">
          ATELIER ARCHIVE
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#1E1B18] font-normal mb-3">
          Page In Preparation
        </h1>
        <p className="text-xs text-[#7C736A] max-w-md mx-auto leading-relaxed mb-6 font-light">
          This bespoke journal entry or editorial page is being curated by the atelier karigars. Please return to explore our active collection silhouettes.
        </p>
        <button
          type="button"
          onClick={onBackToShop}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#231F1D] text-[#FAF8F5] text-xs uppercase tracking-widest font-medium hover:bg-[#14110E] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Explore All Silhouettes</span>
        </button>
      </div>
    );
  }

  const paragraphs = (page.content || '')
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <article className="min-h-screen bg-[#FAF8F5] text-[#1E1B18]">
      {/* 1. Hero Editorial Banner */}
      <section className="relative w-full bg-[#1A1715] text-[#FAF8F5] overflow-hidden min-h-[380px] sm:min-h-[460px] flex items-center">
        {page.heroImage && (
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={page.heroImage}
              alt={page.title}
              className="w-full h-full object-cover object-center brightness-[0.78]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1A1715] via-[#1A1715]/40 to-transparent" />
          </div>
        )}

        <div className="relative z-10 max-w-[1920px] mx-auto w-full px-4 sm:px-6 md:px-12 lg:px-20 py-16 sm:py-24">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#D5CCC0] font-medium">
                AABHA EDITORIAL JOURNAL
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl text-[#FAF8F5] font-normal tracking-tight leading-tight">
              {page.title}
            </h1>

            {page.subtitle && (
              <p className="font-serif italic text-base sm:text-lg text-[#EAE4DC] font-light max-w-2xl">
                {page.subtitle}
              </p>
            )}

            <div className="pt-4 flex items-center gap-4 text-[10px] uppercase tracking-widest text-[#A69C91]">
              <span>Handcrafted in Limited Editions</span>
              <span>·</span>
              <span>Pure Mulmul &amp; Chanderi</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Editorial Narrative Body */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-16 sm:py-24">
        <div className="space-y-6 sm:space-y-8">
          {paragraphs.map((para, idx) => (
            <p
              key={idx}
              className={`text-[#2C2723] leading-relaxed font-light ${
                idx === 0
                  ? 'text-lg sm:text-xl font-serif text-[#1E1B18] leading-relaxed border-l-2 border-[#D4AF37] pl-4 sm:pl-6'
                  : 'text-sm sm:text-base'
              }`}
            >
              {para}
            </p>
          ))}
        </div>

        {/* Dynamic Custom Sections (if added via Admin Pages Manager) */}
        {Array.isArray(page.sections) && page.sections.length > 0 && (
          <div className="mt-16 space-y-12">
            {page.sections
              .filter((sec) => sec.visible !== false)
              .map((sec) => (
                <div
                  key={sec.id}
                  className="bg-[#F8F5F0] border border-[#ECE6DD] p-6 sm:p-8 space-y-4 rounded-xs"
                >
                  {sec.title && (
                    <h3 className="font-serif text-2xl text-[#1E1B18] font-normal">
                      {sec.title}
                    </h3>
                  )}
                  {sec.subtitle && (
                    <p className="text-xs uppercase tracking-widest text-[#7C736A] font-medium">
                      {sec.subtitle}
                    </p>
                  )}
                  {sec.imageUrl && (
                    <div className="w-full h-64 sm:h-80 overflow-hidden rounded-xs border border-[#ECE6DD]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sec.imageUrl}
                        alt={sec.title || 'Page Section Image'}
                        className="w-full h-full object-cover object-center"
                      />
                    </div>
                  )}
                  {sec.content && (
                    <p className="text-sm text-[#3E3832] font-light leading-relaxed whitespace-pre-line">
                      {sec.content}
                    </p>
                  )}
                  {sec.buttonLabel && sec.buttonLink && (
                    <div className="pt-2">
                      <a
                        href={sec.buttonLink}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-[#231F1D] text-white text-xs uppercase tracking-wider font-medium hover:bg-black transition-colors"
                      >
                        <span>{sec.buttonLabel}</span>
                        <span>→</span>
                      </a>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Atelier Commitment Pillar */}
        <div className="mt-16 pt-12 border-t border-[#ECE6DD] grid grid-cols-1 sm:grid-cols-3 gap-6 bg-[#F3EFEA] p-6 sm:p-8">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-serif font-medium text-[#1E1B18]">
              <Shield className="w-4 h-4 text-[#6E5043]" />
              <span>Pure Artisan Handloom</span>
            </div>
            <p className="text-[11px] text-[#7C736A] font-light leading-relaxed">
              Every garment is created by master karigars with French seam tailoring and breathable mulmul lining.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-serif font-medium text-[#1E1B18]">
              <Clock className="w-4 h-4 text-[#6E5043]" />
              <span>Complimentary COD</span>
            </div>
            <p className="text-[11px] text-[#7C736A] font-light leading-relaxed">
              Experience the luxury in your hands before completing payment via cash or doorstep UPI.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-serif font-medium text-[#1E1B18]">
              <RefreshCw className="w-4 h-4 text-[#6E5043]" />
              <span>14-Day Free Exchange</span>
            </div>
            <p className="text-[11px] text-[#7C736A] font-light leading-relaxed">
              Complimentary doorstep reverse pickup should any size adjustment be desired.
            </p>
          </div>
        </div>

        {/* Back to Silhouettes CTA */}
        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={onBackToShop}
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#231F1D] text-[#FAF8F5] text-xs uppercase tracking-widest font-medium hover:bg-[#14110E] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Discover The Launch Silhouettes</span>
          </button>
        </div>
      </section>
    </article>
  );
};
