'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Save,
  RefreshCw,
  Info,
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
        heroCoords: await compressDataUrlIfNeeded(settings.heroCoords),
        heroEthnic: await compressDataUrlIfNeeded(settings.heroEthnic),
        brandStory: await compressDataUrlIfNeeded(settings.brandStory),
        igPhotos: compressedIg,
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

          {/* Section 2: Hero Carousel Banner Slides */}
          <section className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 sm:p-8 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#7C736A]">Homepage Top Hero</p>
              <h2 className="font-serif text-2xl text-[#1E1B18] font-normal mt-1">
                Hero Slideshow Banners (3 Slides)
              </h2>
              <p className="text-xs text-[#5C544D] mt-1">
                The full-bleed editorial slides rotating at the top of your homepage. Max {MAX_IMAGE_FILE_SIZE_MB} MB per slide.
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
                  {uploadingKey === 'heroBanner' ? 'Uploading...' : 'Change Slide 1'}
                </button>
                {(errors.heroBanner || fieldUploadErrors.heroBanner) && (
                  <p className="text-xs text-[#C62828] flex items-center gap-1 font-medium" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldUploadErrors.heroBanner || errors.heroBanner}</span>
                  </p>
                )}
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
                  {uploadingKey === 'heroCoords' ? 'Uploading...' : 'Change Slide 2'}
                </button>
                {(errors.heroCoords || fieldUploadErrors.heroCoords) && (
                  <p className="text-xs text-[#C62828] flex items-center gap-1 font-medium" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldUploadErrors.heroCoords || errors.heroCoords}</span>
                  </p>
                )}
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
                  {uploadingKey === 'heroEthnic' ? 'Uploading...' : 'Change Slide 3'}
                </button>
                {(errors.heroEthnic || fieldUploadErrors.heroEthnic) && (
                  <p className="text-xs text-[#C62828] flex items-center gap-1 font-medium" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldUploadErrors.heroEthnic || errors.heroEthnic}</span>
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Section 3: Brand Story Editorial Image */}
          <section className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 sm:p-8 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#7C736A]">Craftsmanship Section</p>
              <h2 className="font-serif text-2xl text-[#1E1B18] font-normal mt-1">
                Brand Story Editorial Image
              </h2>
              <p className="text-xs text-[#5C544D] mt-1">
                The large wide editorial image displayed next to the "Quiet Indian Luxury" and artisan story section (Max {MAX_IMAGE_FILE_SIZE_MB} MB).
              </p>
            </div>

            <div
              className={`grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-[#FAF8F5] border p-4 ${
                errors.brandStory || fieldUploadErrors.brandStory
                  ? 'border-[#C62828]'
                  : 'border-[#E0D8CE]'
              }`}
            >
              <div className="md:col-span-7 aspect-[16/10] bg-[#ECE6DD] overflow-hidden border border-[#E0D8CE]">
                <img src={settings.brandStory} alt="Brand Story" className="w-full h-full object-cover" />
              </div>
              <div className="md:col-span-5 space-y-3">
                <span className="text-xs font-medium text-[#1E1B18] block">Artisan & Loom Editorial</span>
                <p className="text-xs text-[#7C736A] leading-relaxed">
                  Showcase your weaving techniques, natural fibers, or atelier process.
                </p>
                <button
                  type="button"
                  onClick={() => triggerFileUpload('brandStory')}
                  disabled={uploadingKey === 'brandStory'}
                  className="px-4 py-2 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-wider hover:bg-[#14110E] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
