'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Navigation,
  Search,
  Filter,
  Phone,
  MessageCircle,
  ExternalLink,
  RefreshCw,
  Package,
  CheckCircle,
  Truck,
  Clock,
  ChevronRight,
  Layers,
  ArrowLeft,
  Building2,
  Copy,
  Check,
} from 'lucide-react';
import { AdminLayout } from '@/src/components/AdminLayout';
import { useAuth } from '@/src/context/AuthContext';
import type { CODOrder } from '../../api/orders/route';

// Flagship Atelier origin coordinates
const STORE_ORIGIN = {
  lat: 19.076,
  lng: 72.8777,
  name: 'AABHA Flagship Atelier, Bandra West, Mumbai',
};

export default function AdminDispatchMapPage() {
  const { adminToken } = useAuth();
  const [orders, setOrders] = useState<CODOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<CODOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // Map DOM refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Fetch orders from API
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        headers: {
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
        if (data.orders.length > 0 && !selectedOrder) {
          setSelectedOrder(data.orders[0]);
        }
      }
    } catch (err) {
      console.warn('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as any } : o))
        );
        if (selectedOrder?.id === orderId) {
          setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus as any } : null));
        }
      }
    } catch (err) {
      console.warn('Status update error:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [adminToken]);

  // Load Leaflet
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.id = 'leaflet-js';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => setLeafletLoaded(true);
    document.body.appendChild(script);
  }, []);

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchesSearch =
      searchQuery === '' ||
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.phone.includes(searchQuery) ||
      o.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [STORE_ORIGIN.lat, STORE_ORIGIN.lng],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // Group for markers
      markersGroupRef.current = L.featureGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const group = markersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // 1. Add Store Flagship Atelier Marker
    const atelierIcon = L.divIcon({
      className: 'store-origin-marker',
      html: `
        <div style="width: 32px; height: 32px; background: #231F1D; border: 2.5px solid #E0A96D; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.4); color: #FAF8F5; font-size: 14px; font-weight: bold;">
          🏛️
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    L.marker([STORE_ORIGIN.lat, STORE_ORIGIN.lng], { icon: atelierIcon })
      .bindPopup(
        `<div style="font-family: sans-serif; font-size: 12px; padding: 4px;">
          <strong>AABHA CLOTHING Atelier</strong><br/>
          Central Dispatch Hub & Steam Finishing Workshop
        </div>`
      )
      .addTo(group);

    // 2. Add Customer Order Markers
    filteredOrders.forEach((order) => {
      // Use exact coordinates if present, or fallback near Mumbai center with slight jitter
      const lat = order.latitude || STORE_ORIGIN.lat + (Math.random() - 0.5) * 0.08;
      const lng = order.longitude || STORE_ORIGIN.lng + (Math.random() - 0.5) * 0.08;

      let color = '#D97706'; // Pending
      if (order.status === 'CONFIRMED') color = '#2563EB';
      if (order.status === 'DISPATCHED') color = '#7C3AED';
      if (order.status === 'DELIVERED') color = '#16A34A';
      if (order.status === 'CANCELLED') color = '#DC2626';

      const pinHtml = `
        <div style="position: relative; width: 32px; height: 40px; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div style="width: 28px; height: 28px; background: ${color}; border: 2px solid #FAF8F5; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,0.35);">
            <div style="width: 8px; height: 8px; background: #FAF8F5; border-radius: 50%; transform: rotate(45deg);"></div>
          </div>
          <div style="width: 6px; height: 3px; background: rgba(0,0,0,0.3); border-radius: 50%; margin-top: 1px;"></div>
        </div>
      `;

      const orderIcon = L.divIcon({
        className: `order-pin-${order.id}`,
        html: pinHtml,
        iconSize: [32, 40],
        iconAnchor: [16, 38],
        popupAnchor: [0, -36],
      });

      const navUrl = order.mapUrl || `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      const marker = L.marker([lat, lng], { icon: orderIcon }).addTo(group);

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; min-width: 200px; padding: 2px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="color: #6E5043;">#${order.orderNumber}</strong>
            <span style="font-size: 10px; background: #FAF8F5; border: 1px solid #ECE6DD; padding: 2px 4px; font-weight: bold; color: ${color};">${order.status}</span>
          </div>
          <p style="margin: 2px 0; font-weight: 600;">${order.customerName}</p>
          <p style="margin: 2px 0; color: #5C544D; font-size: 11px;">${order.address}, ${order.city}</p>
          <p style="margin: 4px 0; font-weight: 600; color: #1E1B18;">Doorstep COD: ₹${order.total}</p>
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #ECE6DD;">
            <a href="${navUrl}" target="_blank" rel="noreferrer" style="display: inline-block; padding: 4px 8px; background: #231F1D; color: #FAF8F5; text-decoration: none; font-size: 11px; font-weight: 500;">
              🧭 Launch Rider Navigation
            </a>
          </div>
        </div>
      `);

      marker.on('click', () => {
        setSelectedOrder(order);
      });
    });

    if (filteredOrders.length > 0) {
      try {
        map.fitBounds(group.getBounds().pad(0.15));
      } catch (e) {}
    }
  }, [leafletLoaded, filteredOrders.length, statusFilter]);

  // Center on selected order
  const handleSelectOrder = (order: CODOrder) => {
    setSelectedOrder(order);
    if (!mapInstanceRef.current) return;
    const lat = order.latitude || STORE_ORIGIN.lat;
    const lng = order.longitude || STORE_ORIGIN.lng;
    mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.2 });
  };

  const handleCopyCoords = () => {
    if (!selectedOrder) return;
    const text = selectedOrder.latitude && selectedOrder.longitude
      ? `${selectedOrder.latitude}, ${selectedOrder.longitude}`
      : `${selectedOrder.address}, ${selectedOrder.city} - ${selectedOrder.pincode}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cleanPhone = selectedOrder?.phone.replace(/[^0-9]/g, '').slice(-10) || '';
  const riderNavUrl = selectedOrder?.mapUrl || (
    selectedOrder?.latitude && selectedOrder?.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${selectedOrder.latitude},${selectedOrder.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${selectedOrder?.address}, ${selectedOrder?.city} ${selectedOrder?.pincode}`
        )}`
  );

  return (
    <AdminLayout title="Live Dispatch & Courier GPS Tracing" noPadding>
      <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-[#FAF8F5]">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-[#F3EFEA] border-b border-[#ECE6DD] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#231F1D] text-[#FAF8F5] flex items-center justify-center shrink-0">
              <Navigation className="w-4.5 h-4.5 stroke-[1.4]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-xl sm:text-2xl text-[#1E1B18] font-normal">
                  Live Dispatch & Courier GPS Tracing
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#FAF8F5] border border-[#ECE6DD] text-[#2E7D32] font-semibold">
                  100% FREE MAP
                </span>
              </div>
              <p className="text-xs text-[#7C736A] font-light">
                Monitor live customer doorstep delivery locations and launch courier turn-by-turn navigation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchOrders}
              className="px-3 py-1.5 bg-[#FAF8F5] border border-[#D5CCC0] text-xs font-medium text-[#1E1B18] hover:bg-[#EAE4DC] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Pins</span>
            </button>
            <Link
              href="/admin/orders"
              className="px-3.5 py-1.5 bg-[#231F1D] text-[#FAF8F5] text-xs uppercase tracking-wider font-medium hover:bg-[#14110E] transition-colors"
            >
              Back to Orders Table
            </Link>
          </div>
        </div>

        {/* Workspace: Split Map (Center/Right) + Dispatch Queue (Left) */}
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 overflow-hidden min-h-0">
          {/* Left Column: Order Dispatch Queue (4 Cols on desktop) */}
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#ECE6DD] bg-[#FAF8F5] flex flex-col overflow-hidden h-[40vh] lg:h-auto">
            {/* Search & Filters */}
            <div className="p-3 bg-[#F3EFEA] border-b border-[#ECE6DD] space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#7C736A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search order #, customer, phone, city..."
                  className="w-full bg-[#FAF8F5] border border-[#D5CCC0] pl-8.5 pr-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px] uppercase font-mono scrollbar-none">
                {['ALL', 'PENDING_VERIFICATION', 'CONFIRMED', 'DISPATCHED', 'DELIVERED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2 py-1 whitespace-nowrap cursor-pointer transition-colors ${
                      statusFilter === st
                        ? 'bg-[#231F1D] text-[#FAF8F5] font-semibold'
                        : 'bg-[#FAF8F5] text-[#7C736A] border border-[#ECE6DD] hover:text-[#1E1B18]'
                    }`}
                  >
                    {st === 'PENDING_VERIFICATION' ? 'PENDING' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Order Cards List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#ECE6DD]">
              {filteredOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#7C736A]">
                  No orders match the current filter.
                </div>
              ) : (
                filteredOrders.map((o) => {
                  const isSelected = selectedOrder?.id === o.id;
                  const hasGps = Boolean(o.latitude && o.longitude);
                  return (
                    <div
                      key={o.id}
                      onClick={() => handleSelectOrder(o)}
                      className={`p-3.5 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#EAE4DC] border-l-4 border-l-[#231F1D]'
                          : 'hover:bg-[#F3EFEA]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-semibold text-[#6E5043]">
                          #{o.orderNumber}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {hasGps && (
                            <span className="text-[10px] font-mono text-[#2E7D32] bg-[#E8F5E9] px-1.5 py-0.2 border border-[#C8E6C9]">
                              GPS
                            </span>
                          )}
                          <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 bg-[#FAF8F5] border border-[#ECE6DD] text-[#1E1B18]">
                            {o.status}
                          </span>
                        </div>
                      </div>

                      <p className="font-medium text-xs text-[#1E1B18] mt-1">{o.customerName}</p>
                      <p className="text-[11px] text-[#5C544D] truncate mt-0.5">
                        {o.address}, {o.city} — {o.pincode}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#ECE6DD]/60 text-[11px]">
                        <span className="font-mono text-[#7C736A]">Doorstep COD</span>
                        <span className="font-mono font-medium text-[#1E1B18]">₹{o.total}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Live Map (8 Cols on desktop) */}
          <div className="lg:col-span-8 relative flex flex-col bg-[#EAE4DC] overflow-hidden flex-1">
            {/* Leaflet Map Container */}
            <div ref={mapContainerRef} className="w-full h-full z-0 cursor-grab" />

            {!leafletLoaded && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#FAF8F5]/90 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#6E5043]" />
                <p className="text-xs font-serif">Rendering Courier Dispatch Map Layer...</p>
              </div>
            )}

            {/* Selected Order Floating Card on Map (Bottom-Left) */}
            {selectedOrder && (
              <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-20 bg-[#FAF8F5]/95 backdrop-blur-sm border border-[#D5CCC0] p-4 shadow-xl text-xs space-y-3 font-sans">
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#ECE6DD]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#6E5043]">
                        #{selectedOrder.orderNumber}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#F3EFEA] border border-[#ECE6DD]">
                        {selectedOrder.status}
                      </span>
                    </div>
                    <p className="font-semibold text-sm text-[#1E1B18] mt-0.5">
                      {selectedOrder.customerName}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyCoords}
                    className="p-1 text-[#7C736A] hover:text-[#1E1B18] cursor-pointer flex items-center gap-1 text-[11px]"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#2E7D32]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-[#1E1B18] leading-relaxed">
                    {selectedOrder.address}, {selectedOrder.city}, {selectedOrder.state} —{' '}
                    <strong className="font-mono">{selectedOrder.pincode}</strong>
                  </p>
                  <p className="text-[11px] font-mono text-[#2E7D32]">
                    {selectedOrder.latitude && selectedOrder.longitude
                      ? `📍 GPS: ${selectedOrder.latitude.toFixed(4)}° N, ${selectedOrder.longitude.toFixed(4)}° E`
                      : '📍 Postal geocoded destination'}
                  </p>
                </div>

                {/* 1-Click Status Lifecycle Pipeline right on map */}
                <div className="pt-2 border-t border-[#ECE6DD] space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#7C736A] font-medium uppercase tracking-wider">
                      Update Order Status:
                    </span>
                    <select
                      value={selectedOrder.status}
                      disabled={updatingStatus}
                      onChange={(e) => handleUpdateOrderStatus(selectedOrder.id, e.target.value)}
                      className="bg-[#FAF8F5] border border-[#E0D8CE] px-2 py-0.5 text-[11px] font-mono cursor-pointer"
                    >
                      <option value="PENDING_VERIFICATION">Pending</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="DISPATCHED">Dispatched</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {selectedOrder.status === 'PENDING_VERIFICATION' && (
                      <button
                        type="button"
                        disabled={updatingStatus}
                        onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'CONFIRMED')}
                        className="flex-1 py-1.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Confirm Order</span>
                      </button>
                    )}
                    {selectedOrder.status === 'CONFIRMED' && (
                      <button
                        type="button"
                        disabled={updatingStatus}
                        onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'DISPATCHED')}
                        className="flex-1 py-1.5 bg-[#1565C0] hover:bg-[#0D47A1] text-white text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Mark Dispatched</span>
                      </button>
                    )}
                    {selectedOrder.status === 'DISPATCHED' && (
                      <button
                        type="button"
                        disabled={updatingStatus}
                        onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'DELIVERED')}
                        className="flex-1 py-1.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Mark Delivered</span>
                      </button>
                    )}
                    {selectedOrder.status === 'DELIVERED' && (
                      <span className="w-full py-1 bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] text-xs font-medium flex items-center justify-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Fulfilled & Delivered</span>
                      </span>
                    )}
                    {selectedOrder.status === 'CANCELLED' && (
                      <button
                        type="button"
                        disabled={updatingStatus}
                        onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'PENDING_VERIFICATION')}
                        className="w-full py-1 text-xs text-[#6E5043] underline hover:text-[#1E1B18]"
                      >
                        Re-open Cancelled Order
                      </button>
                    )}
                  </div>
                </div>

                {/* Communication and Navigation Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#ECE6DD]">
                  <a
                    href={riderNavUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 px-3 py-2 bg-[#231F1D] text-[#FAF8F5] text-xs uppercase tracking-wider font-medium hover:bg-[#14110E] transition-colors flex items-center justify-center gap-1.5 text-center"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Rider Nav</span>
                  </a>

                  <a
                    href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
                      `Namaste ${selectedOrder.customerName}, your AABHA CLOTHING order #${selectedOrder.orderNumber} is dispatched to your doorstep. Live Map: ${selectedOrder.mapUrl || riderNavUrl}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-[#25D366] text-white text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  <a
                    href={`tel:+91${cleanPhone}`}
                    className="px-3 py-2 bg-[#FAF8F5] border border-[#D5CCC0] text-xs font-medium hover:bg-[#EAE4DC] transition-colors flex items-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
