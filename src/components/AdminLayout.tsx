'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AdminSidebar } from './AdminSidebar';

interface AdminLayoutProps {
  title: string;
  subtitle?: string;
  extraAction?: React.ReactNode;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  title,
  subtitle,
  extraAction,
  children,
}) => {
  const { isAdmin, isInitialized } = useAuth();

  useEffect(() => {
    if (isInitialized && !isAdmin) {
      window.location.href = '/admin/login';
    }
  }, [isInitialized, isAdmin]);

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

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col lg:flex-row font-sans text-[#1E1B18] antialiased">
      {/* Responsive Luxury Sidebar */}
      <AdminSidebar />

      {/* Main Content Workspace */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Workspace Top Bar */}
        <header className="sticky top-0 z-30 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#ECE6DD] px-4 sm:px-8 lg:px-10 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl text-[#1E1B18] font-normal tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-[#7C736A] font-light mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {extraAction && (
            <div className="flex items-center gap-3">
              {extraAction}
            </div>
          )}
        </header>

        {/* Workspace Children */}
        <main className="flex-1 p-4 sm:p-8 lg:p-10 max-w-[1700px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
