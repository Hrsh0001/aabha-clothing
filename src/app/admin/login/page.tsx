'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Lock,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  Mail,
  KeyRound,
  CheckCircle2,
  Copy,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';

export default function AdminLoginPage() {
  const { loginAsAdmin, isAdmin, isInitialized } = useAuth();
  const [loginMode, setLoginMode] = useState<'credentials' | 'pin'>('credentials');
  const [email, setEmail] = useState('admin@aabhaclothing.com');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  useEffect(() => {
    if (isInitialized && isAdmin) {
      window.location.href = '/admin/dashboard';
    }
  }, [isInitialized, isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const secretToSubmit = loginMode === 'credentials' ? password : pin;
      const success = await loginAsAdmin(secretToSubmit);
      if (success) {
        window.location.href = '/admin/dashboard';
      } else {
        setError('Invalid admin credentials. Use the default email and password below.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutofillDemo = () => {
    setEmail('admin@aabhaclothing.com');
    setPassword('aabha2026');
    setPin('aabha2026');
    setError('');
  };

  if (!isInitialized || isAdmin) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6 text-center">
        <RefreshCw className="w-6 h-6 text-[#6E5043] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1E1B18] font-sans antialiased flex flex-col justify-between p-4 sm:p-8">
      {/* Top Bar */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#7C736A] hover:text-[#1E1B18] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Boutique
        </Link>
        <span className="text-xs uppercase tracking-widest text-[#7C736A] font-mono">
          PORTAL SECURITY
        </span>
      </header>

      {/* Main Login Card */}
      <main className="max-w-md w-full mx-auto my-8 bg-[#F3EFEA] border border-[#ECE6DD] p-7 sm:p-10 space-y-6 shadow-xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-[#FAF8F5] border border-[#E0D8CE] flex items-center justify-center mx-auto text-[#6E5043] shadow-xs">
            <Lock className="w-5 h-5 stroke-[1.4]" />
          </div>
          <h1 className="font-serif text-3xl text-[#1E1B18] font-normal">AABHA Admin Portal</h1>
          <p className="text-xs text-[#7C736A] leading-relaxed">
            Restricted store owner management for inventory, COD orders, sales analytics, and client inquiries.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-[#ECE6DD] pb-2">
          <button
            type="button"
            onClick={() => {
              setLoginMode('credentials');
              setError('');
            }}
            className={`flex-1 py-1.5 text-xs uppercase tracking-wider font-medium transition-colors cursor-pointer ${
              loginMode === 'credentials'
                ? 'border-b-2 border-[#1E1B18] text-[#1E1B18]'
                : 'text-[#7C736A] hover:text-[#1E1B18]'
            }`}
          >
            Email & Password
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode('pin');
              setError('');
            }}
            className={`flex-1 py-1.5 text-xs uppercase tracking-wider font-medium transition-colors cursor-pointer ${
              loginMode === 'pin'
                ? 'border-b-2 border-[#1E1B18] text-[#1E1B18]'
                : 'text-[#7C736A] hover:text-[#1E1B18]'
            }`}
          >
            Quick Security PIN
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {loginMode === 'credentials' ? (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#1E1B18] font-medium mb-1">Admin Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#7C736A] absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@aabhaclothing.com"
                    className="w-full bg-[#FAF8F5] border border-[#E0D8CE] pl-9 pr-3.5 py-2.5 text-sm font-mono text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#1E1B18] font-medium mb-1">Admin Password</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#7C736A] absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password (aabha2026)"
                    className="w-full bg-[#FAF8F5] border border-[#E0D8CE] pl-9 pr-3.5 py-2.5 text-sm font-mono text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 text-xs">
              <label className="block text-[#1E1B18] font-medium">Administrative PIN</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#7C736A] absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter Admin PIN (aabha2026)"
                  className="w-full bg-[#FAF8F5] border border-[#E0D8CE] pl-9 pr-3.5 py-2.5 text-sm font-mono tracking-widest text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                />
              </div>
            </div>
          )}

          {error && <p className="text-xs text-[#C62828] bg-[#FFEBEE] p-2.5 border border-[#FFCDD2]">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-[0.18em] hover:bg-[#14110E] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{submitting ? 'Verifying Credentials...' : 'Authenticate & Enter Dashboard'}</span>
          </button>
        </form>

        {/* Prominent Default Credentials Card */}
        <div className="p-4 bg-[#FAF8F5] border border-[#E0D8CE] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6E5043] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#6E5043]" />
              Default Admin Credentials
            </span>
            <button
              type="button"
              onClick={handleAutofillDemo}
              className="text-[11px] text-[#1E1B18] hover:text-[#6E5043] font-medium underline underline-offset-2 cursor-pointer"
            >
              ⚡ 1-Click Auto-Fill
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#F3EFEA] p-2.5 border border-[#ECE6DD]">
            <div>
              <span className="text-[10px] uppercase text-[#7C736A] font-sans block">Default Email</span>
              <strong className="text-[#1E1B18] select-all">admin@aabhaclothing.com</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase text-[#7C736A] font-sans block">Default Password / PIN</span>
              <strong className="text-[#1E1B18] select-all">aabha2026</strong>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-[#7C736A]">
        AABHA CLOTHING · Operations Security & Enterprise Atelier Panel
      </footer>
    </div>
  );
}
