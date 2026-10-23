'use client';
import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { CollectionFilter } from '../data/products';
import { PolicyTopic } from './InfoPages';
import { BrandLogo } from './BrandLogo';
import {
  FooterColumn,
  FooterLinkItem,
  DEFAULT_FOOTER_COLUMNS,
  SiteSettings,
} from '../lib/site-settings';

interface FooterProps {
  onNavigateHome: () => void;
  onNavigateCategory: (category: CollectionFilter) => void;
  onNavigateAbout: () => void;
  onNavigateContact: () => void;
  onNavigatePolicy: (topic: PolicyTopic) => void;
  logoUrl?: string;
  siteSettings?: SiteSettings | any;
  footerColumns?: FooterColumn[];
}

const FOOTER_CATEGORIES: CollectionFilter[] = [
  'All Collection',
  'Anarkali',
  '3-Piece Dresses',
  'Co-ord Sets',
  'Chikankari Suit',
];

export const Footer: React.FC<FooterProps> = ({
  onNavigateHome,
  onNavigateCategory,
  onNavigateAbout,
  onNavigateContact,
  onNavigatePolicy,
  logoUrl,
  siteSettings,
  footerColumns,
}) => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) return;

    setErrorMsg('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setSubscribed(true);
        setFeedbackMsg(data.message || 'Thank you for subscribing to AABHA CLOTHING.');
        setEmail('');
      } else {
        setErrorMsg(data.error || 'Failed to subscribe. Please try again.');
      }
    } catch (err) {
      setErrorMsg('Network error. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  const configuredColumns = React.useMemo<FooterColumn[]>(() => {
    const raw = footerColumns !== undefined ? footerColumns : siteSettings?.footerColumns;
    if (Array.isArray(raw)) {
      return raw.filter((col) => col.visible !== false);
    }
    return DEFAULT_FOOTER_COLUMNS.filter((col) => col.visible !== false);
  }, [footerColumns, siteSettings?.footerColumns]);

  const renderFooterLink = (link: FooterLinkItem) => {
    const href = link.href || '/';
    const isExternal = link.openInNewTab || href.startsWith('http://') || href.startsWith('https://');

    // 1. WhatsApp concierge shortcut
    if (href === 'whatsapp' || href.includes('wa.me')) {
      const waNumber = (siteSettings?.whatsappNumber || '919876543210').replace(/[^0-9]/g, '');
      const waUrl = href.startsWith('http')
        ? href
        : `https://wa.me/${waNumber}?text=${encodeURIComponent('Namaste AABHA, I have an inquiry regarding garments and orders.')}`;
      return (
        <a
          key={link.id}
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#FAF8F5] transition-colors inline-flex items-center gap-1.5 text-[#A8E6CF]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#A8E6CF] animate-pulse"></span>
          <span>{link.label}</span>
        </a>
      );
    }

    // 2. Email shortcut
    if (href === 'email' || href.startsWith('mailto:')) {
      const emailAddr = href.startsWith('mailto:')
        ? href
        : `mailto:${siteSettings?.supportEmail || 'care@aabhaclothing.com'}`;
      return (
        <a
          key={link.id}
          href={emailAddr}
          className="hover:text-[#FAF8F5] transition-colors inline-block text-xs"
        >
          {link.label}
        </a>
      );
    }

    // 3. External link
    if (isExternal) {
      return (
        <a
          key={link.id}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#FAF8F5] transition-colors inline-block"
        >
          {link.label}
        </a>
      );
    }

    // 4. Policy topic router
    if (href.startsWith('/policy') || href.startsWith('policy:') || href.includes('topic=')) {
      const match = href.match(/topic=([a-z]+)/);
      const topic = (match ? match[1] : href.replace('policy:', '').replace('/policy', '')) as PolicyTopic;
      return (
        <button
          key={link.id}
          type="button"
          onClick={() => onNavigatePolicy(topic || 'shipping')}
          className="hover:text-[#FAF8F5] transition-colors cursor-pointer text-left"
        >
          {link.label}
        </button>
      );
    }

    // 5. Home
    if (href === '/' || href === '#top' || href === '#home') {
      return (
        <button
          key={link.id}
          type="button"
          onClick={onNavigateHome}
          className="hover:text-[#FAF8F5] transition-colors cursor-pointer text-left"
        >
          {link.label}
        </button>
      );
    }

    // 6. About
    if (href === '/about' || href === '?page=about') {
      return (
        <button
          key={link.id}
          type="button"
          onClick={onNavigateAbout}
          className="hover:text-[#FAF8F5] transition-colors cursor-pointer text-left"
        >
          {link.label}
        </button>
      );
    }

    // 7. Contact
    if (href === '/contact' || href === '?page=contact') {
      return (
        <button
          key={link.id}
          type="button"
          onClick={onNavigateContact}
          className="hover:text-[#FAF8F5] transition-colors cursor-pointer text-left"
        >
          {link.label}
        </button>
      );
    }

    // 8. Category shop
    if (href === '/shop') {
      return (
        <button
          key={link.id}
          type="button"
          onClick={() => onNavigateCategory('All Collection')}
          className="hover:text-[#FAF8F5] transition-colors cursor-pointer text-left"
        >
          {link.label}
        </button>
      );
    }

    if (href.startsWith('/shop?category=') || href.startsWith('category:')) {
      const catParam = href.replace('/shop?category=', '').replace('category:', '');
      const cat = decodeURIComponent(catParam) as CollectionFilter;
      return (
        <button
          key={link.id}
          type="button"
          onClick={() => onNavigateCategory(cat)}
          className="hover:text-[#FAF8F5] transition-colors cursor-pointer text-left"
        >
          {link.label}
        </button>
      );
    }

    if (href.startsWith('/#') || href.startsWith('#')) {
      const targetId = href.replace('/#', '').replace('#', '');
      return (
        <button
          key={link.id}
          type="button"
          onClick={() => {
            onNavigateHome();
            setTimeout(() => {
              const el = document.getElementById(targetId);
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 120);
          }}
          className="hover:text-[#FAF8F5] transition-colors cursor-pointer text-left"
        >
          {link.label}
        </button>
      );
    }

    // 9. Standard internal anchor (e.g. /my-orders)
    return (
      <a
        key={link.id}
        href={href}
        className="hover:text-[#FAF8F5] transition-colors inline-block"
      >
        {link.label}
      </a>
    );
  };

  return (
    <footer className="bg-[#1B1815] text-[#EDE7DF]">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-16 sm:py-24 lg:py-28">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-10 pb-16 sm:pb-20 border-b border-[#2E2925]">
          {/* Brand Logo & Newsletter Column */}
          <div className="lg:col-span-5 space-y-6">
            <button
              type="button"
              onClick={onNavigateHome}
              aria-label="AABHA CLOTHING Home"
              className="inline-flex items-center cursor-pointer"
            >
              <BrandLogo variant="footer" customLogoUrl={logoUrl} />
            </button>
            <p className="text-sm text-[#B5ABA0] font-light max-w-sm leading-relaxed">
              {siteSettings?.footerTagline ||
                'Premium Indian women’s ethnic wear crafted in small handloom batches with modern silhouettes and timeless elegance.'}
            </p>

            {/* Minimal Underlined Newsletter Subscription */}
            {siteSettings?.showFooterNewsletter !== false && (
            <div className="pt-3 max-w-md">
              <p className="text-[11px] tracking-[0.2em] uppercase text-[#D8CEC2] mb-3">
                Newsletter & Private Previews
              </p>
              {subscribed ? (
                <div className="flex items-center gap-2 text-xs text-[#D6C4AE] py-2 font-light">
                  <Check className="w-4 h-4 stroke-[1.4]" />
                  <span>{feedbackMsg || 'Thank you for subscribing to AABHA CLOTHING.'}</span>
                </div>
              ) : (
                <div>
                  <form
                    onSubmit={handleSubscribe}
                    className="flex items-center border-b border-[#4A433D] focus-within:border-[#FAF8F5] transition-colors pb-2"
                  >
                    <label htmlFor="footer-newsletter" className="sr-only">
                      Email address for newsletter
                    </label>
                    <input
                      id="footer-newsletter"
                      type="email"
                      required
                      disabled={submitting}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="flex-1 bg-transparent py-1.5 text-sm text-[#FAF8F5] placeholder:text-[#7C736A] font-light focus:outline-none disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="pl-4 py-1.5 text-[#FAF8F5] text-xs tracking-[0.18em] uppercase hover:text-[#D6C4AE] transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      <span>{submitting ? 'Subscribing...' : 'Subscribe'}</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[1.4]" />
                    </button>
                  </form>
                  {errorMsg && (
                    <p className="text-[11px] text-[#FF8A80] mt-1.5 font-light">{errorMsg}</p>
                  )}
                </div>
              )}
            </div>
            )}
          </div>

          {/* Dynamic Footer Navigation Columns */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 lg:gap-8">
            {configuredColumns.map((col) => {
              const activeLinks = (col.links || []).filter((l) => l.visible !== false);
              return (
                <div key={col.id} className="space-y-4">
                  <h3 className="font-sans text-[11px] tracking-[0.2em] text-[#D8CEC2] uppercase">
                    {col.title}
                  </h3>
                  <ul className="space-y-3 text-sm font-light text-[#B5ABA0]">
                    {activeLinks.map((link) => (
                      <li key={link.id}>{renderFooterLink(link)}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Copyright Row — Clean & Authentic */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7C736A] font-light">
          <p>{siteSettings?.footerCopyright || '© 2026 AABHA CLOTHING. All rights reserved.'}</p>
          <p className="text-[#7C736A]">Made in India</p>
        </div>
      </div>
    </footer>
  );
};
