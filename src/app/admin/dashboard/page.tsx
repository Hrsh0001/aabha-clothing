'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  CheckCircle,
  Truck,
  Layers,
  ArrowRight,
  MessageSquareText,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Plus,
  Phone,
  FileText,
  DollarSign,
  Sparkles,
  Users,
  Navigation,
} from 'lucide-react';
import { AdminLayout } from '@/src/components/AdminLayout';
import { useAuth } from '@/src/context/AuthContext';
import type { CODOrder } from '../../api/orders/route';
import type { CustomerInquiry } from '../../api/inquiries/route';

interface ProductItem {
  id: string;
  name: string;
  category: string;
  price: number;
  inStock: boolean;
  primaryImage: string;
}

export default function AdminDashboardPage() {
  const { adminToken } = useAuth();
  const [orders, setOrders] = useState<CODOrder[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [inquiries, setInquiries] = useState<CustomerInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token =
      adminToken ||
      (typeof window !== 'undefined' ? localStorage.getItem('aabha_admin_jwt') : null);
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [resOrders, resProducts, resInquiries] = await Promise.all([
        fetch('/api/orders').then((r) => r.json()),
        fetch('/api/products').then((r) => r.json()),
        fetch('/api/inquiries').then((r) => r.json()),
      ]);

      if (resOrders.success) setOrders(resOrders.orders || []);
      if (resProducts.success) setProducts(resProducts.products || []);
      if (resInquiries.success) setInquiries(resInquiries.inquiries || []);
    } catch (err) {
      console.error('Dashboard data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const formatINR = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  // Metrics calculations
  const totalRevenue = useMemo(() => {
    return orders.reduce((sum, o) => sum + (o.total || 0), 0);
  }, [orders]);

  const pendingOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'PENDING_VERIFICATION');
  }, [orders]);

  const dispatchedOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'DISPATCHED');
  }, [orders]);

  const deliveredOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'DELIVERED');
  }, [orders]);

  const inStockProducts = useMemo(() => {
    return products.filter((p) => p.inStock);
  }, [products]);

  const unreadInquiries = useMemo(() => {
    return inquiries.filter((i) => i.status === 'UNREAD');
  }, [inquiries]);

  const aov = useMemo(() => {
    if (orders.length === 0) return 0;
    return Math.round(totalRevenue / orders.length);
  }, [orders, totalRevenue]);

  // Quick 1-click order status update
  const handleQuickStatusUpdate = async (orderId: string, nextStatus: string) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ orderId, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus as any } : o))
        );
        showToast(`Order status updated to ${nextStatus}!`);
      }
    } catch (err) {
      showToast('Failed to update order status');
    }
  };

  return (
    <AdminLayout
      title="Executive Overview"
      subtitle="Real-time sales performance, COD fulfillment pipeline, and inventory status."
      extraAction={
        <button
          onClick={loadAllData}
          className="flex items-center gap-2 px-3.5 py-2 border border-[#E0D8CE] bg-[#FAF8F5] text-xs text-[#5C544D] hover:bg-[#F3EFEA] transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh Data</span>
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

      <div className="space-y-8">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Total Revenue */}
          <div className="bg-[#F3EFEA] border border-[#ECE6DD] p-5 sm:p-6 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#7C736A]">
              <span className="uppercase tracking-wider font-medium">Total Gross Revenue</span>
              <TrendingUp className="w-4 h-4 text-[#2E7D32]" />
            </div>
            <div className="font-mono text-2xl sm:text-3xl font-semibold text-[#1E1B18]">
              {formatINR(totalRevenue)}
            </div>
            <p className="text-[11px] text-[#7C736A]">
              Pan-India Cash on Delivery & UPI collections
            </p>
          </div>

          {/* Card 2: Pending Orders */}
          <div className="bg-[#F3EFEA] border border-[#ECE6DD] p-5 sm:p-6 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#7C736A]">
              <span className="uppercase tracking-wider font-medium">Pending Verification</span>
              <Clock className="w-4 h-4 text-[#D97706]" />
            </div>
            <div className="font-mono text-2xl sm:text-3xl font-semibold text-[#D97706]">
              {pendingOrders.length}
            </div>
            <Link
              href="/admin/orders"
              className="text-[11px] text-[#D97706] hover:underline flex items-center gap-1 font-medium"
            >
              <span>Verify client phone numbers</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Card 3: Active Inventory */}
          <div className="bg-[#F3EFEA] border border-[#ECE6DD] p-5 sm:p-6 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#7C736A]">
              <span className="uppercase tracking-wider font-medium">Active Silhouettes</span>
              <Layers className="w-4 h-4 text-[#6E5043]" />
            </div>
            <div className="font-mono text-2xl sm:text-3xl font-semibold text-[#1E1B18]">
              {inStockProducts.length} <span className="text-sm font-normal text-[#7C736A]">/ {products.length}</span>
            </div>
            <p className="text-[11px] text-[#7C736A]">
              {Math.round((inStockProducts.length / (products.length || 1)) * 100)}% launch collection available
            </p>
          </div>

          {/* Card 4: Average Order Value */}
          <div className="bg-[#F3EFEA] border border-[#ECE6DD] p-5 sm:p-6 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#7C736A]">
              <span className="uppercase tracking-wider font-medium">Average Order Value</span>
              <Sparkles className="w-4 h-4 text-[#6E5043]" />
            </div>
            <div className="font-mono text-2xl sm:text-3xl font-semibold text-[#1E1B18]">
              {formatINR(aov)}
            </div>
            <p className="text-[11px] text-[#7C736A]">
              Across {orders.length} lifetime patron orders
            </p>
          </div>
        </div>

        {/* Action Shortcuts Banner */}
        <div className="bg-[#1E1B18] text-[#FAF8F5] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl font-normal text-[#FAF8F5]">
              Atelier Management Shortcuts
            </h2>
            <p className="text-xs text-[#B5ABA0] font-light mt-1">
              Direct access to COD dispatch lifecycle, stock updates, and styling messages.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/admin/products"
              className="px-4 py-2.5 bg-[#FAF8F5] text-[#1E1B18] text-xs uppercase tracking-wider font-medium hover:bg-[#EAE4DC] transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Garment</span>
            </Link>
            <Link
              href="/admin/orders"
              className="px-4 py-2.5 border border-[#3E3832] bg-[#2A2622] text-[#FAF8F5] text-xs uppercase tracking-wider font-medium hover:bg-[#3E3832] transition-colors flex items-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Process Orders</span>
            </Link>
            <Link
              href="/admin/inquiries"
              className="px-4 py-2.5 border border-[#3E3832] bg-[#2A2622] text-[#FAF8F5] text-xs uppercase tracking-wider font-medium hover:bg-[#3E3832] transition-colors flex items-center gap-1.5"
            >
              <MessageSquareText className="w-3.5 h-3.5" />
              <span>Inquiries ({unreadInquiries.length})</span>
            </Link>
            <Link
              href="/admin/patrons"
              className="px-4 py-2.5 border border-[#3E3832] bg-[#2A2622] text-[#FAF8F5] text-xs uppercase tracking-wider font-medium hover:bg-[#3E3832] transition-colors flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Patrons & Reviews</span>
            </Link>
          </div>
        </div>

        {/* 2-Column Split: Recent Orders & Inquiries */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Recent Orders (8 cols) */}
          <div className="lg:col-span-8 bg-[#F3EFEA] border border-[#ECE6DD] p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-[#E0D8CE]">
              <div>
                <h3 className="font-serif text-2xl text-[#1E1B18]">Recent COD Orders</h3>
                <p className="text-xs text-[#7C736A] mt-0.5">
                  Latest customer orders placed via storefront
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/admin/dispatch"
                  className="px-3 py-1 bg-[#231F1D] text-[#FAF8F5] text-xs uppercase tracking-wider font-medium hover:bg-[#14110E] transition-colors flex items-center gap-1.5"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Live Map Dispatch</span>
                </Link>
                <Link
                  href="/admin/orders"
                  className="text-xs uppercase tracking-wider font-medium text-[#6E5043] hover:underline flex items-center gap-1"
                >
                  <span>View All ({orders.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#7C736A]">
                No orders placed yet. Orders placed by customers will appear here immediately.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E0D8CE] text-[#7C736A] uppercase font-semibold">
                      <th className="py-2.5">Order</th>
                      <th className="py-2.5">Customer</th>
                      <th className="py-2.5">Destination</th>
                      <th className="py-2.5">Total</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5 text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0D8CE]">
                    {orders.slice(0, 5).map((ord) => (
                      <tr key={ord.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                        <td className="py-3 font-mono font-medium text-[#1E1B18]">
                          #{ord.orderNumber}
                        </td>
                        <td className="py-3">
                          <p className="font-medium text-[#1E1B18]">{ord.customerName}</p>
                          <p className="text-[11px] text-[#7C736A] font-mono">{ord.phone}</p>
                        </td>
                        <td className="py-3 text-[#5C544D]">
                          {ord.city || 'India'}
                        </td>
                        <td className="py-3 font-mono font-semibold text-[#1E1B18]">
                          {formatINR(ord.total)}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono uppercase font-medium ${
                              ord.status === 'DELIVERED'
                                ? 'bg-[#E8F5E9] text-[#2E7D32]'
                                : ord.status === 'DISPATCHED'
                                ? 'bg-[#E3F2FD] text-[#1565C0]'
                                : ord.status === 'CONFIRMED'
                                ? 'bg-[#FFF8E1] text-[#F57F17]'
                                : 'bg-[#FFF3E0] text-[#E65100]'
                            }`}
                          >
                            {ord.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {ord.status === 'PENDING_VERIFICATION' ? (
                            <button
                              type="button"
                              onClick={() => handleQuickStatusUpdate(ord.id, 'CONFIRMED')}
                              className="px-2.5 py-1 bg-[#231F1D] text-white text-[10px] uppercase font-medium hover:bg-black cursor-pointer"
                            >
                              Verify
                            </button>
                          ) : ord.status === 'CONFIRMED' ? (
                            <button
                              type="button"
                              onClick={() => handleQuickStatusUpdate(ord.id, 'DISPATCHED')}
                              className="px-2.5 py-1 bg-[#1565C0] text-white text-[10px] uppercase font-medium hover:bg-[#0D47A1] cursor-pointer"
                            >
                              Dispatch
                            </button>
                          ) : (
                            <Link
                              href="/admin/orders"
                              className="text-[11px] text-[#6E5043] hover:underline font-medium"
                            >
                              Details
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Column: Client Inquiries & Care (4 cols) */}
          <div className="lg:col-span-4 bg-[#F3EFEA] border border-[#ECE6DD] p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-[#E0D8CE]">
              <div>
                <h3 className="font-serif text-2xl text-[#1E1B18]">Client Inquiries</h3>
                <p className="text-xs text-[#7C736A] mt-0.5">
                  Styling & sizing requests from patrons
                </p>
              </div>
              <Link
                href="/admin/inquiries"
                className="text-xs uppercase tracking-wider font-medium text-[#6E5043] hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {inquiries.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#7C736A]">
                No client inquiries received yet.
              </div>
            ) : (
              <div className="space-y-3">
                {inquiries.slice(0, 4).map((inq) => (
                  <div
                    key={inq.id}
                    className="p-3.5 bg-[#FAF8F5] border border-[#ECE6DD] space-y-2 hover:border-[#1E1B18] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs text-[#1E1B18]">{inq.name}</span>
                      <span
                        className={`px-1.5 py-0.5 text-[9px] font-mono uppercase font-semibold ${
                          inq.status === 'UNREAD'
                            ? 'bg-[#FFEBEE] text-[#C62828]'
                            : inq.status === 'RESPONDED'
                            ? 'bg-[#E3F2FD] text-[#1565C0]'
                            : 'bg-[#E8F5E9] text-[#2E7D32]'
                        }`}
                      >
                        {inq.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7C736A] font-medium">{inq.topic}</p>
                    <p className="text-xs text-[#5C544D] line-clamp-2 font-light">
                      {inq.message}
                    </p>
                    <div className="flex items-center justify-between pt-1 text-[10px] text-[#8C8278]">
                      <span>{new Date(inq.createdAt).toLocaleDateString('en-IN')}</span>
                      <Link
                        href="/admin/inquiries"
                        className="text-[#6E5043] hover:underline font-medium"
                      >
                        Reply →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
