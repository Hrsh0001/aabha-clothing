import React, { useState } from 'react';
import { ArrowLeft, ShieldCheck, CheckCircle2, Truck, Lock } from 'lucide-react';
import { CartItem } from './Drawers';
import { formatINR } from '../data/products';
import { EditorialImage } from './EditorialImage';

interface CheckoutPageProps {
  items: CartItem[];
  onBackToShopping: () => void;
  onClearCart: () => void;
}

type PaymentMethod = 'upi' | 'card' | 'cod';

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  items,
  onBackToShopping,
  onClearCart,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('Maharashtra');
  const [postalCode, setPostalCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
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

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    const paymentLabel =
      paymentMethod === 'upi'
        ? 'Instant UPI Verified'
        : paymentMethod === 'card'
        ? 'Credit / Debit Card'
        : 'Cash on Delivery (COD)';

    setOrderCompleted({
      orderNumber: `AB-${Math.floor(24000 + Math.random() * 5999)}`,
      items: [...items],
      total: finalTotal,
      customerName: fullName.trim() || 'Guest',
      shippingCity: `${city.trim() || 'India'}, ${stateName} — ${postalCode.trim()}`,
      paymentLabel,
    });
    onClearCart();
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
              <span className="font-medium text-[#1E1B18]">{orderCompleted.shippingCity}</span>
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
                  key={`${item.product.id}-${item.size}`}
                  className="py-3 flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-medium text-[#1E1B18]">{item.product.name}</p>
                    <p className="text-xs text-[#7C736A]">
                      Size {item.size} · Qty {item.quantity} · {item.product.sku}
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

          <div className="pt-4">
            <button
              type="button"
              onClick={onBackToShopping}
              className="px-8 py-4 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium tracking-[0.18em] uppercase hover:bg-[#14110E] transition-colors cursor-pointer"
            >
              RETURN TO STOREFRONT
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-10 sm:py-14">
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
        <form onSubmit={handlePlaceOrder} className="lg:col-span-7 space-y-8">
          <div>
            <p className="text-xs text-[#7C736A] mb-1">Step 01 of 02</p>
            <h1 className="font-serif text-3xl text-[#1E1B18] font-normal">
              Delivery Details
            </h1>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-[#1E1B18] mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full Name"
                className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3.5 py-2.5 text-sm text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#1E1B18] mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3.5 py-2.5 text-sm text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#1E1B18] mb-1.5">
                Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98200 00000"
                className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3.5 py-2.5 text-sm text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs text-[#1E1B18] mb-1.5">
                Street Address, House / Flat No. *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street Address, Building & Apartment"
                className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3.5 py-2.5 text-sm text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#1E1B18] mb-1.5">City *</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3.5 py-2.5 text-sm text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#1E1B18] mb-1.5">State *</label>
                <select
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3 py-2.5 text-sm text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
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
              </div>
              <div>
                <label className="block text-xs text-[#1E1B18] mb-1.5">
                  PIN Code *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="400001"
                  className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3.5 py-2.5 text-sm font-mono text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                />
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`p-4 border text-left transition-colors cursor-pointer ${
                  paymentMethod === 'upi'
                    ? 'border-[#231F1D] bg-[#F3EFEA]'
                    : 'border-[#E0D8CE] bg-[#FAF8F5]'
                }`}
              >
                <p className="text-sm font-medium text-[#1E1B18]">UPI Instant Pay</p>
                <p className="text-xs text-[#7C736A] mt-1">GPay, PhonePe, CRED, BHIM</p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-4 border text-left transition-colors cursor-pointer ${
                  paymentMethod === 'card'
                    ? 'border-[#231F1D] bg-[#F3EFEA]'
                    : 'border-[#E0D8CE] bg-[#FAF8F5]'
                }`}
              >
                <p className="text-sm font-medium text-[#1E1B18]">Credit / Debit Card</p>
                <p className="text-xs text-[#7C736A] mt-1">Visa, Mastercard, Amex, RuPay</p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cod')}
                className={`p-4 border text-left transition-colors cursor-pointer ${
                  paymentMethod === 'cod'
                    ? 'border-[#231F1D] bg-[#F3EFEA]'
                    : 'border-[#E0D8CE] bg-[#FAF8F5]'
                }`}
              >
                <p className="text-sm font-medium text-[#1E1B18]">Cash on Delivery</p>
                <p className="text-xs text-[#7C736A] mt-1">Pay via cash or UPI at doorstep</p>
              </button>
            </div>

            {paymentMethod === 'upi' && (
              <div className="p-4 bg-[#F3EFEA]">
                <label className="block text-xs text-[#1E1B18] mb-1.5">
                  Enter UPI ID (Optional for instant verification)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@upi"
                  className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3.5 py-2 text-sm"
                />
              </div>
            )}

            {paymentMethod === 'cod' && (
              <div className="p-4 bg-[#F3EFEA] text-xs text-[#4A433D]">
                Cash on Delivery is complimentary on all orders. Total payable at doorstep:{' '}
                <strong className="font-mono tabular-nums text-[#1E1B18]">
                  {formatINR(finalTotal)}
                </strong>
                .
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={items.length === 0}
            className="w-full py-4 px-6 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium tracking-[0.18em] uppercase hover:bg-[#14110E] transition-colors disabled:opacity-50 cursor-pointer"
          >
            COMPLETE ORDER · {formatINR(finalTotal)}
          </button>
        </form>

        {/* Right Column: Order Summary */}
        <div className="lg:col-span-5 bg-[#F3EFEA] p-6 sm:p-8 space-y-6">
          <h2 className="font-serif text-2xl text-[#1E1B18] font-normal pb-4 border-b border-[#E0D8CE]">
            Order Summary ({items.reduce((acc, i) => acc + i.quantity, 0)} Pieces)
          </h2>

          <div className="divide-y divide-[#E0D8CE] max-h-80 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={`${item.product.id}-${item.size}`} className="py-4 flex gap-3.5">
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
                    Size {item.size} · Qty {item.quantity}
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
    </div>
  );
};
