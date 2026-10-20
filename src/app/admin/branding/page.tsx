'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Save,
  RefreshCw,
  Info,
  ExternalLink,
} from 'lucide-react';
import { AdminLayout } from '@/src/components/AdminLayout';
import { useAuth } from '@/src/context/AuthContext';
import type { SiteSettings } from '../../api/settings/route';
import {
  uploadAdminImage,
  compressDataUrlIfNeeded,
  safeParseJsonResponse,
} from '@/src/lib/image-upload';
import {
  MAX_IMAGE_FILE_SIZE_MB,
  validateImageFile,
  validateBrandingForm,
  validateJsonPayloadSize,
  type BrandingFormErrors,
} from '@/src/lib/form-validation';

export default function AdminBrandingPage() {
  const { adminToken } = useAuth();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  // Simultaneous validation & inline upload error state (useForm style)
  const [errors, setErrors] = useState<BrandingFormErrors>({});
  const [fieldUploadErrors, setFieldUploadErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token =
      adminToken ||
      (typeof window !== 'undefined' ? localStorage.getItem('aabha_admin_jwt') : null);
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const getUploadHeaders = () => {
    const token =
      adminToken ||
      (typeof window !== 'undefined' ? localStorage.getItem('aabha_admin_jwt') : null);
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentFieldToUpload, setCurrentFieldToUpload] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      const data = await safeParseJsonResponse(res);
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      showToast('Error loading media settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const triggerFileUpload = (fieldKey: string) => {
    setCurrentFieldToUpload(fieldKey);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3500);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentFieldToUpload || !settings) return;

    const fieldKey = currentFieldToUpload;
    const allowSvg = fieldKey === 'logoUrl';
    const check = validateImageFile(file, { maxSizeMB: MAX_IMAGE_FILE_SIZE_MB, allowSvg });

    if (!check.valid) {
      const msg = check.error || `Image exceeds the ${MAX_IMAGE_FILE_SIZE_MB} MB limit.`;
      setFieldUploadErrors((prev) => ({ ...prev, [fieldKey]: msg }));
      showToast(msg, 'error');
      setCurrentFieldToUpload(null);
      if (e.target) e.target.value = '';
      return;
    }

    setFieldUploadErrors((prev) => {
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });

    setUploadingKey(fieldKey);
    try {
      const data = await uploadAdminImage(file, getUploadHeaders());
      if (data.success && data.imageUrl) {
        let nextSettings: SiteSettings;
        if (fieldKey.startsWith('igPhoto_')) {
          const index = parseInt(fieldKey.split('_')[1], 10);
          const newIg = [...(settings.igPhotos || [])];
          newIg[index] = data.imageUrl;
          nextSettings = { ...settings, igPhotos: newIg };
        } else {
          nextSettings = { ...settings, [fieldKey]: data.imageUrl };
        }
        setSettings(nextSettings);
        const validation = validateBrandingForm(nextSettings);
        setErrors(validation.errors);
        showToast('Image optimized & uploaded! Click "Save All Changes" to publish.');
      } else {
        const msg = data.error || 'Failed to upload photo';
        setFieldUploadErrors((prev) => ({ ...prev, [fieldKey]: msg }));
        showToast(msg, 'error');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      const msg = `Error uploading "${file.name}". Please ensure it is under ${MAX_IMAGE_FILE_SIZE_MB} MB.`;
      setFieldUploadErrors((prev) => ({ ...prev, [fieldKey]: msg }));
      showToast(msg, 'error');
    } finally {
      setUploadingKey(null);
      setCurrentFieldToUpload(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setServerError(null);

    const validation = validateBrandingForm(settings);
    setErrors(validation.errors);

    if (!validation.isValid) {
      const count = Object.keys(validation.errors).length;
      showToast(`Validation failed: Please resolve ${count} branding media error(s).`, 'error');
      return;
    }

    setSaving(true);
    try {
      const compressedIg: string[] = [];
      for (const ig of settings.igPhotos || []) {
        compressedIg.push(await compressDataUrlIfNeeded(ig));
      }

      const payload: SiteSettings = {
        logoUrl: await compressDataUrlIfNeeded(settings.logoUrl),
        heroBanner: await compressDataUrlIfNeeded(settings.heroBanner),
        heroBannerMobile: settings.heroBannerMobile
          ? await compressDataUrlIfNeeded(settings.heroBannerMobile)
          : '',
        heroCoords: await compressDataUrlIfNeeded(settings.heroCoords),
        heroCoordsMobile: settings.heroCoordsMobile
          ? await compressDataUrlIfNeeded(settings.heroCoordsMobile)
          : '',
        heroEthnic: await compressDataUrlIfNeeded(settings.heroEthnic),
        heroEthnicMobile: settings.heroEthnicMobile
          ? await compressDataUrlIfNeeded(settings.heroEthnicMobile)
          : '',
        whatsappNumber: settings.whatsappNumber || '',
        supportEmail: settings.supportEmail || '',
        supportPhone: settings.supportPhone || '',
        instagramUrl: settings.instagramUrl || '',
        instagramHandle: settings.instagramHandle || '',
        storeAddress: settings.storeAddress || '',
        storeHours: settings.storeHours || '',
        brandStory: await compressDataUrlIfNeeded(settings.brandStory),
        igPhotos: compressedIg,
        announcementText: settings.announcementText || '',
        heroSlide1Eyebrow: settings.heroSlide1Eyebrow || '',
        heroSlide1Heading: settings.heroSlide1Heading || '',
        heroSlide1Subheading: settings.heroSlide1Subheading || '',
        heroSlide2Eyebrow: settings.heroSlide2Eyebrow || '',
        heroSlide2Heading: settings.heroSlide2Heading || '',
        heroSlide2Subheading: settings.heroSlide2Subheading || '',
        heroSlide3Eyebrow: settings.heroSlide3Eyebrow || '',
        heroSlide3Heading: settings.heroSlide3Heading || '',
        heroSlide3Subheading: settings.heroSlide3Subheading || '',
        brandStoryTitle: settings.brandStoryTitle || '',
        brandStoryParagraph1: settings.brandStoryParagraph1 || '',
        brandStoryParagraph2: settings.brandStoryParagraph2 || '',
      };

      const payloadCheck = validateJsonPayloadSize(payload);
      if (!payloadCheck.valid) {
        const msg =
          payloadCheck.error ||
          'Branding media payload exceeds the 3.5 MB server limit. Please replace oversized images.';
        setServerError(msg);
        showToast(msg, 'error');
        setSaving(false);
        return;
      }

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await safeParseJsonResponse(res);
      if (data.success) {
        setSettings(payload);
        setFieldUploadErrors({});
        showToast('Boutique branding & media updated live!');
      } else {
        const msg = data.error || 'Failed to save settings';
        setServerError(msg);
        showToast(msg, 'error');
      }
    } catch (err) {
      console.error('Save failed:', err);
      const msg = 'Error saving settings to server. Please check image sizes (max 5 MB per photo).';
      setServerError(msg);
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const activeErrors = [
    ...Object.values(errors).filter(Boolean),
    ...Object.values(fieldUploadErrors).filter(Boolean),
  ];

  return (
    <AdminLayout
      title="Boutique Curation & Media"
      subtitle="Update the luxury editorial imagery, hero storytelling banners, brand logo, and Instagram patron feed."
      extraAction={
        <button
          onClick={handleSave}
          disabled={saving || !settings}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-wider hover:bg-[#14110E] transition-colors cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
        </button>
      }
    >
      {/* Hidden Global File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
      />

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 px-4 py-2.5 text-xs flex items-center gap-2 shadow-xl border animate-fadeIn ${
            toastType === 'error'
              ? 'bg-[#C62828] text-white border-[#B71C1C]'
              : 'bg-[#1E1B18] text-[#FAF8F5] border-[#3D3732]'
          }`}
        >
          {toastType === 'error' ? (
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-[#A8E6CF] shrink-0" />
          )}
          <span>{toast}</span>
        </div>
      )}

      {loading || !settings ? (
        <div className="py-20 text-center text-sm text-[#7C736A] flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 text-[#6E5043] animate-spin" />
          <span>Loading media settings...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Global Image Size Limit Info Banner */}
          <div className="p-3.5 bg-[#FAF8F5] border border-[#E0D8CE] flex flex-wrap items-center justify-between gap-2 text-xs text-[#5C544D]">
            <span className="inline-flex items-center gap-1.5 font-medium text-[#1E1B18]">
              <Info className="w-4 h-4 text-[#6E5043] shrink-0" />
              <span>Image Upload Limit: Max {MAX_IMAGE_FILE_SIZE_MB} MB per photo (JPG, PNG, WebP, SVG)</span>
            </span>
            <span className="font-mono text-[11px] text-[#6E5043]">
              Auto-compressed to &lt;150 KB for fast Vercel Cloud delivery
            </span>
          </div>

          {/* Simultaneous Validation / Upload Error Summary Box */}
          {(activeErrors.length > 0 || serverError) && (
            <div
              role="alert"
              className="p-4 bg-[#FFF5F5] border border-[#C62828] text-xs text-[#C62828] space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Media Validation & Upload Errors ({activeErrors.length + (serverError ? 1 : 0)})</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setErrors({});
                    setFieldUploadErrors({});
                    setServerError(null);
                  }}
                  className="underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
              {serverError && <p className="font-medium pl-5">{serverError}</p>}
              {activeErrors.length > 0 && (
                <ul className="list-disc pl-8 space-y-1 text-[#B71C1C]">
                  {activeErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Section 0: Top Storefront Announcement Bar */}
          <section className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 sm:p-8 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#7C736A]">Storefront Notice</p>
              <h2 className="font-serif text-2xl text-[#1E1B18] font-normal mt-1">
                Announcement Bar Banner
              </h2>
              <p className="text-xs text-[#5C544D] mt-1">
                The promotional or shipping notice banner displayed across the top of your boutique storefront.
              </p>
            </div>
            <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4">
              <label className="block text-xs font-medium text-[#1E1B18] mb-1.5">
                Announcement Bar Text:
              </label>
              <input
                type="text"
                value={settings.announcementText ?? 'Complimentary express shipping across India on orders above ₹1,999 · Artisan Handcrafted'}
                onChange={(e) => setSettings({ ...settings, announcementText: e.target.value })}
                placeholder="e.g. Complimentary express shipping across India on orders above ₹1,999"
                className="w-full bg-white border border-[#E0D8CE] px-3.5 py-2 text-xs text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
              />
            </div>
          </section>

          {/* Section 0.5: Complete Store Concierge, Contact & Social Settings */}
          <section className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 sm:p-8 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#7C736A]">Customer Concierge & Touchpoints</p>
              <h2 className="font-serif text-2xl text-[#1E1B18] font-normal mt-1">
                Store Contact, WhatsApp & Social Channels
              </h2>
              <p className="text-xs text-[#5C544D] mt-1">
                Manage all customer contact channels displayed across Checkout, Order Tracking, Contact page, and Website Footer.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* WhatsApp Concierge Number */}
              <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-[#1E1B18]">
                    Official WhatsApp Concierge Number:
                  </label>
                  {settings.whatsappNumber && (
                    <a
                      href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#2E7D32] hover:underline font-mono inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Test Link
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  value={settings.whatsappNumber ?? '919876543210'}
                  onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value.replace(/[^0-9]/g, '') })}
                  placeholder="e.g. 919876543210 (Country code + 10 digits)"
                  className="w-full bg-white border border-[#E0D8CE] px-3.5 py-2 text-xs text-[#1E1B18] font-mono focus:outline-none focus:border-[#1E1B18]"
                />
                <p className="text-[10px] text-[#7C736A]">
                  Used for instant COD confirmation button, order status chat, and footer concierge.
                </p>
              </div>

              {/* Client Care Email */}
              <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 space-y-2">
                <label className="block text-xs font-medium text-[#1E1B18]">
                  Client Care Email Address:
                </label>
                <input
                  type="email"
                  value={settings.supportEmail ?? 'care@aabhaclothing.com'}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  placeholder="e.g. care@aabhaclothing.com"
                  className="w-full bg-white border border-[#E0D8CE] px-3.5 py-2 text-xs text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                />
                <p className="text-[10px] text-[#7C736A]">
                  Displayed in Contact Us and Website Footer.
                </p>
              </div>

              {/* Calling Helpline Phone */}
              <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 space-y-2">
                <label className="block text-xs font-medium text-[#1E1B18]">
                  Store Calling Helpline Phone:
                </label>
                <input
                  type="text"
                  value={settings.supportPhone ?? '+91 98765 43210'}
                  onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full bg-white border border-[#E0D8CE] px-3.5 py-2 text-xs text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                />
                <p className="text-[10px] text-[#7C736A]">
                  Displayed for voice customer support.
                </p>
              </div>

              {/* Instagram Profile URL */}
              <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 space-y-2">
                <label className="block text-xs font-medium text-[#1E1B18]">
                  Instagram Profile URL & Handle:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="url"
                    value={settings.instagramUrl ?? 'https://instagram.com/aabhaclothing'}
                    onChange={(e) => setSettings({ ...settings, instagramUrl: e.target.value })}
                    placeholder="https://instagram.com/..."
                    className="w-full bg-white border border-[#E0D8CE] px-3 py-2 text-xs text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                  />
                  <input
                    type="text"
                    value={settings.instagramHandle ?? '@aabhaclothing'}
                    onChange={(e) => setSettings({ ...settings, instagramHandle: e.target.value })}
                    placeholder="@aabhaclothing"
                    className="w-full bg-white border border-[#E0D8CE] px-3 py-2 text-xs text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                  />
                </div>
                <p className="text-[10px] text-[#7C736A]">
                  Powers the Instagram grid section and footer link.
                </p>
              </div>

              {/* Atelier Physical Address */}
              <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 space-y-2">
                <label className="block text-xs font-medium text-[#1E1B18]">
                  Boutique / Atelier Studio Address:
                </label>
                <input
                  type="text"
                  value={settings.storeAddress ?? 'AABHA Atelier, Mumbai, Maharashtra 400001'}
                  onChange={(e) => setSettings({ ...settings, storeAddress: e.target.value })}
                  placeholder="e.g. AABHA Atelier, Mumbai, Maharashtra 400001"
                  className="w-full bg-white border border-[#E0D8CE] px-3.5 py-2 text-xs text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                />
              </div>

              {/* Assistance Hours */}
              <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 space-y-2">
                <label className="block text-xs font-medium text-[#1E1B18]">
                  Customer Assistance Hours:
                </label>
                <input
                  type="text"
                  value={settings.storeHours ?? 'Monday to Saturday · 10:00 AM – 7:00 PM IST'}
                  onChange={(e) => setSettings({ ...settings, storeHours: e.target.value })}
                  placeholder="e.g. Monday to Saturday · 10:00 AM – 7:00 PM IST"
                  className="w-full bg-white border border-[#E0D8CE] px-3.5 py-2 text-xs text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                />
              </div>
            </div>
          </section>

          {/* Section 1: Brand Logo */}
          <section className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 sm:p-8 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#7C736A]">Identity</p>
              <h2 className="font-serif text-2xl text-[#1E1B18] font-normal mt-1">
                Brand Logo (Header & Footer)
              </h2>
              <p className="text-xs text-[#5C544D] mt-1">
                Upload your boutique SVG or PNG logo (Max {MAX_IMAGE_FILE_SIZE_MB} MB). This logo appears in the top navigation header and the website footer.
              </p>
            </div>

            <div
              className={`flex flex-col sm:flex-row sm:items-center gap-6 p-4 bg-[#FAF8F5] border ${
                errors.logoUrl || fieldUploadErrors.logoUrl ? 'border-[#C62828]' : 'border-[#E0D8CE]'
              }`}
            >
              <div className="h-16 w-36 bg-[#ECE6DD]/40 flex items-center justify-center p-2 border border-[#E0D8CE] shrink-0">
                <img src={settings.logoUrl} alt="Brand Logo" className="max-h-12 max-w-full object-contain" />
              </div>
              <div className="flex-1 space-y-2">
                <span className="text-xs font-mono text-[#5C544D] block truncate">
                  Current path:{' '}
                  {settings.logoUrl?.startsWith('data:')
                    ? '[Uploaded Custom Logo — Optimized]'
                    : settings.logoUrl}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => triggerFileUpload('logoUrl')}
                    disabled={uploadingKey === 'logoUrl'}
                    className="px-3.5 py-1.5 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-wider hover:bg-[#14110E] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingKey === 'logoUrl' ? 'Uploading...' : 'Upload New Logo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSettings({ ...settings, logoUrl: '/logo.svg' });
                      setFieldUploadErrors((prev) => {
                        const next = { ...prev };
                        delete next.logoUrl;
                        return next;
                      });
                    }}
                    className="px-3.5 py-1.5 border border-[#E0D8CE] text-xs text-[#7C736A] hover:text-[#1E1B18] cursor-pointer"
                  >
                    Reset to Default
                  </button>
                </div>
                {(errors.logoUrl || fieldUploadErrors.logoUrl) && (
                  <p className="text-xs text-[#C62828] flex items-center gap-1.5 font-medium" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldUploadErrors.logoUrl || errors.logoUrl}</span>
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Section 2: Hero Carousel Banner Slides & Storytelling Texts */}
          <section className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 sm:p-8 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#7C736A]">Homepage Top Hero</p>
              <h2 className="font-serif text-2xl text-[#1E1B18] font-normal mt-1">
                Hero Slideshow Banners & Headlines (3 Slides)
              </h2>
              <p className="text-xs text-[#5C544D] mt-1">
                The full-bleed editorial slides and typography rotating at the top of your homepage. Max {MAX_IMAGE_FILE_SIZE_MB} MB per slide.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Slide 1 */}
              <div
                className={`bg-[#FAF8F5] border p-4 space-y-3 ${
                  errors.heroBanner || fieldUploadErrors.heroBanner
                    ? 'border-[#C62828]'
                    : 'border-[#E0D8CE]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1E1B18]">Slide 01 · Handloom Edit</span>
                  <span className="text-[11px] font-mono text-[#7C736A]">Max {MAX_IMAGE_FILE_SIZE_MB} MB</span>
                </div>
                <div className="aspect-[4/5] bg-[#ECE6DD] overflow-hidden border border-[#E0D8CE]">
                  <img src={settings.heroBanner} alt="Hero Slide 1" className="w-full h-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => triggerFileUpload('heroBanner')}
                  disabled={uploadingKey === 'heroBanner'}
                  className="w-full py-2 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-wider hover:bg-[#14110E] transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingKey === 'heroBanner' ? 'Uploading...' : 'Change Desktop Photo'}
                </button>
                {(errors.heroBanner || fieldUploadErrors.heroBanner) && (
                  <p className="text-xs text-[#C62828] flex items-center gap-1 font-medium" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldUploadErrors.heroBanner || errors.heroBanner}</span>
                  </p>
                )}

                {/* Mobile Phone Banner */}
                <div className="pt-2 border-t border-[#E0D8CE] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#1E1B18]">📱 Mobile Phone Banner</span>
                    <span className="text-[10px] text-[#7C736A]">Portrait / Phones</span>
                  </div>
                  {settings.heroBannerMobile ? (
                    <div className="relative aspect-[9/16] max-h-36 w-20 mx-auto bg-[#ECE6DD] overflow-hidden border border-[#E0D8CE]">
                      <img src={settings.heroBannerMobile} alt="Mobile Slide 1" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="p-2 bg-[#F3EFEA] border border-dashed border-[#D5CCC0] text-center text-[10px] text-[#7C736A]">
                      No mobile photo uploaded (auto-falls back to desktop banner with responsive auto-framing).
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => triggerFileUpload('heroBannerMobile')}
                      disabled={uploadingKey === 'heroBannerMobile'}
                      className="flex-1 py-1.5 bg-[#FAF8F5] border border-[#E0D8CE] text-[#1E1B18] hover:bg-[#ECE6DD] text-[11px] font-medium uppercase tracking-wider transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3 h-3" />
                      {uploadingKey === 'heroBannerMobile' ? 'Uploading...' : 'Upload Mobile Banner'}
                    </button>
                    {settings.heroBannerMobile && (
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, heroBannerMobile: '' })}
                        className="px-2 py-1.5 border border-[#E0D8CE] text-[#C62828] text-[11px] hover:bg-[#FFEBEE] cursor-pointer"
                        title="Remove mobile banner"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#E0D8CE]">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Eyebrow Tag:</label>
                    <input
                      type="text"
                      value={settings.heroSlide1Eyebrow ?? 'INAUGURAL EDIT · HANDLOOM'}
                      onChange={(e) => setSettings({ ...settings, heroSlide1Eyebrow: e.target.value })}
                      className="w-full bg-white border border-[#E0D8CE] px-2 py-1 text-xs text-[#1E1B18] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Headline:</label>
                    <input
                      type="text"
                      value={settings.heroSlide1Heading ?? 'EFFORTLESSLY INDIAN.'}
                      onChange={(e) => setSettings({ ...settings, heroSlide1Heading: e.target.value })}
                      className="w-full bg-white border border-[#E0D8CE] px-2 py-1 text-xs text-[#1E1B18] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Subheading:</label>
                    <input
                      type="text"
                      value={settings.heroSlide1Subheading ?? 'Modern silhouettes. Timeless elegance.'}
                      onChange={(e) => setSettings({ ...settings, heroSlide1Subheading: e.target.value })}
                      className="w-full bg-white border border-[#E0D8CE] px-2 py-1 text-xs text-[#1E1B18] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Slide 2 */}
              <div
                className={`bg-[#FAF8F5] border p-4 space-y-3 ${
                  errors.heroCoords || fieldUploadErrors.heroCoords
                    ? 'border-[#C62828]'
                    : 'border-[#E0D8CE]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1E1B18]">Slide 02 · Co-ord Edit</span>
                  <span className="text-[11px] font-mono text-[#7C736A]">Max {MAX_IMAGE_FILE_SIZE_MB} MB</span>
                </div>
                <div className="aspect-[4/5] bg-[#ECE6DD] overflow-hidden border border-[#E0D8CE]">
                  <img src={settings.heroCoords} alt="Hero Slide 2" className="w-full h-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => triggerFileUpload('heroCoords')}
                  disabled={uploadingKey === 'heroCoords'}
                  className="w-full py-2 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-wider hover:bg-[#14110E] transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingKey === 'heroCoords' ? 'Uploading...' : 'Change Desktop Photo'}
                </button>
                {(errors.heroCoords || fieldUploadErrors.heroCoords) && (
                  <p className="text-xs text-[#C62828] flex items-center gap-1 font-medium" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldUploadErrors.heroCoords || errors.heroCoords}</span>
                  </p>
                )}

                {/* Mobile Phone Banner */}
                <div className="pt-2 border-t border-[#E0D8CE] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#1E1B18]">📱 Mobile Phone Banner</span>
                    <span className="text-[10px] text-[#7C736A]">Portrait / Phones</span>
                  </div>
                  {settings.heroCoordsMobile ? (
                    <div className="relative aspect-[9/16] max-h-36 w-20 mx-auto bg-[#ECE6DD] overflow-hidden border border-[#E0D8CE]">
                      <img src={settings.heroCoordsMobile} alt="Mobile Slide 2" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="p-2 bg-[#F3EFEA] border border-dashed border-[#D5CCC0] text-center text-[10px] text-[#7C736A]">
                      No mobile photo uploaded (auto-falls back to desktop banner with responsive auto-framing).
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => triggerFileUpload('heroCoordsMobile')}
                      disabled={uploadingKey === 'heroCoordsMobile'}
                      className="flex-1 py-1.5 bg-[#FAF8F5] border border-[#E0D8CE] text-[#1E1B18] hover:bg-[#ECE6DD] text-[11px] font-medium uppercase tracking-wider transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3 h-3" />
                      {uploadingKey === 'heroCoordsMobile' ? 'Uploading...' : 'Upload Mobile Banner'}
                    </button>
                    {settings.heroCoordsMobile && (
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, heroCoordsMobile: '' })}
                        className="px-2 py-1.5 border border-[#E0D8CE] text-[#C62828] text-[11px] hover:bg-[#FFEBEE] cursor-pointer"
                        title="Remove mobile banner"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#E0D8CE]">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Eyebrow Tag:</label>
                    <input
                      type="text"
                      value={settings.heroSlide2Eyebrow ?? 'THE CO-ORD EDIT'}
                      onChange={(e) => setSettings({ ...settings, heroSlide2Eyebrow: e.target.value })}
                      className="w-full bg-white border border-[#E0D8CE] px-2 py-1 text-xs text-[#1E1B18] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Headline:</label>
                    <input
                      type="text"
                      value={settings.heroSlide2Heading ?? 'MODERN. EFFORTLESS. YOURS.'}
                      onChange={(e) => setSettings({ ...settings, heroSlide2Heading: e.target.value })}
                      className="w-full bg-white border border-[#E0D8CE] px-2 py-1 text-xs text-[#1E1B18] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Subheading:</label>
                    <input
                      type="text"
                      value={settings.heroSlide2Subheading ?? 'Contemporary silhouettes designed for everyday elegance.'}
                      onChange={(e) => setSettings({ ...settings, heroSlide2Subheading: e.target.value })}
                      className="w-full bg-white border border-[#E0D8CE] px-2 py-1 text-xs text-[#1E1B18] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Slide 3 */}
              <div
                className={`bg-[#FAF8F5] border p-4 space-y-3 ${
                  errors.heroEthnic || fieldUploadErrors.heroEthnic
                    ? 'border-[#C62828]'
                    : 'border-[#E0D8CE]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1E1B18]">Slide 03 · Ethnic Edit</span>
                  <span className="text-[11px] font-mono text-[#7C736A]">Max {MAX_IMAGE_FILE_SIZE_MB} MB</span>
                </div>
                <div className="aspect-[4/5] bg-[#ECE6DD] overflow-hidden border border-[#E0D8CE]">
                  <img src={settings.heroEthnic} alt="Hero Slide 3" className="w-full h-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => triggerFileUpload('heroEthnic')}
                  disabled={uploadingKey === 'heroEthnic'}
                  className="w-full py-2 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-wider hover:bg-[#14110E] transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingKey === 'heroEthnic' ? 'Uploading...' : 'Change Desktop Photo'}
                </button>
                {(errors.heroEthnic || fieldUploadErrors.heroEthnic) && (
                  <p className="text-xs text-[#C62828] flex items-center gap-1 font-medium" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldUploadErrors.heroEthnic || errors.heroEthnic}</span>
                  </p>
                )}

                {/* Mobile Phone Banner */}
                <div className="pt-2 border-t border-[#E0D8CE] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#1E1B18]">📱 Mobile Phone Banner</span>
                    <span className="text-[10px] text-[#7C736A]">Portrait / Phones</span>
                  </div>
                  {settings.heroEthnicMobile ? (
                    <div className="relative aspect-[9/16] max-h-36 w-20 mx-auto bg-[#ECE6DD] overflow-hidden border border-[#E0D8CE]">
                      <img src={settings.heroEthnicMobile} alt="Mobile Slide 3" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="p-2 bg-[#F3EFEA] border border-dashed border-[#D5CCC0] text-center text-[10px] text-[#7C736A]">
                      No mobile photo uploaded (auto-falls back to desktop banner with responsive auto-framing).
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => triggerFileUpload('heroEthnicMobile')}
                      disabled={uploadingKey === 'heroEthnicMobile'}
                      className="flex-1 py-1.5 bg-[#FAF8F5] border border-[#E0D8CE] text-[#1E1B18] hover:bg-[#ECE6DD] text-[11px] font-medium uppercase tracking-wider transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3 h-3" />
                      {uploadingKey === 'heroEthnicMobile' ? 'Uploading...' : 'Upload Mobile Banner'}
                    </button>
                    {settings.heroEthnicMobile && (
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, heroEthnicMobile: '' })}
                        className="px-2 py-1.5 border border-[#E0D8CE] text-[#C62828] text-[11px] hover:bg-[#FFEBEE] cursor-pointer"
                        title="Remove mobile banner"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-[#E0D8CE]">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Eyebrow Tag:</label>
                    <input
                      type="text"
                      value={settings.heroSlide3Eyebrow ?? 'TIMELESS INDIAN'}
                      onChange={(e) => setSettings({ ...settings, heroSlide3Eyebrow: e.target.value })}
                      className="w-full bg-white border border-[#E0D8CE] px-2 py-1 text-xs text-[#1E1B18] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Headline:</label>
                    <input
                      type="text"
                      value={settings.heroSlide3Heading ?? 'MADE FOR EVERY MOMENT.'}
                      onChange={(e) => setSettings({ ...settings, heroSlide3Heading: e.target.value })}
                      className="w-full bg-white border border-[#E0D8CE] px-2 py-1 text-xs text-[#1E1B18] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Subheading:</label>
                    <input
                      type="text"
                      value={settings.heroSlide3Subheading ?? 'Refined Indian silhouettes for celebrations and everyday occasions.'}
                      onChange={(e) => setSettings({ ...settings, heroSlide3Subheading: e.target.value })}
                      className="w-full bg-white border border-[#E0D8CE] px-2 py-1 text-xs text-[#1E1B18] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Brand Story Editorial Image & Copy */}
          <section className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 sm:p-8 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#7C736A]">Craftsmanship Section</p>
              <h2 className="font-serif text-2xl text-[#1E1B18] font-normal mt-1">
                Brand Story & Philosophy Section
              </h2>
              <p className="text-xs text-[#5C544D] mt-1">
                The large wide editorial image and storytelling copy displayed on your homepage. Max {MAX_IMAGE_FILE_SIZE_MB} MB.
              </p>
            </div>

            <div
              className={`grid grid-cols-1 md:grid-cols-12 gap-6 items-start bg-[#FAF8F5] border p-4 ${
                errors.brandStory || fieldUploadErrors.brandStory
                  ? 'border-[#C62828]'
                  : 'border-[#E0D8CE]'
              }`}
            >
              <div className="md:col-span-5 space-y-3">
                <div className="aspect-[16/10] bg-[#ECE6DD] overflow-hidden border border-[#E0D8CE]">
                  <img src={settings.brandStory} alt="Brand Story" className="w-full h-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => triggerFileUpload('brandStory')}
                  disabled={uploadingKey === 'brandStory'}
                  className="w-full py-2 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-wider hover:bg-[#14110E] transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingKey === 'brandStory' ? 'Uploading...' : 'Upload Brand Story Image'}
                </button>
                {(errors.brandStory || fieldUploadErrors.brandStory) && (
                  <p className="text-xs text-[#C62828] flex items-center gap-1 font-medium" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldUploadErrors.brandStory || errors.brandStory}</span>
                  </p>
                )}
              </div>

              <div className="md:col-span-7 space-y-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-1 font-medium">Story Section Title:</label>
                  <input
                    type="text"
                    value={settings.brandStoryTitle ?? 'MADE FOR YOUR EVERYDAY ELEGANCE'}
                    onChange={(e) => setSettings({ ...settings, brandStoryTitle: e.target.value })}
                    className="w-full bg-white border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-1 font-medium">Philosophy Paragraph 1:</label>
                  <textarea
                    rows={3}
                    value={settings.brandStoryParagraph1 ?? 'Born from a desire to move beyond heavy occasion-only ornamentation, AABHA reimagines Indian textile heritage for the rhythm of modern life.'}
                    onChange={(e) => setSettings({ ...settings, brandStoryParagraph1: e.target.value })}
                    className="w-full bg-white border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-1 font-medium">Philosophy Paragraph 2:</label>
                  <textarea
                    rows={3}
                    value={settings.brandStoryParagraph2 ?? 'Every garment is tailored with French seams, deep concealed pockets, and soft cotton mulmul linings—silhouettes that feel as natural in morning light as they do at an intimate evening gathering.'}
                    onChange={(e) => setSettings({ ...settings, brandStoryParagraph2: e.target.value })}
                    className="w-full bg-white border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Instagram Showcase Gallery Grid */}
          <section className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-[#7C736A]">Social Showcase</p>
                <h2 className="font-serif text-2xl text-[#1E1B18] font-normal mt-1">
                  Instagram Editorial Gallery (6 Images)
                </h2>
                <p className="text-xs text-[#5C544D] mt-1">
                  The 6-image editorial grid displayed near the footer. Click any image to replace it (Max {MAX_IMAGE_FILE_SIZE_MB} MB per image).
                </p>
              </div>
            </div>

            {errors.igPhotos && (
              <p className="text-xs text-[#C62828] flex items-center gap-1.5 font-medium" role="alert">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.igPhotos}</span>
              </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {settings.igPhotos?.map((photo, idx) => {
                const fieldKey = `igPhoto_${idx}`;
                const cardErr = fieldUploadErrors[fieldKey];
                return (
                  <div
                    key={idx}
                    className={`bg-[#FAF8F5] border p-2 space-y-2 ${
                      cardErr ? 'border-[#C62828]' : 'border-[#E0D8CE]'
                    }`}
                  >
                    <div className="aspect-[3/4] bg-[#ECE6DD] overflow-hidden border border-[#E0D8CE]">
                      <img src={photo} alt={`Instagram ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                    <button
                      type="button"
                      onClick={() => triggerFileUpload(fieldKey)}
                      disabled={uploadingKey === fieldKey}
                      className="w-full py-1.5 bg-[#FAF8F5] border border-[#E0D8CE] text-[11px] font-medium text-[#1E1B18] hover:bg-[#ECE6DD] transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingKey === fieldKey ? '...' : `Change #${idx + 1}`}
                    </button>
                    {cardErr && (
                      <p className="text-[10px] text-[#C62828] leading-tight" role="alert">
                        {cardErr}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Bottom Floating Save Bar */}
          <div className="pt-6 border-t border-[#ECE6DD] flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3.5 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-[0.18em] hover:bg-[#14110E] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving Changes...' : 'Save All Branding & Media'}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
