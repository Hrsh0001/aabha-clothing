'use client';
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Truck,
  Lock,
  MessageCircle,
  FileText,
  User,
  MapPin,
  ExternalLink,
  RotateCcw,
  CreditCard,
} from 'lucide-react';
import { CartItem } from './Drawers';
import { formatINR } from '../data/products';
import { EditorialImage } from './EditorialImage';
import { useAuth } from '../context/AuthContext';
import { LocationPickerModal, LocationData } from './LocationPickerModal';
import {
  validateCheckoutForm,
  type CheckoutFormField,
  type CheckoutFormErrors,
  type CheckoutFormValues,
} from '../lib/form-validation';
import type { SiteSettings } from '../app/api/settings/route';

interface CheckoutPageProps {
  items: CartItem[];
  siteSettings?: SiteSettings | null;
  onBackToShopping: () => void;
  onClearCart: () => void;
}

type PaymentMethod = 'upi' | 'card' | 'cod';

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  items,
  siteSettings,
  onBackToShopping,
  onClearCart,
}) => {
  const { user, setAuthModalOpen } = useAuth();
  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('Maharashtra');
  const [postalCode, setPostalCode] = useState('');

  // useForm-style simultaneous validation state
  const [errors, setErrors] = useState<CheckoutFormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<CheckoutFormField, boolean>>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Exact Doorstep GPS & Map Selection states (100% Free OpenStreetMap)
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [mapUrl, setMapUrl] = useState<string | null>(null);

  const [storeWhatsApp, setStoreWhatsApp] = useState<string>(
    siteSettings?.whatsappNumber || process.env.NEXT_PUBLIC_STORE_WHATSAPP || '919876543210'
  );

  useEffect(() => {
    if (siteSettings?.whatsappNumber) {
      setStoreWhatsApp(siteSettings.whatsappNumber);
    } else {
      fetch('/api/settings')
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.settings?.whatsappNumber) {
            setStoreWhatsApp(d.settings.whatsappNumber);
          }
        })
        .catch(() => {});
    }
  }, [siteSettings?.whatsappNumber]);

  const getCurrentValues = (overrides?: Partial<CheckoutFormValues>): CheckoutFormValues => ({
    fullName,
    email,
    phone,
    address,
    city,
    stateName,
    postalCode,
    ...overrides,
  });

  const syncFieldValidation = (
    field: CheckoutFormField,
    overrides?: Partial<CheckoutFormValues>
  ) => {
    const nextTouched = { ...touched, [field]: true };
    setTouched(nextTouched);

    const result = validateCheckoutForm(getCurrentValues(overrides));
    if (isSubmitted) {
      setErrors(result.errors);
    } else {
      setErrors((prev) => {
        const next: CheckoutFormErrors = { ...prev };
        if (result.errors[field]) {
          next[field] = result.errors[field];
        } else {
          delete next[field];
        }
        return next;
      });
    }
  };

  const handleLocationSelected = (loc: LocationData) => {
    setLatitude(loc.latitude);
    setLongitude(loc.longitude);
    setMapUrl(loc.mapUrl);
    const nextAddress = loc.address || address;
    const nextCity = loc.city || city;
    const nextState = loc.state || stateName;
    const nextPostal = loc.pincode || postalCode;
    if (loc.address) setAddress(loc.address);
    if (loc.city) setCity(loc.city);
    if (loc.state) setStateName(loc.state);
    if (loc.pincode) setPostalCode(loc.pincode);

    if (isSubmitted) {
      const check = validateCheckoutForm(
        getCurrentValues({
          address: nextAddress,
          city: nextCity,
          stateName: nextState,
          postalCode: nextPostal,
        })
      );
      setErrors(check.errors);
    }
  };

  useEffect(() => {
    try {
      const savedLoc = localStorage.getItem('aabha_delivery_location');
      if (savedLoc) {
        const parsed = JSON.parse(savedLoc);
        if (parsed.latitude && parsed.longitude) {
          setLatitude(parsed.latitude);
          setLongitude(parsed.longitude);
          if (parsed.mapUrl) setMapUrl(parsed.mapUrl);
          if (parsed.address && !address) setAddress(parsed.address);
          if (parsed.city && !city) setCity(parsed.city);
          if (parsed.state && !stateName) setStateName(parsed.state);
          if (parsed.pincode && !postalCode) setPostalCode(parsed.pincode);
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (user?.name && !fullName) setFullName(user.name);
    if (user?.phone && !phone) setPhone(user.phone);
    if (user?.email && !email) setEmail(user.email);
  }, [user]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [upiId, setUpiId] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  const [orderCompleted, setOrderCompleted] = useState<{
    orderNumber: string;
    items: CartItem[];
    total: number;
    customerName: string;
    shippingCity: string;
    paymentLabel: string;
    latitude?: number | null;
    longitude?: number | null;
    mapUrl?: string | null;
  } | null>(null);

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discountAmount = promoApplied ? Math.round(subtotal * 0.1) : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (promoCode.trim().toUpperCase() === 'AABHA10') {
      setPromoApplied(true);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setIsSubmitted(true);
    setTouched({
      fullName: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      stateName: true,
      postalCode: true,
    });

    const validation = validateCheckoutForm(getCurrentValues());
    setErrors(validation.errors);
    if (!validation.isValid) {
      return;
    }

    setIsSubmitting(true);
    const fallbackOrderNumber = `AB-${Math.floor(24000 + Math.random() * 5999)}`;

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phone,
          email,
          address,
          city,
          stateName,
          postalCode,
          latitude: latitude || undefined,
          longitude: longitude || undefined,
          mapUrl: mapUrl || undefined,
          items: items.map((i) => {
            const matchingColor = i.product.colors?.find((c) => c.name === i.selectedColor);
            return {
              productId: i.product.id,
              name: i.selectedColor ? `${i.product.name} (${i.selectedColor})` : i.product.name,
              size: i.size,
              quantity: i.quantity,
              price: i.product.price,
              image: matchingColor?.imageUrl || i.product.primaryImage,
            };
          }),
          total: finalTotal,
        }),
      });
      const data = await res.json();
      const actualOrderNumber =
        data.success && data.order?.orderNumber ? data.order.orderNumber : fallbackOrderNumber;

      setOrderCompleted({
        orderNumber: actualOrderNumber,
        items: [...items],
        total: finalTotal,
        customerName: fullName.trim() || 'Guest',
        shippingCity: `${city.trim() || 'India'}, ${stateName} — ${postalCode.trim()}`,
        paymentLabel: 'Cash on Delivery (Doorstep Cash/UPI)',
        latitude,
        longitude,
        mapUrl: data.order?.mapUrl || mapUrl,
      });
      onClearCart();
    } catch (err) {
      console.warn('Backend order recording notice:', err);
      setOrderCompleted({
        orderNumber: fallbackOrderNumber,
        items: [...items],
        total: finalTotal,
        customerName: fullName.trim() || 'Guest',
        shippingCity: `${city.trim() || 'India'}, ${stateName} — ${postalCode.trim()}`,
        paymentLabel: 'Cash on Delivery (Doorstep Cash/UPI)',
        latitude,
        longitude,
        mapUrl,
      });
      onClearCart();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderCompleted) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-14 sm:py-20">
        <div className="bg-[#F3EFEA] border border-[#ECE6DD] p-8 sm:p-12 space-y-8">
          <div className="flex items-start gap-4 pb-6 border-b border-[#E0D8CE]">
            <CheckCircle2 className="w-8 h-8 text-[#6E5043] shrink-0 mt-1 stroke-[1.35]" />
            <div>
              <p className="font-mono text-xs text-[#6E5043]">
                Order #{orderCompleted.orderNumber} Confirmed — Preparing Shipment
              </p>
              <h1 className="font-serif text-3xl sm:text-4xl text-[#1E1B18] font-normal mt-1">
                Thank you, {orderCompleted.customerName}.
              </h1>
              <p className="text-sm text-[#5C544D] font-light mt-2">
                AABHA CLOTHING is inspecting and steam-finishing your garments. You will receive dispatch tracking via SMS and email within 24 hours.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs sm:text-sm pb-6 border-b border-[#E0D8CE]">
            <div>
              <span className="text-[#7C736A] block mb-1">Delivery Destination</span>
              <span className="font-medium text-[#1E1B18] block">{orderCompleted.shippingCity}</span>
              {orderCompleted.latitude && orderCompleted.longitude && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FAF8F5] border border-[#E0D8CE] text-[11px] font-mono text-[#2E7D32]">
                    <MapPin className="w-3 h-3 text-[#2E7D32]" />
                    {orderCompleted.latitude.toFixed(4)}° N, {orderCompleted.longitude.toFixed(4)}° E
                  </span>
                  <a
                    href={orderCompleted.mapUrl || `https://www.google.com/maps?q=${orderCompleted.latitude},${orderCompleted.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-[#6E5043] underline inline-flex items-center gap-0.5"
                  >
                    <span>Google Maps</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              )}
            </div>
            <div>
              <span className="text-[#7C736A] block mb-1">Payment Method</span>
              <span className="font-medium text-[#1E1B18]">{orderCompleted.paymentLabel}</span>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="font-serif text-xl text-[#1E1B18]">Reserved Garments</h2>
            <div className="divide-y divide-[#E0D8CE]">
              {orderCompleted.items.map((item) => (
                <div
                  key={`${item.product.id}-${item.size}-${item.selectedColor || ''}`}
                  className="py-3 flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-medium text-[#1E1B18]">{item.product.name}</p>
                    <p className="text-xs text-[#7C736A]">
                      Size {item.size}{item.selectedColor ? ` · ${item.selectedColor}` : ''} · Qty {item.quantity} · {item.product.sku}
                    </p>
                  </div>
                  <span className="font-mono tabular-nums text-[#1E1B18]">
                    {formatINR(item.product.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-[#E0D8CE] flex items-center justify-between text-base font-medium text-[#1E1B18] tabular-nums">
              <span>Total Amount</span>
              <span>{formatINR(orderCompleted.total)}</span>
            </div>
          </div>

          <div className="pt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onBackToShopping}
              className="px-6 py-3.5 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium tracking-[0.18em] uppercase hover:bg-[#14110E] transition-colors cursor-pointer"
            >
              Return to Storefront
            </button>

            <a
              href={`/my-orders?phone=${encodeURIComponent(
                phone.trim().replace(/[^0-9]/g, '')
              )}&order=${encodeURIComponent(orderCompleted.orderNumber)}&invoice=1`}
              className="px-6 py-3.5 border border-[#E0D8CE] bg-[#FAF8F5] text-[#1E1B18] text-xs font-medium tracking-[0.16em] uppercase hover:bg-[#ECE6DD] transition-colors inline-flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              View & Print Invoice Bill
            </a>

            <a
              href={`https://wa.me/${storeWhatsApp.replace(/[^0-9]/g, '') || '919876543210'}?text=${encodeURIComponent(
                `Namaste AABHA, I have just placed Cash on Delivery Order #${orderCompleted.orderNumber} for ${formatINR(orderCompleted.total)}. Please confirm dispatch!`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3.5 bg-[#25D366] text-white text-xs font-medium tracking-[0.16em] uppercase hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp Confirmation
            </a>
          </div>
        </div>
      </div>
    );
  }

  const activeErrorList = Object.values(errors).filter(Boolean) as string[];

  return (
    <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-8 sm:py-12 lg:py-16">
      <div className="pb-6 mb-8 border-b border-[#ECE6DD] flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToShopping}
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-[#1E1B18] hover:text-[#6E5043] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 stroke-[1.4]" />
          <span>Continue Shopping</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-[#7C736A]">
          <Lock className="w-3.5 h-3.5 text-[#6E5043]" />
          <span>AABHA CLOTHING · Secure Checkout</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Form: Shipping & Payment */}
        <form onSubmit={handlePlaceOrder} noValidate className="lg:col-span-7 space-y-8">
          {!user && (
            <div className="bg-[#F3EFEA] border border-[#ECE6DD] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-[#5C544D]">
                <User className="w-4 h-4 text-[#6E5043] shrink-0" />
                <span>Already have an AABHA client account?</span>
              </div>
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="text-[#1E1B18] font-medium underline underline-offset-4 hover:text-[#6E5043] whitespace-nowrap cursor-pointer text-left sm:text-right"
              >
                Sign In for Express Checkout →
              </button>
            </div>
          )}

          <div>
            <p className="text-xs text-[#7C736A] mb-1">Step 01 of 02</p>
            <h1 className="font-serif text-3xl text-[#1E1B18] font-normal">
              Delivery Details
            </h1>
          </div>

          {/* Simultaneous Validation Summary Alert */}
          {activeErrorList.length > 0 && (
            <div
              role="alert"
              className="p-4 bg-[#FFF5F5] border border-[#C62828] text-xs text-[#C62828] space-y-1.5"
            >
              <div className="flex items-center gap-1.5 font-semibold uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Please complete all required delivery details ({activeErrorList.length} field{activeErrorList.length === 1 ? '' : 's'})
                </span>
              </div>
              <ul className="list-disc pl-6 space-y-0.5 text-[#B71C1C]">
                {activeErrorList.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-[#1E1B18] mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => {
                  const val = e.target.value;
                  setFullName(val);
                  syncFieldValidation('fullName', { fullName: val });
                }}
                onBlur={() => syncFieldValidation('fullName')}
                placeholder="Full Name"
                aria-invalid={Boolean(errors.fullName)}
                className={`w-full bg-[#FAF8F5] border px-3.5 py-2.5 text-sm text-[#1E1B18] focus:outline-none ${
                  errors.fullName
                    ? 'border-[#C62828] bg-[#FFF5F5]/40 focus:border-[#C62828]'
                    : 'border-[#E0D8CE] focus:border-[#1E1B18]'
                }`}
              />
              {errors.fullName && (
                <p className="mt-1.5 text-xs text-[#C62828] flex items-center gap-1.5 font-medium" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.fullName}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs text-[#1E1B18] mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  const val = e.target.value;
                  setEmail(val);
                  syncFieldValidation('email', { email: val });
                }}
                onBlur={() => syncFieldValidation('email')}
                placeholder="you@domain.com"
                aria-invalid={Boolean(errors.email)}
                className={`w-full bg-[#FAF8F5] border px-3.5 py-2.5 text-sm text-[#1E1B18] focus:outline-none ${
                  errors.email
                    ? 'border-[#C62828] bg-[#FFF5F5]/40 focus:border-[#C62828]'
                    : 'border-[#E0D8CE] focus:border-[#1E1B18]'
                }`}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-[#C62828] flex items-center gap-1.5 font-medium" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.email}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs text-[#1E1B18] mb-1.5">
                Mobile Number *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value;
                  setPhone(val);
                  syncFieldValidation('phone', { phone: val });
                }}
                onBlur={() => syncFieldValidation('phone')}
                placeholder="+91 98200 00000"
                aria-invalid={Boolean(errors.phone)}
                className={`w-full bg-[#FAF8F5] border px-3.5 py-2.5 text-sm text-[#1E1B18] focus:outline-none ${
                  errors.phone
                    ? 'border-[#C62828] bg-[#FFF5F5]/40 focus:border-[#C62828]'
                    : 'border-[#E0D8CE] focus:border-[#1E1B18]'
                }`}
              />
              {errors.phone && (
                <p className="mt-1.5 text-xs text-[#C62828] flex items-center gap-1.5 font-medium" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.phone}</span>
                </p>
              )}
            </div>

            {/* 100% Free Interactive OpenStreetMap & GPS Doorstep Location Selector */}
            <div className="sm:col-span-2 p-4 bg-[#F3EFEA] border border-[#E0D8CE] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#231F1D] text-[#FAF8F5] flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 stroke-[1.4]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-[#1E1B18]">
                      {latitude && longitude
                        ? 'Exact Doorstep Location Pinned'
                        : 'Interactive Delivery Map & GPS'}
                    </p>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#FAF8F5] border border-[#E0D8CE] text-[#2E7D32] font-semibold">
                      100% FREE
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7C736A] font-light mt-0.5">
                    {latitude && longitude
                      ? `📍 ${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E · Attached for Courier GPS Navigation`
                      : 'Pinpoint your exact gate/doorstep or auto-detect via GPS for seamless COD delivery'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setLocationModalOpen(true)}
                  className="px-4 py-2 bg-[#231F1D] text-[#FAF8F5] text-xs uppercase tracking-wider font-medium hover:bg-[#14110E] transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{latitude && longitude ? 'Edit Pin (Modal)' : 'Select on Map (Modal)'}</span>
                </button>

                <a
                  href="/select-location"
                  className="px-3.5 py-2 bg-[#FAF8F5] border border-[#D5CCC0] text-xs uppercase tracking-wider font-medium text-[#1E1B18] hover:bg-[#EAE4DC] transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  title="Open Dedicated Fullscreen Map Page"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#6E5043]" />
                  <span>Full Map Page</span>
                </a>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs text-[#1E1B18] mb-1.5">
                Street Address, House / Flat No. *
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => {
                  const val = e.target.value;
                  setAddress(val);
                  syncFieldValidation('address', { address: val });
                }}
                onBlur={() => syncFieldValidation('address')}
                placeholder="Street Address, Building & Apartment"
                aria-invalid={Boolean(errors.address)}
                className={`w-full bg-[#FAF8F5] border px-3.5 py-2.5 text-sm text-[#1E1B18] focus:outline-none ${
                  errors.address
                    ? 'border-[#C62828] bg-[#FFF5F5]/40 focus:border-[#C62828]'
                    : 'border-[#E0D8CE] focus:border-[#1E1B18]'
                }`}
              />
              {errors.address && (
                <p className="mt-1.5 text-xs text-[#C62828] flex items-center gap-1.5 font-medium" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.address}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs text-[#1E1B18] mb-1.5">City *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => {
                  const val = e.target.value;
                  setCity(val);
                  syncFieldValidation('city', { city: val });
                }}
                onBlur={() => syncFieldValidation('city')}
                placeholder="City"
                aria-invalid={Boolean(errors.city)}
                className={`w-full bg-[#FAF8F5] border px-3.5 py-2.5 text-sm text-[#1E1B18] focus:outline-none ${
                  errors.city
                    ? 'border-[#C62828] bg-[#FFF5F5]/40 focus:border-[#C62828]'
                    : 'border-[#E0D8CE] focus:border-[#1E1B18]'
                }`}
              />
              {errors.city && (
                <p className="mt-1.5 text-xs text-[#C62828] flex items-center gap-1.5 font-medium" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.city}</span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#1E1B18] mb-1.5">State *</label>
                <select
                  value={stateName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStateName(val);
                    syncFieldValidation('stateName', { stateName: val });
                  }}
                  onBlur={() => syncFieldValidation('stateName')}
                  aria-invalid={Boolean(errors.stateName)}
                  className={`w-full bg-[#FAF8F5] border px-3 py-2.5 text-sm text-[#1E1B18] focus:outline-none ${
                    errors.stateName
                      ? 'border-[#C62828] bg-[#FFF5F5]/40 focus:border-[#C62828]'
                      : 'border-[#E0D8CE] focus:border-[#1E1B18]'
                  }`}
                >
                  <option>Maharashtra</option>
                  <option>Delhi NCR</option>
                  <option>Karnataka</option>
                  <option>Gujarat</option>
                  <option>Rajasthan</option>
                  <option>Telangana</option>
                  <option>Tamil Nadu</option>
                  <option>West Bengal</option>
                  <option>Uttar Pradesh</option>
                </select>
                {errors.stateName && (
                  <p className="mt-1.5 text-xs text-[#C62828] flex items-center gap-1 font-medium" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.stateName}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-[#1E1B18] mb-1.5">
                  PIN Code *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={postalCode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPostalCode(val);
                    syncFieldValidation('postalCode', { postalCode: val });
                  }}
                  onBlur={() => syncFieldValidation('postalCode')}
                  placeholder="400001"
                  aria-invalid={Boolean(errors.postalCode)}
                  className={`w-full bg-[#FAF8F5] border px-3.5 py-2.5 text-sm font-mono text-[#1E1B18] focus:outline-none ${
                    errors.postalCode
                      ? 'border-[#C62828] bg-[#FFF5F5]/40 focus:border-[#C62828]'
                      : 'border-[#E0D8CE] focus:border-[#1E1B18]'
                  }`}
                />
                {errors.postalCode && (
                  <p className="mt-1.5 text-xs text-[#C62828] flex items-center gap-1 font-medium" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.postalCode}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Payment Method */}
          <div className="pt-6 border-t border-[#ECE6DD] space-y-4">
            <div>
              <p className="text-xs text-[#7C736A] mb-1">Step 02 of 02</p>
              <h2 className="font-serif text-3xl text-[#1E1B18] font-normal">
                Payment Method
              </h2>
            </div>

            <div className="p-5 border border-[#231F1D] bg-[#F3EFEA] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#1E1B18] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6E5043]"></span>
                  Cash on Delivery (Doorstep Cash or UPI)
                </span>
                <span className="text-xs uppercase tracking-wider font-mono px-2 py-0.5 bg-[#FAF8F5] border border-[#E0D8CE] text-[#6E5043]">
                  Complimentary COD
                </span>
              </div>
              <p className="text-xs text-[#5C544D] leading-relaxed">
                No advance online payment required. Pay via cash or instant doorstep UPI when your AABHA garment package arrives.
              </p>
              <div className="pt-2 border-t border-[#E0D8CE] flex items-center justify-between text-xs text-[#1E1B18]">
                <span>Payable upon delivery:</span>
                <strong className="font-mono tabular-nums text-sm">
                  {formatINR(finalTotal)}
                </strong>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={items.length === 0 || isSubmitting}
            className="w-full py-4 px-6 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium tracking-[0.18em] uppercase hover:bg-[#14110E] transition-colors disabled:opacity-50 cursor-pointer shadow-md"
          >
            {isSubmitting ? 'RECORDING ORDER...' : `CONFIRM CASH ON DELIVERY ORDER · ${formatINR(finalTotal)}`}
          </button>

          {/* COD Trust Guarantee Box */}
          {siteSettings?.showCodTrustGuarantee !== false && (
            <div className="p-4 sm:p-5 bg-[#FAF8F5] border border-[#E0D8CE] space-y-3">
              <span className="text-[11px] font-medium tracking-[0.16em] uppercase text-[#6E5043] block">
                The AABHA Cash On Delivery Guarantee
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-[#1E1B18]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#6E5043] shrink-0" />
                    <span>{siteSettings?.codTrustPillar1Title || 'Zero Advance Payment'}</span>
                  </div>
                  <p className="text-[11px] text-[#7C736A] font-light leading-snug">
                    {siteSettings?.codTrustPillar1Desc || 'Pay only when your parcel arrives safely at your doorstep.'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-[#1E1B18]">
                    <CreditCard className="w-3.5 h-3.5 text-[#6E5043] shrink-0" />
                    <span>{siteSettings?.codTrustPillar2Title || 'Doorstep Cash or UPI'}</span>
                  </div>
                  <p className="text-[11px] text-[#7C736A] font-light leading-snug">
                    {siteSettings?.codTrustPillar2Desc || 'Pay courier conveniently via Cash, GPay, PhonePe, or Paytm.'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-[#1E1B18]">
                    <RotateCcw className="w-3.5 h-3.5 text-[#6E5043] shrink-0" />
                    <span>{siteSettings?.codTrustPillar3Title || '14-Day Free Exchange'}</span>
                  </div>
                  <p className="text-[11px] text-[#7C736A] font-light leading-snug">
                    {siteSettings?.codTrustPillar3Desc || 'Doorstep size replacement or exchange if fit needs adjusting.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Right Column: Order Summary */}
        <div className="lg:col-span-5 bg-[#F3EFEA] p-6 sm:p-8 space-y-6">
          <h2 className="font-serif text-2xl text-[#1E1B18] font-normal pb-4 border-b border-[#E0D8CE]">
            Order Summary ({items.reduce((acc, i) => acc + i.quantity, 0)} Pieces)
          </h2>

          <div className="divide-y divide-[#E0D8CE] max-h-80 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={`${item.product.id}-${item.size}-${item.selectedColor || ''}`} className="py-4 flex gap-3.5">
                <div className="w-16 aspect-[3/4] bg-[#FAF8F5] shrink-0 overflow-hidden">
                  <EditorialImage
                    src={item.product.primaryImage}
                    alt={item.product.name}
                    containerClassName="w-full h-full"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1E1B18] truncate">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-[#7C736A] mt-0.5">
                    Size {item.size}{item.selectedColor ? ` · ${item.selectedColor}` : ''} · Qty {item.quantity}
                  </p>
                  <p className="text-sm font-medium text-[#1E1B18] mt-1 tabular-nums">
                    {formatINR(item.product.price * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Privilege Code */}
          <form onSubmit={handleApplyPromo} className="pt-4 border-t border-[#E0D8CE] space-y-2">
            <label className="block text-xs text-[#7C736A]">
              Privilege Code (Try <span className="font-mono text-[#1E1B18]">AABHA10</span>)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Enter code AABHA10"
                className="flex-1 bg-[#FAF8F5] border border-[#E0D8CE] px-3 py-2 text-xs uppercase font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#231F1D] text-[#FAF8F5] text-xs tracking-wider uppercase hover:bg-[#14110E] transition-colors cursor-pointer"
              >
                Apply
              </button>
            </div>
            {promoApplied && (
              <p className="text-xs text-[#6E5043]">
                AABHA10 applied · 10% launch collection privilege deducted.
              </p>
            )}
          </form>

          <div className="pt-4 border-t border-[#E0D8CE] space-y-2 text-sm tabular-nums">
            <div className="flex justify-between text-[#7C736A]">
              <span>Subtotal</span>
              <span>{formatINR(subtotal)}</span>
            </div>
            {promoApplied && (
              <div className="flex justify-between text-[#6E5043]">
                <span>Privilege Discount (10%)</span>
                <span>−{formatINR(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#7C736A]">
              <span>Insured Express Shipping</span>
              <span>Complimentary</span>
            </div>
            <div className="flex justify-between text-lg font-medium text-[#1E1B18] pt-3 border-t border-[#E0D8CE]">
              <span>Total Payable</span>
              <span>{formatINR(finalTotal)}</span>
            </div>
          </div>

          <div className="pt-3 space-y-2 text-xs text-[#7C736A]">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#6E5043] shrink-0" />
              <span>Dispatched in reusable unbleached muslin garment bags.</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#6E5043] shrink-0" />
              <span>Complimentary 14-day doorstep size exchanges and returns.</span>
            </div>
          </div>
        </div>
      </div>

      {/* 100% Free Interactive Location Picker Modal (OpenStreetMap & HTML5 GPS) */}
      <LocationPickerModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        onSelectLocation={handleLocationSelected}
        initialLat={latitude || undefined}
        initialLng={longitude || undefined}
      />
    </div>
  );
};
