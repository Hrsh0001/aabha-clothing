'use client';
import React, { useState } from 'react';
import { ArrowRight, Mail, Clock, CheckCircle2 } from 'lucide-react';
import { EDITORIAL_ASSETS } from '../data/products';
import { EditorialImage } from './EditorialImage';

interface AboutPageProps {
  onExploreCollection: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onExploreCollection }) => {
  return (
    <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-10 sm:py-16 lg:py-20 space-y-16 sm:space-y-20">
      {/* Hero Header */}
      <div className="max-w-3xl space-y-4">
        <p className="text-xs tracking-[0.18em] uppercase text-[#7C736A]">
          AABHA CLOTHING · Premium Indian Women&apos;s Ethnic Wear
        </p>
        <h1 className="font-serif text-4xl sm:text-6xl text-[#1E1B18] font-normal leading-[1.08]">
          Quiet Indian Luxury, Woven for the Everyday Hour.
        </h1>
        <p className="text-base sm:text-lg text-[#4A433D] font-light leading-relaxed pt-2">
          AABHA was founded with a singular conviction: Indian textiles do not belong locked inside occasion trunks. Handwoven Chanderi silk, breathable linen, kora cotton, and fine khadi deserve to be inhabited every single day—cut with architectural clarity, deep pockets, and unhurried grace.
        </p>
      </div>

      {/* Editorial Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
        <div className="lg:col-span-7 aspect-[16/10] bg-[#F3EFEA] overflow-hidden">
          <EditorialImage
            src={EDITORIAL_ASSETS.brandStory}
            alt="AABHA CLOTHING craftsmanship"
            containerClassName="w-full h-full"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="lg:col-span-5 space-y-6">
          <h2 className="font-serif text-3xl text-[#1E1B18] font-normal">
            Seventeen Foundational Silhouettes.
          </h2>
          <p className="text-sm sm:text-base text-[#4A433D] font-light leading-relaxed">
            Instead of producing hundreds of fleeting styles each month, our inaugural edition consists of strictly seventeen considered garments across four categories: Anarkali (2), 3-Piece Dresses (5), Co-ord Sets (9), and Chikankari Suit (1).
          </p>
          <div className="space-y-4 pt-4 border-t border-[#ECE6DD] text-xs sm:text-sm">
            <div>
              <span className="font-medium text-[#1E1B18]">01. Panelled Anarkalis</span>
              <p className="text-[#7C736A] font-light mt-0.5">
                Sixteen-panel kalidar silhouettes engineered for fluid movement and effortless lightness.
              </p>
            </div>
            <div>
              <span className="font-medium text-[#1E1B18]">02. Three-Piece Dresses</span>
              <p className="text-[#7C736A] font-light mt-0.5">
                Handwoven silk-cotton tunics paired with tailored trousers and sheer organza dupattas.
              </p>
            </div>
            <div>
              <span className="font-medium text-[#1E1B18]">03. Contemporary Co-ord Sets</span>
              <p className="text-[#7C736A] font-light mt-0.5">
                Structured khadi silk, organic linen, and raw silk twin-sets designed for everyday versatility.
              </p>
            </div>
            <div>
              <span className="font-medium text-[#1E1B18]">04. Hand-Embroidered Chikankari</span>
              <p className="text-[#7C736A] font-light mt-0.5">
                Authentic 32-hour tonal Tepchi and Bakhiya needlework on superfine organic mulmul.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onExploreCollection}
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium tracking-[0.18em] uppercase hover:bg-[#14110E] transition-colors cursor-pointer"
          >
            <span>EXPLORE THE COLLECTION</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[1.4]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [topic, setTopic] = useState('Sizing & Styling Inquiry');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          topic,
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Failed to send message. Please try again.');
      }
    } catch (err) {
      setError('Network connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-10 sm:py-16 lg:py-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-5 space-y-8">
          <div>
            <p className="text-xs tracking-[0.18em] uppercase text-[#7C736A] mb-2">
              AABHA CLOTHING · Client Care
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl text-[#1E1B18] font-normal">
              Get in Touch
            </h1>
            <p className="text-sm sm:text-base text-[#5C544D] font-light mt-3 leading-relaxed">
              Whether you need guidance on garment sizing, fabric details, or order assistance, the AABHA client care team is here to assist you.
            </p>
          </div>

          <div className="space-y-6 pt-6 border-t border-[#ECE6DD] text-sm">
            <div className="flex items-start gap-3.5">
              <Mail className="w-4 h-4 text-[#6E5043] shrink-0 mt-1 stroke-[1.35]" />
              <div>
                <h2 className="font-medium text-[#1E1B18]">Client Care Email</h2>
                <p className="text-[#7C736A] font-light text-xs sm:text-sm mt-0.5">
                  care@aabhaclothing.com
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <Clock className="w-4 h-4 text-[#6E5043] shrink-0 mt-1 stroke-[1.35]" />
              <div>
                <h2 className="font-medium text-[#1E1B18]">Assistance Hours</h2>
                <p className="text-[#7C736A] font-light text-xs sm:text-sm mt-0.5">
                  Monday to Saturday · 10:00 AM – 7:00 PM IST
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-[#F3EFEA] p-8 sm:p-10">
          {submitted ? (
            <div className="py-12 text-center space-y-4">
              <CheckCircle2 className="w-9 h-9 text-[#6E5043] mx-auto stroke-[1.35]" />
              <h2 className="font-serif text-3xl text-[#1E1B18]">
                Thank You for Reaching Out
              </h2>
              <p className="text-sm text-[#5C544D] font-light max-w-md mx-auto">
                Thank you, {name}. Our team at AABHA CLOTHING has received your message regarding "{topic}" and will respond to {email} shortly.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setMessage('');
                  setPhone('');
                }}
                className="px-7 py-3 bg-[#231F1D] text-[#FAF8F5] text-xs tracking-[0.16em] uppercase cursor-pointer"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <h2 className="font-serif text-2xl sm:text-3xl text-[#1E1B18] font-normal">
                Write to AABHA
              </h2>

              {error && (
                <div className="p-3 bg-[#FFEBEE] text-[#C62828] text-xs border border-[#FFCDD2]">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#7C736A] mb-1.5">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1E1B18]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#7C736A] mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1E1B18]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#7C736A] mb-1.5">
                    Mobile Number (Optional)
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="9876543210"
                    className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:border-[#1E1B18]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#7C736A] mb-1.5">
                    Subject
                  </label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1E1B18] cursor-pointer"
                  >
                    <option>Sizing & Styling Inquiry</option>
                    <option>Order Dispatch & Tracking Status</option>
                    <option>Size Exchange or Return Request</option>
                    <option>Custom Handloom Request</option>
                    <option>General Inquiry</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#7C736A] mb-1.5">
                  Message *
                </label>
                <textarea
                  rows={5}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can our styling team help you today?"
                  className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1E1B18]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium tracking-[0.18em] uppercase hover:bg-[#14110E] transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Sending to Atelier...' : 'Submit Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export type PolicyTopic = 'shipping' | 'returns' | 'faq' | 'privacy' | 'terms';

interface PolicyPageProps {
  topic: PolicyTopic;
  onSelectTopic: (topic: PolicyTopic) => void;
}

export const PolicyPage: React.FC<PolicyPageProps> = ({ topic, onSelectTopic }) => {
  const tabs: { id: PolicyTopic; label: string }[] = [
    { id: 'shipping', label: 'Shipping' },
    { id: 'returns', label: 'Returns' },
    { id: 'faq', label: 'FAQ' },
    { id: 'privacy', label: 'Privacy Policy' },
    { id: 'terms', label: 'Terms & Conditions' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-12 sm:py-16 space-y-10">
      <div className="border-b border-[#ECE6DD] pb-6">
        <p className="text-xs tracking-[0.18em] uppercase text-[#7C736A] mb-2">
          AABHA CLOTHING · Client Care
        </p>
        <h1 className="font-serif text-3xl sm:text-5xl text-[#1E1B18] font-normal">
          Policies & FAQ
        </h1>

        <div className="flex flex-wrap gap-2 mt-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTopic(t.id)}
              className={`px-4 py-2 text-xs tracking-wider uppercase transition-colors cursor-pointer ${
                topic === t.id
                  ? 'bg-[#231F1D] text-[#FAF8F5]'
                  : 'bg-[#F3EFEA] text-[#5C544D] hover:text-[#1E1B18]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#F3EFEA] p-6 sm:p-10 space-y-6 text-sm text-[#4A433D] font-light leading-relaxed">
        {topic === 'shipping' && (
          <>
            <h2 className="font-serif text-2xl text-[#1E1B18] font-normal">
              Shipping & Dispatch Policy
            </h2>
            <p>
              Every AABHA CLOTHING order enjoys complimentary insured express shipping across all serviceable PIN codes in India.
            </p>
            <p>
              <strong className="font-medium text-[#1E1B18]">Dispatch Timeline:</strong> Ready-to-ship silhouettes are dispatched within 24–48 business hours after quality inspection and steam finishing.
            </p>
            <p>
              <strong className="font-medium text-[#1E1B18]">Packaging:</strong> Every garment arrives folded inside a breathable, reusable unbleached muslin garment bag to protect delicate weaves and natural fibers in your wardrobe.
            </p>
          </>
        )}

        {topic === 'returns' && (
          <>
            <h2 className="font-serif text-2xl text-[#1E1B18] font-normal">
              14-Day Easy Returns & Exchanges
            </h2>
            <p>
              We stand behind the cut and hand-feel of our garments. If a silhouette does not fit as envisioned, you may request a complimentary size exchange or full refund within 14 days of delivery.
            </p>
            <p>
              <strong className="font-medium text-[#1E1B18]">Process:</strong> Simply initiate a pickup request via our Contact page. Our courier partner will collect the unworn garment with original tags intact from your doorstep within 48 hours.
            </p>
          </>
        )}

        {topic === 'faq' && (
          <div className="space-y-5">
            <h2 className="font-serif text-2xl text-[#1E1B18] font-normal">
              Frequently Asked Questions
            </h2>
            <div>
              <h3 className="font-medium text-[#1E1B18]">
                Are AABHA garments lined and opaque?
              </h3>
              <p className="mt-1">
                Yes. All sheer weaves such as Chanderi silk and Kora tissue are lined with 100% pre-shrunk organic cotton mulmul or accompanied by a fitted cotton voile slip.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-[#1E1B18]">
                Do your silhouettes have functional pockets?
              </h3>
              <p className="mt-1">
                Every AABHA Anarkali, Three-Piece Dress, Co-ord Set, and Chikankari Suit is tailored with deep concealed side-seam pockets engineered not to add hip volume.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-[#1E1B18]">
                Is there seam allowance inside the garments?
              </h3>
              <p className="mt-1">
                Yes, we leave 1.5 inches of clean French-seamed margin inside every garment so it can be easily let out if needed.
              </p>
            </div>
          </div>
        )}

        {topic === 'privacy' && (
          <>
            <h2 className="font-serif text-2xl text-[#1E1B18] font-normal">Privacy Policy</h2>
            <p>
              AABHA CLOTHING respects your digital privacy. Client addresses, sizing profiles, and contact numbers are used strictly for order fulfillment and private previews. We never sell or share client data with third-party advertising networks.
            </p>
          </>
        )}

        {topic === 'terms' && (
          <>
            <h2 className="font-serif text-2xl text-[#1E1B18] font-normal">
              Terms & Conditions
            </h2>
            <p>
              Because our textiles are handwoven on traditional looms and hand-embroidered by artisans, subtle variations in yarn slub and weave density are authentic hallmarks of genuine Indian craft and not manufacturing defects.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
