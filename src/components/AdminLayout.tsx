'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  RefreshCw,
  Lock,
  ArrowLeft,
  Package,
  Layers,
  Sparkles,
  MessageSquare,
  Navigation,
  LayoutDashboard,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Sliders,
  Compass,
  Palette,
  FileText,
  ChevronRight,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AdminLayoutProps {
  title?: string;
  subtitle?: string;
  extraAction?: React.ReactNode;
  noPadding?: boolean;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  title,
  subtitle,
  extraAction,
  noPadding = false,
  children,
}) => {
  const { isAdmin, isInitialized, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [livePending, setLivePending] = useState(0);
  const [liveInquiries, setLiveInquiries] = useState(0);
  const [pagesMenuExpanded, setPagesMenuExpanded] = useState(true);
  const [sidebarCustomPages, setSidebarCustomPages] = useState<Array<{ id: string; slug: string; title: string }>>([
    { id: 'page-our-craft', slug: 'our-craft', title: 'The Artisanal Weaves' },
    { id: 'page-garment-care', slug: 'garment-care', title: 'Mulmul Care Guide' },
  ]);
  const [currentSelectedPage, setCurrentSelectedPage] = useState<string>('home');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('page') || 'home';
      setCurrentSelectedPage(p);
    }
  }, [pathname]);

  useEffect(() => {
    if (isInitialized && !isAdmin) {
      window.location.href = '/admin/login';
    }
  }, [isInitialized, isAdmin]);

  // Fetch live counts for order/inquiry badges
  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/orders')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.orders)) {
          const count = data.orders.filter(
            (o: any) => o.status === 'PENDING_VERIFICATION' || o.status === 'PENDING'
          ).length;
          setLivePending(count);
        }
      })
      .catch(() => {});

    fetch('/api/inquiries')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && typeof data.unreadCount === 'number') {
          setLiveInquiries(data.unreadCount);
        }
      })
      .catch(() => {});

    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.settings?.customPages) && data.settings.customPages.length > 0) {
          setSidebarCustomPages(
            data.settings.customPages.map((p: any) => ({
              id: p.id,
              slug: p.slug,
              title: p.title,
            }))
          );
        }
      })
      .catch(() => {});
  }, [isAdmin, pathname]);

  // Close mobile menu on page transition
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-6 text-center space-y-3">
        <RefreshCw className="w-6 h-6 text-[#6E5043] animate-spin" />
        <p className="text-xs uppercase tracking-widest text-[#7C736A]">
          Verifying Security Credentials...
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-[#F3EFEA] border border-[#ECE6DD] flex items-center justify-center text-[#6E5043]">
          <Lock className="w-5 h-5 stroke-[1.4]" />
        </div>
        <h1 className="font-serif text-3xl text-[#1E1B18]">Authentication Required</h1>
        <p className="text-xs text-[#7C736A] max-w-sm">
          You must be authenticated with the store administrator PIN or email credentials to access this management area.
        </p>
        <Link
          href="/admin/login"
          className="px-6 py-2.5 bg-[#231F1D] text-[#FAF8F5] text-xs uppercase tracking-wider font-medium hover:bg-[#14110E]"
        >
          Sign In as Admin
        </Link>
      </div>
    );
  }

  const navLinks = [
    {
      label: 'COD Orders',
      href: '/admin/orders',
      icon: Package,
      badge: livePending > 0 ? livePending : null,
      badgeColor: 'bg-[#D97706] text-white',
    },
    {
      label: 'Garments & Stock',
      href: '/admin/products',
      icon: Layers,
    },
    {
      label: 'Pages (All Pages & CMS)',
      href: '/admin/pages',
      icon: FileText,
      badge: 'ALL',
      badgeColor: 'bg-[#6E5043] text-white',
    },
    {
      label: 'Theme & Brand Colors',
      href: '/admin/branding?tab=themes',
      icon: Palette,
    },
    {
      label: 'Inquiries',
      href: '/admin/inquiries',
      icon: MessageSquare,
      badge: liveInquiries > 0 ? liveInquiries : null,
      badgeColor: 'bg-[#2E7D32] text-white',
    },
    {
      label: 'GPS Dispatch',
      href: '/admin/dispatch',
      icon: Navigation,
    },
    {
      label: 'Analytics',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex font-sans text-[#1E1B18] antialiased">
      {/* 1. FIXED STATIONARY SIDEBAR (Desktop - Pinned to Left, Does NOT Scroll With Page) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 h-screen z-40 bg-[#1A1715] text-[#FAF8F5] border-r border-[#2C2723] flex-col justify-between overflow-y-auto">
        {/* Brand & Return to Storefront Header */}
        <div className="p-5 border-b border-[#2C2723] space-y-4">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-2 px-3 text-xs uppercase tracking-wider font-medium text-[#FAF8F5] bg-[#2A2521] hover:bg-[#38312B] border border-[#3E3832] transition-colors group cursor-pointer"
            title="Return to Customer Storefront (Home)"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#D4AF37] group-hover:-translate-x-1 transition-transform" />
            <span>← Storefront</span>
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-serif text-2xl tracking-[0.14em] text-[#FAF8F5] block font-normal">
                AABHA
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#9E948A] block font-sans">
                Atelier Suite
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#25211D] border border-[#3E3832] text-[10px] text-[#A8E6CF] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A8E6CF] animate-pulse"></span>
              LIVE
            </span>
          </div>
        </div>

        {/* Navigation Items (Stationary) */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8C8075]">
            ATELIER CONTROLS
          </div>
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isPagesItem = item.href === '/admin/pages';
            const isTabMatch =
              item.href.includes('?tab=') &&
              typeof window !== 'undefined' &&
              pathname === '/admin/branding' &&
              window.location.search.includes(item.href.split('?')[1]);
            const isActive =
              isTabMatch ||
              (!item.href.includes('?') &&
                (pathname === item.href ||
                  (item.href !== '/admin/dashboard' && pathname?.startsWith(item.href))));

            return (
              <div key={item.href} className="space-y-0.5">
                <div
                  className={`flex items-center justify-between px-3 py-2.5 text-xs font-medium tracking-wide transition-colors border ${
                    isActive
                      ? 'bg-[#FAF8F5] text-[#1A1715] font-semibold border-[#FAF8F5] shadow-sm'
                      : 'bg-transparent text-[#D5CCC0] border-transparent hover:bg-[#2A2521] hover:text-[#FAF8F5]'
                  }`}
                >
                  <Link
                    href={item.href}
                    className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 stroke-[1.4] ${
                        isActive ? 'text-[#1A1715]' : 'text-[#A69C91]'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.badge !== null && item.badge !== undefined && (
                      <span
                        className={`px-1.5 py-0.2 text-[9px] font-mono font-bold rounded-full ${
                          item.badgeColor || 'bg-[#25211D] text-white'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isPagesItem && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPagesMenuExpanded(!pagesMenuExpanded);
                        }}
                        className="p-0.5 hover:bg-black/20 rounded cursor-pointer text-[#A69C91]"
                        title={pagesMenuExpanded ? 'Collapse Pages List' : 'Expand Pages List'}
                      >
                        {pagesMenuExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Submenu for Pages */}
                {isPagesItem && pagesMenuExpanded && (
                  <div className="ml-3 pl-3 py-1 space-y-0.5 border-l-2 border-[#3E3832] my-1">
                    <div className="px-2 py-0.5 text-[9px] uppercase tracking-wider text-[#8C8075] font-semibold">
                      Core Storefront
                    </div>
                    {[
                      { key: 'home', label: 'Home Page (/)', href: '/admin/pages?page=home' },
                      { key: 'shop', label: 'Shop All (/shop)', href: '/admin/pages?page=shop' },
                      { key: 'about', label: 'About Atelier (/about)', href: '/admin/pages?page=about' },
                      { key: 'contact', label: 'Contact Us (/contact)', href: '/admin/pages?page=contact' },
                      { key: 'orders', label: 'Track Orders (/my-orders)', href: '/admin/pages?page=orders' },
                      { key: 'policy', label: 'Policies & FAQ (/policy)', href: '/admin/pages?page=policy' },
                    ].map((sub) => {
                      const isSubActive =
                        pathname === '/admin/pages' && currentSelectedPage === sub.key;
                      return (
                        <Link
                          key={sub.key}
                          href={sub.href}
                          onClick={() => setCurrentSelectedPage(sub.key)}
                          className={`flex items-center justify-between px-2 py-1.5 text-[11px] rounded transition-colors ${
                            isSubActive
                              ? 'bg-[#2A2521] text-[#D4AF37] font-semibold'
                              : 'text-[#B8AEA3] hover:text-[#FAF8F5] hover:bg-[#25201C]'
                          }`}
                        >
                          <span className="truncate">{sub.label}</span>
                          {isSubActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shrink-0" />
                          )}
                        </Link>
                      );
                    })}

                    {sidebarCustomPages.length > 0 && (
                      <>
                        <div className="px-2 pt-2 pb-0.5 text-[9px] uppercase tracking-wider text-[#8C8075] font-semibold">
                          Custom Pages
                        </div>
                        {sidebarCustomPages.map((cp) => {
                          const isCpActive =
                            pathname === '/admin/pages' && currentSelectedPage === cp.slug;
                          return (
                            <Link
                              key={cp.id}
                              href={`/admin/pages?page=${cp.slug}`}
                              onClick={() => setCurrentSelectedPage(cp.slug)}
                              className={`flex items-center justify-between px-2 py-1.5 text-[11px] rounded transition-colors ${
                                isCpActive
                                  ? 'bg-[#2A2521] text-[#D4AF37] font-semibold'
                                  : 'text-[#B8AEA3] hover:text-[#FAF8F5] hover:bg-[#25201C]'
                              }`}
                            >
                              <span className="truncate">{cp.title}</span>
                              {isCpActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shrink-0" />
                              )}
                            </Link>
                          );
                        })}
                      </>
                    )}

                    <div className="pt-1.5">
                      <Link
                        href="/admin/pages?action=create"
                        className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#A8E6CF] hover:text-white bg-[#1F2C23] hover:bg-[#2E4233] border border-[#2E4535] rounded font-medium transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Add New Page</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom Stationed Controls */}
        <div className="p-4 border-t border-[#2C2723] space-y-2">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-3 py-2 text-xs text-[#A69C91] hover:text-[#FAF8F5] hover:bg-[#2A2521] transition-colors"
            title="Open live storefront in new browser tab"
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Live Boutique ↗</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </a>

          <button
            type="button"
            onClick={() => {
              logout();
              window.location.href = '/admin/login';
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-[#FF8A80] hover:text-white bg-[#2A1818] hover:bg-[#B71C1C] border border-[#3E2723] transition-colors cursor-pointer"
            title="Sign out of administrator session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Admin</span>
          </button>
        </div>
      </aside>

      {/* 2. MOBILE TOP BAR & DRAWER (< lg screens) */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 bg-[#1A1715] text-[#FAF8F5] border-b border-[#2C2723] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 text-[#FAF8F5] hover:bg-[#2A2521] border border-[#3E3832] cursor-pointer"
            aria-label="Open Admin Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <span className="font-serif text-lg tracking-wide text-[#FAF8F5]">
            AABHA <span className="text-[10px] uppercase font-sans text-[#9E948A]">Atelier</span>
          </span>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-[#D4AF37] bg-[#2A2521] border border-[#3E3832]"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Storefront</span>
        </Link>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full bg-[#1A1715] text-[#FAF8F5] flex flex-col justify-between z-50 shadow-2xl overflow-y-auto">
            <div className="p-5 border-b border-[#2C2723] flex items-center justify-between">
              <div>
                <span className="font-serif text-xl text-[#FAF8F5] block">AABHA</span>
                <span className="text-[10px] uppercase tracking-widest text-[#9E948A]">
                  Management
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-[#D5CCC0] hover:text-white hover:bg-[#2A2521] border border-[#3E3832] cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isPagesItem = item.href === '/admin/pages';
                const isTabMatch =
                  item.href.includes('?tab=') &&
                  typeof window !== 'undefined' &&
                  pathname === '/admin/branding' &&
                  window.location.search.includes(item.href.split('?')[1]);
                const isActive =
                  isTabMatch ||
                  (!item.href.includes('?') &&
                    (pathname === item.href ||
                      (item.href !== '/admin/dashboard' && pathname?.startsWith(item.href))));
                return (
                  <div key={item.href} className="space-y-0.5">
                    <div
                      className={`flex items-center justify-between px-3 py-2.5 text-xs font-medium tracking-wide border ${
                        isActive
                          ? 'bg-[#FAF8F5] text-[#1A1715] font-semibold border-[#FAF8F5]'
                          : 'bg-[#25211D] text-[#D5CCC0] border-[#332C26] hover:bg-[#2E2823] hover:text-[#FAF8F5]'
                      }`}
                    >
                      <Link
                        href={item.href}
                        onClick={() => !isPagesItem && setMobileMenuOpen(false)}
                        className="flex items-center gap-2.5 flex-1"
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.badge !== null && item.badge !== undefined && (
                          <span
                            className={`px-1.5 py-0.2 text-[9px] font-mono font-bold rounded-full ${
                              item.badgeColor || 'bg-[#25211D] text-white'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        {isPagesItem && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setPagesMenuExpanded(!pagesMenuExpanded);
                            }}
                            className="p-1 hover:bg-black/20 rounded cursor-pointer text-[#A69C91]"
                          >
                            {pagesMenuExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Submenu for Pages in Mobile Drawer */}
                    {isPagesItem && pagesMenuExpanded && (
                      <div className="ml-3 pl-3 py-1 space-y-0.5 border-l-2 border-[#3E3832] my-1">
                        {[
                          { key: 'home', label: 'Home Page (/)', href: '/admin/pages?page=home' },
                          { key: 'shop', label: 'Shop All (/shop)', href: '/admin/pages?page=shop' },
                          { key: 'about', label: 'About Atelier (/about)', href: '/admin/pages?page=about' },
                          { key: 'contact', label: 'Contact Us (/contact)', href: '/admin/pages?page=contact' },
                          { key: 'orders', label: 'Track Orders (/my-orders)', href: '/admin/pages?page=orders' },
                          { key: 'policy', label: 'Policies & FAQ (/policy)', href: '/admin/pages?page=policy' },
                        ].map((sub) => {
                          const isSubActive =
                            pathname === '/admin/pages' && currentSelectedPage === sub.key;
                          return (
                            <Link
                              key={sub.key}
                              href={sub.href}
                              onClick={() => {
                                setCurrentSelectedPage(sub.key);
                                setMobileMenuOpen(false);
                              }}
                              className={`flex items-center justify-between px-2 py-1.5 text-[11px] rounded transition-colors ${
                                isSubActive
                                  ? 'bg-[#2A2521] text-[#D4AF37] font-semibold'
                                  : 'text-[#B8AEA3] hover:text-[#FAF8F5] hover:bg-[#25201C]'
                              }`}
                            >
                              <span className="truncate">{sub.label}</span>
                              {isSubActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shrink-0" />
                              )}
                            </Link>
                          );
                        })}

                        {sidebarCustomPages.map((cp) => {
                          const isCpActive =
                            pathname === '/admin/pages' && currentSelectedPage === cp.slug;
                          return (
                            <Link
                              key={cp.id}
                              href={`/admin/pages?page=${cp.slug}`}
                              onClick={() => {
                                setCurrentSelectedPage(cp.slug);
                                setMobileMenuOpen(false);
                              }}
                              className={`flex items-center justify-between px-2 py-1.5 text-[11px] rounded transition-colors ${
                                isCpActive
                                  ? 'bg-[#2A2521] text-[#D4AF37] font-semibold'
                                  : 'text-[#B8AEA3] hover:text-[#FAF8F5] hover:bg-[#25201C]'
                              }`}
                            >
                              <span className="truncate">{cp.title}</span>
                              {isCpActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shrink-0" />
                              )}
                            </Link>
                          );
                        })}

                        <div className="pt-1">
                          <Link
                            href="/admin/pages?action=create"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#A8E6CF] bg-[#1F2C23] border border-[#2E4535] rounded font-medium"
                          >
                            <Plus className="w-3 h-3" />
                            <span>+ Add New Page</span>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="p-4 border-t border-[#2C2723] space-y-2">
              <button
                type="button"
                onClick={() => {
                  logout();
                  window.location.href = '/admin/login';
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-[#FF8A80] bg-[#2A1818] border border-[#3E2723]"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN WORKSPACE CONTAINER (Offset by lg:pl-64, Scrolls Independently) */}
      <div className="lg:pl-64 flex-1 flex flex-col min-h-screen w-full min-w-0 pt-14 lg:pt-0">
        {/* Workspace Subheader (Page Title + Actions) */}
        {title && (
          <div className="bg-[#FAF8F5] border-b border-[#ECE6DD] sticky top-14 lg:top-0 z-20 shadow-xs">
            <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="font-serif text-2xl sm:text-3xl text-[#1E1B18] font-normal tracking-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs text-[#7C736A] font-light mt-0.5 max-w-3xl">
                    {subtitle}
                  </p>
                )}
              </div>
              {extraAction && (
                <div className="flex items-center gap-2.5 shrink-0">
                  {extraAction}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main
          className={
            noPadding
              ? 'flex-1 w-full flex flex-col min-h-0'
              : 'flex-1 p-4 sm:p-6 lg:p-8 max-w-[1920px] w-full mx-auto min-w-0'
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
};
