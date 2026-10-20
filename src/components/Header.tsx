'use client';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Heart, ShoppingBag, ChevronDown, Menu, X, User, Shield } from 'lucide-react';
import { CollectionFilter, Product } from '../data/products';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../context/AuthContext';

export type ActivePage = 'home' | 'shop' | 'product' | 'about' | 'contact' | 'checkout' | 'policy';

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
  onOpenSearch: () => void;
  onOpenWishlist: () => void;
  onOpenCart: () => void;
  onOpenAccount?: () => void;
  logoUrl?: string;
  announcementText?: string;
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
  onOpenSearch,
  onOpenWishlist,
  onOpenCart,
  onOpenAccount,
  logoUrl,
  announcementText,
}) => {
  const [shopMenuOpen, setShopMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, role, setAuthModalOpen, logout } = useAuth();

  const shopCategories = useMemo(() => {
    const list = products || [];
    return [
      { label: 'All Collection' as CollectionFilter, count: list.length },
      {
        label: 'Anarkali' as CollectionFilter,
        count: list.filter((p) => p.category === 'Anarkali').length,
      },
      {
        label: '3-Piece Dresses' as CollectionFilter,
        count: list.filter((p) => p.category === '3-Piece Dresses').length,
      },
      {
        label: 'Co-ord Sets' as CollectionFilter,
        count: list.filter((p) => p.category === 'Co-ord Sets').length,
      },
      {
        label: 'Chikankari Suit' as CollectionFilter,
        count: list.filter((p) => p.category === 'Chikankari Suit').length,
      },
    ];
  }, [products]);

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

  return (
    <>
      {announcementText && (
        <div className="bg-[#231F1D] text-[#FAF8F5] text-[10px] sm:text-[11px] font-light tracking-[0.14em] uppercase py-1.5 px-4 text-center border-b border-[#3D3732]">
          {announcementText}
        </div>
      )}
      <header className="sticky top-0 z-40 h-16 sm:h-[76px] bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#ECE6DD]">
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

        {/* Zone 2: Clean Text Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-9 lg:gap-11 text-[13px] tracking-[0.08em] font-normal text-[#4A433D]">
          <button
            type="button"
            onClick={onNavigateNewArrivals}
            className="hover:text-[#1E1B18] py-1 border-b border-transparent hover:border-[#1E1B18]/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            New Arrivals
          </button>

          <div
            ref={dropdownRef}
            className="relative"
            onMouseEnter={() => setShopMenuOpen(true)}
            onMouseLeave={() => setShopMenuOpen(false)}
          >
            <button
              type="button"
              onClick={() => setShopMenuOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 py-1 border-b transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activePage === 'shop'
                  ? 'text-[#1E1B18] border-[#1E1B18]'
                  : 'border-transparent hover:text-[#1E1B18] hover:border-[#1E1B18]/60'
              }`}
            >
              <span>Shop</span>
              <ChevronDown
                className={`w-3.5 h-3.5 stroke-[1.4] transition-transform duration-200 ${
                  shopMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {shopMenuOpen && (
              <div className="absolute left-0 top-full pt-3 w-60 z-50">
                <div className="bg-[#FAF8F5] border border-[#E8E1D7] py-2.5">
                  {shopCategories.map(({ label, count }) => {
                    const isSelected = activePage === 'shop' && selectedCategory === label;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => handleCategorySelect(label)}
                        className={`w-full text-left px-6 py-2.5 text-[13px] tracking-wide transition-colors flex items-center justify-between whitespace-nowrap cursor-pointer ${
                          isSelected
                            ? 'text-[#1E1B18] font-medium bg-[#F4F0EA]'
                            : 'text-[#5C544D] hover:bg-[#F4F0EA]/70 hover:text-[#1E1B18]'
                        }`}
                      >
                        <span>{label}</span>
                        <span className="text-[11px] tabular-nums text-[#8C8278]">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onNavigateAbout}
            className={`py-1 border-b transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activePage === 'about'
                ? 'text-[#1E1B18] border-[#1E1B18]'
                : 'border-transparent hover:text-[#1E1B18] hover:border-[#1E1B18]/60'
            }`}
          >
            About
          </button>

          <button
            type="button"
            onClick={onNavigateContact}
            className={`py-1 border-b transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activePage === 'contact'
                ? 'text-[#1E1B18] border-[#1E1B18]'
                : 'border-transparent hover:text-[#1E1B18] hover:border-[#1E1B18]/60'
            }`}
          >
            Contact
          </button>

          <a
            href="/my-orders"
            className="py-1 border-b border-transparent hover:text-[#1E1B18] hover:border-[#1E1B18]/60 transition-colors whitespace-nowrap shrink-0 text-xs tracking-wider uppercase font-medium text-[#6E5043]"
          >
            Track Orders
          </a>
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
        <div className="md:hidden bg-[#FAF8F5] border-b border-[#E8E1D7] px-6 py-8 space-y-7">
          <div className="flex flex-col space-y-5">
            <button
              type="button"
              onClick={() => {
                onNavigateNewArrivals();
                setMobileMenuOpen(false);
              }}
              className="text-left font-serif text-2xl text-[#1E1B18] font-normal"
            >
              New Arrivals
            </button>

            <div className="pt-4 border-t border-[#ECE6DD] space-y-3">
              <p className="text-[11px] tracking-[0.16em] uppercase text-[#7C736A]">
                Shop Collection
              </p>
              <div className="flex flex-col space-y-2.5 pl-1">
                {shopCategories.map(({ label, count }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleCategorySelect(label)}
                    className={`flex items-center justify-between text-left py-1 text-base transition-colors ${
                      activePage === 'shop' && selectedCategory === label
                        ? 'text-[#1E1B18] font-medium'
                        : 'text-[#5C544D]'
                    }`}
                  >
                    <span>{label}</span>
                    <span className="text-xs tabular-nums text-[#8C8278]">{count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#ECE6DD] flex flex-col space-y-3.5">
              <button
                type="button"
                onClick={() => {
                  onNavigateAbout();
                  setMobileMenuOpen(false);
                }}
                className="text-left font-serif text-2xl text-[#1E1B18] font-normal"
              >
                About
              </button>

              <button
                type="button"
                onClick={() => {
                  onNavigateContact();
                  setMobileMenuOpen(false);
                }}
                className="text-left font-serif text-2xl text-[#1E1B18] font-normal"
              >
                Contact
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenWishlist();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-between text-left font-serif text-2xl text-[#1E1B18] font-normal"
              >
                <span>Wishlist</span>
                {wishlistCount > 0 && (
                  <span className="text-sm font-mono text-[#6E5043]">({wishlistCount})</span>
                )}
              </button>

              <a
                href="/my-orders"
                onClick={() => setMobileMenuOpen(false)}
                className="text-left font-serif text-2xl text-[#6E5043] font-normal"
              >
                Track Orders & Bills
              </a>

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
