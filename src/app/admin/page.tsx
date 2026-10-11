'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import { RefreshCw } from 'lucide-react';

export default function AdminIndexPage() {
  const { isAdmin, isInitialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;
    if (isAdmin) {
      router.replace('/admin/dashboard');
    } else {
      router.replace('/admin/login');
    }
  }, [isAdmin, isInitialized, router]);

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-6 text-center space-y-3">
      <RefreshCw className="w-6 h-6 text-[#6E5043] animate-spin" />
      <p className="text-xs uppercase tracking-widest text-[#7C736A]">
        Verifying Administrative Credentials...
      </p>
    </div>
  );
}
