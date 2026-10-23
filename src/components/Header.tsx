'use client';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Heart, ShoppingBag, ChevronDown, Menu, X, User, Shield } from 'lucide-react';
import { CollectionFilter, Product } from '../data/products';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../context/AuthContext';
import { NavLinkItem, DEFAULT_NAV_LINKS, SiteSettings } from '../lib/site-settings';

export type ActivePage =
  | 'home'
  | 'shop'
  | 'product'
  | 'about'
  | 'contact'
  | 'checkout'
  | 'policy'
  | 'custom';

interface HeaderProps {
  activePage: ActivePage;
  selectedCategory: CollectionFilter;
  wishlistCount: number;
  cartCount: number;
  products?: Product[];
  onNavigateHome: () => void;
  onNavigateNewArrivals: () => void;
  onNavigateShopCategory: (category: CollectionFilter) => void;
  onNavigateAbout: () => void;
  onNavigateContact: () => void;
  onNavigatePolicy?: (topic: any) => void;
  onNavigateCustomPage?: (slug: string) => void;
  onOpenSearch: () => void;
  onOpenWishlist: () => void;
  onOpenCart: () => void;
  onOpenAccount?: () => void;
  logoUrl?: string;
  announcementText?: string;
  showAnnouncementBar?: boolean;
  showNewArrivals?: boolean;
  navLinks?: NavLinkItem[];
  siteSettings?: SiteSettings | any;
}

const SHOP_CATEGORIES: Array<{ label: CollectionFilter; count: number }> = [
  { label: 'All Collection', count: 0 },
  { label: 'Anarkali', count: 0 },
  { label: '3-Piece Dresses', count: 0 },
  { label: 'Co-ord Sets', count: 0 },
  { label: 'Chikankari Suit', count: 0 },
];

