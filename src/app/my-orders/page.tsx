'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Package,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  Printer,
  X,
  MessageCircle,
  User,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';

interface OrderItem {
  productId?: string;
  name: string;
  size: string;
  quantity: number;
  price: number;
}

interface OrderData {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  total: number;
  status: string;
  paymentMethod: string;
  items: OrderItem[];
  createdAt: string;
  latitude?: number;
  longitude?: number;
  mapUrl?: string;
}

export default function MyOrdersPage() {
  const { user, setAuthModalOpen } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<OrderData | null>(null);

  useEffect(() => {
    if (!invoiceOrder) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInvoiceOrder(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [invoiceOrder]);

  const formatINR = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  const performSearch = async (term: string, autoOpenOrderId?: string | null, shouldOpenInvoice?: boolean) => {
    const raw = term.trim();
    if (!raw) return;

    setLoading(true);
    setSearched(true);
    try {
      const isPhone = /^[0-9+ -]{7,15}$/.test(raw);
      const cleanPhone = isPhone ? raw.replace(/[^0-9]/g, '') : '';
      const orderParam = isPhone ? '' : raw;

      const url = cleanPhone
        ? `/api/my-orders?phone=${encodeURIComponent(cleanPhone)}${
            autoOpenOrderId ? `&orderNumber=${encodeURIComponent(autoOpenOrderId)}` : ''
          }`
        : `/api/my-orders?orderNumber=${encodeURIComponent(orderParam)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.orders) {
        setOrders(data.orders);
        if (shouldOpenInvoice && data.orders.length > 0) {
          const matched = autoOpenOrderId
            ? data.orders.find((o: OrderData) => o.orderNumber === autoOpenOrderId || o.id === autoOpenOrderId) || data.orders[0]
            : data.orders[0];
          setInvoiceOrder(matched);
        }
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Failed to search orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const queryPhone = params.get('phone');
    const queryOrder = params.get('order') || params.get('orderNumber');
    const autoInvoice = params.get('invoice') === '1';

    if (queryPhone) {
      setPhoneNumber(queryPhone);
      performSearch(queryPhone, queryOrder, autoInvoice);
    } else if (queryOrder) {
      setPhoneNumber(queryOrder);
      performSearch(queryOrder, queryOrder, autoInvoice);
    } else if (user?.phone) {
      setPhoneNumber(user.phone);
      performSearch(user.phone, null, false);
    }
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(phoneNumber);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="px-2.5 py-1 text-xs font-medium bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="px-2.5 py-1 text-xs font-medium bg-[#E3F2FD] text-[#1565C0] border border-[#BBDEFB] flex items-center gap-1">
            <Package className="w-3.5 h-3.5" /> Out for Delivery / Dispatched
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="px-2.5 py-1 text-xs font-medium bg-[#FFF8E1] text-[#F57F17] border border-[#FFECB3] flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Confirmed — Tailoring & Packing
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-medium bg-[#F3EFEA] text-[#6E5043] border border-[#E0D8CE] flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Order Received · Pending Verification
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1E1B18] font-sans antialiased">
      {/* Header */}
      <header className="border-b border-[#ECE6DD] bg-[#FAF8F5] sticky top-0 z-30">
        <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-5 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#7C736A] hover:text-[#1E1B18] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Boutique
          </Link>

          <Link href="/" className="font-serif text-2xl tracking-[0.14em] text-[#1E1B18] font-normal">
            AABHA
          </Link>

          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[#1E1B18] hover:text-[#6E5043] transition-colors cursor-pointer"
          >
            <User className="w-4 h-4 text-[#6E5043]" />
            <span className="hidden sm:inline">
              {user ? (user.name || 'Account').split(' ')[0] : 'Sign In'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-8 sm:py-12 lg:py-16 space-y-10">
        <div className="max-w-4xl mx-auto space-y-10">
        {/* Title & Search Box */}
        <div className="max-w-xl mx-auto text-center space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[#7C736A]">
            Customer Purchase History & Invoices
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1E1B18] font-normal">
            Track Your Orders & Bills
          </h1>
          <p className="text-sm text-[#5C544D] font-light">
            Enter the 10-digit mobile number or Order ID (e.g. AB-24810) used during checkout to view your garments status, delivery timeline, and download your billing receipt.
          </p>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5 pt-4">
            <div className="relative flex-1">
              <input
                type="text"
                required
                maxLength={24}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter 10-digit mobile number or Order ID (e.g. AB-24810)"
                className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-4 py-2.5 text-sm font-mono text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-[0.18em] hover:bg-[#14110E] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Search className="w-3.5 h-3.5" />
              {loading ? 'Finding...' : 'Find Orders'}
            </button>
          </form>
        </div>

        {/* Results Area */}
        {searched && (
          <div className="space-y-6 pt-4 border-t border-[#ECE6DD]">
            <div className="flex items-center justify-between text-xs text-[#7C736A]">
              <span>
                Search results for:{' '}
                <strong className="font-mono text-[#1E1B18]">
                  {/^[0-9+ -]{7,15}$/.test(phoneNumber.trim())
                    ? `+91 ${phoneNumber.replace(/[^0-9]/g, '').slice(-10)}`
                    : `Order #${phoneNumber.trim()}`}
                </strong>
              </span>
              <span>{orders.length} Order(s) Found</span>
            </div>

            {orders.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-[#ECE6DD] bg-[#F3EFEA] space-y-3">
                <Package className="w-10 h-10 text-[#A69C91] mx-auto stroke-[1.2]" />
                <h3 className="font-serif text-xl text-[#1E1B18]">No Orders Found</h3>
                <p className="text-xs text-[#7C736A] max-w-sm mx-auto">
                  We could not find any orders matching "{phoneNumber}". Please verify the Order ID (e.g. AB-25356) or 10-digit mobile number.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 sm:p-8 space-y-6"
                  >
                    {/* Order Top Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E0D8CE]">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-base font-semibold text-[#1E1B18]">
                            #{order.orderNumber}
                          </span>
                          <span className="text-xs text-[#7C736A] flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(order.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-[#5C544D] mt-1">
                          Reserved for: <strong className="text-[#1E1B18]">{order.customerName}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {getStatusBadge(order.status)}
                        <button
                          type="button"
                          onClick={() => setInvoiceOrder(order)}
                          className="px-3 py-1 bg-[#FAF8F5] border border-[#E0D8CE] text-xs text-[#1E1B18] hover:bg-[#ECE6DD] transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Invoice Bill
                        </button>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-3">
                      <span className="text-xs uppercase tracking-wider text-[#7C736A] block font-medium">
                        Garments Ordered ({order.items?.length || 0})
                      </span>
                      <div className="divide-y divide-[#E0D8CE] bg-[#FAF8F5] p-4 border border-[#E0D8CE]">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                            <div>
                              <p className="font-medium text-[#1E1B18]">{item.name}</p>
                              <p className="text-xs text-[#7C736A] mt-0.5">
                                Size: <span className="font-mono">{item.size}</span> · Quantity: <span className="font-mono">{item.quantity}</span>
                              </p>
                            </div>
                            <span className="font-mono tabular-nums text-[#1E1B18]">
                              {formatINR(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delivery & Payment Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#E0D8CE] text-xs">
                      <div>
                        <span className="text-[#7C736A] block mb-1">Delivery Destination</span>
                        <p className="text-[#1E1B18] leading-relaxed flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#6E5043]" />
                          <span>{order.address}, {order.city}, {order.state} — {order.pincode}</span>
                        </p>
                        {order.latitude && order.longitude && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FAF8F5] border border-[#E0D8CE] text-[10px] font-mono text-[#2E7D32]">
                              📍 {order.latitude.toFixed(4)}° N, {order.longitude.toFixed(4)}° E
                            </span>
                            <a
                              href={order.mapUrl || `https://www.google.com/maps?q=${order.latitude},${order.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-[#6E5043] underline inline-flex items-center gap-0.5"
                            >
                              <span>Track on Google Maps</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="sm:text-right">
                        <span className="text-[#7C736A] block mb-1">
                          Payment Method: <strong>Cash on Delivery (Doorstep Cash/UPI)</strong>
                        </span>
                        <div className="text-base font-medium text-[#1E1B18]">
                          Total Payable at Doorstep:{' '}
                          <span className="font-mono text-lg text-[#6E5043]">
                            {formatINR(order.total)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Help Action */}
                    <div className="pt-2 flex justify-end">
                      <a
                        href={`https://wa.me/919876543210?text=Namaste%20AABHA,%20I%20have%20an%20inquiry%20regarding%20my%20Order%20${order.orderNumber}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[#2E7D32] hover:underline"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Need Help With This Order? Chat on WhatsApp
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </main>

      {/* Printable Invoice Modal */}
      {invoiceOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer print:hidden"
            onClick={() => setInvoiceOrder(null)}
            aria-hidden="true"
          />
          <div className="relative bg-[#FAF8F5] border border-[#ECE6DD] max-w-2xl w-full p-8 sm:p-10 space-y-6 print:border-none print:p-0 z-10 shadow-2xl">
            {/* Close Button */}
            <button
              onClick={() => setInvoiceOrder(null)}
              className="absolute top-4 right-4 p-1.5 text-[#7C736A] hover:text-[#1E1B18] cursor-pointer print:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Invoice Header */}
            <div className="flex justify-between items-start pb-6 border-b border-[#ECE6DD]">
              <div>
                <h2 className="font-serif text-3xl text-[#1E1B18]">AABHA CLOTHING</h2>
                <p className="text-xs text-[#7C736A] mt-1 font-medium">
                  Handcrafted Indian Women's Ethnic Wear · GST Tax Invoice
                </p>
                <p className="text-[11px] text-[#7C736A] font-mono mt-0.5">
                  GSTIN: 27AABCA1234F1Z5 · State: Maharashtra (27)
                </p>
                <p className="text-[11px] text-[#7C736A]">
                  Bandra West, Mumbai 400050 · care@aabhaclothing.com
                </p>
              </div>

              <div className="text-right">
                <span className="font-mono text-base font-bold text-[#1E1B18]">
                  INVOICE #{invoiceOrder.orderNumber}
                </span>
                <p className="text-xs text-[#7C736A] mt-1">
                  Invoice Date: {new Date(invoiceOrder.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-mono uppercase bg-[#F3EFEA] text-[#6E5043] border border-[#E0D8CE]">
                  Cash on Delivery (Doorstep Cash/UPI)
                </span>
              </div>
            </div>

            {/* Billed To */}
            <div className="grid grid-cols-2 gap-6 text-xs pb-6 border-b border-[#ECE6DD]">
              <div>
                <span className="text-[#7C736A] uppercase tracking-wider block font-medium">Billed To (Client)</span>
                <p className="font-medium text-[#1E1B18] mt-1">{invoiceOrder.customerName}</p>
                <p className="text-[#5C544D] font-mono">+91 {invoiceOrder.phone}</p>
                {invoiceOrder.email && <p className="text-[#5C544D]">{invoiceOrder.email}</p>}
              </div>

              <div>
                <span className="text-[#7C736A] uppercase tracking-wider block font-medium">Delivery Destination</span>
                <p className="text-[#1E1B18] mt-1 leading-relaxed">
                  {invoiceOrder.address}, {invoiceOrder.city}, {invoiceOrder.state} —{' '}
                  <strong className="font-mono">{invoiceOrder.pincode}</strong>
                </p>
                <p className="text-[11px] text-[#7C736A] mt-0.5">Place of Supply: {invoiceOrder.state || 'Maharashtra'}</p>
                {invoiceOrder.latitude && invoiceOrder.longitude && (
                  <p className="text-[11px] font-mono text-[#2E7D32] mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#2E7D32] shrink-0" />
                    <span>GPS: {invoiceOrder.latitude.toFixed(4)}° N, {invoiceOrder.longitude.toFixed(4)}° E</span>
                  </p>
                )}
              </div>
            </div>

            {/* Line Items */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[420px]">
                <thead>
                  <tr className="border-b border-[#ECE6DD] text-[#7C736A] uppercase">
                    <th className="py-2.5 font-medium">Garment Description</th>
                    <th className="py-2.5 text-center font-medium">HSN</th>
                    <th className="py-2.5 text-center font-medium">Size</th>
                    <th className="py-2.5 text-center font-medium">Qty</th>
                    <th className="py-2.5 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECE6DD]">
                  {invoiceOrder.items?.map((item, i) => (
                    <tr key={i} className="text-[#1E1B18]">
                      <td className="py-3 font-medium">{item.name}</td>
                      <td className="py-3 text-center font-mono text-[#7C736A]">6204</td>
                      <td className="py-3 text-center font-mono">{item.size}</td>
                      <td className="py-3 text-center font-mono">{item.quantity}</td>
                      <td className="py-3 text-right font-mono">{formatINR(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Detailed GST Tax Calculation Breakdown */}
            <div className="pt-4 border-t border-[#ECE6DD] space-y-2 text-xs">
              <div className="flex justify-between text-[#7C736A]">
                <span>Taxable Value (Apparel):</span>
                <span className="font-mono tabular-nums">{formatINR(Math.round(invoiceOrder.total / 1.12))}</span>
              </div>
              <div className="flex justify-between text-[#7C736A]">
                <span>CGST @ 6%:</span>
                <span className="font-mono tabular-nums">{formatINR(Math.round((invoiceOrder.total - Math.round(invoiceOrder.total / 1.12)) / 2))}</span>
              </div>
              <div className="flex justify-between text-[#7C736A]">
                <span>SGST @ 6%:</span>
                <span className="font-mono tabular-nums">{formatINR(Math.round((invoiceOrder.total - Math.round(invoiceOrder.total / 1.12)) / 2))}</span>
              </div>
              <div className="flex justify-between text-[#7C736A]">
                <span>Insured Express Shipping:</span>
                <span className="font-medium text-[#2E7D32]">Complimentary</span>
              </div>
              <div className="pt-3 border-t border-[#ECE6DD] flex justify-between items-center text-sm font-medium">
                <span className="text-[#1E1B18]">Total Payable Upon Delivery (COD):</span>
                <span className="font-mono text-xl font-bold text-[#1E1B18]">
                  {formatINR(invoiceOrder.total)}
                </span>
              </div>
              <p className="text-[11px] text-[#7C736A] font-light italic pt-1">
                * Payment to be collected by delivery agent via cash or instant doorstep UPI. 14-day doorstep size exchange available.
              </p>
            </div>

            {/* Print Buttons */}
            <div className="pt-6 border-t border-[#ECE6DD] flex justify-end gap-3 print:hidden">
              <button
                type="button"
                onClick={() => setInvoiceOrder(null)}
                className="px-4 py-2 border border-[#E0D8CE] text-xs text-[#5C544D] hover:bg-[#F3EFEA] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-6 py-2 bg-[#231F1D] text-[#FAF8F5] text-xs uppercase tracking-wider font-medium flex items-center gap-2 hover:bg-[#14110E] cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
