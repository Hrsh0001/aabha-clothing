'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Layers,
  MessageSquareText,
  Image as ImageIcon,
  ExternalLink,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Users,
  Navigation,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AdminSidebarProps {
  pendingOrdersCount?: number;
  unreadInquiriesCount?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  pendingOrdersCount = 0,
  unreadInquiriesCount = 0,
}) => {
  const { logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [livePending, setLivePending] = useState(pendingOrdersCount);
  const [liveInquiries, setLiveInquiries] = useState(unreadInquiriesCount);

  // Auto-fetch badges if not provided
  useEffect(() => {
    fetch('/api/orders')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.orders)) {
          const count = data.orders.filter((o: any) => o.status === 'PENDING_VERIFICATION').length;
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
  }, [pathname]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navItems = [
    {
      group: 'ATELIER MANAGEMENT',
      items: [
        {
          label: 'Executive Dashboard',
          href: '/admin/dashboard',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          label: 'COD Orders & Dispatch',
          href: '/admin/orders',
          icon: ShoppingBag,
          badge: livePending > 0 ? `${livePending} pending` : null,
          badgeColor: 'bg-[#D97706] text-white',
        },
        {
          label: 'Live Dispatch Map',
          href: '/admin/dispatch',
          icon: Navigation,
          badge: 'GPS',
          badgeColor: 'bg-[#2E7D32] text-white',
        },
        {
          label: 'Garments & Stock',
          href: '/admin/products',
          icon: Layers,
          badge: null,
        },
        {
          label: 'Client Inquiries',
          href: '/admin/inquiries',
          icon: MessageSquareText,
          badge: liveInquiries > 0 ? `${liveInquiries} new` : null,
          badgeColor: 'bg-[#6E5043] text-white',
        },
        {
          label: 'Patrons & Reviews',
          href: '/admin/patrons',
          icon: Users,
          badge: null,
        },
      ],
    },
    {
      group: 'BOUTIQUE CURATION',
      items: [
        {
          label: 'Branding & Banners',
          href: '/admin/branding',
          icon: ImageIcon,
          badge: null,
        },
      ],
    },
  ];

  const handleLogout = () => {
    logout();
    window.location.href = '/admin/login';
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#1E1B18] text-[#FAF8F5]">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#2E2925]">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-serif text-2xl tracking-[0.14em] text-[#FAF8F5] block">
              AABHA
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#9E948A] block mt-0.5">
              Atelier Management
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#2E2925] border border-[#3E3832] text-[10px] text-[#A8E6CF] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A8E6CF] animate-pulse"></span>
            LIVE
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {navItems.map((sec) => (
          <div key={sec.group} className="space-y-1.5">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8C8075]">
              {sec.group}
            </p>
            <div className="space-y-1">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-medium tracking-wide transition-colors ${
                      isActive
                        ? 'bg-[#FAF8F5] text-[#1E1B18] font-semibold'
                        : 'text-[#D5CCC0] hover:bg-[#2A2622] hover:text-[#FAF8F5]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 stroke-[1.4] ${isActive ? 'text-[#1E1B18]' : 'text-[#A69C91]'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`px-2 py-0.5 text-[10px] font-mono uppercase font-semibold ${item.badgeColor || 'bg-[#2E2925] text-white'}`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Quick Link to Customer Storefront */}
        <div className="pt-2">
          <Link
            href="/"
            className="flex items-center justify-between px-3.5 py-2.5 text-xs text-[#A69C91] hover:text-[#FAF8F5] hover:bg-[#2A2622] transition-colors"
          >
            <div className="flex items-center gap-3">
              <ExternalLink className="w-4 h-4" />
              <span>Public Boutique</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </Link>
        </div>
      </div>

      {/* Bottom Store Owner Widget */}
      <div className="p-4 border-t border-[#2E2925] bg-[#171412]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#FAF8F5] text-[#1E1B18] flex items-center justify-center font-serif text-sm font-semibold shrink-0">
              A
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#FAF8F5] truncate">Store Administrator</p>
              <p className="text-[10px] text-[#8C8075] truncate font-mono">owner@aabhaclothing.com</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out of Admin Session"
            className="p-1.5 text-[#A69C91] hover:text-[#C62828] transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar Panel */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 z-40 border-r border-[#2E2925]">
        <SidebarContent />
      </aside>

      {/* Mobile Top Header with Hamburger */}
      <div className="lg:hidden sticky top-0 z-40 bg-[#1E1B18] text-[#FAF8F5] border-b border-[#2E2925] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle admin sidebar"
            className="p-1.5 text-[#FAF8F5] hover:text-[#D5CCC0] cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-serif text-lg tracking-wider text-[#FAF8F5]">AABHA ADMIN</span>
        </div>

        <div className="flex items-center gap-2">
          {livePending > 0 && (
            <Link
              href="/admin/orders"
              className="px-2 py-0.5 bg-[#D97706] text-white text-[10px] font-mono uppercase"
            >
              {livePending} orders
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs text-[#A69C91] hover:text-[#C62828] p-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Slide-Over Drawer with Backdrop */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10 shadow-2xl">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
};