export const Header: React.FC<HeaderProps> = ({
  activePage,
  selectedCategory,
  wishlistCount,
  cartCount,
  products,
  onNavigateHome,
  onNavigateNewArrivals,
  onNavigateShopCategory,
  onNavigateAbout,
  onNavigateContact,
  onNavigatePolicy,
  onNavigateCustomPage,
  onOpenSearch,
  onOpenWishlist,
  onOpenCart,
  onOpenAccount,
  logoUrl,
  announcementText,
  showAnnouncementBar = true,
  showNewArrivals = true,
  navLinks,
  siteSettings,
}) => {
  const [shopMenuOpen, setShopMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, role, setAuthModalOpen, logout } = useAuth();

  const shopCategories = useMemo<{ label: CollectionFilter }[]>(() => [
    { label: 'All Collection' },
    { label: 'Anarkali' },
    { label: '3-Piece Dresses' },
    { label: 'Co-ord Sets' },
    { label: 'Chikankari Suit' },
  ], []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShopMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategorySelect = (cat: CollectionFilter) => {
    onNavigateShopCategory(cat);
    setShopMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const configuredNavLinks = useMemo<NavLinkItem[]>(() => {
    const raw = navLinks !== undefined ? navLinks : siteSettings?.navLinks;
    if (Array.isArray(raw)) {
      return raw.filter((l) => l.visible !== false);
    }
    return DEFAULT_NAV_LINKS.filter((l) => l.visible !== false);
  }, [navLinks, siteSettings?.navLinks]);

  const handleLinkNavigate = (item: NavLinkItem, e?: React.MouseEvent) => {
    const href = item.href || '/';
    if (item.openInNewTab || href.startsWith('http://') || href.startsWith('https://')) {
      window.open(href, item.openInNewTab ? '_blank' : '_self', 'noopener,noreferrer');
      setMobileMenuOpen(false);
      return;
    }

    if (e) e.preventDefault();
    setMobileMenuOpen(false);

    // 1. WhatsApp concierge shortcut
    if (href === 'whatsapp' || href.includes('wa.me')) {
      const waNumber = (siteSettings?.whatsappNumber || '919876543210').replace(/[^0-9]/g, '');
      const waUrl = href.startsWith('http')
        ? href
        : `https://wa.me/${waNumber}?text=${encodeURIComponent('Namaste AABHA, I have an inquiry regarding garments and orders.')}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // 2. Email shortcut
    if (href === 'email' || href.startsWith('mailto:')) {
      const emailAddr = href.startsWith('mailto:')
        ? href
        : `mailto:${siteSettings?.supportEmail || 'care@aabhaclothing.com'}`;
      window.location.href = emailAddr;
      return;
    }

    // 3. Home
    if (href === '/' || href === '#top' || href === '#home') {
      onNavigateHome();
      return;
    }

    // 4. Hash section anchors (e.g. /#new-arrivals, /#brand-story, /#curated)
    if (href.startsWith('/#') || href.startsWith('#')) {
      const targetId = href.replace('/#', '').replace('#', '');
      if (activePage !== 'home') {
        onNavigateHome();
        setTimeout(() => {
          const el = document.getElementById(targetId);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 120);
      } else {
        const el = document.getElementById(targetId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    if (href === '/shop') {
      onNavigateShopCategory('All Collection');
      return;
    }

    if (href.startsWith('/shop?category=') || href.startsWith('category:')) {
      const catParam = href.replace('/shop?category=', '').replace('category:', '');
      const decoded = decodeURIComponent(catParam) as CollectionFilter;
      onNavigateShopCategory(decoded);
      return;
    }

    if (href === '/about' || href === '?page=about') {
      onNavigateAbout();
      return;
    }

    if (href === '/contact' || href === '?page=contact') {
      onNavigateContact();
      return;
    }

    if (href.startsWith('/policy') || href.startsWith('?page=policy')) {
      if (onNavigatePolicy) {
        const match = href.match(/topic=([a-z]+)/);
        onNavigatePolicy((match ? match[1] : 'shipping') as any);
        return;
      }
    }

    if (href.startsWith('/pages/') || href.startsWith('/page/') || href.includes('page=custom')) {
      const slugMatch = href.match(/\/pages?\/([^?#/]+)/) || href.match(/slug=([^&#]+)/);
      const slug = slugMatch ? slugMatch[1] : 'our-craft';
      if (onNavigateCustomPage) {
        onNavigateCustomPage(slug);
        return;
      }
    }

    window.location.href = href;
  };

  const isLinkActive = (item: NavLinkItem): boolean => {
    const href = item.href || '/';
    const currentHash = typeof window !== 'undefined' ? window.location.hash : '';
    if (href === '/#new-arrivals' || href === '#new-arrivals') {
      return activePage === 'home' && currentHash === '#new-arrivals';
    }
    if (href === '/' || href === '#top' || href === '#home') {
      return activePage === 'home' && (!currentHash || currentHash === '#top' || currentHash === '#home');
    }
    if (href === '/shop') {
      return activePage === 'shop' && selectedCategory === 'All Collection';
    }
    if (href.startsWith('/shop?category=') || href.startsWith('category:')) {
      const catParam = href.replace('/shop?category=', '').replace('category:', '');
      return activePage === 'shop' && selectedCategory === decodeURIComponent(catParam);
    }
    if (href === '/about' || href === '?page=about') {
      return activePage === 'about';
    }
    if (href === '/contact' || href === '?page=contact') {
      return activePage === 'contact';
    }
    if (href.startsWith('/policy') || href.startsWith('?page=policy')) {
      return activePage === 'policy';
    }
    return false;
  };

  return (
    <>
      {showAnnouncementBar !== false && announcementText && (
        <div className="bg-[#231F1D] text-[#FAF8F5] text-[10px] sm:text-[11px] font-light tracking-[0.14em] uppercase py-1.5 px-4 text-center border-b border-[#3D3732]">
          {announcementText}
        </div>
      )}
      <header className="sticky top-0 z-40 h-16 sm:h-[76px] bg-[#FAF8F5] sm:bg-[#FAF8F5]/95 sm:backdrop-blur-sm border-b border-[#ECE6DD]">
      <div className="relative max-w-[1920px] mx-auto w-full h-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 flex items-center justify-between">
        {/* Mobile Left Hamburger Trigger (flex-1 on mobile so logo stays centered) */}
        <div className="flex-1 flex items-center justify-start md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="p-2 text-[#1E1B18] hover:text-[#6E5043] transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 stroke-[1.35]" />
            ) : (
              <Menu className="w-5 h-5 stroke-[1.35]" />
            )}
          </button>
        </div>

        {/* Zone 1: Brand Logo (Perfectly Centered Horizontally & Vertically on Mobile, Vertically Centered on Desktop) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:static md:translate-x-0 md:translate-y-0 shrink-0 flex items-center justify-center md:justify-start h-full pointer-events-auto">
          <a
            href="#top"
            aria-label="AABHA CLOTHING Home"
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome();
            }}
            className="flex items-center justify-center whitespace-nowrap shrink-0"
          >
            <BrandLogo variant="header" customLogoUrl={logoUrl} />
          </a>
        </div>

        {/* Zone 2: Dynamic Clean Text Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 xl:gap-10 text-[13px] tracking-[0.08em] font-normal text-[#4A433D] overflow-x-auto no-scrollbar py-1">
          {configuredNavLinks.map((item) => {
            const isActive = isLinkActive(item);
            const isShopLink = item.href === '/shop';

            if (isShopLink) {
              return (
                <div
                  key={item.id}
                  ref={dropdownRef}
                  className="relative shrink-0"
                  onMouseEnter={() => setShopMenuOpen(true)}
                  onMouseLeave={() => setShopMenuOpen(false)}
                >
                  <button
                    type="button"
                    onClick={(e) => handleLinkNavigate(item, e)}
                    className={`flex items-center gap-1.5 py-1 border-b transition-colors whitespace-nowrap cursor-pointer ${
                      activePage === 'shop'
                        ? 'text-[#1E1B18] border-[#1E1B18]'
                        : 'border-transparent hover:text-[#1E1B18] hover:border-[#1E1B18]/60'
                    }`}
                  >
                    <span>{item.label}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 stroke-[1.4] transition-transform duration-200 ${
                        shopMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {shopMenuOpen && (
                    <div className="absolute left-0 top-full pt-3 w-60 z-50">
                      <div className="bg-[#FAF8F5] border border-[#E8E1D7] py-2.5 shadow-md">
                        {shopCategories.map(({ label }) => {
                          const isCatSelected = activePage === 'shop' && selectedCategory === label;
                          return (
                            <button
                              key={label}
                              type="button"
                              onClick={() => handleCategorySelect(label)}
                              className={`w-full text-left px-6 py-2.5 text-[13px] tracking-wide transition-colors flex items-center justify-between whitespace-nowrap cursor-pointer ${
                                isCatSelected
                                  ? 'text-[#1E1B18] font-medium bg-[#F4F0EA]'
                                  : 'text-[#5C544D] hover:bg-[#F4F0EA]/70 hover:text-[#1E1B18]'
                              }`}
                            >
                              <span>{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={(e) => handleLinkNavigate(item, e)}
                className={`py-1 border-b transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'text-[#1E1B18] border-[#1E1B18] font-medium'
                    : 'border-transparent hover:text-[#1E1B18] hover:border-[#1E1B18]/60'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Minimal Refined Actions (Search | Wishlist | Cart) */}
        <div className="flex-1 md:flex-none flex items-center justify-end gap-1 sm:gap-4">
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search collection"
            className="flex items-center gap-1.5 p-2 text-[13px] text-[#1E1B18] hover:text-[#6E5043] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Search className="w-[18px] h-[18px] stroke-[1.35]" />
            <span className="hidden lg:inline tracking-wide">Search</span>
          </button>

          <button
            type="button"
            onClick={onOpenWishlist}
            aria-label="Open wishlist"
            className="hidden sm:flex items-center gap-1 p-2 text-[13px] text-[#1E1B18] hover:text-[#6E5043] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Heart className="w-[18px] h-[18px] stroke-[1.35]" />
            <span className="hidden lg:inline tracking-wide">Wishlist</span>
            {wishlistCount > 0 && (
              <span className="text-[11px] tabular-nums text-[#6E5043]">
                ({wishlistCount})
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenCart}
            aria-label="Open shopping bag"
            className="flex items-center gap-1 p-2 text-[13px] text-[#1E1B18] hover:text-[#6E5043] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-[18px] h-[18px] stroke-[1.35]" />
            <span className="hidden sm:inline tracking-wide">Cart</span>
            <span className="text-[11px] sm:text-xs tabular-nums text-[#4A433D]">
              ({cartCount})
            </span>
          </button>

          {/* Mobile Account Trigger */}
          <button
            type="button"
            onClick={onOpenAccount || (() => setAuthModalOpen(true))}
            aria-label="Open Account"
            className="sm:hidden flex items-center p-2 text-[13px] text-[#1E1B18] hover:text-[#6E5043] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <User className="w-[18px] h-[18px] stroke-[1.35]" />
          </button>

          {/* Customer Account Area (Desktop / Tablet) */}
          <div className="hidden sm:flex pl-2 border-l border-[#ECE6DD] items-center">
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenAccount || (() => setAuthModalOpen(true))}
                  className="text-xs font-medium text-[#1E1B18] hover:text-[#6E5043] flex items-center gap-1.5 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-[#6E5043]" />
                  <span>{(user.name || 'Member').split(' ')[0]}</span>
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="text-[#7C736A] hover:text-[#C62828] text-[11px] cursor-pointer"
                  title="Sign Out"
                >
                  Exit
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAccount || (() => setAuthModalOpen(true))}
                className="flex items-center gap-1.5 p-1.5 text-xs text-[#1E1B18] hover:text-[#6E5043] transition-colors cursor-pointer"
                title="Customer Sign In & Account"
              >
                <User className="w-4 h-4 stroke-[1.35]" />
                <span className="hidden md:inline text-xs tracking-wide">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Minimal Editorial Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FAF8F5] border-b border-[#E8E1D7] px-6 py-8 space-y-6">
          <div className="flex flex-col space-y-3.5">
            {configuredNavLinks.map((item) => {
              const isShop = item.href === '/shop';
              const isActive = isLinkActive(item);

              if (isShop) {
                return (
                  <div key={item.id} className="pt-2 border-t border-[#ECE6DD] space-y-2.5">
                    <button
                      type="button"
                      onClick={(e) => handleLinkNavigate(item, e)}
                      className={`text-left font-serif text-2xl transition-colors cursor-pointer ${
                        isActive ? 'text-[#1E1B18] font-medium' : 'text-[#1E1B18]'
                      }`}
                    >
                      {item.label}
                    </button>
                    <div className="flex flex-col space-y-2 pl-2">
                      {shopCategories.map(({ label }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => handleCategorySelect(label)}
                          className={`flex items-center justify-between text-left py-1 text-base transition-colors cursor-pointer ${
                            activePage === 'shop' && selectedCategory === label
                              ? 'text-[#1E1B18] font-medium'
                              : 'text-[#5C544D]'
                          }`}
                        >
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={(e) => handleLinkNavigate(item, e)}
                  className={`text-left font-serif text-2xl transition-colors cursor-pointer ${
                    isActive ? 'text-[#1E1B18] font-medium' : 'text-[#1E1B18]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}

            <div className="pt-4 border-t border-[#ECE6DD] flex flex-col space-y-3.5">
              <button
                type="button"
                onClick={() => {
                  onOpenWishlist();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-between text-left font-serif text-2xl text-[#1E1B18] font-normal cursor-pointer"
              >
                <span>Wishlist</span>
                {wishlistCount > 0 && (
                  <span className="text-sm font-mono text-[#6E5043]">({wishlistCount})</span>
                )}
              </button>

              <div className="pt-3 border-t border-[#ECE6DD]">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onOpenAccount) onOpenAccount();
                    else setAuthModalOpen(true);
                  }}
                  className="w-full py-3 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-[0.16em] text-center flex items-center justify-center gap-2 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>
                    {user
                      ? `My Account (${(user.name || 'Member').split(' ')[0]})`
                      : 'Customer Sign In / Register'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
    </>
  );
};
