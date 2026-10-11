'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Star,
  Mail,
  Search,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Phone,
} from 'lucide-react';
import { AdminLayout } from '@/src/components/AdminLayout';
import { useAuth } from '@/src/context/AuthContext';
import type { SanitizedCustomer } from '../../api/customers/route';
import type { StoredReview } from '../../api/reviews/route';
import type { Subscriber } from '../../api/newsletter/route';

type ActiveTab = 'customers' | 'reviews' | 'subscribers';

const ITEMS_PER_PAGE = 8;

export default function AdminPatronsPage() {
  const { adminToken } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('customers');

  // Data states
  const [customers, setCustomers] = useState<SanitizedCustomer[]>([]);
  const [reviews, setReviews] = useState<StoredReview[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<'ALL' | '5' | '4' | '3' | 'BELOW3'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copiedEmails, setCopiedEmails] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const getAuthHeaders = () => {
    const token =
      adminToken ||
      (typeof window !== 'undefined' ? localStorage.getItem('aabha_admin_jwt') : null);
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Fetch all patron data
  const loadData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [resCust, resRev, resSub] = await Promise.all([
        fetch('/api/customers', { headers }).then((r) => r.json()),
        fetch('/api/reviews').then((r) => r.json()),
        fetch('/api/newsletter').then((r) => r.json()),
      ]);

      if (resCust.success && Array.isArray(resCust.customers)) {
        setCustomers(resCust.customers);
      }
      if (resRev.success && Array.isArray(resRev.reviews)) {
        setReviews(resRev.reviews);
      }
      if (resSub.success && Array.isArray(resSub.subscribers)) {
        setSubscribers(resSub.subscribers);
      }
    } catch (err) {
      console.error('Error fetching patron data:', err);
      showToast('Error loading patron data from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reset page whenever tab or search filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, ratingFilter]);

  // 1. Patron Customers Delete
  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove customer account "${name}"?`)) return;

    try {
      const res = await fetch(`/api/customers?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        showToast(`Customer account "${name}" removed successfully`);
      } else {
        showToast(data.error || 'Failed to remove customer');
      }
    } catch (err) {
      showToast('Error communicating with customer service');
    }
  };

  // 2. Reviews Moderate / Delete
  const handleDeleteReview = async (id: string) => {
    if (!confirm('Are you sure you want to remove and unpublish this customer review?')) return;

    try {
      const res = await fetch(`/api/reviews?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setReviews((prev) => prev.filter((r) => r.id !== id));
        showToast('Review removed and unpublished from product catalog');
      } else {
        showToast(data.error || 'Failed to remove review');
      }
    } catch (err) {
      showToast('Error communicating with reviews service');
    }
  };

  // 3. Newsletter Subscriber Delete
  const handleDeleteSubscriber = async (id: string, email: string) => {
    if (!confirm(`Remove subscriber "${email}" from the newsletter list?`)) return;

    try {
      const res = await fetch(`/api/newsletter?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setSubscribers((prev) => prev.filter((s) => s.id !== id));
        showToast(`Removed subscriber ${email}`);
      } else {
        showToast(data.error || 'Failed to remove subscriber');
      }
    } catch (err) {
      showToast('Error communicating with newsletter service');
    }
  };

  // Copy all newsletter subscribers to clipboard
  const handleCopySubscribers = () => {
    if (subscribers.length === 0) return;
    const emailList = subscribers.map((s) => s.email).join(', ');
    navigator.clipboard.writeText(emailList);
    setCopiedEmails(true);
    showToast(`Copied ${subscribers.length} subscriber emails to clipboard!`);
    setTimeout(() => setCopiedEmails(false), 3000);
  };

  // Format INR Currency
  const formatINR = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  // Filtered lists
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customers.filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q)
      );
    });
  }, [customers, searchQuery]);

  const filteredReviews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reviews.filter((r) => {
      if (ratingFilter !== 'ALL') {
        if (ratingFilter === '5' && r.rating !== 5) return false;
        if (ratingFilter === '4' && r.rating !== 4) return false;
        if (ratingFilter === '3' && r.rating !== 3) return false;
        if (ratingFilter === 'BELOW3' && r.rating >= 3) return false;
      }
      if (!q) return true;
      return (
        (r.productName || '').toLowerCase().includes(q) ||
        r.author.toLowerCase().includes(q) ||
        r.comment.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q)
      );
    });
  }, [reviews, searchQuery, ratingFilter]);

  const filteredSubscribers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return subscribers.filter((s) => {
      if (!q) return true;
      return s.email.toLowerCase().includes(q);
    });
  }, [subscribers, searchQuery]);

  // Pagination calculations
  const currentListLength =
    activeTab === 'customers'
      ? filteredCustomers.length
      : activeTab === 'reviews'
      ? filteredReviews.length
      : filteredSubscribers.length;

  const totalPages = Math.max(1, Math.ceil(currentListLength / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const paginatedCustomers = useMemo(
    () => filteredCustomers.slice(startIndex, endIndex),
    [filteredCustomers, startIndex, endIndex]
  );
  const paginatedReviews = useMemo(
    () => filteredReviews.slice(startIndex, endIndex),
    [filteredReviews, startIndex, endIndex]
  );
  const paginatedSubscribers = useMemo(
    () => filteredSubscribers.slice(startIndex, endIndex),
    [filteredSubscribers, startIndex, endIndex]
  );

  // Metrics
  const avgRating = useMemo(() => {
    if (reviews.length === 0) return 5;
    const sum = reviews.reduce((acc, curr) => acc + (Number(curr.rating) || 5), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  return (
    <AdminLayout
      title="Patrons, Reviews & Subscribers"
      subtitle="Oversee registered boutique client accounts, moderate patron reviews, and curate newsletter subscribers."
      extraAction={
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-1.5 border border-[#3E3832] bg-[#FAF8F5] text-[#1E1B18] text-xs font-medium uppercase tracking-wider hover:bg-[#F3EFEA] transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Data</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#FAF8F5] border border-[#ECE6DD] p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#7C736A] font-medium">
                Registered Patrons
              </p>
              <p className="font-serif text-3xl text-[#1E1B18] font-normal mt-1">
                {customers.length}
              </p>
              <p className="text-[10px] text-[#A69C91] mt-0.5">Verified customer profiles</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#F3EFEA] flex items-center justify-center text-[#6E5043]">
              <Users className="w-5 h-5 stroke-[1.4]" />
            </div>
          </div>

          <div className="bg-[#FAF8F5] border border-[#ECE6DD] p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#7C736A] font-medium">
                Verified Impressions
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-serif text-3xl text-[#1E1B18] font-normal">
                  {reviews.length}
                </span>
                <span className="text-xs font-mono text-[#D97706] flex items-center gap-0.5">
                  ★ {avgRating} avg
                </span>
              </div>
              <p className="text-[10px] text-[#A69C91] mt-0.5">Client product reviews</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#FEF3C7] flex items-center justify-center text-[#D97706]">
              <Star className="w-5 h-5 stroke-[1.4] fill-[#D97706]" />
            </div>
          </div>

          <div className="bg-[#FAF8F5] border border-[#ECE6DD] p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#7C736A] font-medium">
                Newsletter Subscribers
              </p>
              <p className="font-serif text-3xl text-[#1E1B18] font-normal mt-1">
                {subscribers.length}
              </p>
              <p className="text-[10px] text-[#A69C91] mt-0.5">Private preview recipients</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#F3EFEA] flex items-center justify-center text-[#6E5043]">
              <Mail className="w-5 h-5 stroke-[1.4]" />
            </div>
          </div>
        </div>

        {/* Tab Navigation Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#ECE6DD] gap-4 pb-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('customers');
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.12em] transition-colors cursor-pointer border-b-2 -mb-2 ${
                activeTab === 'customers'
                  ? 'border-[#1E1B18] text-[#1E1B18] font-semibold'
                  : 'border-transparent text-[#7C736A] hover:text-[#1E1B18]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Patrons ({customers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('reviews');
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.12em] transition-colors cursor-pointer border-b-2 -mb-2 ${
                activeTab === 'reviews'
                  ? 'border-[#1E1B18] text-[#1E1B18] font-semibold'
                  : 'border-transparent text-[#7C736A] hover:text-[#1E1B18]'
              }`}
            >
              <Star className="w-4 h-4" />
              <span>Product Reviews ({reviews.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('subscribers');
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.12em] transition-colors cursor-pointer border-b-2 -mb-2 ${
                activeTab === 'subscribers'
                  ? 'border-[#1E1B18] text-[#1E1B18] font-semibold'
                  : 'border-transparent text-[#7C736A] hover:text-[#1E1B18]'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Subscribers ({subscribers.length})</span>
            </button>
          </div>

          {/* Quick Action for Subscribers */}
          {activeTab === 'subscribers' && (
            <button
              type="button"
              onClick={handleCopySubscribers}
              disabled={subscribers.length === 0}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-[#231F1D] text-[#FAF8F5] text-xs uppercase tracking-wider font-medium hover:bg-[#14110E] transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-auto"
            >
              {copiedEmails ? <Check className="w-3.5 h-3.5 text-[#A8E6CF]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedEmails ? 'Emails Copied!' : 'Copy All Emails'}</span>
            </button>
          )}
        </div>

        {/* Search & Sub-Filter Bar */}
        <div className="bg-[#FAF8F5] border border-[#ECE6DD] p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#7C736A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'customers'
                  ? 'Search by name, email, or phone...'
                  : activeTab === 'reviews'
                  ? 'Search by product name, author, or review content...'
                  : 'Search subscribers by email address...'
              }
              className="w-full pl-10 pr-4 py-2 bg-[#FAF8F5] border border-[#D5CCC0] text-xs text-[#1E1B18] placeholder:text-[#9E948A] focus:outline-none focus:border-[#1E1B18]"
            />
          </div>

          {activeTab === 'reviews' && (
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-[#7C736A] font-medium whitespace-nowrap">
                Rating:
              </span>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value as any)}
                className="bg-[#FAF8F5] border border-[#D5CCC0] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
              >
                <option value="ALL">All Ratings</option>
                <option value="5">5 Stars Only</option>
                <option value="4">4 Stars Only</option>
                <option value="3">3 Stars Only</option>
                <option value="BELOW3">Below 3 Stars</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Customers Table */}
        {activeTab === 'customers' && (
          <div className="bg-[#FAF8F5] border border-[#ECE6DD] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F3EFEA] border-b border-[#ECE6DD] text-[#7C736A] uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4 font-semibold">Patron Details</th>
                    <th className="py-3.5 px-4 font-semibold">Contact</th>
                    <th className="py-3.5 px-4 font-semibold">Joined Date</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Orders Placed</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Lifetime Spend</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECE6DD]">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#7C736A]">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#6E5043] mb-2" />
                        Loading patron records...
                      </td>
                    </tr>
                  ) : paginatedCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#7C736A]">
                        No patrons match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedCustomers.map((cust) => (
                      <tr key={cust.id} className="hover:bg-[#F9F7F4] transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#231F1D] text-[#FAF8F5] flex items-center justify-center font-serif text-sm shrink-0">
                              {cust.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-[#1E1B18] text-sm">{cust.name}</p>
                              <p className="text-[10px] text-[#A69C91] font-mono">{cust.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-[#4A433D]">
                          <p className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-[#7C736A]" />
                            <a href={`mailto:${cust.email}`} className="hover:underline">
                              {cust.email}
                            </a>
                          </p>
                          {cust.phone && (
                            <p className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-[#7C736A]">
                              <Phone className="w-3 h-3 text-[#7C736A]" />
                              <span>{cust.phone}</span>
                            </p>
                          )}
                        </td>
                        <td className="py-4 px-4 text-[#7C736A]">
                          {new Date(cust.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 text-[11px] font-mono ${
                              cust.orderCount > 0
                                ? 'bg-[#E8F5E9] text-[#2E7D32] font-semibold'
                                : 'bg-[#F3EFEA] text-[#7C736A]'
                            }`}
                          >
                            {cust.orderCount} {cust.orderCount === 1 ? 'order' : 'orders'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-medium text-[#1E1B18]">
                          {cust.totalSpent > 0 ? formatINR(cust.totalSpent) : '—'}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                            title="Delete customer account"
                            className="p-1.5 text-[#A69C91] hover:text-[#C62828] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Product Reviews Cards */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {loading ? (
              <div className="bg-[#FAF8F5] border border-[#ECE6DD] p-12 text-center text-[#7C736A]">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#6E5043] mb-2" />
                Loading product reviews...
              </div>
            ) : paginatedReviews.length === 0 ? (
              <div className="bg-[#FAF8F5] border border-[#ECE6DD] p-12 text-center text-[#7C736A]">
                No product reviews match your criteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-[#FAF8F5] border border-[#ECE6DD] p-6 flex flex-col justify-between space-y-4 shadow-xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="inline-block px-2.5 py-0.5 bg-[#F3EFEA] text-[10px] uppercase tracking-wider text-[#6E5043] font-medium mb-1">
                            {rev.productName || rev.productId}
                          </span>
                          <h4 className="font-serif text-lg text-[#1E1B18] font-medium leading-snug">
                            {rev.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0 bg-[#FEF3C7] px-2 py-0.5 text-xs text-[#D97706] font-mono">
                          <Star className="w-3.5 h-3.5 fill-[#D97706]" />
                          <span>{rev.rating}.0</span>
                        </div>
                      </div>

                      <p className="text-xs text-[#4A433D] font-light leading-relaxed italic">
                        "{rev.comment}"
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#ECE6DD] flex items-center justify-between text-xs text-[#7C736A]">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#1E1B18]">{rev.author}</span>
                        <span>·</span>
                        <span>Size {rev.sizePurchased || 'M'}</span>
                        <span>·</span>
                        <span>{rev.date || 'October 2026'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteReview(rev.id)}
                        title="Unpublish and remove review"
                        className="p-1.5 text-[#A69C91] hover:text-[#C62828] transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Newsletter Subscribers Table */}
        {activeTab === 'subscribers' && (
          <div className="bg-[#FAF8F5] border border-[#ECE6DD] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F3EFEA] border-b border-[#ECE6DD] text-[#7C736A] uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4 font-semibold">Subscriber Email</th>
                    <th className="py-3.5 px-4 font-semibold">Subscribed At</th>
                    <th className="py-3.5 px-4 font-semibold">Source Channel</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECE6DD]">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-[#7C736A]">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#6E5043] mb-2" />
                        Loading newsletter subscribers...
                      </td>
                    </tr>
                  ) : paginatedSubscribers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-[#7C736A]">
                        No newsletter subscribers found.
                      </td>
                    </tr>
                  ) : (
                    paginatedSubscribers.map((sub) => (
                      <tr key={sub.id} className="hover:bg-[#F9F7F4] transition-colors">
                        <td className="py-4 px-4 font-medium text-[#1E1B18]">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-[#7C736A]" />
                            <a href={`mailto:${sub.email}`} className="hover:underline">
                              {sub.email}
                            </a>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-[#7C736A]">
                          {new Date(sub.subscribedAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-4 px-4 text-[#4A433D]">
                          <span className="inline-block px-2 py-0.5 bg-[#F3EFEA] text-[10px] uppercase font-mono text-[#6E5043]">
                            {sub.source || 'Storefront Footer'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteSubscriber(sub.id, sub.email)}
                            title="Remove subscriber"
                            className="p-1.5 text-[#A69C91] hover:text-[#C62828] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Unified Luxury Pagination Footer */}
        {totalPages > 1 && (
          <div className="bg-[#FAF8F5] border border-[#ECE6DD] px-4 py-3 flex items-center justify-between text-xs text-[#7C736A]">
            <p>
              Showing <span className="font-medium text-[#1E1B18]">{startIndex + 1}</span> to{' '}
              <span className="font-medium text-[#1E1B18]">
                {Math.min(endIndex, currentListLength)}
              </span>{' '}
              of <span className="font-medium text-[#1E1B18]">{currentListLength}</span> items
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-[#D5CCC0] text-[#1E1B18] hover:bg-[#F3EFEA] transition-colors disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-xs">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 border border-[#D5CCC0] text-[#1E1B18] hover:bg-[#F3EFEA] transition-colors disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E1B18] text-[#FAF8F5] px-5 py-3 text-xs tracking-wide shadow-2xl border border-[#3D3732] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#A8E6CF]" />
          <span>{toastMsg}</span>
        </div>
      )}
    </AdminLayout>
  );
}
