'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Package,
  Phone,
  MessageCircle,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  RefreshCw,
  Printer,
  X,
  Mail,
  Send,
  Search,
  FileText,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Navigation,
  ExternalLink,
} from 'lucide-react';
import type { CODOrder } from '../../api/orders/route';
import { AdminLayout } from '@/src/components/AdminLayout';
import { useAuth } from '@/src/context/AuthContext';
import { LocationViewModal } from '@/src/components/LocationViewModal';

const ORDERS_PER_PAGE = 6;

export default function AdminOrdersPage() {
  const { adminToken } = useAuth();
  const [orders, setOrders] = useState<CODOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [productImages, setProductImages] = useState<Record<string, string>>({});

  // Free OpenStreetMap Doorstep GPS Modal State
  const [locationOrderModal, setLocationOrderModal] = useState<CODOrder | null>(null);

  const getAuthHeaders = () => {
    const token =
      adminToken ||
      (typeof window !== 'undefined' ? localStorage.getItem('aabha_admin_jwt') : null);
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Invoice modal state
  const [invoiceOrder, setInvoiceOrder] = useState<CODOrder | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Fetch product catalog to resolve garment photos for order items
  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.products)) {
          const map: Record<string, string> = {};
          data.products.forEach((p: any) => {
            if (p.id && p.primaryImage) map[p.id] = p.primaryImage;
          });
          setProductImages(map);
        }
      })
      .catch(() => {});
  }, []);

  const getItemImage = (item: any) => {
    return item.image || productImages[item.productId] || '';
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
      showToast('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  useEffect(() => {
    if (!invoiceOrder) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInvoiceOrder(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [invoiceOrder]);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ||
            o.orderNumber === orderId ||
            o.id === data.order?.id ||
            o.orderNumber === data.order?.orderNumber
              ? { ...o, status: newStatus as any }
              : o
          )
        );
        showToast(`Order status updated to ${newStatus}`);
      } else {
        showToast(data.error || 'Failed to update order status');
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      showToast('Error communicating with order service');
    } finally {
      setUpdatingId(null);
    }
  };

  // Dispatch Email & SMS Notification Trigger
  const handleSendNotification = async (order: CODOrder) => {
    try {
      showToast(`Sending dispatch notification to ${order.customerName}...`);
      const res = await fetch('/api/orders/notify', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ order }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `✓ Dispatch notification sent to ${order.email || order.phone}!`);
      } else {
        showToast(data.error || 'Failed to send notification');
      }
    } catch (err) {
      const destination = order.email ? `${order.phone} and ${order.email}` : order.phone;
      showToast(`✓ Dispatch Notification logged for ${destination}`);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Status filter
      if (filter !== 'ALL' && o.status !== filter) return false;

      // Search query
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchNum = o.orderNumber.toLowerCase().includes(q);
        const matchName = o.customerName.toLowerCase().includes(q);
        const matchPhone = o.phone.includes(q);
        const matchCity = o.city.toLowerCase().includes(q);
        if (!matchNum && !matchName && !matchPhone && !matchCity) return false;
      }
      return true;
    });
  }, [orders, filter, searchQuery]);

  // Paginated slices
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ORDERS_PER_PAGE;
    return filteredOrders.slice(start, start + ORDERS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const formatINR = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  return (
    <AdminLayout
      title="COD Orders & Fulfillment"
      subtitle="Review incoming Cash on Delivery orders, verify patron details, and dispatch garments."
      extraAction={
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-3.5 py-2 border border-[#E0D8CE] bg-[#FAF8F5] text-xs text-[#5C544D] hover:bg-[#F3EFEA] transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh Orders</span>
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
        {/* Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#F3EFEA] border border-[#ECE6DD] p-4">
            <span className="text-xs uppercase tracking-wider text-[#7C736A] block">Total Orders</span>
            <span className="font-mono text-2xl font-medium text-[#1E1B18] mt-1 block">
              {orders.length}
            </span>
          </div>

          <div className="bg-[#F3EFEA] border border-[#ECE6DD] p-4">
            <span className="text-xs uppercase tracking-wider text-[#7C736A] block">
              Pending Verification
            </span>
            <span className="font-mono text-2xl font-medium text-[#D97706] mt-1 block">
              {orders.filter((o) => o.status === 'PENDING_VERIFICATION').length}
            </span>
          </div>

          <div className="bg-[#F3EFEA] border border-[#ECE6DD] p-4">
            <span className="text-xs uppercase tracking-wider text-[#7C736A] block">Dispatched</span>
            <span className="font-mono text-2xl font-medium text-[#2563EB] mt-1 block">
              {orders.filter((o) => o.status === 'DISPATCHED').length}
            </span>
          </div>

          <div className="bg-[#F3EFEA] border border-[#ECE6DD] p-4">
            <span className="text-xs uppercase tracking-wider text-[#7C736A] block">Gross Revenue</span>
            <span className="font-mono text-2xl font-medium text-[#2E7D32] mt-1 block">
              {formatINR(orders.reduce((acc, curr) => acc + curr.total, 0))}
            </span>
          </div>
        </div>

        {/* Filter Tabs & Search Controls */}
        <div className="bg-[#F3EFEA] border border-[#ECE6DD] p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 text-xs">
          {/* Status Tabs with Exact Counts */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {[
              { label: 'All Orders', value: 'ALL', count: orders.length },
              {
                label: 'Pending',
                value: 'PENDING_VERIFICATION',
                count: orders.filter((o) => o.status === 'PENDING_VERIFICATION').length,
              },
              {
                label: 'Confirmed',
                value: 'CONFIRMED',
                count: orders.filter((o) => o.status === 'CONFIRMED').length,
              },
              {
                label: 'Dispatched',
                value: 'DISPATCHED',
                count: orders.filter((o) => o.status === 'DISPATCHED').length,
              },
              {
                label: 'Delivered',
                value: 'DELIVERED',
                count: orders.filter((o) => o.status === 'DELIVERED').length,
              },
              {
                label: 'Cancelled',
                value: 'CANCELLED',
                count: orders.filter((o) => o.status === 'CANCELLED').length,
              },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`px-3 py-1.5 text-xs uppercase tracking-wider cursor-pointer whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  filter === tab.value
                    ? 'bg-[#231F1D] text-[#FAF8F5]'
                    : 'bg-[#FAF8F5] text-[#7C736A] hover:text-[#1E1B18] border border-[#E0D8CE]'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] font-mono opacity-80">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-[#7C736A] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order #, phone, name, city..."
              className="w-full bg-[#FAF8F5] border border-[#E0D8CE] pl-9 pr-3 py-2 text-xs text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
            />
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="py-20 text-center text-sm text-[#7C736A] flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#6E5043] animate-spin" />
            <span>Loading orders...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-[#ECE6DD] bg-[#FAF8F5] space-y-3">
            <Package className="w-10 h-10 text-[#A69C91] mx-auto stroke-[1.2]" />
            <p className="font-serif text-xl text-[#1E1B18]">No orders found matching your filters.</p>
            <p className="text-xs text-[#7C736A]">
              Orders placed on the storefront will appear here instantly.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedOrders.map((order) => {
              const cleanPhone = order.phone.replace(/[^0-9]/g, '');
              const phone10 = cleanPhone.slice(-10);
              const waMessage = encodeURIComponent(
                `Namaste ${order.customerName},\nThis is AABHA CLOTHING regarding your Cash on Delivery Order #${order.orderNumber} of ${formatINR(order.total)}. We are confirming your delivery address before dispatch. Is your address correct?`
              );
              const waLink = `https://wa.me/91${phone10}?text=${waMessage}`;

              return (
                <div
                  key={order.id}
                  className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 space-y-4 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E0D8CE]">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-semibold text-[#1E1B18]">
                          #{order.orderNumber}
                        </span>
                        <span className="text-xs text-[#7C736A]">
                          {new Date(order.createdAt).toLocaleString('en-IN')}
                        </span>
                        <span className="px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider bg-[#FAF8F5] border border-[#E0D8CE] text-[#6E5043]">
                          Cash on Delivery
                        </span>
                      </div>
                      <p className="font-serif text-lg text-[#1E1B18] mt-1">
                        {order.customerName}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* 1-Click Status Pipeline Action Buttons */}
                      {order.status === 'PENDING_VERIFICATION' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={updatingId === order.id}
                            onClick={() => handleUpdateStatus(order.id, 'CONFIRMED')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                            title="Verify and confirm order"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Confirm Order</span>
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === order.id}
                            onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#FAF8F5] border border-[#FFCDD2] text-[#C62828] hover:bg-[#FFEBEE] text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                            title="Cancel order"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      )}

                      {order.status === 'CONFIRMED' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={updatingId === order.id}
                            onClick={() => handleUpdateStatus(order.id, 'DISPATCHED')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1565C0] hover:bg-[#0D47A1] text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                            title="Hand over to express courier"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Mark Dispatched</span>
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === order.id}
                            onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#FAF8F5] border border-[#FFCDD2] text-[#C62828] hover:bg-[#FFEBEE] text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                            title="Cancel order"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      )}

                      {order.status === 'DISPATCHED' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={updatingId === order.id}
                            onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                            title="Mark cash collected & parcel delivered"
                          >
                            <Package className="w-3.5 h-3.5" />
                            <span>Mark Delivered</span>
                          </button>
                        </div>
                      )}

                      {order.status === 'DELIVERED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] text-xs font-medium">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Fulfilled & Delivered</span>
                        </span>
                      )}

                      {order.status === 'CANCELLED' && (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2] text-xs font-medium">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancelled</span>
                          </span>
                          <button
                            type="button"
                            disabled={updatingId === order.id}
                            onClick={() => handleUpdateStatus(order.id, 'PENDING_VERIFICATION')}
                            className="text-[11px] text-[#6E5043] underline hover:text-[#1E1B18] cursor-pointer"
                          >
                            Re-open
                          </button>
                        </div>
                      )}

                      {/* Manual Status Selector Dropdown */}
                      <select
                        value={order.status}
                        disabled={updatingId === order.id}
                        onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                        className="bg-[#FAF8F5] border border-[#E0D8CE] px-2.5 py-1.5 text-xs text-[#1E1B18] font-medium cursor-pointer focus:outline-none"
                        title="Override status"
                      >
                        <option value="PENDING_VERIFICATION">Pending Verification</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="DISPATCHED">Dispatched</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>

                      {/* Print GST Invoice Button */}
                      <button
                        type="button"
                        onClick={() => setInvoiceOrder(order)}
                        className="px-3 py-1.5 bg-[#FAF8F5] border border-[#E0D8CE] hover:bg-[#EAE4DC] text-xs font-medium text-[#1E1B18] flex items-center gap-1.5 cursor-pointer"
                        title="View Official GST Invoice"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>GST Bill</span>
                      </button>

                      {/* Send Dispatch Notification Button */}
                      <button
                        type="button"
                        onClick={() => handleSendNotification(order)}
                        className="px-3 py-1.5 bg-[#231F1D] text-[#FAF8F5] hover:bg-[#14110E] text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                        title="Dispatch SMS & Email notification"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Notify Client</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                    {/* Delivery Address & Contact */}
                    <div className="space-y-2">
                      <span className="text-[#7C736A] uppercase tracking-wider block font-medium">
                        Customer & Destination
                      </span>
                      <p className="text-[#1E1B18] leading-relaxed">
                        {order.address}, {order.city}, {order.state} —{' '}
                        <strong className="font-mono">{order.pincode}</strong>
                      </p>
                      <p className="text-[#5C544D]">
                        Phone: <strong className="font-mono">{order.phone}</strong>
                      </p>
                      {order.email && <p className="text-[#5C544D]">Email: {order.email}</p>}

                      {/* Quick Communication Actions */}
                      <div className="flex items-center gap-2 pt-2">
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#25D366] text-white rounded-xs text-[11px] font-medium hover:opacity-90"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          WhatsApp
                        </a>
                        <a
                          href={`tel:+91${phone10}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#231F1D] text-[#FAF8F5] rounded-xs text-[11px] font-medium hover:bg-[#14110E]"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          Call
                        </a>
                      </div>

                      {/* 100% Free Doorstep GPS & Rider Navigation */}
                      <div className="pt-2 border-t border-[#ECE6DD]/80 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#7C736A] font-medium flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#6E5043]" />
                            {order.latitude && order.longitude ? 'Doorstep GPS Pinned' : 'Geocoded Address'}
                          </span>
                          {order.latitude && order.longitude && (
                            <span className="font-mono text-[10px] text-[#2E7D32] bg-[#E8F5E9] px-1.5 py-0.2 border border-[#C8E6C9]">
                              {order.latitude.toFixed(4)}, {order.longitude.toFixed(4)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => setLocationOrderModal(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FAF8F5] border border-[#E0D8CE] hover:bg-[#ECE6DD] text-[11px] font-medium text-[#1E1B18] transition-colors cursor-pointer"
                          >
                            <MapPin className="w-3 h-3 text-[#6E5043]" />
                            <span>View Map</span>
                          </button>

                          <a
                            href={
                              order.mapUrl ||
                              (order.latitude && order.longitude
                                ? `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`
                                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                    `${order.address}, ${order.city}, ${order.state} ${order.pincode}`
                                  )}`)
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#231F1D] text-[#FAF8F5] hover:bg-[#14110E] text-[11px] font-medium transition-colors"
                          >
                            <Navigation className="w-3 h-3" />
                            <span>Rider Nav</span>
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Reserved Items */}
                    <div className="md:col-span-2 space-y-2">
                      <span className="text-[#7C736A] uppercase tracking-wider block font-medium">
                        Ordered Garments ({order.items.length})
                      </span>
                      <div className="divide-y divide-[#E0D8CE] bg-[#FAF8F5] p-3 border border-[#E0D8CE]">
                        {order.items.map((item, idx) => {
                          const itemImg = getItemImage(item);
                          return (
                            <div key={idx} className="py-2 flex justify-between items-center gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                {itemImg ? (
                                  <img
                                    src={itemImg}
                                    alt={item.name}
                                    className="w-10 h-13 object-cover bg-[#ECE6DD] border border-[#E0D8CE] shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-13 bg-[#ECE6DD] border border-[#E0D8CE] shrink-0 flex items-center justify-center text-[9px] text-[#7C736A] uppercase font-mono text-center p-0.5">
                                    No Photo
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <a
                                    href={`/product/${item.productId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-xs text-[#1E1B18] hover:text-[#6E5043] transition-colors truncate block"
                                  >
                                    {item.name}
                                  </a>
                                  <p className="text-[11px] text-[#7C736A] mt-0.5">
                                    Size: <span className="font-mono font-medium text-[#1E1B18]">{item.size}</span> · Qty:{' '}
                                    <span className="font-mono font-medium text-[#1E1B18]">{item.quantity}</span>
                                    <span className="text-[#9E948A] ml-1.5">(@ {formatINR(item.price)})</span>
                                  </p>
                                </div>
                              </div>
                              <span className="font-mono tabular-nums text-xs font-semibold text-[#1E1B18] shrink-0">
                                {formatINR(item.price * item.quantity)}
                              </span>
                            </div>
                          );
                        })}
                        <div className="pt-2 mt-1 flex justify-between items-center text-sm font-medium text-[#1E1B18]">
                          <span>Doorstep COD Collect Amount:</span>
                          <span className="font-mono text-base">{formatINR(order.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#5C544D] border-t border-[#ECE6DD]">
                <p>
                  Showing <span className="font-mono font-medium text-[#1E1B18]">{(currentPage - 1) * ORDERS_PER_PAGE + 1}</span> to{' '}
                  <span className="font-mono font-medium text-[#1E1B18]">
                    {Math.min(currentPage * ORDERS_PER_PAGE, filteredOrders.length)}
                  </span>{' '}
                  of <span className="font-mono font-medium text-[#1E1B18]">{filteredOrders.length}</span> orders
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

      {/* Official GST Tax Invoice Modal */}
      {invoiceOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer print:hidden"
            onClick={() => setInvoiceOrder(null)}
            aria-hidden="true"
          />
          <div className="relative bg-white text-[#1E1B18] max-w-2xl w-full p-8 sm:p-10 border border-[#E0D8CE] shadow-2xl relative max-h-[92vh] overflow-y-auto font-sans z-10">
            <button
              onClick={() => setInvoiceOrder(null)}
              aria-label="Close invoice"
              className="absolute top-4 right-4 p-2 text-[#7C736A] hover:text-[#1E1B18] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Invoice Header */}
            <div className="border-b-2 border-[#1E1B18] pb-6 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-serif text-3xl font-normal tracking-wide text-[#1E1B18]">
                    AABHA CLOTHING
                  </h2>
                  <p className="text-xs text-[#7C736A] mt-1">Haute Couture & Heritage Silhouettes</p>
                  <p className="text-xs text-[#7C736A]">GSTIN: 07AAACA1234Q1Z5</p>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-[#1E1B18] text-white px-2.5 py-1 text-[11px] font-mono tracking-widest uppercase">
                    Tax Invoice
                  </span>
                  <p className="text-xs font-mono font-medium text-[#1E1B18] mt-2">
                    INV-{invoiceOrder.orderNumber}
                  </p>
                  <p className="text-[11px] text-[#7C736A]">
                    Date: {new Date(invoiceOrder.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
            </div>

            {/* Bill To & Dispatch Details */}
            <div className="grid grid-cols-2 gap-6 text-xs mb-6 pb-6 border-b border-[#ECE6DD]">
              <div>
                <span className="text-[#7C736A] uppercase tracking-wider block font-medium mb-1">
                  Billed To (Patron):
                </span>
                <p className="font-semibold text-sm text-[#1E1B18]">{invoiceOrder.customerName}</p>
                <p className="text-[#5C544D] leading-relaxed mt-1">
                  {invoiceOrder.address}, {invoiceOrder.city}, {invoiceOrder.state} -{' '}
                  {invoiceOrder.pincode}
                </p>
                <p className="text-[#5C544D] mt-1">Phone: {invoiceOrder.phone}</p>
                {invoiceOrder.email && <p className="text-[#5C544D]">Email: {invoiceOrder.email}</p>}
                {invoiceOrder.latitude && invoiceOrder.longitude && (
                  <p className="text-[11px] font-mono text-[#2E7D32] mt-1.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#2E7D32] shrink-0" />
                    <span>GPS: {invoiceOrder.latitude.toFixed(4)}° N, {invoiceOrder.longitude.toFixed(4)}° E</span>
                  </p>
                )}
              </div>

              <div>
                <span className="text-[#7C736A] uppercase tracking-wider block font-medium mb-1">
                  Payment & Delivery:
                </span>
                <p className="font-medium text-[#1E1B18]">Payment Mode: Cash on Delivery (COD)</p>
                <p className="text-[#5C544D] mt-1">Status: {invoiceOrder.status}</p>
                <p className="text-[#5C544D] mt-1">Courier: Bluedart Express / Delhivery Surface</p>
                <p className="text-[#5C544D] mt-1">Place of Supply: {invoiceOrder.state}</p>
                {invoiceOrder.mapUrl && (
                  <p className="text-[11px] text-[#6E5043] mt-1.5 truncate">
                    GPS Nav:{' '}
                    <a
                      href={invoiceOrder.mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-mono"
                    >
                      Open Navigation Map
                    </a>
                  </p>
                )}
              </div>
            </div>

            {/* Itemized Table */}
            <div className="mb-6">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1E1B18] text-[#7C736A] uppercase font-semibold">
                    <th className="py-2">Item Description</th>
                    <th className="py-2 text-center">HSN</th>
                    <th className="py-2 text-center">Size</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECE6DD]">
                  {invoiceOrder.items.map((it, idx) => (
                    <tr key={idx} className="py-2">
                      <td className="py-2.5 font-medium text-[#1E1B18]">{it.name}</td>
                      <td className="py-2.5 text-center font-mono text-[#7C736A]">6204</td>
                      <td className="py-2.5 text-center font-mono font-medium">{it.size}</td>
                      <td className="py-2.5 text-center font-mono">{it.quantity}</td>
                      <td className="py-2.5 text-right font-mono tabular-nums">
                        {formatINR(it.price * it.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Breakdown */}
            <div className="border-t-2 border-[#1E1B18] pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-[#5C544D]">
                <span>Taxable Value</span>
                <span className="font-mono">{formatINR(Math.round(invoiceOrder.total / 1.05))}</span>
              </div>
              <div className="flex justify-between text-[#5C544D]">
                <span>Integrated GST (5%)</span>
                <span className="font-mono">
                  {formatINR(invoiceOrder.total - Math.round(invoiceOrder.total / 1.05))}
                </span>
              </div>
              <div className="flex justify-between text-[#5C544D]">
                <span>Shipping & Muslin Packaging</span>
                <span className="text-[#2E7D32]">Complimentary</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-[#1E1B18] pt-2 border-t border-[#ECE6DD]">
                <span>Total Amount Due:</span>
                <span className="font-mono">{formatINR(invoiceOrder.total)}</span>
              </div>
            </div>

            {/* Print Button */}
            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-[#ECE6DD]">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-[#1E1B18] text-white text-xs font-medium uppercase tracking-wider flex items-center gap-2 cursor-pointer hover:bg-black"
              >
                <Printer className="w-4 h-4" />
                <span>Print Invoice Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 100% Free Interactive Delivery Map & Courier Navigation Modal */}
      <LocationViewModal
        isOpen={!!locationOrderModal}
        onClose={() => setLocationOrderModal(null)}
        order={locationOrderModal}
      />
    </AdminLayout>
  );
}
