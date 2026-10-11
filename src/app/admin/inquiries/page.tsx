'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquareText,
  Mail,
  Phone,
  MessageCircle,
  CheckCircle,
  Clock,
  Trash2,
  Search,
  RefreshCw,
  X,
  Send,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AdminLayout } from '@/src/components/AdminLayout';
import { useAuth } from '@/src/context/AuthContext';
import type { CustomerInquiry } from '../../api/inquiries/route';

const INQUIRIES_PER_PAGE = 8;

export default function AdminInquiriesPage() {
  const { adminToken } = useAuth();
  const [inquiries, setInquiries] = useState<CustomerInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNREAD' | 'RESPONDED' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<CustomerInquiry | null>(null);

  const getAuthHeaders = () => {
    const token =
      adminToken ||
      (typeof window !== 'undefined' ? localStorage.getItem('aabha_admin_jwt') : null);
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-admin-pin': 'aabha2026',
    };
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inquiries');
      const data = await res.json();
      if (data.success) {
        setInquiries(data.inquiries || []);
      }
    } catch (err) {
      console.error('Failed to load inquiries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  const handleUpdateStatus = async (id: string, newStatus: 'UNREAD' | 'RESPONDED' | 'RESOLVED') => {
    try {
      const res = await fetch('/api/inquiries', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setInquiries((prev) =>
          prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i))
        );
        if (selectedInquiry?.id === id) {
          setSelectedInquiry((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
        showToast(`Inquiry marked as ${newStatus}!`);
      }
    } catch (err) {
      showToast('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer inquiry?')) return;
    try {
      const res = await fetch(`/api/inquiries?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setInquiries((prev) => prev.filter((i) => i.id !== id));
        if (selectedInquiry?.id === id) setSelectedInquiry(null);
        showToast('Inquiry deleted successfully');
      }
    } catch (err) {
      showToast('Failed to delete inquiry');
    }
  };

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      if (statusFilter !== 'ALL' && inq.status !== statusFilter) return false;
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchName = inq.name.toLowerCase().includes(q);
        const matchEmail = inq.email.toLowerCase().includes(q);
        const matchTopic = inq.topic.toLowerCase().includes(q);
        const matchMsg = inq.message.toLowerCase().includes(q);
        const matchPhone = inq.phone?.includes(q);
        if (!matchName && !matchEmail && !matchTopic && !matchMsg && !matchPhone) return false;
      }
      return true;
    });
  }, [inquiries, statusFilter, searchQuery]);

  // Paginated slices
  const totalPages = Math.max(1, Math.ceil(filteredInquiries.length / INQUIRIES_PER_PAGE));
  const paginatedInquiries = useMemo(() => {
    const start = (currentPage - 1) * INQUIRIES_PER_PAGE;
    return filteredInquiries.slice(start, start + INQUIRIES_PER_PAGE);
  }, [filteredInquiries, currentPage]);

  return (
    <AdminLayout
      title="Client Inquiries & Styling Atelier"
      subtitle="Messages, bespoke styling requests, and sizing inquiries submitted from the storefront Contact Us form."
      extraAction={
        <button
          onClick={fetchInquiries}
          className="flex items-center gap-2 px-3.5 py-2 border border-[#E0D8CE] bg-[#FAF8F5] text-xs text-[#5C544D] hover:bg-[#F3EFEA] transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      }
    >
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-[#1E1B18] text-[#FAF8F5] px-4 py-2.5 text-xs shadow-xl border border-[#3D3732] flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-[#A8E6CF]" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Quick Filter & Search Bar */}
        <div className="bg-[#F3EFEA] border border-[#ECE6DD] p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 text-xs">
          {/* Status Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {(
              [
                { label: 'All Inquiries', value: 'ALL', count: inquiries.length },
                {
                  label: 'Unread',
                  value: 'UNREAD',
                  count: inquiries.filter((i) => i.status === 'UNREAD').length,
                },
                {
                  label: 'Responded',
                  value: 'RESPONDED',
                  count: inquiries.filter((i) => i.status === 'RESPONDED').length,
                },
                {
                  label: 'Resolved',
                  value: 'RESOLVED',
                  count: inquiries.filter((i) => i.status === 'RESOLVED').length,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 text-xs uppercase tracking-wider cursor-pointer whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  statusFilter === tab.value
                    ? 'bg-[#231F1D] text-[#FAF8F5]'
                    : 'bg-[#FAF8F5] text-[#7C736A] hover:text-[#1E1B18] border border-[#E0D8CE]'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] font-mono opacity-80">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[#7C736A] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client name, email, or topic..."
              className="w-full bg-[#FAF8F5] border border-[#E0D8CE] pl-9 pr-3 py-2 text-xs text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
            />
          </div>
        </div>

        {/* Inquiries Table / Grid */}
        {loading ? (
          <div className="py-20 text-center text-xs text-[#7C736A] flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#6E5043] animate-spin" />
            <span>Loading client messages...</span>
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-[#ECE6DD] bg-[#FAF8F5] space-y-3">
            <MessageSquareText className="w-10 h-10 text-[#A69C91] mx-auto stroke-[1.2]" />
            <h3 className="font-serif text-xl text-[#1E1B18]">No Inquiries Found</h3>
            <p className="text-xs text-[#7C736A]">
              Messages sent through the storefront Contact page will be catalogued here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedInquiries.map((inq) => {
              const cleanPhone = inq.phone ? inq.phone.replace(/[^0-9]/g, '') : '';
              const waLink = cleanPhone
                ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(
                    `Namaste ${inq.name},\nThis is the AABHA CLOTHING atelier replying to your inquiry regarding "${inq.topic}". How may we assist you further?`
                  )}`
                : null;
              const mailLink = `mailto:${inq.email}?subject=${encodeURIComponent(
                `Re: AABHA CLOTHING — ${inq.topic}`
              )}&body=${encodeURIComponent(`Namaste ${inq.name},\n\nThank you for reaching out to AABHA.\n\n`)}`;

              return (
                <div
                  key={inq.id}
                  className={`p-5 sm:p-6 border transition-all space-y-4 ${
                    inq.status === 'UNREAD'
                      ? 'bg-[#FAF8F5] border-[#1E1B18] shadow-sm'
                      : 'bg-[#F3EFEA] border-[#ECE6DD]'
                  }`}
                >
                  {/* Top Row: Patron info & Status pill */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E0D8CE]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#231F1D] text-[#FAF8F5] flex items-center justify-center font-serif text-base shrink-0">
                        {inq.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-[#1E1B18] flex items-center gap-2">
                          <span>{inq.name}</span>
                          {inq.status === 'UNREAD' && (
                            <span className="w-2 h-2 rounded-full bg-[#C62828] animate-pulse" />
                          )}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-[#7C736A] mt-0.5">
                          <span className="flex items-center gap-1 font-mono">
                            <Mail className="w-3 h-3" /> {inq.email}
                          </span>
                          {inq.phone && (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3" /> +91 {inq.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 text-[10px] font-mono uppercase font-semibold ${
                          inq.status === 'UNREAD'
                            ? 'bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]'
                            : inq.status === 'RESPONDED'
                            ? 'bg-[#E3F2FD] text-[#1565C0] border border-[#BBDEFB]'
                            : 'bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]'
                        }`}
                      >
                        {inq.status}
                      </span>
                      <span className="text-[11px] text-[#7C736A] font-mono">
                        {new Date(inq.createdAt).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Topic & Message Body */}
                  <div className="space-y-1.5">
                    <p className="text-xs uppercase tracking-wider font-semibold text-[#6E5043]">
                      Topic: {inq.topic}
                    </p>
                    <p className="text-sm text-[#1E1B18] font-light leading-relaxed whitespace-pre-wrap bg-[#FAF8F5] p-4 border border-[#ECE6DD]">
                      "{inq.message}"
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
                    {/* Status Toggles */}
                    <div className="flex items-center gap-2">
                      <span className="text-[#7C736A]">Set Status:</span>
                      {inq.status !== 'UNREAD' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(inq.id, 'UNREAD')}
                          className="px-2.5 py-1 bg-[#FAF8F5] border border-[#E0D8CE] text-[11px] text-[#7C736A] hover:text-[#1E1B18] cursor-pointer"
                        >
                          Mark Unread
                        </button>
                      )}
                      {inq.status !== 'RESPONDED' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(inq.id, 'RESPONDED')}
                          className="px-2.5 py-1 bg-[#FAF8F5] border border-[#E0D8CE] text-[11px] text-[#1565C0] hover:bg-[#E3F2FD] cursor-pointer"
                        >
                          Mark Responded
                        </button>
                      )}
                      {inq.status !== 'RESOLVED' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(inq.id, 'RESOLVED')}
                          className="px-2.5 py-1 bg-[#FAF8F5] border border-[#E0D8CE] text-[11px] text-[#2E7D32] hover:bg-[#E8F5E9] cursor-pointer"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>

                    {/* Contact & Delete Buttons */}
                    <div className="flex items-center gap-2">
                      {waLink && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => {
                            if (inq.status === 'UNREAD') handleUpdateStatus(inq.id, 'RESPONDED');
                          }}
                          className="px-3 py-1.5 bg-[#25D366] text-white text-[11px] font-medium tracking-wide flex items-center gap-1.5 hover:opacity-90 cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp Reply</span>
                        </a>
                      )}
                      <a
                        href={mailLink}
                        onClick={() => {
                          if (inq.status === 'UNREAD') handleUpdateStatus(inq.id, 'RESPONDED');
                        }}
                        className="px-3 py-1.5 bg-[#231F1D] text-[#FAF8F5] text-[11px] font-medium tracking-wide flex items-center gap-1.5 hover:bg-black cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Email Reply</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDelete(inq.id)}
                        className="p-1.5 text-[#948A80] hover:text-[#C62828] cursor-pointer transition-colors"
                        title="Delete Inquiry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#5C544D] border-t border-[#ECE6DD]">
                <p>
                  Showing <span className="font-mono font-medium text-[#1E1B18]">{(currentPage - 1) * INQUIRIES_PER_PAGE + 1}</span> to{' '}
                  <span className="font-mono font-medium text-[#1E1B18]">
                    {Math.min(currentPage * INQUIRIES_PER_PAGE, filteredInquiries.length)}
                  </span>{' '}
                  of <span className="font-mono font-medium text-[#1E1B18]">{filteredInquiries.length}</span> inquiries
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 bg-[#F3EFEA] border border-[#ECE6DD] hover:bg-[#EAE4DC] disabled:opacity-40 disabled:cursor-not-allowed text-[#1E1B18]"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-3 py-1 font-mono text-xs bg-[#FAF8F5] border border-[#ECE6DD]">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 bg-[#F3EFEA] border border-[#ECE6DD] hover:bg-[#EAE4DC] disabled:opacity-40 disabled:cursor-not-allowed text-[#1E1B18]"
                    aria-label="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
