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
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Layers,
  Sparkles,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Clock,
  Instagram,
  ShoppingBag,
  BookOpen,
  Award,
  Sliders,
} from 'lucide-react';
import { AdminLayout } from '@/src/components/AdminLayout';
import { useAuth } from '@/src/context/AuthContext';
import type { SiteSettings } from '../../api/settings/route';
import { CATEGORIES, CollectionFilter } from '@/src/data/products';
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

type BrandingTab = 'hero' | 'categories' | 'arrivals_trust' | 'story_about' | 'contact_social' | 'layout_manager';

export default function AdminBrandingPage() {
  const { adminToken } = useAuth();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<BrandingTab>('hero');
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  // Simultaneous validation & inline upload error state
  const [errors, setErrors] = useState<BrandingFormErrors>({});
  const [fieldUploadErrors, setFieldUploadErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentFieldToUpload, setCurrentFieldToUpload] = useState<string | null>(null);

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
        } else if (fieldKey.startsWith('categoryImage_')) {
          const catKey = fieldKey.replace('categoryImage_', '');
          nextSettings = {
            ...settings,
            categoryImages: {
              ...(settings.categoryImages || {}),
              [catKey]: data.imageUrl,
            },
          };
        } else {
          nextSettings = { ...settings, [fieldKey]: data.imageUrl };
        }
        setSettings(nextSettings);
        const validation = validateBrandingForm(nextSettings);
        setErrors(validation.errors);
        showToast('Image uploaded! Remember to click "Save All Changes" to publish.');
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

      const compressedCategoryImages: Record<string, string> = {};
      if (settings.categoryImages) {
        for (const [cat, img] of Object.entries(settings.categoryImages)) {
          if (img) {
            compressedCategoryImages[cat] = await compressDataUrlIfNeeded(img);
          }
        }
      }

      const payload: SiteSettings = {
        ...settings,
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
        brandStory: await compressDataUrlIfNeeded(settings.brandStory),
        igPhotos: compressedIg,
        categoryImages: compressedCategoryImages,
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
        showToast('All storefront sections & branding saved successfully!');
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

  const updateCategoryTagline = (categoryKey: string, value: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      categoryTaglines: {
        ...(settings.categoryTaglines || {}),
        [categoryKey]: value,
      },
    });
  };

  const removeCategoryImage = (categoryKey: string) => {
    if (!settings) return;
    const nextImages = { ...(settings.categoryImages || {}) };
    delete nextImages[categoryKey];
    setSettings({
      ...settings,
      categoryImages: nextImages,
    });
  };

  const toggleSection = (flag: keyof SiteSettings) => {
    if (!settings) return;
    const current = settings[flag] !== false;
    setSettings({
      ...settings,
      [flag]: !current,
    });
  };

  const activeErrors = [
    ...Object.values(errors).filter(Boolean),
    ...Object.values(fieldUploadErrors).filter(Boolean),
  ];

  const renderSectionHeader = (
    title: string,
    eyebrow: string,
    description: string,
    flag: keyof SiteSettings,
    sectionName: string
  ) => {
    const isVisible = settings?.[flag] !== false;
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#ECE6DD]">
        <div>
          <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-[#7C736A] block">
            {eyebrow}
          </span>
          <h2 className="font-serif text-2xl text-[#1E1B18] font-normal mt-0.5">{title}</h2>
          <p className="text-xs text-[#5C544D] mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider rounded-full border ${
              isVisible
                ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                : 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]'
            }`}
          >
            {isVisible ? (
              <>
                <Eye className="w-3 h-3" /> Visible on Storefront
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3" /> Removed from Storefront
              </>
            )}
          </span>
          <button
            type="button"
            onClick={() => toggleSection(flag)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer border ${
              isVisible
                ? 'bg-white text-[#C62828] border-[#FFCDD2] hover:bg-[#FFEBEE]'
                : 'bg-[#231F1D] text-[#FAF8F5] border-[#231F1D] hover:bg-[#14110E]'
            }`}
          >
            {isVisible ? (
              <>
                <Trash2 className="w-3.5 h-3.5" /> Remove Section
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" /> Add Back to Page
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderRemovedPlaceholder = (sectionName: string, flag: keyof SiteSettings) => (
    <div className="p-6 bg-[#FAF8F5] border border-dashed border-[#D5CCC0] text-center space-y-3">
      <div className="w-10 h-10 mx-auto rounded-full bg-[#ECE6DD] flex items-center justify-center text-[#7C736A]">
        <EyeOff className="w-5 h-5" />
      </div>
      <div>
        <p className="font-serif text-lg text-[#1E1B18]">
          {sectionName} is Currently Removed
        </p>
        <p className="text-xs text-[#7C736A] max-w-md mx-auto mt-1">
          This section is hidden and will not be displayed on the storefront. Click below to re-enable and customize it.
        </p>
      </div>
      <button
        type="button"
        onClick={() => toggleSection(flag)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-wider hover:bg-[#14110E] transition-colors cursor-pointer shadow-sm"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add {sectionName} to Storefront</span>
      </button>
    </div>
  );

  return (
    <AdminLayout
      title="Storefront Sections & Media Manager"
      subtitle="Customize content, headlines, images, and add or remove any section across your luxury storefront."
      extraAction={
        <button
          onClick={handleSave}
          disabled={saving || !settings}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-wider hover:bg-[#14110E] transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
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
        <div className="py-24 text-center text-sm text-[#7C736A] flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-6 h-6 text-[#6E5043] animate-spin" />
          <span>Loading storefront sections...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top Tabs Navigation */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[#ECE6DD] pb-2 bg-[#FAF8F5] p-2">
            {[
              { id: 'hero', label: '1. Hero & Notice Bar', icon: Layers },
              { id: 'categories', label: '2. Category & Curated', icon: ShoppingBag },
              { id: 'arrivals_trust', label: '3. New Arrivals & Pillars', icon: Award },
              { id: 'story_about', label: '4. Brand Story & About Page', icon: BookOpen },
              { id: 'contact_social', label: '5. Concierge, Trust & Conversion', icon: MessageCircle },
              { id: 'layout_manager', label: '6. Page Sections Add/Remove', icon: Sliders },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as BrandingTab)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium tracking-wider uppercase transition-colors cursor-pointer border ${
                    isActive
                      ? 'bg-[#231F1D] text-[#FAF8F5] border-[#231F1D] shadow-sm'
                      : 'bg-white text-[#5C544D] border-[#E0D8CE] hover:text-[#1E1B18] hover:border-[#1E1B18]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Image Size Limit Banner */}
          <div className="p-3.5 bg-[#FAF8F5] border border-[#E0D8CE] flex flex-wrap items-center justify-between gap-2 text-xs text-[#5C544D]">
            <span className="inline-flex items-center gap-1.5 font-medium text-[#1E1B18]">
              <Info className="w-4 h-4 text-[#6E5043] shrink-0" />
              <span>Section Management: Customize content or toggle Add/Remove for any storefront section.</span>
            </span>
            <span className="font-mono text-[11px] text-[#6E5043]">
              Photo Upload Limit: Max {MAX_IMAGE_FILE_SIZE_MB} MB
            </span>
          </div>

          {/* Validation Errors Box */}
          {(activeErrors.length > 0 || serverError) && (
            <div
              role="alert"
              className="p-4 bg-[#FFF5F5] border border-[#C62828] text-xs text-[#C62828] space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Media Validation Errors ({activeErrors.length + (serverError ? 1 : 0)})</span>
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

          {/* TAB 1: HERO & ANNOUNCEMENT BAR */}
          {activeTab === 'hero' && (
            <div className="space-y-8 animate-fadeIn">
              {/* Section: Announcement Bar */}
              <section className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 sm:p-8 space-y-6">
                {renderSectionHeader(
                  'Top Announcement Bar',
                  'Header Notification',
                  'The promotional or express shipping banner displayed across the very top of your storefront header.',
                  'showAnnouncementBar',
                  'Announcement Bar'
                )}

                {settings.showAnnouncementBar === false ? (
                  renderRemovedPlaceholder('Announcement Bar', 'showAnnouncementBar')
                ) : (
                  <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 space-y-2">
                    <label className="block text-xs font-medium text-[#1E1B18]">
                      Announcement Bar Notice Text:
                    </label>
                    <input
                      type="text"
                      value={settings.announcementText ?? ''}
                      onChange={(e) => setSettings({ ...settings, announcementText: e.target.value })}
                      placeholder="e.g. Complimentary express shipping across India on orders above ₹1,999 · Artisan Handcrafted"
                      className="w-full bg-white border border-[#E0D8CE] px-3.5 py-2 text-xs text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                    />
                    <p className="text-[10px] text-[#7C736A]">
                      Leave empty or toggle remove above to hide the top bar completely.
                    </p>
                  </div>
                )}
              </section>

              {/* Section: Hero Slideshow Banners */}
              <section className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 sm:p-8 space-y-6">
                {renderSectionHeader(
                  'Hero Carousel Slides (3 Slides)',
                  'Homepage Top Hero',
                  'Full-bleed rotating editorial slides, headings, button labels, and link destinations.',
                  'showHeroCarousel',
                  'Hero Carousel'
                )}

                {settings.showHeroCarousel === false ? (
                  renderRemovedPlaceholder('Hero Carousel Slides', 'showHeroCarousel')
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Slide 1 */}
                    <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 space-y-3">
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

                      {/* Mobile Phone Banner */}
                      <div className="pt-2 border-t border-[#E0D8CE] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#1E1B18]">📱 Mobile Phone Banner</span>
                          <span className="text-[10px] text-[#7C736A]">Portrait</span>
                        </div>
                        {settings.heroBannerMobile ? (
                          <div className="relative aspect-[9/16] max-h-36 w-20 mx-auto bg-[#ECE6DD] overflow-hidden border border-[#E0D8CE]">
                            <img src={settings.heroBannerMobile} alt="Mobile Slide 1" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="p-2 bg-[#F3EFEA] border border-dashed border-[#D5CCC0] text-center text-[10px] text-[#7C736A]">
                            No mobile photo uploaded (auto-falls back to desktop banner).
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
                            {uploadingKey === 'heroBannerMobile' ? 'Uploading...' : 'Upload Mobile Photo'}
                          </button>
                          {settings.heroBannerMobile && (
                            <button
                              type="button"
                              onClick={() => setSettings({ ...settings, heroBannerMobile: '' })}
                              className="px-2 py-1.5 border border-[#E0D8CE] text-[#C62828] text-[11px] hover:bg-[#FFEBEE] cursor-pointer"
                              title="Remove mobile photo"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Copy & CTA */}
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
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Button Label:</label>
                          <input
                            type="text"
                            value={settings.heroSlide1ButtonLabel ?? 'SHOP THE COLLECTION'}
                            onChange={(e) => setSettings({ ...settings, heroSlide1ButtonLabel: e.target.value })}
                            className="w-full bg-white border border-[#E0D8CE] px-2 py-1 text-xs text-[#1E1B18] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Target Category / Link:</label>
                          <select
                            value={settings.heroSlide1TargetCategory ?? 'All Collection'}
                            onChange={(e) => setSettings({ ...settings, heroSlide1TargetCategory: e.target.value })}
                            className="w-full bg-white border border-[#E0D8CE] px-2 py-1 text-xs text-[#1E1B18] focus:outline-none"
                          >
                            <option value="All Collection">All Collection</option>
                            <option value="Anarkali">Anarkali</option>
                            <option value="3-Piece Dresses">3-Piece Dresses</option>
                            <option value="Co-ord Sets">Co-ord Sets</option>
                            <option value="Chikankari Suit">Chikankari Suit</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Slide 2 */}
                    <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 space-y-3">
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

                      {/* Mobile Phone Banner */}
                      <div className="pt-2 border-t border-[#E0D8CE] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#1E1B18]">📱 Mobile Phone Banner</span>
                          <span className="text-[10px] text-[#7C736A]">Portrait</span>
                        </div>
                        {settings.heroCoordsMobile ? (
                          <div className="relative aspect-[9/16] max-h-36 w-20 mx-auto bg-[#ECE6DD] overflow-hidden border border-[#E0D8CE]">
                            <img src={settings.heroCoordsMobile} alt="Mobile Slide 2" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="p-2 bg-[#F3EFEA] border border-dashed border-[#D5CCC0] text-center text-[10px] text-[#7C736A]">
                            No mobile photo uploaded (auto-falls back to desktop banner).
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
                            {uploadingKey === 'heroCoordsMobile' ? 'Uploading...' : 'Upload Mobile Photo'}
                          </button>
                          {settings.heroCoordsMobile && (
                            <button
                              type="button"
                              onClick={() => setSettings({ ...settings, heroCoordsMobile: '' })}
                              className="px-2 py-1.5 border border-[#E0D8CE] text-[#C62828] text-[11px] hover:bg-[#FFEBEE] cursor-pointer"
                              title="Remove mobile photo"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Copy & CTA */}
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
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Button Label:</label>
                          <input
                            type="text"
                            value={settings.heroSlide2ButtonLabel ?? 'SHOP CO-ORDS'}
                            onChange={(e) => setSettings({ ...settings, heroSlide2ButtonLabel: e.target.value })}
                            className="w-full bg-white border border-[#E0D8CE] px-2 py-1 text-xs text-[#1E1B18] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Target Category / Link:</label>
                          <select
                            value={settings.heroSlide2TargetCategory ?? 'Co-ord Sets'}
                            onChange={(e) => setSettings({ ...settings, heroSlide2TargetCategory: e.target.value })}
                            className="w-full bg-white border border-[#E0D8CE] px-2 py-1 text-xs text-[#1E1B18] focus:outline-none"
                          >
                            <option value="All Collection">All Collection</option>
                            <option value="Anarkali">Anarkali</option>
                            <option value="3-Piece Dresses">3-Piece Dresses</option>
                            <option value="Co-ord Sets">Co-ord Sets</option>
                            <option value="Chikankari Suit">Chikankari Suit</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Slide 3 */}
                    <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 space-y-3">
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

                      {/* Mobile Phone Banner */}
                      <div className="pt-2 border-t border-[#E0D8CE] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#1E1B18]">📱 Mobile Phone Banner</span>
                          <span className="text-[10px] text-[#7C736A]">Portrait</span>
                        </div>
                        {settings.heroEthnicMobile ? (
                          <div className="relative aspect-[9/16] max-h-36 w-20 mx-auto bg-[#ECE6DD] overflow-hidden border border-[#E0D8CE]">
                            <img src={settings.heroEthnicMobile} alt="Mobile Slide 3" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="p-2 bg-[#F3EFEA] border border-dashed border-[#D5CCC0] text-center text-[10px] text-[#7C736A]">
                            No mobile photo uploaded (auto-falls back to desktop banner).
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
                            {uploadingKey === 'heroEthnicMobile' ? 'Uploading...' : 'Upload Mobile Photo'}
                          </button>
                          {settings.heroEthnicMobile && (
                            <button
                              type="button"
                              onClick={() => setSettings({ ...settings, heroEthnicMobile: '' })}
                              className="px-2 py-1.5 border border-[#E0D8CE] text-[#C62828] text-[11px] hover:bg-[#FFEBEE] cursor-pointer"
                              title="Remove mobile photo"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Copy & CTA */}
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
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Button Label:</label>
                          <input
                            type="text"
                            value={settings.heroSlide3ButtonLabel ?? 'EXPLORE THE COLLECTION'}
                            onChange={(e) => setSettings({ ...settings, heroSlide3ButtonLabel: e.target.value })}
                            className="w-full bg-white border border-[#E0D8CE] px-2 py-1 text-xs text-[#1E1B18] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Target Category / Link:</label>
                          <select
                            value={settings.heroSlide3TargetCategory ?? 'All Collection'}
                            onChange={(e) => setSettings({ ...settings, heroSlide3TargetCategory: e.target.value })}
                            className="w-full bg-white border border-[#E0D8CE] px-2 py-1 text-xs text-[#1E1B18] focus:outline-none"
                          >
                            <option value="All Collection">All Collection</option>
                            <option value="Anarkali">Anarkali</option>
                            <option value="3-Piece Dresses">3-Piece Dresses</option>
                            <option value="Co-ord Sets">Co-ord Sets</option>
                            <option value="Chikankari Suit">Chikankari Suit</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 2: CATEGORY & SPOTLIGHT */}
          {activeTab === 'categories' && (
            <div className="space-y-8 animate-fadeIn">
              {/* Section: Shop By Category */}
              <section className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 sm:p-8 space-y-6">
                {renderSectionHeader(
                  'Shop By Category Section',
                  'Category Showcase',
                  'Customize section heading, subheadings, and individual category taglines & cover photos.',
                  'showCategorySection',
                  'Shop By Category'
                )}

                {settings.showCategorySection === false ? (
                  renderRemovedPlaceholder('Shop By Category Section', 'showCategorySection')
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#FAF8F5] border border-[#E0D8CE] p-4">
                      <div>
                        <label className="block text-[11px] font-medium text-[#1E1B18] mb-1">
                          Section Eyebrow:
                        </label>
                        <input
                          type="text"
                          value={settings.categorySectionEyebrow ?? 'THE LAUNCH SILHOUETTES'}
                          onChange={(e) => setSettings({ ...settings, categorySectionEyebrow: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#1E1B18] mb-1">
                          Section Heading:
                        </label>
                        <input
                          type="text"
                          value={settings.categorySectionHeading ?? 'Shop By Category'}
                          onChange={(e) => setSettings({ ...settings, categorySectionHeading: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#1E1B18] mb-1">
                          Section Description:
                        </label>
                        <input
                          type="text"
                          value={settings.categorySectionSubheading ?? 'Fluid silhouettes tailored for effortless elegance'}
                          onChange={(e) => setSettings({ ...settings, categorySectionSubheading: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {CATEGORIES.map((category) => {
                        const customImage =
                          settings.categoryImages?.[category.name] ||
                          settings.categoryImages?.[category.id];
                        const customTagline =
                          settings.categoryTaglines?.[category.name] ||
                          settings.categoryTaglines?.[category.id] ||
                          category.tagline;
                        const uploadKey = `categoryImage_${category.id}`;

                        return (
                          <div
                            key={category.id}
                            className="bg-[#FAF8F5] border border-[#E0D8CE] p-3.5 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-[#1E1B18]">
                                {category.name}
                              </span>
                              <span className="text-[10px] text-[#7C736A] font-mono">
                                {category.index}
                              </span>
                            </div>

                            <div className="aspect-[4/3] bg-[#ECE6DD] overflow-hidden border border-[#E0D8CE]">
                              {customImage ? (
                                <img
                                  src={customImage}
                                  alt={category.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-[#F3EFEA]">
                                  <span className="text-xs font-serif text-[#1E1B18] font-medium">
                                    {category.name}
                                  </span>
                                  <span className="text-[10px] text-[#7C736A] mt-1">
                                    Default product cover
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => triggerFileUpload(uploadKey)}
                                disabled={uploadingKey === uploadKey}
                                className="flex-1 py-1.5 bg-[#FAF8F5] border border-[#E0D8CE] text-[11px] font-medium text-[#1E1B18] hover:bg-[#ECE6DD] transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <Upload className="w-3 h-3" />
                                {uploadingKey === uploadKey ? 'Uploading...' : 'Custom Photo'}
                              </button>
                              {customImage && (
                                <button
                                  type="button"
                                  onClick={() => removeCategoryImage(category.id)}
                                  className="px-2 py-1.5 border border-[#E0D8CE] text-[#C62828] text-[11px] hover:bg-[#FFEBEE] cursor-pointer"
                                  title="Reset to default product photo"
                                >
                                  Reset
                                </button>
                              )}
                            </div>

                            <div>
                              <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-1">
                                Category Tagline:
                              </label>
                              <input
                                type="text"
                                value={customTagline}
                                onChange={(e) => updateCategoryTagline(category.id, e.target.value)}
                                className="w-full bg-white border border-[#E0D8CE] px-2.5 py-1 text-xs text-[#1E1B18] focus:outline-none"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              {/* Section: Curated Collection / Spotlight */}
              <section className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 sm:p-8 space-y-6">
                {renderSectionHeader(
                  'Curated Collection / Spotlight Section',
                  'House Signatures',
                  'The curated showcase section highlighting selected foundational silhouettes.',
                  'showCuratedSection',
                  'Curated Collection'
                )}

                {settings.showCuratedSection === false ? (
                  renderRemovedPlaceholder('Curated Collection Section', 'showCuratedSection')
                ) : (
                  <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-medium text-[#1E1B18] mb-1">
                          Curated Eyebrow:
                        </label>
                        <input
                          type="text"
                          value={settings.curatedEyebrow ?? 'THE CURATED COLLECTION'}
                          onChange={(e) => setSettings({ ...settings, curatedEyebrow: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#1E1B18] mb-1">
                          Curated Heading:
                        </label>
                        <input
                          type="text"
                          value={settings.curatedHeading ?? 'Artisanal Grace, Tailored For Life'}
                          onChange={(e) => setSettings({ ...settings, curatedHeading: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#1E1B18] mb-1">
                          Curated Description:
                        </label>
                        <input
                          type="text"
                          value={
                            settings.curatedSubheading ??
                            'Each piece reflects our commitment to preserving heritage weaving techniques through modern, wearable design.'
                          }
                          onChange={(e) => setSettings({ ...settings, curatedSubheading: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 3: NEW ARRIVALS & TRUST PILLARS */}
          {activeTab === 'arrivals_trust' && (
            <div className="space-y-8 animate-fadeIn">
              {/* Section: New Arrivals */}
              <section className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 sm:p-8 space-y-6">
                {renderSectionHeader(
                  'New Arrivals Catalog Section',
                  'Product Catalog',
                  'The dynamic new arrivals grid showing recently published garments from your Atelier.',
                  'showNewArrivals',
                  'New Arrivals'
                )}

                {settings.showNewArrivals === false ? (
                  renderRemovedPlaceholder('New Arrivals Section', 'showNewArrivals')
                ) : (
                  <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-medium text-[#1E1B18] mb-1">
                          New Arrivals Eyebrow:
                        </label>
                        <input
                          type="text"
                          value={settings.newArrivalsEyebrow ?? 'INAUGURAL RELEASE'}
                          onChange={(e) => setSettings({ ...settings, newArrivalsEyebrow: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#1E1B18] mb-1">
                          New Arrivals Heading:
                        </label>
                        <input
                          type="text"
                          value={settings.newArrivalsHeading ?? 'New Arrivals'}
                          onChange={(e) => setSettings({ ...settings, newArrivalsHeading: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#1E1B18] mb-1">
                          New Arrivals Subheading:
                        </label>
                        <input
                          type="text"
                          value={
                            settings.newArrivalsSubheading ??
                            'Handcrafted in limited quantities with artisanal attention.'
                          }
                          onChange={(e) => setSettings({ ...settings, newArrivalsSubheading: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Section: Heritage & Trust Badges */}
              <section className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 sm:p-8 space-y-6">
                {renderSectionHeader(
                  'Heritage & Trust Badges (4 Pillars)',
                  'Trust & Commitments',
                  'The 4 value pillars displayed above the footer emphasizing artisanal tailoring, mulmul lining, and complimentary COD shipping.',
                  'showTrustBadges',
                  'Heritage & Trust Badges'
                )}

                {settings.showTrustBadges === false ? (
                  renderRemovedPlaceholder('Trust Badges Section', 'showTrustBadges')
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Badge 1 */}
                    <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 space-y-2">
                      <span className="text-[11px] font-semibold text-[#1E1B18]">Pillar 1: Delivery</span>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Title:</label>
                        <input
                          type="text"
                          value={settings.trustBadge1Title ?? 'Artisan Handcrafted'}
                          onChange={(e) => setSettings({ ...settings, trustBadge1Title: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-2.5 py-1 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Description:</label>
                        <textarea
                          rows={2}
                          value={
                            settings.trustBadge1Subtitle ??
                            'Complimentary insured express delivery across all Indian PIN codes.'
                          }
                          onChange={(e) => setSettings({ ...settings, trustBadge1Subtitle: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-2.5 py-1 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Badge 2 */}
                    <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 space-y-2">
                      <span className="text-[11px] font-semibold text-[#1E1B18]">Pillar 2: Tailoring</span>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Title:</label>
                        <input
                          type="text"
                          value={settings.trustBadge2Title ?? 'French Seams & Mulmul Lining'}
                          onChange={(e) => setSettings({ ...settings, trustBadge2Title: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-2.5 py-1 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Description:</label>
                        <textarea
                          rows={2}
                          value={
                            settings.trustBadge2Subtitle ??
                            '14-day complimentary doorstep return and size exchange.'
                          }
                          onChange={(e) => setSettings({ ...settings, trustBadge2Subtitle: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-2.5 py-1 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Badge 3 */}
                    <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 space-y-2">
                      <span className="text-[11px] font-semibold text-[#1E1B18]">Pillar 3: Payment</span>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Title:</label>
                        <input
                          type="text"
                          value={settings.trustBadge3Title ?? 'Complimentary Express Delivery & COD'}
                          onChange={(e) => setSettings({ ...settings, trustBadge3Title: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-2.5 py-1 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Description:</label>
                        <textarea
                          rows={2}
                          value={
                            settings.trustBadge3Subtitle ??
                            'Zero advance payment. Pay conveniently via cash or UPI upon delivery.'
                          }
                          onChange={(e) => setSettings({ ...settings, trustBadge3Subtitle: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-2.5 py-1 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Badge 4 */}
                    <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 space-y-2">
                      <span className="text-[11px] font-semibold text-[#1E1B18]">Pillar 4: Heritage</span>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Title:</label>
                        <input
                          type="text"
                          value={settings.trustBadge4Title ?? 'Dedicated Atelier Concierge'}
                          onChange={(e) => setSettings({ ...settings, trustBadge4Title: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-2.5 py-1 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Description:</label>
                        <textarea
                          rows={2}
                          value={
                            settings.trustBadge4Subtitle ??
                            'Crafted in India with authentic handloom textiles and artisanal tailoring.'
                          }
                          onChange={(e) => setSettings({ ...settings, trustBadge4Subtitle: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-2.5 py-1 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 4: BRAND STORY & ABOUT PAGE */}
          {activeTab === 'story_about' && (
            <div className="space-y-8 animate-fadeIn">
              {/* Section: Brand Story */}
              <section className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 sm:p-8 space-y-6">
                {renderSectionHeader(
                  'Brand Story & Craftsmanship Section',
                  'Homepage Editorial Story',
                  'The wide editorial image and philosophy story section on your homepage.',
                  'showBrandStory',
                  'Brand Story Section'
                )}

                {settings.showBrandStory === false ? (
                  renderRemovedPlaceholder('Brand Story Section', 'showBrandStory')
                ) : (
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-1 font-medium">Eyebrow:</label>
                          <input
                            type="text"
                            value={settings.brandStoryEyebrow ?? 'OUR ESSENCE'}
                            onChange={(e) => setSettings({ ...settings, brandStoryEyebrow: e.target.value })}
                            className="w-full bg-white border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-1 font-medium">Story Section Title:</label>
                          <input
                            type="text"
                            value={settings.brandStoryTitle ?? 'MADE FOR YOUR EVERYDAY ELEGANCE'}
                            onChange={(e) => setSettings({ ...settings, brandStoryTitle: e.target.value })}
                            className="w-full bg-white border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-1 font-medium">Philosophy Paragraph 1:</label>
                        <textarea
                          rows={3}
                          value={settings.brandStoryParagraph1 ?? ''}
                          onChange={(e) => setSettings({ ...settings, brandStoryParagraph1: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-1 font-medium">Philosophy Paragraph 2:</label>
                        <textarea
                          rows={3}
                          value={settings.brandStoryParagraph2 ?? ''}
                          onChange={(e) => setSettings({ ...settings, brandStoryParagraph2: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-1 font-medium">CTA Button Text:</label>
                          <input
                            type="text"
                            value={settings.brandStoryButtonText ?? 'Discover Our Craft'}
                            onChange={(e) => setSettings({ ...settings, brandStoryButtonText: e.target.value })}
                            className="w-full bg-white border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-1 font-medium">Button Link Destination:</label>
                          <select
                            value={settings.brandStoryButtonLink ?? 'about'}
                            onChange={(e) => setSettings({ ...settings, brandStoryButtonLink: e.target.value })}
                            className="w-full bg-white border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                          >
                            <option value="about">About Page (/about)</option>
                            <option value="shop">Full Collection (/shop)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Section: Dedicated About Page Content */}
              <section className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 sm:p-8 space-y-6">
                <div className="pb-4 border-b border-[#ECE6DD]">
                  <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-[#7C736A] block">
                    Page Management
                  </span>
                  <h2 className="font-serif text-2xl text-[#1E1B18] font-normal mt-0.5">
                    Dedicated About Us Page (/about)
                  </h2>
                  <p className="text-xs text-[#5C544D] mt-1">
                    Manage the hero heading, lead philosophy, and foundational silhouettes description on the full About page.
                  </p>
                </div>

                {/* About Hero Section Toggle */}
                <div className="space-y-4">
                  {renderSectionHeader(
                    'About Hero Statement',
                    'About Page Top',
                    'The large luxury typography statement introducing the boutique.',
                    'showAboutHero',
                    'About Hero'
                  )}
                  {settings.showAboutHero === false ? (
                    renderRemovedPlaceholder('About Hero Statement', 'showAboutHero')
                  ) : (
                    <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 space-y-3">
                      <div>
                        <label className="block text-[11px] font-medium text-[#1E1B18] mb-1">
                          About Hero Main Headline:
                        </label>
                        <input
                          type="text"
                          value={settings.aboutHeroHeading ?? 'Quiet Indian Luxury, Woven for the Everyday Hour.'}
                          onChange={(e) => setSettings({ ...settings, aboutHeroHeading: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#1E1B18] mb-1">
                          About Hero Philosophy Lead Text:
                        </label>
                        <textarea
                          rows={3}
                          value={
                            settings.aboutHeroLead ??
                            'AABHA was founded with a singular conviction: Indian textiles do not belong locked inside occasion trunks. Handwoven Chanderi silk, breathable linen, kora cotton, and fine khadi deserve to be inhabited every single day—cut with architectural clarity, deep pockets, and unhurried grace.'
                          }
                          onChange={(e) => setSettings({ ...settings, aboutHeroLead: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* About Foundational Section Toggle */}
                <div className="space-y-4 pt-4 border-t border-[#ECE6DD]">
                  {renderSectionHeader(
                    'Foundational Silhouettes Split Section',
                    'About Page Split',
                    'The editorial split section detailing Anarkalis, Three-Piece Sets, Co-ords, and Chikankari.',
                    'showAboutFoundational',
                    'Foundational Silhouettes'
                  )}
                  {settings.showAboutFoundational === false ? (
                    renderRemovedPlaceholder('Foundational Silhouettes Section', 'showAboutFoundational')
                  ) : (
                    <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 space-y-3">
                      <div>
                        <label className="block text-[11px] font-medium text-[#1E1B18] mb-1">
                          Foundational Silhouettes Title:
                        </label>
                        <input
                          type="text"
                          value={settings.aboutFoundationalTitle ?? 'Handcrafted Foundational Silhouettes.'}
                          onChange={(e) => setSettings({ ...settings, aboutFoundationalTitle: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#1E1B18] mb-1">
                          Foundational Silhouettes Body:
                        </label>
                        <textarea
                          rows={3}
                          value={
                            settings.aboutFoundationalBody ??
                            'Instead of producing hundreds of fleeting styles each month, our curated edition consists of thoughtfully tailored garments across our foundational categories: Anarkalis, Three-Piece Dresses, Contemporary Co-ord Sets, and Authentic Chikankari.'
                          }
                          onChange={(e) => setSettings({ ...settings, aboutFoundationalBody: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* TAB 5: CONCIERGE, CONTACT & IDENTITY */}
          {activeTab === 'contact_social' && (
            <div className="space-y-8 animate-fadeIn">
              {/* Section: Brand Logo */}
              <section className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 sm:p-8 space-y-6">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#7C736A]">Identity</p>
                  <h2 className="font-serif text-2xl text-[#1E1B18] font-normal mt-1">
                    Brand Logo (Header & Footer)
                  </h2>
                  <p className="text-xs text-[#5C544D] mt-1">
                    Upload your boutique SVG or PNG logo (Max {MAX_IMAGE_FILE_SIZE_MB} MB). Appears in the top navigation header and website footer.
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
                      Current logo:{' '}
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
                  </div>
                </div>
              </section>

              {/* Section: Instagram Editorial Feed */}
              <section className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 sm:p-8 space-y-6">
                {renderSectionHeader(
                  'Instagram Editorial Feed Section',
                  'Social Gallery',
                  'The 6-image editorial patron grid displayed above the footer.',
                  'showInstagramSection',
                  'Instagram Feed'
                )}

                {settings.showInstagramSection === false ? (
                  renderRemovedPlaceholder('Instagram Feed Section', 'showInstagramSection')
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#FAF8F5] border border-[#E0D8CE] p-4">
                      <div>
                        <label className="block text-[11px] font-medium text-[#1E1B18] mb-1">
                          Feed Eyebrow:
                        </label>
                        <input
                          type="text"
                          value={settings.igSectionEyebrow ?? 'MOMENTS IN AABHA'}
                          onChange={(e) => setSettings({ ...settings, igSectionEyebrow: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#1E1B18] mb-1">
                          Feed Heading:
                        </label>
                        <input
                          type="text"
                          value={settings.igSectionHeading ?? 'The Living Atelier'}
                          onChange={(e) => setSettings({ ...settings, igSectionHeading: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#1E1B18] mb-1">
                          Feed Subheading:
                        </label>
                        <input
                          type="text"
                          value={settings.igSectionSubheading ?? 'Follow our story on Instagram'}
                          onChange={(e) => setSettings({ ...settings, igSectionSubheading: e.target.value })}
                          className="w-full bg-white border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                    </div>

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
                              {uploadingKey === fieldKey ? '...' : `Photo #${idx + 1}`}
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
                  </div>
                )}
              </section>

              {/* Section: Contact & Social Channels */}
              <section className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 sm:p-8 space-y-6">
                {renderSectionHeader(
                  'Store Concierge, Contact & Social Channels',
                  'Customer Touchpoints',
                  'Displayed across Checkout, Order Tracking, Contact page, and Website Footer.',
                  'showContactChannels',
                  'Contact Channels'
                )}

                {settings.showContactChannels === false ? (
                  renderRemovedPlaceholder('Contact Channels & Concierge', 'showContactChannels')
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* WhatsApp */}
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
                        placeholder="e.g. 919876543210"
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

                    {/* Helpline Phone */}
                    <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 space-y-2">
                      <label className="block text-xs font-medium text-[#1E1B18]">
                        Store Helpline Phone:
                      </label>
                      <input
                        type="text"
                        value={settings.supportPhone ?? '+91 98765 43210'}
                        onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full bg-white border border-[#E0D8CE] px-3.5 py-2 text-xs text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                      />
                      <p className="text-[10px] text-[#7C736A]">
                        Displayed for telephone customer assistance.
                      </p>
                    </div>

                    {/* Instagram URL & Handle */}
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
                    </div>

                    {/* Atelier Address */}
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
                )}
              </section>

              {/* Section: Contact Page Inquiry Form Toggle */}
              <section className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 sm:p-8 space-y-6">
                {renderSectionHeader(
                  'Write to AABHA Inquiry Form',
                  'Contact Us Page Form',
                  'The patron inquiry message form displayed on the Contact page.',
                  'showContactForm',
                  'Inquiry Form'
                )}

                {settings.showContactForm === false ? (
                  renderRemovedPlaceholder('Inquiry Message Form', 'showContactForm')
                ) : (
                  <div className="p-4 bg-[#FAF8F5] border border-[#E0D8CE] text-xs text-[#5C544D]">
                    <p className="font-medium text-[#1E1B18]">Inquiry Form Active on /contact</p>
                    <p className="mt-1 text-[11px] text-[#7C736A]">
                      Patrons can submit sizing inquiries, fabric questions, and bespoke order requests directly from the Contact page.
                    </p>
                  </div>
                )}
              </section>

              {/* Section: Footer Newsletter Toggle */}
              <section className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between p-4 bg-[#FAF8F5] border border-[#E0D8CE]">
                  <div>
                    <span className="text-xs font-medium text-[#1E1B18] block">
                      Website Footer Newsletter Signup Box
                    </span>
                    <p className="text-[11px] text-[#7C736A] mt-0.5">
                      Allow customers to subscribe to email previews from the footer.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSection('showFooterNewsletter')}
                    className={`px-3 py-1 text-xs font-medium uppercase tracking-wider border cursor-pointer ${
                      settings.showFooterNewsletter !== false
                        ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                        : 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]'
                    }`}
                  >
                    {settings.showFooterNewsletter !== false ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </section>

              {/* Section: High-Impact Conversion & COD Trust Customization */}
              <section className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 sm:p-8 space-y-6">
                <div>
                  <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-[#7C736A] block">
                    Conversion Engine &amp; Patron Trust
                  </span>
                  <h2 className="font-serif text-2xl text-[#1E1B18] font-normal mt-0.5">
                    High-Impact Storefront &amp; COD Experience Controls
                  </h2>
                  <p className="text-xs text-[#5C544D] mt-1">
                    Control visibility, customize microcopy, and tailor conversational ordering across Product Pages, Cart Drawer, Checkout, and Order Concierge.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Feature 1: Find My Fit Quick Bust Recommender */}
                  <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 sm:p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E0D8CE]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#1E1B18]">
                            1. &ldquo;Find My Fit&rdquo; Quick Bust Recommender
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full border ${
                              settings.showSizeRecommender !== false
                                ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                                : 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]'
                            }`}
                          >
                            {settings.showSizeRecommender !== false ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7C736A] mt-0.5">
                          Renders a 1-click bust measurement selector (32&quot; - 44&quot;) on the Product Detail Page to eliminate sizing uncertainty.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSection('showSizeRecommender')}
                        className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider border cursor-pointer whitespace-nowrap ${
                          settings.showSizeRecommender !== false
                            ? 'bg-white text-[#C62828] border-[#FFCDD2] hover:bg-[#FFEBEE]'
                            : 'bg-[#231F1D] text-[#FAF8F5] border-[#231F1D] hover:bg-[#14110E]'
                        }`}
                      >
                        {settings.showSizeRecommender !== false ? 'Disable Recommender' : 'Enable Recommender'}
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-1 font-medium">
                        Fit Guidance Note / Tailoring Advice:
                      </label>
                      <input
                        type="text"
                        value={
                          settings.sizeRecommenderNote ??
                          'Tailored with 2.5″ comfortable ease for effortless all-day wear.'
                        }
                        onChange={(e) =>
                          setSettings({ ...settings, sizeRecommenderNote: e.target.value })
                        }
                        placeholder="e.g. Tailored with 2.5″ comfortable ease for effortless all-day wear."
                        className="w-full bg-white border border-[#E0D8CE] px-3.5 py-2 text-xs text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                      />
                    </div>
                  </div>

                  {/* Feature 2: Quick WhatsApp Direct Order CTA */}
                  <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 sm:p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E0D8CE]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#1E1B18]">
                            2. Direct &ldquo;Quick Order on WhatsApp&rdquo; Conversational Commerce
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full border ${
                              settings.showWhatsAppDirectOrder !== false
                                ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                                : 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]'
                            }`}
                          >
                            {settings.showWhatsAppDirectOrder !== false ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7C736A] mt-0.5">
                          Provides a prominent WhatsApp order CTA on Product Detail Page and in Shopping Bag Drawer pre-filling garment details and COD prompt.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSection('showWhatsAppDirectOrder')}
                        className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider border cursor-pointer whitespace-nowrap ${
                          settings.showWhatsAppDirectOrder !== false
                            ? 'bg-white text-[#C62828] border-[#FFCDD2] hover:bg-[#FFEBEE]'
                            : 'bg-[#231F1D] text-[#FAF8F5] border-[#231F1D] hover:bg-[#14110E]'
                        }`}
                      >
                        {settings.showWhatsAppDirectOrder !== false ? 'Disable Direct CTA' : 'Enable Direct CTA'}
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-1 font-medium">
                        WhatsApp Button CTA Label:
                      </label>
                      <input
                        type="text"
                        value={settings.whatsAppOrderButtonText ?? 'Quick Order on WhatsApp'}
                        onChange={(e) =>
                          setSettings({ ...settings, whatsAppOrderButtonText: e.target.value })
                        }
                        placeholder="e.g. Quick Order on WhatsApp"
                        className="w-full bg-white border border-[#E0D8CE] px-3.5 py-2 text-xs text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                      />
                    </div>
                  </div>

                  {/* Feature 3: Recently Viewed Silhouettes Shelf */}
                  <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 sm:p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E0D8CE]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#1E1B18]">
                            3. &ldquo;Recently Viewed Silhouettes&rdquo; PDP Shelf
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full border ${
                              settings.showRecentlyViewed !== false
                                ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                                : 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]'
                            }`}
                          >
                            {settings.showRecentlyViewed !== false ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7C736A] mt-0.5">
                          Tracks recently visited garments on client devices to remind patrons of previously explored pieces.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSection('showRecentlyViewed')}
                        className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider border cursor-pointer whitespace-nowrap ${
                          settings.showRecentlyViewed !== false
                            ? 'bg-white text-[#C62828] border-[#FFCDD2] hover:bg-[#FFEBEE]'
                            : 'bg-[#231F1D] text-[#FAF8F5] border-[#231F1D] hover:bg-[#14110E]'
                        }`}
                      >
                        {settings.showRecentlyViewed !== false ? 'Disable Shelf' : 'Enable Shelf'}
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-1 font-medium">
                        Recently Viewed Shelf Heading:
                      </label>
                      <input
                        type="text"
                        value={settings.recentlyViewedTitle ?? 'Recently Viewed Silhouettes'}
                        onChange={(e) =>
                          setSettings({ ...settings, recentlyViewedTitle: e.target.value })
                        }
                        placeholder="e.g. Recently Viewed Silhouettes"
                        className="w-full bg-white border border-[#E0D8CE] px-3.5 py-2 text-xs text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                      />
                    </div>
                  </div>

                  {/* Feature 4: The AABHA COD Trust Guarantee Card */}
                  <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E0D8CE]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#1E1B18]">
                            4. Checkout COD Trust Guarantee (3 Pillars)
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full border ${
                              settings.showCodTrustGuarantee !== false
                                ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                                : 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]'
                            }`}
                          >
                            {settings.showCodTrustGuarantee !== false ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7C736A] mt-0.5">
                          High-converting 3-point assurance card rendered right next to the Confirm Order button on /checkout.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSection('showCodTrustGuarantee')}
                        className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider border cursor-pointer whitespace-nowrap ${
                          settings.showCodTrustGuarantee !== false
                            ? 'bg-white text-[#C62828] border-[#FFCDD2] hover:bg-[#FFEBEE]'
                            : 'bg-[#231F1D] text-[#FAF8F5] border-[#231F1D] hover:bg-[#14110E]'
                        }`}
                      >
                        {settings.showCodTrustGuarantee !== false ? 'Disable Guarantee Card' : 'Enable Guarantee Card'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Pillar 1 */}
                      <div className="bg-white border border-[#E0D8CE] p-3 space-y-2">
                        <span className="text-[11px] font-semibold text-[#1E1B18] block">COD Pillar 1</span>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Title:</label>
                          <input
                            type="text"
                            value={settings.codTrustPillar1Title ?? 'Zero Advance Payment'}
                            onChange={(e) => setSettings({ ...settings, codTrustPillar1Title: e.target.value })}
                            className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-2.5 py-1 text-xs text-[#1E1B18] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Description:</label>
                          <textarea
                            rows={2}
                            value={settings.codTrustPillar1Desc ?? 'Pay only when your parcel arrives safely at your doorstep.'}
                            onChange={(e) => setSettings({ ...settings, codTrustPillar1Desc: e.target.value })}
                            className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-2.5 py-1 text-xs text-[#1E1B18] focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Pillar 2 */}
                      <div className="bg-white border border-[#E0D8CE] p-3 space-y-2">
                        <span className="text-[11px] font-semibold text-[#1E1B18] block">COD Pillar 2</span>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Title:</label>
                          <input
                            type="text"
                            value={settings.codTrustPillar2Title ?? 'Doorstep Cash or UPI'}
                            onChange={(e) => setSettings({ ...settings, codTrustPillar2Title: e.target.value })}
                            className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-2.5 py-1 text-xs text-[#1E1B18] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Description:</label>
                          <textarea
                            rows={2}
                            value={settings.codTrustPillar2Desc ?? 'Pay courier conveniently via Cash, GPay, PhonePe, or Paytm.'}
                            onChange={(e) => setSettings({ ...settings, codTrustPillar2Desc: e.target.value })}
                            className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-2.5 py-1 text-xs text-[#1E1B18] focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Pillar 3 */}
                      <div className="bg-white border border-[#E0D8CE] p-3 space-y-2">
                        <span className="text-[11px] font-semibold text-[#1E1B18] block">COD Pillar 3</span>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Title:</label>
                          <input
                            type="text"
                            value={settings.codTrustPillar3Title ?? '14-Day Free Exchange'}
                            onChange={(e) => setSettings({ ...settings, codTrustPillar3Title: e.target.value })}
                            className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-2.5 py-1 text-xs text-[#1E1B18] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">Description:</label>
                          <textarea
                            rows={2}
                            value={settings.codTrustPillar3Desc ?? 'Doorstep size replacement or exchange if fit needs adjusting.'}
                            onChange={(e) => setSettings({ ...settings, codTrustPillar3Desc: e.target.value })}
                            className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-2.5 py-1 text-xs text-[#1E1B18] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Feature 5: Customer Order Self-Service Window */}
                  <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 sm:p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#1E1B18]">
                            5. Customer Order Self-Service Window (/my-orders)
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full border ${
                              settings.showOrderSelfService !== false
                                ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                                : 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]'
                            }`}
                          >
                            {settings.showOrderSelfService !== false ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7C736A] mt-0.5">
                          Enables a 1-click WhatsApp concierge card on the customer tracking page while an order status is &ldquo;PENDING&rdquo;, allowing patrons to request delivery address or size corrections prior to dispatch.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSection('showOrderSelfService')}
                        className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider border cursor-pointer whitespace-nowrap ${
                          settings.showOrderSelfService !== false
                            ? 'bg-white text-[#C62828] border-[#FFCDD2] hover:bg-[#FFEBEE]'
                            : 'bg-[#231F1D] text-[#FAF8F5] border-[#231F1D] hover:bg-[#14110E]'
                        }`}
                      >
                        {settings.showOrderSelfService !== false ? 'Disable Window' : 'Enable Window'}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 6: ALL PAGES SECTION MANAGER */}
          {activeTab === 'layout_manager' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="bg-[#F3EFEA] p-6 border border-[#ECE6DD]">
                <div className="flex items-center gap-2 mb-2">
                  <Sliders className="w-5 h-5 text-[#6E5043]" />
                  <h2 className="font-serif text-2xl text-[#1E1B18]">
                    Master Page Sections &amp; Visibility Manager
                  </h2>
                </div>
                <p className="text-xs text-[#5C544D] leading-relaxed max-w-2xl">
                  Add, remove, or temporarily hide any section across all storefront pages with a single click. When a section is removed, the storefront smoothly collapses that section and adapts its layout. Click &ldquo;Save All Branding &amp; Media&rdquo; at the bottom to apply changes to the live site.
                </p>
              </div>

              {/* Group by Page */}
              {[
                {
                  pageTitle: 'Home Page (/)',
                  pageDesc: 'Primary luxury brand showcase and editorial landing experience',
                  sections: [
                    {
                      flag: 'showAnnouncementBar' as keyof SiteSettings,
                      name: 'Top Announcement Bar',
                      desc: 'Urgent notice or complimentary shipping bar displayed across the top header',
                    },
                    {
                      flag: 'showHeroCarousel' as keyof SiteSettings,
                      name: 'Editorial 3-Slide Hero Carousel',
                      desc: 'Full-screen editorial imagery with typography and primary CTA shop buttons',
                    },
                    {
                      flag: 'showCategorySection' as keyof SiteSettings,
                      name: 'Shop By Category Grid',
                      desc: 'Curated 4-column silhouette exploration with dynamic cover photography',
                    },
                    {
                      flag: 'showNewArrivals' as keyof SiteSettings,
                      name: 'New Arrivals Showcase',
                      desc: 'Dynamic catalog of recently published silhouettes with quick-view controls',
                    },
                    {
                      flag: 'showBrandStory' as keyof SiteSettings,
                      name: 'Brand Story Philosophy Section',
                      desc: 'Editorial craft narrative explaining handloom textiles, french seams, and mulmul linings',
                    },
                    {
                      flag: 'showCuratedSection' as keyof SiteSettings,
                      name: 'Curated Collection Signatures',
                      desc: 'Handpicked spotlight garments with featured styling details',
                    },
                    {
                      flag: 'showTrustBadges' as keyof SiteSettings,
                      name: 'Heritage & Trust Badges (4 Pillars)',
                      desc: 'Assurances for Free Insured Delivery, Easy Returns, COD Guarantee, and Made in India',
                    },
                    {
                      flag: 'showInstagramSection' as keyof SiteSettings,
                      name: 'Instagram Living Atelier Showcase',
                      desc: '6 curated lookbook photos highlighting moments in quiet motion',
                    },
                    {
                      flag: 'showFooterNewsletter' as keyof SiteSettings,
                      name: 'Footer Newsletter Subscription',
                      desc: 'Private previews and launch email subscription input in the website footer',
                    },
                  ],
                },
                {
                  pageTitle: 'Shop Catalog Page (/shop)',
                  pageDesc: 'Garment browsing, category filtering, and sorting experience',
                  sections: [
                    {
                      flag: 'showShopHeader' as keyof SiteSettings,
                      name: 'Category Title & Description Header',
                      desc: 'Editorial title and craft description for currently active collection',
                    },
                    {
                      flag: 'showShopFilters' as keyof SiteSettings,
                      name: 'Category Tabs & Luxury Sort Dropdown',
                      desc: 'Silhouette filter tabs (Anarkali, 3-Piece, Co-ord, Chikankari) and price sorting menu',
                    },
                  ],
                },
                {
                  pageTitle: 'Product Detail Page',
                  pageDesc: 'Single garment inspection, sizing, and styling showcase',
                  sections: [
                    {
                      flag: 'showPinCodeChecker' as keyof SiteSettings,
                      name: 'PIN Code Delivery Estimator',
                      desc: 'Subtle 6-digit postal code check for complimentary courier serviceability',
                    },
                    {
                      flag: 'showSizeRecommender' as keyof SiteSettings,
                      name: 'Find My Fit Bust Recommender',
                      desc: '1-click bust measurement selector and interactive size recommendation chip on PDP',
                    },
                    {
                      flag: 'showWhatsAppDirectOrder' as keyof SiteSettings,
                      name: 'Quick Order on WhatsApp Direct CTA',
                      desc: 'One-tap WhatsApp concierge order button with pre-filled garment details and COD prompt',
                    },
                    {
                      flag: 'showRecentlyViewed' as keyof SiteSettings,
                      name: 'Recently Viewed Silhouettes Shelf',
                      desc: 'Client-side history shelf displaying recently inspected garments at the bottom of PDP',
                    },
                    {
                      flag: 'showProductReviews' as keyof SiteSettings,
                      name: 'Client Impressions & Review Form',
                      desc: 'Customer star ratings, written reviews, verified buyer badges, and submission form',
                    },
                    {
                      flag: 'showRelatedProducts' as keyof SiteSettings,
                      name: 'Related Products / Complete The Look',
                      desc: 'Curated companion garments from the same silhouette or fabric family',
                    },
                  ],
                },
                {
                  pageTitle: 'Checkout & Order Tracking (/checkout, /my-orders)',
                  pageDesc: 'Friction-free COD ordering assurances and self-service order modifications',
                  sections: [
                    {
                      flag: 'showCodTrustGuarantee' as keyof SiteSettings,
                      name: 'COD Trust Guarantee 3-Pillar Card',
                      desc: 'Prominent 3-point assurance box (Zero advance payment, Doorstep Cash/UPI, 14-day exchange) at checkout',
                    },
                    {
                      flag: 'showOrderSelfService' as keyof SiteSettings,
                      name: 'Order Self-Service Update Window',
                      desc: 'Allow patrons to 1-click message WhatsApp concierge to adjust delivery address or garment size while order is pending',
                    },
                  ],
                },
                {
                  pageTitle: 'About Page (/about)',
                  pageDesc: 'Brand heritage, design philosophy, and handloom craft story',
                  sections: [
                    {
                      flag: 'showAboutHero' as keyof SiteSettings,
                      name: 'About Hero Narrative & Philosophy',
                      desc: 'Brand inception header and quiet luxury conviction text',
                    },
                    {
                      flag: 'showAboutFoundational' as keyof SiteSettings,
                      name: 'Foundational Silhouettes Showcase',
                      desc: '4 signature silhouette pillars: Anarkalis, 3-Piece, Co-ords, and Chikankari needlework',
                    },
                  ],
                },
                {
                  pageTitle: 'Contact Concierge Page (/contact)',
                  pageDesc: 'Direct atelier communication and client care channels',
                  sections: [
                    {
                      flag: 'showContactChannels' as keyof SiteSettings,
                      name: 'Direct Concierge Cards',
                      desc: 'Official WhatsApp, Telephone, Email care cards, and studio address information',
                    },
                    {
                      flag: 'showContactForm' as keyof SiteSettings,
                      name: 'Patron Message Inquiry Form',
                      desc: 'Direct customer message form for sizing assistance, custom orders, or order inquiries',
                    },
                  ],
                },
              ].map((group, gIdx) => (
                <div key={gIdx} className="bg-white border border-[#ECE6DD] p-6 space-y-4 shadow-xs">
                  <div className="border-b border-[#ECE6DD] pb-3">
                    <h3 className="font-serif text-xl text-[#1E1B18] font-normal">{group.pageTitle}</h3>
                    <p className="text-xs text-[#7C736A] mt-0.5">{group.pageDesc}</p>
                  </div>
                  <div className="divide-y divide-[#ECE6DD]">
                    {group.sections.map((sec) => {
                      const isVisible = settings[sec.flag] !== false;
                      return (
                        <div
                          key={String(sec.flag)}
                          className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-[#1E1B18]">{sec.name}</span>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full border ${
                                  isVisible
                                    ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                                    : 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]'
                                }`}
                              >
                                {isVisible ? 'Active' : 'Removed'}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#7C736A] leading-relaxed max-w-xl">
                              {sec.desc}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleSection(sec.flag)}
                            className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer border whitespace-nowrap shrink-0 ${
                              isVisible
                                ? 'bg-white text-[#C62828] border-[#FFCDD2] hover:bg-[#FFEBEE]'
                                : 'bg-[#231F1D] text-[#FAF8F5] border-[#231F1D] hover:bg-[#14110E]'
                            }`}
                          >
                            {isVisible ? 'Remove Section' : '+ Add Section'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Floating Save Bar */}
          <div className="pt-6 border-t border-[#ECE6DD] flex justify-between items-center">
            <span className="text-xs text-[#7C736A]">
              Changes are saved directly to database and live in-memory cache.
            </span>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3.5 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-[0.18em] hover:bg-[#14110E] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
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
