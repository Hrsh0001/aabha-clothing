'use client';
import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { CollectionFilter } from '../data/products';
import { PolicyTopic } from './InfoPages';
import { BrandLogo } from './BrandLogo';

interface FooterProps {
  onNavigateHome: () => void;
  onNavigateCategory: (category: CollectionFilter) => void;
  onNavigateAbout: () => void;
  onNavigateContact: () => void;
  onNavigatePolicy: (topic: PolicyTopic) => void;
  logoUrl?: string;
  siteSettings?: any;
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
              Premium Indian women’s ethnic wear crafted in small handloom batches with modern silhouettes and timeless elegance.
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

          {/* Shop Categories */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-sans text-[11px] tracking-[0.2em] text-[#D8CEC2] uppercase">
              Collection
            </h3>
            <ul className="space-y-3 text-sm font-light text-[#B5ABA0]">
              {FOOTER_CATEGORIES.map((cat) => (
                <li key={cat}>
                  <button
                    type="button"
                    onClick={() => onNavigateCategory(cat)}
                    className="hover:text-[#FAF8F5] transition-colors cursor-pointer"
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* THE HOUSE */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-sans text-[11px] tracking-[0.2em] text-[#D8CEC2] uppercase">
              THE HOUSE
            </h3>
            <ul className="space-y-3 text-sm font-light text-[#B5ABA0]">
              <li>
                <button
                  type="button"
                  onClick={onNavigateAbout}
                  className="hover:text-[#FAF8F5] transition-colors cursor-pointer"
                >
                  About
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onNavigateContact}
                  className="hover:text-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Contact
                </button>
              </li>
              <li>
                <a
                  href={siteSettings?.instagramUrl || "https://instagram.com/aabhaclothing"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#FAF8F5] transition-colors inline-block"
                >
                  Instagram ({siteSettings?.instagramHandle || '@aabhaclothing'})
                </a>
              </li>
            </ul>
          </div>

          {/* CLIENT CARE */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="font-sans text-[11px] tracking-[0.2em] text-[#D8CEC2] uppercase">
              CLIENT CARE
            </h3>
            <ul className="space-y-3 text-sm font-light text-[#B5ABA0]">
              <li>
                <a
                  href="/my-orders"
                  className="hover:text-[#FAF8F5] transition-colors inline-block text-[#D8CEC2] font-normal"
                >
                  Track Orders & GST Bills
                </a>
              </li>
              <li>
                <a
                  href={`https://wa.me/${(siteSettings?.whatsappNumber || '919876543210').replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Namaste AABHA, I have an inquiry regarding garments and orders.')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#FAF8F5] transition-colors inline-flex items-center gap-1.5 text-[#A8E6CF]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A8E6CF] animate-pulse"></span>
                  WhatsApp Concierge
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${siteSettings?.supportEmail || 'care@aabhaclothing.com'}`}
                  className="hover:text-[#FAF8F5] transition-colors inline-block text-xs"
                >
                  {siteSettings?.supportEmail || 'care@aabhaclothing.com'}
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigatePolicy('shipping')}
                  className="hover:text-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Shipping
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigatePolicy('returns')}
                  className="hover:text-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Returns
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigatePolicy('faq')}
                  className="hover:text-[#FAF8F5] transition-colors cursor-pointer"
                >
                  FAQ
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigatePolicy('privacy')}
                  className="hover:text-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigatePolicy('terms')}
                  className="hover:text-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Terms & Conditions
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright Row — Clean & Authentic */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7C736A] font-light">
          <p>© 2026 AABHA CLOTHING. All rights reserved.</p>
          <p className="text-[#7C736A]">Made in India</p>
        </div>
      </div>
    </footer>
  );
};
