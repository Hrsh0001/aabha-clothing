'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle,
  Save,
  RefreshCw,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { AdminLayout } from '@/src/components/AdminLayout';
import { useAuth } from '@/src/context/AuthContext';
import type { SiteSettings } from '../../api/settings/route';

export default function AdminBrandingPage() {
  const { adminToken } = useAuth();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token =
      adminToken ||
      (typeof window !== 'undefined' ? localStorage.getItem('aabha_admin_jwt') : null);
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-admin-pin': 'aabha2026',
    };
  };

  const getUploadHeaders = () => {
    const token =
      adminToken ||
      (typeof window !== 'undefined' ? localStorage.getItem('aabha_admin_jwt') : null);
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-admin-pin': 'aabha2026',
    };
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentFieldToUpload, setCurrentFieldToUpload] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      showToast('Error loading media settings');
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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentFieldToUpload || !settings) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image exceeds 5MB size limit. Please upload an image under 5MB.');
      return;
    }

    setUploadingKey(currentFieldToUpload);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: getUploadHeaders(),
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.imageUrl) {
        if (currentFieldToUpload.startsWith('igPhoto_')) {
          const index = parseInt(currentFieldToUpload.split('_')[1], 10);
          const newIg = [...(settings.igPhotos || [])];
          newIg[index] = data.imageUrl;
          setSettings({ ...settings, igPhotos: newIg });
        } else {
          setSettings({ ...settings, [currentFieldToUpload]: data.imageUrl });
        }
        showToast('Image uploaded successfully! Click "Save Changes" to publish.');
      } else {
        showToast(data.error || 'Failed to upload photo');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      showToast('Error communicating with upload server');
    } finally {
      setUploadingKey(null);
      setCurrentFieldToUpload(null);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Boutique branding & media updated live!');
      } else {
        showToast(data.error || 'Failed to save settings');
      }
    } catch (err) {
      console.error('Save failed:', err);
      showToast('Error saving settings to server');
    } finally {
      setSaving(false);
    }
  };

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
        <div className="fixed top-20 right-6 z-50 bg-[#1E1B18] text-[#FAF8F5] px-4 py-2.5 text-xs flex items-center gap-2 shadow-xl border border-[#3D3732] animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-[#A8E6CF]" />
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
          {/* Section 1: Brand Logo */}
          <section className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 sm:p-8 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#7C736A]">Identity</p>
              <h2 className="font-serif text-2xl text-[#1E1B18] font-normal mt-1">
                Brand Logo (Header & Footer)
              </h2>
              <p className="text-xs text-[#5C544D] mt-1">
                Upload your boutique SVG or PNG logo. This logo appears in the top navigation header and the website footer.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-4 bg-[#FAF8F5] border border-[#E0D8CE]">
              <div className="h-16 w-36 bg-[#ECE6DD]/40 flex items-center justify-center p-2 border border-[#E0D8CE] shrink-0">
                <img src={settings.logoUrl} alt="Brand Logo" className="max-h-12 max-w-full object-contain" />
              </div>
              <div className="flex-1 space-y-2">
                <span className="text-xs font-mono text-[#5C544D] block truncate">
                  Current path: {settings.logoUrl}
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
                    onClick={() => setSettings({ ...settings, logoUrl: '/logo.svg' })}
                    className="px-3.5 py-1.5 border border-[#E0D8CE] text-xs text-[#7C736A] hover:text-[#1E1B18] cursor-pointer"
                  >
                    Reset to Default
                  </button>
                </div>
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
                The full-bleed editorial slides rotating at the top of your homepage. Recommend portrait or wide aspect ratio photos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Slide 1 */}
              <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1E1B18]">Slide 01 · Handloom Edit</span>
                  <span className="text-[11px] font-mono text-[#7C736A]">Main Banner</span>
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
              </div>

              {/* Slide 2 */}
              <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1E1B18]">Slide 02 · Co-ord Edit</span>
                  <span className="text-[11px] font-mono text-[#7C736A]">Modern Tailored</span>
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
              </div>

              {/* Slide 3 */}
              <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1E1B18]">Slide 03 · Ethnic Edit</span>
                  <span className="text-[11px] font-mono text-[#7C736A]">Everyday Grace</span>
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
                The large wide editorial image displayed next to the "Quiet Indian Luxury" and artisan story section.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-[#FAF8F5] border border-[#E0D8CE] p-4">
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
                  The 6-image editorial grid displayed near the footer. Click any image to replace it with a new photo.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {settings.igPhotos?.map((photo, idx) => (
                <div key={idx} className="bg-[#FAF8F5] border border-[#E0D8CE] p-2 space-y-2">
                  <div className="aspect-[3/4] bg-[#ECE6DD] overflow-hidden border border-[#E0D8CE]">
                    <img src={photo} alt={`Instagram ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => triggerFileUpload(`igPhoto_${idx}`)}
                    disabled={uploadingKey === `igPhoto_${idx}`}
                    className="w-full py-1.5 bg-[#FAF8F5] border border-[#E0D8CE] text-[11px] font-medium text-[#1E1B18] hover:bg-[#ECE6DD] transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingKey === `igPhoto_${idx}` ? '...' : `Change #${idx + 1}`}
                  </button>
                </div>
              ))}
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
