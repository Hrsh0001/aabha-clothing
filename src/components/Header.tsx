import React, { useState, useRef, useEffect } from 'react';
import { Search, Heart, ShoppingBag, ChevronDown, Menu, X } from 'lucide-react';
import { CollectionFilter } from '../data/products';
import { BrandLogo } from './BrandLogo';

export type ActivePage = 'home' | 'shop' | 'product' | 'about' | 'contact' | 'checkout' | 'policy';

interface HeaderProps {
  activePage: ActivePage;
  selectedCategory: CollectionFilter;
  wishlistCount: number;
  cartCount: number;
  onNavigateHome: () => void;
  onNavigateNewArrivals: () => void;
  onNavigateShopCategory: (category: CollectionFilter) => void;
  onNavigateAbout: () => void;
  onNavigateContact: () => void;
  onOpenSearch: () => void;
  onOpenWishlist: () => void;
  onOpenCart: () => void;
}

const SHOP_CATEGORIES: Array<{ label: CollectionFilter; count: number }> = [
  { label: 'All Collection', count: 17 },
  { label: 'Anarkali', count: 2 },
  { label: '3-Piece Dresses', count: 5 },
  { label: 'Co-ord Sets', count: 9 },
  { label: 'Chikankari Suit', count: 1 },
];

export const Header: React.FC<HeaderProps> = ({
  activePage,
  selectedCategory,
  wishlistCount,
  cartCount,
  onNavigateHome,
  onNavigateNewArrivals,
  onNavigateShopCategory,
  onNavigateAbout,
  onNavigateContact,
  onOpenSearch,
  onOpenWishlist,
  onOpenCart,
}) => {
  const [shopMenuOpen, setShopMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    <header className="sticky top-0 z-40 h-16 sm:h-[76px] bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#ECE6DD]">
      <div className="relative max-w-[1400px] mx-auto h-full px-4 sm:px-8 lg:px-12 flex items-center justify-between">
        {/* Mobile Left Hamburger Trigger (flex-1 on mobile so logo stays centered) */}
        <div className="flex-1 flex items-center justify-start md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="p-2 -ml-2 text-[#1E1B18] hover:text-[#6E5043] transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 stroke-[1.35]" />
            ) : (
              <Menu className="w-5 h-5 stroke-[1.35]" />
            )}
          </button>
        </div>

        {/* Zone 1: Brand Logo (Perfectly Centered Horizontally & Vertically on Mobile, Vertically Centered on Desktop) */}
        <div className="max-md:absolute max-md:left-1/2 max-md:top-1/2 max-md:-translate-x-1/2 max-md:-translate-y-1/2 shrink-0 flex items-center justify-center md:justify-start h-full">
          <a
            href="#top"
            aria-label="AABHA CLOTHING Home"
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome();
            }}
            className="flex items-center justify-center whitespace-nowrap shrink-0"
          >
            <BrandLogo variant="header" />
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
                  {SHOP_CATEGORIES.map(({ label, count }) => {
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
        </nav>

        {/* Zone 3: Minimal Refined Actions (Search | Wishlist | Cart) */}
        <div className="flex-1 md:flex-none flex items-center justify-end gap-1.5 sm:gap-5">
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
            className="flex items-center gap-1 p-2 text-[13px] text-[#1E1B18] hover:text-[#6E5043] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
            className="flex items-center gap-1 p-2 -mr-1 text-[13px] text-[#1E1B18] hover:text-[#6E5043] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-[18px] h-[18px] stroke-[1.35]" />
            <span className="hidden sm:inline tracking-wide">Cart</span>
            <span className="text-[11px] sm:text-xs tabular-nums text-[#4A433D]">
              ({cartCount})
            </span>
          </button>
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
                {SHOP_CATEGORIES.map(({ label, count }) => (
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
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
