'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Navigation,
  ExternalLink,
  Copy,
  Check,
  X,
  Phone,
  MessageCircle,
  Building2,
  Maximize2,
} from 'lucide-react';
import { InteractiveMap } from './InteractiveMap';

interface LocationViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    orderNumber: string;
    customerName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
    mapUrl?: string;
  } | null;
}

export const LocationViewModal: React.FC<LocationViewModalProps> = ({
  isOpen,
  onClose,
  order,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const lat = order.latitude !== undefined ? order.latitude : 19.076;
  const lng = order.longitude !== undefined ? order.longitude : 72.8777;
  const hasExactGps = order.latitude !== undefined && order.longitude !== undefined;

  const navUrl = hasExactGps
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${order.address}, ${order.city}, ${order.state} ${order.pincode}`
      )}`;

  const cleanPhone = order.phone.replace(/[^0-9]/g, '').slice(-10);
  const waLocationMsg = encodeURIComponent(
    `Namaste ${order.customerName},\nAABHA CLOTHING delivery dispatch is en route to your location for Order #${order.orderNumber}. Location: ${order.mapUrl || navUrl}`
  );

  const handleCopyCoordinates = () => {
    const text = hasExactGps
      ? `${lat}, ${lng}`
      : `${order.address}, ${order.city}, ${order.state} - ${order.pincode}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1E1B18]/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Responsive Modal Card */}
      <div className="relative bg-[#FAF8F5] border border-[#ECE6DD] w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl z-10 font-sans text-[#1E1B18]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#F3EFEA] border-b border-[#ECE6DD] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#231F1D] text-[#FAF8F5] flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 stroke-[1.4]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-[#6E5043]">
                  #{order.orderNumber}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-[#FAF8F5] border border-[#ECE6DD] text-[#2E7D32] font-semibold">
                  {hasExactGps ? 'GPS Pinpoint Verified' : 'Postal Area'}
                </span>
              </div>
              <h3 className="font-serif text-lg sm:text-2xl text-[#1E1B18] font-normal leading-tight mt-0.5 truncate">
                {order.customerName}’s Delivery Destination
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/admin/dispatch"
              onClick={onClose}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF8F5] border border-[#D5CCC0] text-xs text-[#1E1B18] hover:bg-[#EAE4DC] transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full Dispatch Center</span>
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#7C736A] hover:text-[#1E1B18] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0">
          {/* Interactive Leaflet Map Viewer */}
          <div className="relative w-full h-64 sm:h-80 border border-[#ECE6DD] bg-[#EAE4DC] overflow-hidden rounded-xs shadow-xs">
            <InteractiveMap
              latitude={lat}
              longitude={lng}
              zoom={16}
              onLocationChange={() => {}}
              height="100%"
              className="w-full h-full"
              interactive={false}
            />

            <div className="absolute top-3 left-3 z-20 bg-[#FAF8F5]/90 backdrop-blur-xs border border-[#ECE6DD] px-2.5 py-1 text-[10px] font-mono text-[#1E1B18] flex items-center gap-2 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse"></span>
              <span>
                {hasExactGps
                  ? `${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`
                  : 'Area Center (Estimated)'}
              </span>
            </div>
          </div>

          {/* Destination Address Card */}
          <div className="bg-[#F3EFEA] border border-[#ECE6DD] p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E0D8CE]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6E5043] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>Doorstep Delivery Address</span>
              </span>
              <button
                type="button"
                onClick={handleCopyCoordinates}
                className="text-[11px] font-medium text-[#7C736A] hover:text-[#1E1B18] flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#2E7D32]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Coordinates' : 'Copy Coordinates'}</span>
              </button>
            </div>

            <p className="text-sm text-[#1E1B18] font-normal leading-relaxed">
              {order.address}
            </p>
            <p className="text-xs text-[#5C544D]">
              {order.city}, {order.state} — <strong className="font-mono text-[#1E1B18]">{order.pincode}</strong>
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-[#5C544D]">
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-[#7C736A]" />
                <a href={`tel:+91${cleanPhone}`} className="font-mono font-medium hover:underline text-[#1E1B18]">
                  +91 {order.phone}
                </a>
              </span>

              <a
                href={`https://wa.me/91${cleanPhone}?text=${waLocationMsg}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#25D366] text-white text-[11px] font-medium hover:opacity-90 rounded-xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp Location</span>
              </a>

              <a
                href={`tel:+91${cleanPhone}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#231F1D] text-[#FAF8F5] text-[11px] font-medium hover:bg-[#14110E] rounded-xs"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Patron</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-[#F3EFEA] border-t border-[#ECE6DD] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-[#7C736A] font-light">
            Powered by OpenStreetMap & Google Maps Courier Navigation Protocol (100% Free)
          </p>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 border border-[#D5CCC0] bg-[#FAF8F5] text-xs uppercase tracking-wider font-medium text-[#7C736A] hover:bg-[#F3EFEA] transition-colors cursor-pointer"
            >
              Close
            </button>
            <a
              href={navUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 sm:flex-none px-6 py-2.5 bg-[#231F1D] text-[#FAF8F5] text-xs uppercase tracking-wider font-semibold hover:bg-[#14110E] transition-colors flex items-center justify-center gap-2"
            >
              <Navigation className="w-4 h-4" />
              <span>Launch Rider Navigation</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
