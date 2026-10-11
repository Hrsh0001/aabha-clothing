'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Upload,
  Plus,
  Trash2,
  Star,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Camera,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Package,
  Layers,
  Image as ImageIcon,
  Check,
  X,
} from 'lucide-react';
import { AdminLayout } from '@/src/components/AdminLayout';
import { useAuth } from '@/src/context/AuthContext';
import { formatINR } from '@/src/data/products';

export interface GalleryItem {
  url: string;
  label?: string;
  focalClass?: string;
}

const PRESET_IMAGES = [
  { label: 'Ivory Kurta', url: '/images/product_kurta_ivory_1791119105107.jpg' },
  { label: 'Sand Kurta Set', url: '/images/product_kurtaset_sand_1791119136277.jpg' },
  { label: 'Ochre Dress', url: '/images/product_dress_ochre_1791119165890.jpg' },
  { label: 'Charcoal Co-ords', url: '/images/product_coords_charcoal_1791119178003.jpg' },
  { label: 'Olive Kurta', url: '/images/product_kurta_olive_1791119121380.jpg' },
  { label: 'Rosewood Set', url: '/images/product_kurtaset_rosewood_1791119152298.jpg' },
];

const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'];

function ProductEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('id');
  const isNew = !productId || productId === 'new';

  const { adminToken } = useAuth();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Anarkali');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [fabric, setFabric] = useState('Pure Handloom Chanderi Silk');
  const [inStock, setInStock] = useState(true);
  const [description, setDescription] = useState('');
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
  const [customSizeInput, setCustomSizeInput] = useState('');

  // Image states
  const [primaryImage, setPrimaryImage] = useState('/images/hero_editorial_banner_1791119088652.jpg');
  const [secondaryImage, setSecondaryImage] = useState('/images/hero_editorial_banner_1791119088652.jpg');
  const [gallery, setGallery] = useState<GalleryItem[]>([
    { url: '/images/hero_editorial_banner_1791119088652.jpg', label: 'Full Studio Silhouette', focalClass: 'object-center' },
  ]);

  // Uploading state
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingSecondary, setUploadingSecondary] = useState(false);
  const [uploadingBatch, setUploadingBatch] = useState(false);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

  // URL input drawer
  const [newUrl, setNewUrl] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [showAddUrlForm, setShowAddUrlForm] = useState(false);

  // File input refs
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const secondaryFileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

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

  // Load existing product
  useEffect(() => {
    if (isNew) {
      setSku(`AB-ANA-${Math.floor(100 + Math.random() * 899)}`);
      return;
    }

    const loadProduct = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products?id=${productId}`);
        const data = await res.json();
        if (data.success && data.product) {
          const p = data.product;
          setName(p.name || '');
          setSku(p.sku || '');
          setCategory(p.category || 'Anarkali');
          setPrice(p.price?.toString() || '');
          setOriginalPrice(p.originalPrice ? p.originalPrice.toString() : '');
          setFabric(p.fabric || 'Pure Handloom Chanderi Silk');
          setInStock(typeof p.inStock === 'boolean' ? p.inStock : true);
          setDescription(p.description || '');
          setSelectedSizes(p.sizes && p.sizes.length > 0 ? p.sizes : ['XS', 'S', 'M', 'L', 'XL', 'XXL']);

          const lead = p.primaryImage || '/images/hero_editorial_banner_1791119088652.jpg';
          setPrimaryImage(lead);
          setSecondaryImage(p.secondaryImage || lead);

          let gal: GalleryItem[] = [];
          if (p.gallery && Array.isArray(p.gallery) && p.gallery.length > 0) {
            gal = p.gallery.map((g: any, idx: number) => {
              if (typeof g === 'string') {
                return { url: g, label: idx === 0 ? 'Full Studio Silhouette' : `Studio View ${idx + 1}`, focalClass: 'object-center' };
              }
              return {
                url: g.url || lead,
                label: g.label || (idx === 0 ? 'Full Studio Silhouette' : `Studio View ${idx + 1}`),
                focalClass: g.focalClass || 'object-center',
              };
            });
          } else {
            gal = [{ url: lead, label: 'Full Studio Silhouette', focalClass: 'object-center' }];
            if (p.secondaryImage && p.secondaryImage !== lead) {
              gal.push({ url: p.secondaryImage, label: 'Editorial Daylight Drape', focalClass: 'object-center' });
            }
          }
          setGallery(gal);
        } else {
          showToast('Product not found in catalog');
        }
      } catch (err) {
        console.error('Failed to load product:', err);
        showToast('Error loading product details');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [productId, isNew]);

  // Upload Cover Photo
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Photo exceeds 5MB limit.');
      return;
    }

    setUploadingCover(true);
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
        setPrimaryImage(data.imageUrl);
        setGallery((prev) => {
          if (prev.length === 0) {
            return [{ url: data.imageUrl, label: 'Full Studio Silhouette', focalClass: 'object-center' }];
          }
          return prev.map((item, idx) => (idx === 0 ? { ...item, url: data.imageUrl } : item));
        });
        showToast('Cover photo replaced & synced with gallery!');
      } else {
        showToast(data.error || 'Failed to upload photo');
      }
    } catch (err) {
      console.error('Cover upload error:', err);
      showToast('Error during photo upload');
    } finally {
      setUploadingCover(false);
      if (e.target) e.target.value = '';
    }
  };

  // Upload Secondary Drape
  const handleSecondaryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Photo exceeds 5MB limit.');
      return;
    }

    setUploadingSecondary(true);
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
        setSecondaryImage(data.imageUrl);
        setGallery((prev) => {
          const exists = prev.some((g) => g.url === data.imageUrl);
          if (!exists) {
            return [...prev, { url: data.imageUrl, label: 'Editorial Daylight Drape', focalClass: 'object-center' }];
          }
          return prev;
        });
        showToast('Secondary hover drape photo replaced & added to gallery!');
      } else {
        showToast(data.error || 'Failed to upload photo');
      }
    } catch (err) {
      console.error('Secondary upload error:', err);
      showToast('Error during photo upload');
    } finally {
      setUploadingSecondary(false);
      if (e.target) e.target.value = '';
    }
  };

  // Batch Upload Multiple Photos to Gallery
  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingBatch(true);
    try {
      let added = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
          showToast(`Photo "${file.name}" exceeds 5MB limit.`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: getUploadHeaders(),
          body: formData,
        });
        const data = await res.json();
        if (data.success && data.imageUrl) {
          const defaultLabel =
            gallery.length + added === 0
              ? 'Full Studio Silhouette'
              : gallery.length + added === 1
              ? 'Pleated Bodice & Yoke Detail'
              : gallery.length + added === 2
              ? 'Kalidar Flare & Zari Selvedge'
              : `Studio Angle ${gallery.length + added + 1}`;
          setGallery((prev) => [
            ...prev,
            { url: data.imageUrl, label: defaultLabel, focalClass: 'object-center' },
          ]);
          added++;
        }
      }
      if (added > 0) {
        showToast(`Added ${added} photo(s) to garment gallery!`);
      }
    } catch (err) {
      console.error('Batch upload error:', err);
      showToast('Error uploading photos');
    } finally {
      setUploadingBatch(false);
      if (e.target) e.target.value = '';
    }
  };

  // Direct Replace of a specific photo card
  const handleTriggerReplace = (index: number) => {
    setReplacingIndex(index);
    replaceFileInputRef.current?.click();
  };

  const handleExecuteReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (replacingIndex === null) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Photo exceeds 5MB limit.');
      return;
    }

    const targetIdx = replacingIndex;
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
        setGallery((prev) =>
          prev.map((item, idx) => (idx === targetIdx ? { ...item, url: data.imageUrl } : item))
        );
        if (targetIdx === 0) {
          setPrimaryImage(data.imageUrl);
        }
        showToast(`Replaced photo #${targetIdx + 1} with new upload!`);
      } else {
        showToast(data.error || 'Failed to upload photo');
      }
    } catch (err) {
      console.error('Replace photo error:', err);
      showToast('Error replacing photo');
    } finally {
      setReplacingIndex(null);
      if (e.target) e.target.value = '';
    }
  };

  // Add Photo by URL
  const handleAddUrl = () => {
    if (!newUrl.trim()) return;
    const cleanUrl = newUrl.trim();
    const cleanLabel =
      newLabel.trim() ||
      (gallery.length === 0
        ? 'Full Studio Silhouette'
        : gallery.length === 1
        ? 'Pleated Bodice & Yoke Detail'
        : `Studio Angle ${gallery.length + 1}`);

    setGallery((prev) => [
      ...prev,
      { url: cleanUrl, label: cleanLabel, focalClass: 'object-center' },
    ]);
    setNewUrl('');
    setNewLabel('');
    setShowAddUrlForm(false);
    showToast('Photo added to gallery!');
  };

  // Card Handlers
  const handleUpdateItem = (index: number, updates: Partial<GalleryItem>) => {
    setGallery((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          const updated = { ...item, ...updates };
          if (idx === 0 && updates.url) {
            setPrimaryImage(updates.url);
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (index: number) => {
    if (gallery.length <= 1) {
      showToast('Garment must have at least one photo.');
      return;
    }
    setGallery((prev) => {
      const updated = prev.filter((_, idx) => idx !== index);
      if (index === 0 && updated[0]) {
        setPrimaryImage(updated[0].url);
      }
      return updated;
    });
    showToast('Photo removed from gallery.');
  };

  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    const item = gallery[index];
    setPrimaryImage(item.url);
    setGallery((prev) => {
      const rest = prev.filter((_, idx) => idx !== index);
      return [item, ...rest];
    });
    showToast(`Set "${item.label || 'Photo'}" as Primary Cover!`);
  };

  const handleSetSecondary = (index: number) => {
    const item = gallery[index];
    setSecondaryImage(item.url);
    showToast(`Set "${item.label || 'Photo'}" as Hover Drape!`);
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= gallery.length) return;
    setGallery((prev) => {
      const clone = [...prev];
      const temp = clone[index];
      clone[index] = clone[targetIdx];
      clone[targetIdx] = temp;
      if (index === 0 || targetIdx === 0) {
        setPrimaryImage(clone[0].url);
      }
      return clone;
    });
  };

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const addCustomSize = () => {
    const cleaned = customSizeInput.trim().toUpperCase();
    if (!cleaned) return;
    if (!selectedSizes.includes(cleaned)) {
      setSelectedSizes((prev) => [...prev, cleaned]);
    }
    setCustomSizeInput('');
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a garment name.');
      return;
    }
    if (!price || Number(price) <= 0) {
      alert('Please enter a valid price.');
      return;
    }
    if (selectedSizes.length === 0) {
      alert('Please select at least one available size.');
      return;
    }
    if (gallery.length === 0) {
      alert('Please add at least one garment photo.');
      return;
    }

    setSaving(true);
    try {
      const leadImage = gallery[0]?.url || primaryImage;
      const drapeImage = secondaryImage || leadImage;

      const payload = {
        name: name.trim(),
        category,
        price: Number(price),
        originalPrice: originalPrice ? Number(originalPrice) : undefined,
        fabric: fabric.trim(),
        inStock,
        description: description.trim(),
        sizes: selectedSizes,
        primaryImage: leadImage,
        secondaryImage: drapeImage,
        gallery: gallery,
      };

      if (!isNew && productId) {
        // Edit existing
        const res = await fetch('/api/products', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ id: productId, ...payload }),
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Updated "${name}" & all ${gallery.length} photos successfully!`);
          setTimeout(() => {
            router.push('/admin/products');
          }, 1200);
        } else {
          showToast(data.error || 'Failed to update garment');
        }
      } else {
        // Create new
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Created "${name}" with all photos!`);
          setTimeout(() => {
            router.push('/admin/products');
          }, 1200);
        } else {
          showToast(data.error || 'Failed to create garment');
        }
      }
    } catch (err) {
      console.error('Failed to save product:', err);
      showToast('Error saving garment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout
        title="Loading Garment..."
        subtitle="Retrieving silhouette details and photo studio gallery..."
      >
        <div className="py-24 text-center text-sm text-[#7C736A] flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 text-[#6E5043] animate-spin" />
          <p className="font-serif text-lg text-[#1E1B18]">Loading Garment & Studio Photos...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={isNew ? 'Create New Silhouette' : `Edit: ${name || 'Garment Silhouette'}`}
      subtitle={
        isNew
          ? 'Add a new handcrafted piece to the AABHA catalog with multi-angle photography and sizing.'
          : `SKU: ${sku || 'AB-CAT'} · Full unrestricted photography studio and catalog editor.`
      }
      extraAction={
        <div className="flex items-center gap-2">
          {!isNew && productId && (
            <a
              href={`/product/${productId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FAF8F5] border border-[#E0D8CE] hover:bg-[#F3EFEA] text-xs font-medium text-[#1E1B18] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Live Page</span>
            </a>
          )}
          <Link
            href="/admin/products"
            className="px-3.5 py-2 border border-[#E0D8CE] bg-[#FAF8F5] hover:bg-[#F3EFEA] text-xs font-medium text-[#7C736A] transition-colors"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-wider hover:bg-[#14110E] transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Garment'}</span>
          </button>
        </div>
      }
    >
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-[#1E1B18] text-[#FAF8F5] px-4 py-2.5 text-xs shadow-xl border border-[#3D3732] flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-[#A8E6CF]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={coverFileInputRef}
        onChange={handleCoverUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={secondaryFileInputRef}
        onChange={handleSecondaryUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={batchFileInputRef}
        onChange={handleBatchUpload}
        accept="image/*"
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={replaceFileInputRef}
        onChange={handleExecuteReplace}
        accept="image/*"
        className="hidden"
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Back Link Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#7C736A]">
          <Link
            href="/admin/products"
            className="hover:text-[#1E1B18] transition-colors flex items-center gap-1 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Garments</span>
          </Link>
          <span>/</span>
          <span className="text-[#1E1B18] font-medium">
            {isNew ? 'New Garment' : name || 'Edit Silhouette'}
          </span>
        </div>

        {/* SECTION 1: STUDIO PHOTOGRAPHY & MULTI-ANGLE GALLERY (PROMINENT AT TOP) */}
        <section className="bg-[#FAF8F5] border border-[#ECE6DD] p-5 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ECE6DD] pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#231F1D] text-[#FAF8F5] flex items-center justify-center">
                  <Camera className="w-4 h-4 stroke-[1.4]" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl text-[#1E1B18] font-normal leading-tight">
                    Studio Photography & Multi-Angle Gallery
                  </h2>
                  <p className="text-xs text-[#7C736A] mt-0.5">
                    Upload & manage all photos customers see on the dedicated product page. Every angle can be replaced, labeled, or reordered.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => batchFileInputRef.current?.click()}
                disabled={uploadingBatch}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium hover:bg-[#14110E] transition-colors cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadingBatch ? 'Uploading...' : '+ Upload Photo(s) from Computer'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddUrlForm(!showAddUrlForm)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FAF8F5] border border-[#1E1B18] text-[#1E1B18] text-xs font-medium hover:bg-[#1E1B18] hover:text-[#FAF8F5] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add by URL</span>
              </button>
            </div>
          </div>

          {/* Add by URL Drawer */}
          {showAddUrlForm && (
            <div className="p-4 bg-[#F3EFEA] border border-[#D5CCC0] space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-[#1E1B18]">Add Photo via Image Link</p>
                <button
                  type="button"
                  onClick={() => setShowAddUrlForm(false)}
                  className="p-1 text-[#7C736A] hover:text-[#1E1B18]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-7">
                  <input
                    type="text"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="Enter image URL (e.g. /images/... or https://...)"
                    className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3.5 py-2 text-xs font-mono text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                  />
                </div>
                <div className="sm:col-span-3">
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Angle Label (e.g. Back Drape & Tie)"
                    className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3.5 py-2 text-xs text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddUrl}
                    className="w-full py-2 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium hover:bg-[#14110E] transition-colors cursor-pointer"
                  >
                    + Add to Gallery
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lead Cover & Hover Drape Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary Catalog Cover */}
            <div className="p-4 bg-[#F3EFEA] border border-[#E0D8CE] flex items-center gap-4">
              <div className="relative aspect-[3/4] w-20 shrink-0 bg-[#ECE6DD] border border-[#D5CCC0] overflow-hidden">
                <img
                  src={gallery[0]?.url || primaryImage}
                  alt="Primary Cover"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-0 inset-x-0 bg-[#231F1D]/85 text-[#FAF8F5] text-[9px] font-mono text-center py-0.5">
                  COVER
                </span>
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-[#D97706] text-[#D97706]" />
                  <span className="text-xs font-semibold text-[#1E1B18] uppercase tracking-wider">
                    Primary Catalog Cover
                  </span>
                </div>
                <p className="text-xs text-[#5C544D] leading-snug">
                  Shown as default on storefront grid. (Always Position #1 in gallery)
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => coverFileInputRef.current?.click()}
                    disabled={uploadingCover}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF8F5] border border-[#1E1B18] text-[#1E1B18] text-xs font-medium hover:bg-[#1E1B18] hover:text-[#FAF8F5] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3 h-3" />
                    <span>{uploadingCover ? 'Uploading...' : 'Replace Cover Photo'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Secondary Hover Drape */}
            <div className="p-4 bg-[#F3EFEA] border border-[#E0D8CE] flex items-center gap-4">
              <div className="relative aspect-[3/4] w-20 shrink-0 bg-[#ECE6DD] border border-[#D5CCC0] overflow-hidden">
                <img
                  src={secondaryImage}
                  alt="Secondary Drape"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-0 inset-x-0 bg-[#6E5043]/90 text-[#FAF8F5] text-[9px] font-mono text-center py-0.5">
                  HOVER
                </span>
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#6E5043]" />
                  <span className="text-xs font-semibold text-[#1E1B18] uppercase tracking-wider">
                    Secondary Hover Drape
                  </span>
                </div>
                <p className="text-xs text-[#5C544D] leading-snug">
                  Shown when shopper hovers mouse over garment card in collection.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => secondaryFileInputRef.current?.click()}
                    disabled={uploadingSecondary}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF8F5] border border-[#1E1B18] text-[#1E1B18] text-xs font-medium hover:bg-[#1E1B18] hover:text-[#FAF8F5] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3 h-3" />
                    <span>{uploadingSecondary ? 'Uploading...' : 'Replace Hover Drape'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ALL GALLERY PHOTOS GRID (FULL WIDTH WORKSPACE) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-[#1E1B18]">
                Product Page Photo Sequence ({gallery.length} Angles):
              </span>
              <span className="text-[11px] text-[#7C736A]">
                Customers will see these exact angles on the dedicated product page.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {gallery.map((item, idx) => {
                const isPrimary = idx === 0;
                const isSecondary = item.url === secondaryImage;

                return (
                  <div
                    key={idx}
                    className={`bg-[#FAF8F5] border flex flex-col justify-between transition-all shadow-xs ${
                      isPrimary
                        ? 'border-[#D97706] ring-2 ring-[#D97706]/30'
                        : 'border-[#D5CCC0] hover:border-[#1E1B18]'
                    }`}
                  >
                    {/* Top Preview Frame */}
                    <div className="relative aspect-[3/4] w-full bg-[#ECE6DD] border-b border-[#E0D8CE] overflow-hidden group">
                      <img
                        src={item.url}
                        alt={item.label || `Angle #${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                      />

                      {/* Sequence Badge */}
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#1E1B18]/85 text-[#FAF8F5] font-mono text-[10px] font-semibold">
                        Angle #{idx + 1}
                      </span>

                      {/* Status Badges */}
                      <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                        {isPrimary && (
                          <span className="px-2 py-0.5 bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-[10px] font-semibold flex items-center gap-1 shadow-xs">
                            <Star className="w-3 h-3 fill-[#D97706]" /> Cover
                          </span>
                        )}
                        {isSecondary && (
                          <span className="px-2 py-0.5 bg-[#E0E7FF] text-[#3730A3] border border-[#C7D2FE] text-[10px] font-semibold shadow-xs">
                            Hover Drape
                          </span>
                        )}
                      </div>

                      {/* Overlay: Direct Upload/Replace This Photo */}
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleTriggerReplace(idx)}
                          className="px-2.5 py-1 bg-[#FAF8F5] text-[#1E1B18] text-[11px] font-medium hover:bg-white transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Replace Photo</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveItem(idx, 'up')}
                            disabled={idx === 0}
                            title="Move earlier"
                            className="p-1 bg-[#FAF8F5]/90 hover:bg-white text-[#1E1B18] disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveItem(idx, 'down')}
                            disabled={idx === gallery.length - 1}
                            title="Move later"
                            className="p-1 bg-[#FAF8F5]/90 hover:bg-white text-[#1E1B18] disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card Controls */}
                    <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        {/* Angle Label Input */}
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-1 font-medium">
                            Angle Name / Label:
                          </label>
                          <input
                            type="text"
                            value={item.label || ''}
                            onChange={(e) => handleUpdateItem(idx, { label: e.target.value })}
                            placeholder="e.g. Pleated Bodice & Neckline Detail"
                            className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-2.5 py-1.5 text-xs text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                          />
                        </div>

                        {/* Direct URL Input */}
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-1 font-medium">
                            Image Path / URL:
                          </label>
                          <input
                            type="text"
                            value={item.url}
                            onChange={(e) => handleUpdateItem(idx, { url: e.target.value })}
                            className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-2.5 py-1 text-[10px] font-mono text-[#5C544D] focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-2 border-t border-[#E0D8CE] flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {!isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(idx)}
                              className="px-2 py-1 bg-[#FAF8F5] border border-[#D97706] text-[#92400E] text-[10px] font-medium hover:bg-[#FEF3C7] transition-colors cursor-pointer"
                            >
                              ★ Make Cover
                            </button>
                          )}
                          {!isSecondary && (
                            <button
                              type="button"
                              onClick={() => handleSetSecondary(idx)}
                              className="px-2 py-1 bg-[#FAF8F5] border border-[#C7D2FE] text-[#3730A3] text-[10px] font-medium hover:bg-[#EEF2FF] transition-colors cursor-pointer"
                            >
                              Set Hover
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          title="Remove photo"
                          className="p-1 text-[#C62828] hover:bg-[#FFEBEE] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preset Editorial Asset Library */}
          <div className="pt-4 border-t border-[#ECE6DD]">
            <p className="text-xs font-semibold text-[#1E1B18] mb-2 uppercase tracking-wider">
              Luxury Editorial Preset Library (Click to add directly):
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {PRESET_IMAGES.map((preset) => (
                <button
                  key={preset.url}
                  type="button"
                  onClick={() =>
                    setGallery((prev) => [
                      ...prev,
                      { url: preset.url, label: preset.label, focalClass: 'object-center' },
                    ])
                  }
                  title={`Click to add ${preset.label} to gallery`}
                  className="group aspect-[3/4] overflow-hidden border border-[#D5CCC0] relative cursor-pointer hover:border-[#1E1B18] transition-colors"
                >
                  <img
                    src={preset.url}
                    alt={preset.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute bottom-0 inset-x-0 bg-[#1E1B18]/85 text-[#FAF8F5] text-[9px] truncate px-1 py-1 text-center font-medium">
                    + {preset.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 2: GARMENT METADATA & PRICING SPECIFICATIONS */}
        <section className="bg-[#FAF8F5] border border-[#ECE6DD] p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[#ECE6DD] pb-3">
            <div className="w-8 h-8 rounded-full bg-[#231F1D] text-[#FAF8F5] flex items-center justify-center">
              <Package className="w-4 h-4 stroke-[1.4]" />
            </div>
            <div>
              <h2 className="font-serif text-2xl text-[#1E1B18] font-normal leading-tight">
                Garment Specifications & Atelier Details
              </h2>
              <p className="text-xs text-[#7C736A]">
                Title, pricing, size availability, fabric origin, and craft notes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 text-xs">
            {/* Garment Name */}
            <div className="md:col-span-2">
              <label className="block text-[#1E1B18] font-semibold uppercase tracking-wider mb-1">
                Garment Silhouette Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Anarkali 01 — Earthen Ochre Kalidar"
                className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3.5 py-2.5 text-sm text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-[#1E1B18] font-semibold uppercase tracking-wider mb-1">
                Collection Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3.5 py-2.5 text-sm text-[#1E1B18] focus:outline-none cursor-pointer"
              >
                <option value="Anarkali">Anarkali</option>
                <option value="3-Piece Dresses">3-Piece Dresses</option>
                <option value="Co-ord Sets">Co-ord Sets</option>
                <option value="Chikankari Suit">Chikankari Suit</option>
              </select>
            </div>

            {/* SKU */}
            <div>
              <label className="block text-[#1E1B18] font-semibold uppercase tracking-wider mb-1">
                Atelier SKU Code
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. AB-AN-01"
                className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3.5 py-2.5 text-sm font-mono text-[#1E1B18] focus:outline-none"
              />
            </div>

            {/* Selling Price */}
            <div>
              <label className="block text-[#1E1B18] font-semibold uppercase tracking-wider mb-1">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="9490"
                className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3.5 py-2.5 text-sm font-mono text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
              />
            </div>

            {/* MRP */}
            <div>
              <label className="block text-[#1E1B18] font-semibold uppercase tracking-wider mb-1">
                MRP / Original Price (₹) (Optional strikethrough)
              </label>
              <input
                type="number"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                placeholder="10800"
                className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3.5 py-2.5 text-sm font-mono text-[#1E1B18] focus:outline-none"
              />
            </div>

            {/* Fabric */}
            <div>
              <label className="block text-[#1E1B18] font-semibold uppercase tracking-wider mb-1">
                Handloom Fabric & Weave Origin
              </label>
              <input
                type="text"
                value={fabric}
                onChange={(e) => setFabric(e.target.value)}
                placeholder="Handwoven Kora Silk-Cotton"
                className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3.5 py-2.5 text-sm text-[#1E1B18] focus:outline-none"
              />
            </div>

            {/* Stock Toggle */}
            <div>
              <label className="block text-[#1E1B18] font-semibold uppercase tracking-wider mb-1">
                Inventory Stock Status
              </label>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setInStock(!inStock)}
                  className={`px-4 py-2 border text-xs font-semibold uppercase tracking-wider cursor-pointer flex items-center gap-2 ${
                    inStock
                      ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                      : 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]'
                  }`}
                >
                  {inStock ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  <span>{inStock ? 'In Stock (Available for Purchase)' : 'Sold Out / Disabled'}</span>
                </button>
              </div>
            </div>

            {/* Size Inventory Organizer */}
            <div className="md:col-span-2 p-4 bg-[#F3EFEA] border border-[#E0D8CE] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-[#1E1B18] font-semibold uppercase tracking-wider">
                    Size Inventory Organizer *
                  </label>
                  <p className="text-[11px] text-[#7C736A] mt-0.5">
                    Click size chips to enable/disable for customer selection:
                  </p>
                </div>
                <span className="text-xs font-mono font-medium text-[#6E5043]">
                  {selectedSizes.length} Sizes Active
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {STANDARD_SIZES.map((sz) => {
                  const isSelected = selectedSizes.includes(sz);
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => toggleSize(sz)}
                      className={`px-3.5 py-1.5 text-xs font-mono font-medium border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#231F1D] text-[#FAF8F5] border-[#231F1D]'
                          : 'bg-[#FAF8F5] text-[#5C544D] border-[#D5CCC0] hover:border-[#1E1B18]'
                      }`}
                    >
                      {sz} {isSelected && '✓'}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#E0D8CE]">
                <input
                  type="text"
                  value={customSizeInput}
                  onChange={(e) => setCustomSizeInput(e.target.value)}
                  placeholder="Custom size (e.g. 4XL, PETITE, STITCHED)..."
                  className="flex-1 bg-[#FAF8F5] border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none uppercase"
                />
                <button
                  type="button"
                  onClick={addCustomSize}
                  className="px-3.5 py-1.5 bg-[#FAF8F5] border border-[#1E1B18] text-[#1E1B18] font-medium text-xs hover:bg-[#1E1B18] hover:text-[#FAF8F5] transition-colors cursor-pointer"
                >
                  + Add Size
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-[#1E1B18] font-semibold uppercase tracking-wider mb-1">
                Garment Description & Cut Notes
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Cut with sixteen narrow godet panels (kalis) that flare gracefully from a high empire waist..."
                className="w-full bg-[#FAF8F5] border border-[#E0D8CE] p-3 text-xs text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
              />
            </div>
          </div>
        </section>

        {/* BOTTOM STICKY ACTION BAR */}
        <div className="sticky bottom-4 z-30 bg-[#FAF8F5]/95 backdrop-blur-sm border border-[#D5CCC0] p-4 shadow-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-[#7C736A]">
            <span className="font-mono">{gallery.length} Photos Configured</span>
            <span>·</span>
            <span className="font-mono">{selectedSizes.length} Sizes</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/products"
              className="px-4 py-2 border border-[#E0D8CE] text-xs font-medium uppercase tracking-wider text-[#7C736A] hover:bg-[#F3EFEA] transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-wider hover:bg-[#14110E] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Silhouette...' : isNew ? 'Create Garment' : 'Save All Changes'}</span>
            </button>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
}

export default function ProductEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
          <RefreshCw className="w-6 h-6 text-[#6E5043] animate-spin" />
        </div>
      }
    >
      <ProductEditorContent />
    </Suspense>
  );
}
