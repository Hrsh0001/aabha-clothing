'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  Package,
  Sparkles,
  Image as ImageIcon,
  LogOut,
  Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AdminNavProps {
  activeTab: 'orders' | 'products' | 'branding';
  extraAction?: React.ReactNode;
}

export const AdminNav: React.FC<AdminNavProps> = ({ activeTab, extraAction }) => {
  const { logout } = useAuth();
  const pathname = usePathname();

  const navItems = [
    {
      id: 'orders',
      href: '/admin/orders',
      label: 'COD Orders',
      icon: Package,
    },
    {
      id: 'products',
      href: '/admin/products',
      label: 'Garments & Stock',
      icon: Sparkles,
    },
    {
      id: 'branding',
      href: '/admin/branding',
      label: 'Logo & Banners',
      icon: ImageIcon,
    },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#ECE6DD]">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          {/* Top Row: Storefront Return + Portal Brand */}
          <div className="flex items-center justify-between md:justify-start gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-[#7C736A] hover:text-[#1E1B18] transition-colors"
                title="Return to Customer Storefront"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Storefront</span>
              </Link>
              <span className="text-[#ECE6DD]">|</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#6E5043] animate-pulse"></span>
                <span className="font-serif text-lg sm:text-xl text-[#1E1B18] font-medium tracking-tight">
                  AABHA Admin
                </span>
              </div>
            </div>

            {/* Mobile Exit Admin */}
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = '/admin/login';
              }}
              className="md:hidden text-xs text-[#C62828] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || pathname === item.href;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium tracking-wider uppercase whitespace-nowrap transition-colors rounded-none ${
                    isActive
                      ? 'bg-[#231F1D] text-[#FAF8F5]'
                      : 'bg-[#F3EFEA] text-[#5C544D] hover:text-[#1E1B18] hover:bg-[#EAE4DC] border border-[#ECE6DD]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 stroke-[1.4]" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Action Bar (Extra button + Sign out) */}
          <div className="hidden md:flex items-center gap-3">
            {extraAction}
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = '/admin/login';
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium uppercase tracking-wider text-[#7C736A] hover:text-[#C62828] transition-colors cursor-pointer"
              title="Sign out of Admin Session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit Portal</span>
            </button>
          </div>
        </div>

        {/* Mobile Extra Action (e.g. Add Garment button) */}
        {extraAction && (
          <div className="mt-3 md:hidden flex justify-end">
            {extraAction}
          </div>
        )}
      </div>
    </header>
  );
};
