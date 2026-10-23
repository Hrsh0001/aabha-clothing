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
  Check,
  X,
  Info,
  Palette,
} from 'lucide-react';
import { AdminLayout } from '@/src/components/AdminLayout';
import { useAuth } from '@/src/context/AuthContext';
import {
  uploadAdminImage,
  compressDataUrlIfNeeded,
  safeParseJsonResponse,
} from '@/src/lib/image-upload';
import {
  MAX_IMAGE_FILE_SIZE_MB,
  MAX_GALLERY_PHOTOS,
  IMAGE_UPLOAD_LIMIT_BADGE,
  validateImageFile,
  validateImageFilesBatch,
  validateJsonPayloadSize,
  validateProductForm,
  type ProductFormField,
  type ProductFormErrors,
  type ProductFormValues,
} from '@/src/lib/form-validation';

export interface GalleryItem {
  url: string;
  label?: string;
  focalClass?: string;
}

const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'];

const FIELD_LABELS: Record<ProductFormField, string> = {
  name: 'Garment Silhouette Name',
  category: 'Collection Category',
  sku: 'Atelier SKU Code',
  price: 'Selling Price (₹)',
  originalPrice: 'MRP / Original Price (₹)',
  fabric: 'Handloom Fabric & Weave Origin',
  sizes: 'Size Inventory',
  description: 'Garment Description & Cut Notes',
  gallery: 'Studio Photography Gallery',
};

function ProductEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('id');
  const isNew = !productId || productId === 'new';

  const { adminToken } = useAuth();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

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
  const [colors, setColors] = useState<Array<{ name: string; hex: string; imageUrl?: string }>>([]);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#6E5043');
  const [newColorImageUrl, setNewColorImageUrl] = useState('');

  // Image states
  const [primaryImage, setPrimaryImage] = useState('');
  const [secondaryImage, setSecondaryImage] = useState('');
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  // useForm-style simultaneous validation state
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<ProductFormField, boolean>>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

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

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const getCurrentFormValues = (overrides?: Partial<ProductFormValues>): ProductFormValues => ({
    name,
    category,
    sku,
    price,
    originalPrice,
    fabric,
    sizes: selectedSizes,
    description,
    gallery,
    ...overrides,
  });

  /**
   * Re-runs simultaneous validation whenever a field changes or is blurred,
   * updating errors for all touched fields (or all fields once submit has been attempted),
   * matching react-hook-form `useForm` behavior.
   */
  const syncFieldValidation = (
    field: ProductFormField,
    overrides?: Partial<ProductFormValues>,
    markTouched: boolean = true
  ) => {
    const nextTouched = markTouched ? { ...touched, [field]: true } : touched;
    if (markTouched) {
      setTouched(nextTouched);
    }

    const fullResult = validateProductForm(getCurrentFormValues(overrides));
    if (isSubmitted) {
      setErrors(fullResult.errors);
    } else {
      setErrors((prev) => {
        const next: ProductFormErrors = { ...prev };
        const fieldsToSync: ProductFormField[] =
          field === 'price' ? ['price', 'originalPrice'] : [field];
        for (const f of fieldsToSync) {
          if (nextTouched[f] || prev[f]) {
            if (fullResult.errors[f]) {
              next[f] = fullResult.errors[f];
            } else {
              delete next[f];
            }
          }
        }
        return next;
      });
    }
  };

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
          if (p.colors && Array.isArray(p.colors)) {
            setColors(p.colors);
          }

          const lead = p.primaryImage || '';
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
          } else if (lead) {
            gal = [{ url: lead, label: 'Full Studio Silhouette', focalClass: 'object-center' }];
            if (p.secondaryImage && p.secondaryImage !== lead) {
              gal.push({ url: p.secondaryImage, label: 'Editorial Daylight Drape', focalClass: 'object-center' });
            }
          }
          setGallery(gal);
        } else {
          showToast('Product not found in catalog', 'error');
        }
      } catch (err) {
        console.error('Failed to load product:', err);
        showToast('Error loading product details', 'error');
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

    const validation = validateImageFile(file, { maxSizeMB: MAX_IMAGE_FILE_SIZE_MB });
    if (!validation.valid) {
      const errMsg = validation.error || 'Invalid cover image file.';
      setUploadErrors((prev) => [...prev, errMsg]);
      showToast(errMsg, 'error');
      if (e.target) e.target.value = '';
      return;
    }

    setUploadingCover(true);
    setUploadErrors([]);
    try {
      const data = await uploadAdminImage(file, getUploadHeaders());
      if (data.success && data.imageUrl) {
        const uploadedUrl = data.imageUrl;
        setPrimaryImage(uploadedUrl);
        setGallery((prev) => {
          const next =
            prev.length === 0
              ? [{ url: uploadedUrl, label: 'Full Studio Silhouette', focalClass: 'object-center' }]
              : prev.map((item, idx) => (idx === 0 ? { ...item, url: uploadedUrl } : item));
          syncFieldValidation('gallery', { gallery: next });
          return next;
        });
        showToast('Cover photo optimized, uploaded & synced with gallery!');
      } else {
        const errMsg = data.error || 'Failed to upload cover photo';
        setUploadErrors((prev) => [...prev, errMsg]);
        showToast(errMsg, 'error');
      }
    } catch (err) {
      console.error('Cover upload error:', err);
      const errMsg = `Error uploading "${file.name}". Please ensure it is under ${MAX_IMAGE_FILE_SIZE_MB} MB.`;
      setUploadErrors((prev) => [...prev, errMsg]);
      showToast(errMsg, 'error');
    } finally {
      setUploadingCover(false);
      if (e.target) e.target.value = '';
    }
  };

  // Upload Secondary Drape
  const handleSecondaryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file, { maxSizeMB: MAX_IMAGE_FILE_SIZE_MB });
    if (!validation.valid) {
      const errMsg = validation.error || 'Invalid secondary image file.';
      setUploadErrors((prev) => [...prev, errMsg]);
      showToast(errMsg, 'error');
      if (e.target) e.target.value = '';
      return;
    }

    setUploadingSecondary(true);
    setUploadErrors([]);
    try {
      const data = await uploadAdminImage(file, getUploadHeaders());
      if (data.success && data.imageUrl) {
        const uploadedUrl = data.imageUrl;
        setSecondaryImage(uploadedUrl);
        setGallery((prev) => {
          const exists = prev.some((g) => g.url === uploadedUrl);
          const next =
            !exists && prev.length < MAX_GALLERY_PHOTOS
              ? [...prev, { url: uploadedUrl, label: 'Editorial Daylight Drape', focalClass: 'object-center' }]
              : prev;
          syncFieldValidation('gallery', { gallery: next });
          return next;
        });
        showToast('Secondary hover drape photo optimized & added to gallery!');
      } else {
        const errMsg = data.error || 'Failed to upload secondary photo';
        setUploadErrors((prev) => [...prev, errMsg]);
        showToast(errMsg, 'error');
      }
    } catch (err) {
      console.error('Secondary upload error:', err);
      const errMsg = `Error uploading "${file.name}". Please ensure it is under ${MAX_IMAGE_FILE_SIZE_MB} MB.`;
      setUploadErrors((prev) => [...prev, errMsg]);
      showToast(errMsg, 'error');
    } finally {
      setUploadingSecondary(false);
      if (e.target) e.target.value = '';
    }
  };

  // Batch Upload Multiple Photos to Gallery (Validates all selected files simultaneously)
  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const effectiveGalleryCount = gallery.length;

    const batchCheck = validateImageFilesBatch(
      Array.from(files),
      effectiveGalleryCount,
      MAX_GALLERY_PHOTOS,
      { maxSizeMB: MAX_IMAGE_FILE_SIZE_MB }
    );

    const newUploadErrors: string[] = [...batchCheck.errors];
    if (batchCheck.validFiles.length === 0) {
      setUploadErrors(newUploadErrors);
      showToast(newUploadErrors[0] || 'Selected photos exceeded the 5 MB file size limit.', 'error');
      if (e.target) e.target.value = '';
      return;
    }

    setUploadingBatch(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < batchCheck.validFiles.length; i++) {
        const file = batchCheck.validFiles[i];
        const data = await uploadAdminImage(file, getUploadHeaders());
        if (data.success && data.imageUrl) {
          uploadedUrls.push(data.imageUrl);
        } else if (data.error) {
          newUploadErrors.push(`"${file.name}": ${data.error}`);
        }
      }

      setUploadErrors(newUploadErrors);

      if (uploadedUrls.length > 0) {
        setGallery((prev) => {
          const next = [...prev];

          for (const url of uploadedUrls) {
            if (next.length >= MAX_GALLERY_PHOTOS) break;
            const idx = next.length;
            const defaultLabel =
              idx === 0
                ? 'Full Studio Silhouette'
                : idx === 1
                ? 'Pleated Bodice & Yoke Detail'
                : idx === 2
                ? 'Kalidar Flare & Zari Selvedge'
                : `Studio Angle ${idx + 1}`;
            next.push({ url, label: defaultLabel, focalClass: 'object-center' });
          }

          if (next[0]?.url) {
            setPrimaryImage(next[0].url);
          }
          if (!secondaryImage && next.length > 1) {
            setSecondaryImage(next[1]?.url);
          }
          syncFieldValidation('gallery', { gallery: next });
          return next;
        });

        if (newUploadErrors.length > 0) {
          showToast(
            `Uploaded ${uploadedUrls.length} photo(s); ${newUploadErrors.length} file(s) rejected due to size/format limits.`,
            'error'
          );
        } else {
          showToast(`Added ${uploadedUrls.length} optimized photo(s) to garment gallery!`);
        }
      } else if (newUploadErrors.length > 0) {
        showToast(newUploadErrors[0], 'error');
      }
    } catch (err) {
      console.error('Batch upload error:', err);
      const errMsg = 'Error uploading photos. Please verify each photo is under 5 MB.';
      setUploadErrors((prev) => [...prev, errMsg]);
      showToast(errMsg, 'error');
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

    const validation = validateImageFile(file, { maxSizeMB: MAX_IMAGE_FILE_SIZE_MB });
    if (!validation.valid) {
      const errMsg = validation.error || 'Invalid replacement image file.';
      setUploadErrors((prev) => [...prev, errMsg]);
      showToast(errMsg, 'error');
      setReplacingIndex(null);
      if (e.target) e.target.value = '';
      return;
    }

    const targetIdx = replacingIndex;
    setUploadErrors([]);
    try {
      const data = await uploadAdminImage(file, getUploadHeaders());
      if (data.success && data.imageUrl) {
        const uploadedUrl = data.imageUrl;
        setGallery((prev) => {
          const next = prev.map((item, idx) =>
            idx === targetIdx ? { ...item, url: uploadedUrl } : item
          );
          syncFieldValidation('gallery', { gallery: next });
          return next;
        });
        if (targetIdx === 0) {
          setPrimaryImage(uploadedUrl);
        }
        showToast(`Replaced photo #${targetIdx + 1} with new upload!`);
      } else {
        const errMsg = data.error || 'Failed to replace photo';
        setUploadErrors((prev) => [...prev, errMsg]);
        showToast(errMsg, 'error');
      }
    } catch (err) {
      console.error('Replace photo error:', err);
      const errMsg = `Error replacing photo #${targetIdx + 1}`;
      setUploadErrors((prev) => [...prev, errMsg]);
      showToast(errMsg, 'error');
    } finally {
      setReplacingIndex(null);
      if (e.target) e.target.value = '';
    }
  };

  // Add Photo by URL
  const handleAddUrl = () => {
    if (!newUrl.trim()) {
      setUploadErrors(['Please enter a valid image URL before adding to gallery.']);
      return;
    }
    if (gallery.length >= MAX_GALLERY_PHOTOS) {
      const msg = `Gallery limit of ${MAX_GALLERY_PHOTOS} photos reached. Remove a photo before adding another.`;
      setUploadErrors([msg]);
      showToast(msg, 'error');
      return;
    }
    const cleanUrl = newUrl.trim();
    const cleanLabel =
      newLabel.trim() ||
      (gallery.length === 0
        ? 'Full Studio Silhouette'
        : gallery.length === 1
        ? 'Pleated Bodice & Yoke Detail'
        : `Studio Angle ${gallery.length + 1}`);

    const next = [
      ...gallery,
      { url: cleanUrl, label: cleanLabel, focalClass: 'object-center' },
    ];
    setGallery(next);
    syncFieldValidation('gallery', { gallery: next });
    setNewUrl('');
    setNewLabel('');
    setShowAddUrlForm(false);
    setUploadErrors([]);
    showToast('Photo added to gallery!');
  };

  // Card Handlers
  const handleUpdateItem = (index: number, updates: Partial<GalleryItem>) => {
    setGallery((prev) => {
      const next = prev.map((item, idx) => {
        if (idx === index) {
          const updated = { ...item, ...updates };
          if (idx === 0 && updates.url) {
            setPrimaryImage(updates.url);
          }
          return updated;
        }
        return item;
      });
      syncFieldValidation('gallery', { gallery: next });
      return next;
    });
  };

  const handleRemoveItem = (index: number) => {
    if (gallery.length <= 1) {
      showToast('Garment must have at least one photo.', 'error');
      return;
    }
    setGallery((prev) => {
      const updated = prev.filter((_, idx) => idx !== index);
      if (index === 0 && updated[0]) {
        setPrimaryImage(updated[0].url);
      }
      syncFieldValidation('gallery', { gallery: updated });
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
    setSelectedSizes((prev) => {
      const next = prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size];
      syncFieldValidation('sizes', { sizes: next });
      return next;
    });
  };

  const addCustomSize = () => {
    const cleaned = customSizeInput.trim().toUpperCase();
    if (!cleaned) return;
    if (!selectedSizes.includes(cleaned)) {
      const next = [...selectedSizes, cleaned];
      setSelectedSizes(next);
      syncFieldValidation('sizes', { sizes: next });
    }
    setCustomSizeInput('');
  };

  const handleAddColor = () => {
    if (!newColorName.trim()) {
      showToast('Please enter a color name (e.g. "Rani Rose")', 'error');
      return;
    }
    const newSwatch = {
      name: newColorName.trim(),
      hex: newColorHex || '#6E5043',
      ...(newColorImageUrl.trim() ? { imageUrl: newColorImageUrl.trim() } : {}),
    };
    setColors((prev) => [...prev, newSwatch]);
    setNewColorName('');
    setNewColorImageUrl('');
    showToast(`Added "${newSwatch.name}" color swatch`);
  };

  const handleRemoveColor = (index: number) => {
    setColors((prev) => prev.filter((_, idx) => idx !== index));
    showToast('Removed color swatch');
  };

  const handleAutoGenerateDescription = () => {
    const displayName = name.trim() || `${category} Silhouette`;
    const displayFabric = fabric.trim() || 'Pure Handloom Chanderi Silk';
    const generated = `Tailored in ${displayFabric}, ${displayName} features fluid architectural drape, reinforced French seams, and deep concealed side-seam pockets for effortless celebration and everyday grace.`;
    setDescription(generated);
    syncFieldValidation('description', { description: generated });
  };

  // Submit Form with Simultaneous All-Inputs Validation (useForm style)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setServerError(null);

    const allTouched: Partial<Record<ProductFormField, boolean>> = {
      name: true,
      category: true,
      sku: true,
      price: true,
      originalPrice: true,
      fabric: true,
      sizes: true,
      description: true,
      gallery: true,
    };
    setTouched(allTouched);

    const validation = validateProductForm(getCurrentFormValues());
    setErrors(validation.errors);

    if (!validation.isValid) {
      const errorCount = Object.keys(validation.errors).length;
      showToast(
        `Validation failed: Please review and fix ${errorCount} highlighted field${errorCount === 1 ? '' : 's'} below.`,
        'error'
      );
      return;
    }

    const parsedPrice = Number(price);
    const validSizes = selectedSizes
      .map((s) => s.trim().toUpperCase())
      .filter((s) => Boolean(s));

    setSaving(true);
    try {
      // Compress any oversized data URLs before sending JSON payload
      const sanitizedGallery: GalleryItem[] = [];
      for (let idx = 0; idx < gallery.length; idx++) {
        const item = gallery[idx];
        const compressedUrl = await compressDataUrlIfNeeded((item.url || '').trim());
        sanitizedGallery.push({
          url: compressedUrl,
          label:
            item.label?.trim() ||
            (idx === 0 ? 'Full Studio Silhouette' : `Studio Angle ${idx + 1}`),
          focalClass: item.focalClass || 'object-center',
        });
      }

      const leadImage =
        sanitizedGallery[0]?.url || (await compressDataUrlIfNeeded(primaryImage));
      const rawDrape = secondaryImage || sanitizedGallery[1]?.url || leadImage || '';
      const drapeImage = rawDrape ? await compressDataUrlIfNeeded(rawDrape) : '';

      const payload = {
        name: name.trim(),
        sku: sku.trim(),
        category,
        price: parsedPrice,
        originalPrice: originalPrice ? Number(originalPrice) : undefined,
        fabric: fabric.trim() || 'Handcrafted Luxury Fabric',
        inStock: Boolean(inStock),
        description: description.trim(),
        sizes: validSizes,
        colors: colors.length > 0 ? colors : undefined,
        primaryImage: leadImage,
        secondaryImage: drapeImage,
        gallery: sanitizedGallery,
      };

      // Pre-flight check on total serialized payload size (prevent 413 / network drop)
      const payloadCheck = validateJsonPayloadSize(payload);
      if (!payloadCheck.valid) {
        const sizeErr =
          payloadCheck.error ||
          'Total image payload exceeds the 3.5 MB server limit. Please replace or remove oversized photos.';
        setErrors((prev) => ({ ...prev, gallery: sizeErr }));
        setServerError(sizeErr);
        showToast(sizeErr, 'error');
        setSaving(false);
        return;
      }

      if (!isNew && productId) {
        // Edit existing
        const res = await fetch('/api/products', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ id: productId, ...payload }),
        });
        const data = await safeParseJsonResponse(res);
        if (data.success) {
          showToast(`Updated "${name}" & all ${gallery.length} photos successfully!`, 'success');
          setTimeout(() => {
            router.push('/admin/products');
          }, 1200);
        } else {
          const msg = data.error || 'Failed to update garment';
          if (data.errors && typeof data.errors === 'object') {
            setErrors((prev) => ({ ...prev, ...data.errors }));
          }
          setServerError(msg);
          showToast(`Save Error: ${msg}`, 'error');
        }
      } else {
        // Create new
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await safeParseJsonResponse(res);
        if (data.success) {
          showToast(`Created "${name}" with all ${gallery.length} photos!`, 'success');
          setTimeout(() => {
            router.push('/admin/products');
          }, 1200);
        } else {
          const msg = data.error || 'Failed to create garment';
          if (data.errors && typeof data.errors === 'object') {
            setErrors((prev) => ({ ...prev, ...data.errors }));
          }
          setServerError(msg);
          showToast(`Save Error: ${msg}`, 'error');
        }
      }
    } catch (err: any) {
      console.error('Failed to save product:', err);
      const errMsg =
        err?.message ||
        'Network or payload error while saving garment. Ensure all photos are under 5 MB.';
      setServerError(errMsg);
      showToast(`Error saving garment: ${errMsg}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const activeErrorEntries = Object.entries(errors).filter(([, msg]) => Boolean(msg)) as [
    ProductFormField,
    string,
  ][];

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
        <div
          className={`fixed top-20 right-6 z-50 px-4 py-2.5 text-xs shadow-xl border flex items-center gap-2 animate-fadeIn ${
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
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={coverFileInputRef}
        onChange={handleCoverUpload}
        accept="image/jpeg,image/jpg,image/png,image/webp,image/avif,image/gif,.jpg,.jpeg,.png,.webp,.avif,.gif"
        className="hidden"
      />
      <input
        type="file"
        ref={secondaryFileInputRef}
        onChange={handleSecondaryUpload}
        accept="image/jpeg,image/jpg,image/png,image/webp,image/avif,image/gif,.jpg,.jpeg,.png,.webp,.avif,.gif"
        className="hidden"
      />
      <input
        type="file"
        ref={batchFileInputRef}
        onChange={handleBatchUpload}
        accept="image/jpeg,image/jpg,image/png,image/webp,image/avif,image/gif,.jpg,.jpeg,.png,.webp,.avif,.gif"
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={replaceFileInputRef}
        onChange={handleExecuteReplace}
        accept="image/jpeg,image/jpg,image/png,image/webp,image/avif,image/gif,.jpg,.jpeg,.png,.webp,.avif,.gif"
        className="hidden"
      />

      <form onSubmit={handleSubmit} noValidate className="space-y-8">
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

        {/* SIMULTANEOUS FORM VALIDATION SUMMARY ALERT (useForm style) */}
        {(activeErrorEntries.length > 0 || serverError) && (
          <div
            role="alert"
            className="bg-[#FFF5F5] border border-[#C62828] p-4 sm:p-5 space-y-2.5 shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-[#C62828]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <h3 className="text-xs font-semibold uppercase tracking-wider">
                  {serverError
                    ? 'Unable to Save Garment'
                    : `Please Resolve ${activeErrorEntries.length} Validation Issue${
                        activeErrorEntries.length === 1 ? '' : 's'
                      } Before Saving`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setServerError(null);
                  setErrors({});
                }}
                className="text-xs text-[#C62828] hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>

            {serverError && (
              <p className="text-xs text-[#B71C1C] font-medium pl-6">{serverError}</p>
            )}

            {activeErrorEntries.length > 0 && (
              <ul className="list-disc pl-10 space-y-1 text-xs text-[#B71C1C]">
                {activeErrorEntries.map(([field, message]) => (
                  <li key={field}>
                    <span className="font-semibold">{FIELD_LABELS[field]}:</span> {message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* SECTION 1: STUDIO PHOTOGRAPHY & MULTI-ANGLE GALLERY (PROMINENT AT TOP) */}
        <section
          className={`bg-[#FAF8F5] border p-5 sm:p-7 shadow-xs space-y-6 ${
            errors.gallery ? 'border-[#C62828]' : 'border-[#ECE6DD]'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ECE6DD] pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#231F1D] text-[#FAF8F5] flex items-center justify-center shrink-0">
                  <Camera className="w-4 h-4 stroke-[1.4]" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl text-[#1E1B18] font-normal leading-tight">
                    Studio Photography & Multi-Angle Gallery *
                  </h2>
                  <p className="text-xs text-[#7C736A] mt-0.5">
                    Upload & manage all photos customers see on the dedicated product page. Every angle can be replaced, labeled, or reordered.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => batchFileInputRef.current?.click()}
                  disabled={uploadingBatch || gallery.length >= MAX_GALLERY_PHOTOS}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium hover:bg-[#14110E] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {uploadingBatch
                      ? 'Optimizing & Uploading...'
                      : '+ Upload Photo(s) from Computer'}
                  </span>
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
              {/* Explicit Image Props & Size Limit Badge */}
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#6E5043] bg-[#F3EFEA] border border-[#E0D8CE] px-2.5 py-0.5">
                <Info className="w-3 h-3 shrink-0" />
                <span>{IMAGE_UPLOAD_LIMIT_BADGE}</span>
              </span>
            </div>
          </div>

          {/* Inline Image Upload Size / Format Validation Errors */}
          {(uploadErrors.length > 0 || errors.gallery) && (
            <div
              role="alert"
              className="p-3.5 bg-[#FFF5F5] border border-[#C62828] text-xs text-[#C62828] space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Image Upload & Size Limit Notice (Max {MAX_IMAGE_FILE_SIZE_MB} MB per photo · Max {MAX_GALLERY_PHOTOS} photos)
                  </span>
                </span>
                {uploadErrors.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setUploadErrors([])}
                    className="text-[11px] underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <ul className="list-disc pl-6 space-y-0.5 text-[#B71C1C]">
                {errors.gallery && <li>{errors.gallery}</li>}
                {uploadErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

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
              <div className="relative aspect-[3/4] w-20 shrink-0 bg-[#ECE6DD] border border-[#D5CCC0] overflow-hidden flex items-center justify-center">
                {(gallery[0]?.url || primaryImage) ? (
                  <>
                    <img
                      src={gallery[0]?.url || primaryImage}
                      alt="Primary Cover"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-[#231F1D]/85 text-[#FAF8F5] text-[9px] font-mono text-center py-0.5">
                      COVER
                    </span>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center bg-[#ECE6DD]">
                    <Camera className="w-5 h-5 text-[#A89F91]" />
                    <span className="text-[8px] text-[#7C736A] mt-1">No Cover</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-[#D97706] text-[#D97706]" />
                  <span className="text-xs font-semibold text-[#1E1B18] uppercase tracking-wider">
                    Primary Catalog Cover
                  </span>
                </div>
                <p className="text-xs text-[#5C544D] leading-snug">
                  Shown as default on storefront grid. (Always Position #1 · Max {MAX_IMAGE_FILE_SIZE_MB} MB)
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => coverFileInputRef.current?.click()}
                    disabled={uploadingCover}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF8F5] border border-[#1E1B18] text-[#1E1B18] text-xs font-medium hover:bg-[#1E1B18] hover:text-[#FAF8F5] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3 h-3" />
                    <span>{uploadingCover ? 'Uploading...' : (gallery[0]?.url || primaryImage ? 'Replace Cover Photo' : 'Upload Cover Photo')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Secondary Hover Drape */}
            <div className="p-4 bg-[#F3EFEA] border border-[#E0D8CE] flex items-center gap-4">
              <div className="relative aspect-[3/4] w-20 shrink-0 bg-[#ECE6DD] border border-[#D5CCC0] overflow-hidden flex items-center justify-center">
                {secondaryImage ? (
                  <>
                    <img
                      src={secondaryImage}
                      alt="Secondary Drape"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-[#6E5043]/90 text-[#FAF8F5] text-[9px] font-mono text-center py-0.5">
                      HOVER
                    </span>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center bg-[#ECE6DD]">
                    <Sparkles className="w-5 h-5 text-[#A89F91]" />
                    <span className="text-[8px] text-[#7C736A] mt-1">No Drape</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#6E5043]" />
                  <span className="text-xs font-semibold text-[#1E1B18] uppercase tracking-wider">
                    Secondary Hover Drape
                  </span>
                </div>
                <p className="text-xs text-[#5C544D] leading-snug">
                  Shown when shopper hovers mouse over garment card. (Max {MAX_IMAGE_FILE_SIZE_MB} MB)
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => secondaryFileInputRef.current?.click()}
                    disabled={uploadingSecondary}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF8F5] border border-[#1E1B18] text-[#1E1B18] text-xs font-medium hover:bg-[#1E1B18] hover:text-[#FAF8F5] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3 h-3" />
                    <span>{uploadingSecondary ? 'Uploading...' : (secondaryImage ? 'Replace Hover Drape' : 'Upload Hover Drape')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ALL GALLERY PHOTOS GRID (FULL WIDTH WORKSPACE) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-[#1E1B18]">
                Product Page Photo Sequence ({gallery.length} / {MAX_GALLERY_PHOTOS} Angles):
              </span>
              <span className="text-[11px] text-[#7C736A]">
                Customers will see these exact angles on the dedicated product page.
              </span>
            </div>

            {gallery.length === 0 ? (
              <div className="py-12 text-center bg-[#FAF8F5] border border-dashed border-[#D5CCC0] p-6 space-y-1.5">
                <Camera className="w-7 h-7 text-[#A89F91] mx-auto mb-1" />
                <p className="text-xs font-semibold text-[#1E1B18]">No photos uploaded yet</p>
                <p className="text-[11px] text-[#7C736A]">Upload high-resolution photography using the batch upload button above.</p>
              </div>
            ) : (
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
                              value={
                                item.url.startsWith('data:')
                                  ? '[Uploaded Cloud Image — Optimized]'
                                  : item.url
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                if (!val.startsWith('[Uploaded Cloud Image')) {
                                  handleUpdateItem(idx, { url: val });
                                }
                              }}
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
            )}
          </div>
        </section>

        {/* SECTION 2: GARMENT METADATA & PRICING SPECIFICATIONS */}
        <section className="bg-[#FAF8F5] border border-[#ECE6DD] p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[#ECE6DD] pb-3">
            <div className="w-8 h-8 rounded-full bg-[#231F1D] text-[#FAF8F5] flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 stroke-[1.4]" />
            </div>
            <div>
              <h2 className="font-serif text-2xl text-[#1E1B18] font-normal leading-tight">
                Garment Specifications & Atelier Details
              </h2>
              <p className="text-xs text-[#7C736A]">
                Title, pricing, size availability, fabric origin, and craft notes. All required (*) fields are validated simultaneously.
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
                value={name}
                onChange={(e) => {
                  const val = e.target.value;
                  setName(val);
                  syncFieldValidation('name', { name: val });
                }}
                onBlur={() => syncFieldValidation('name')}
                placeholder="e.g. Wine Kurta Pant Set with Floral Dupatta"
                aria-invalid={Boolean(errors.name)}
                className={`w-full bg-[#FAF8F5] border px-3.5 py-2.5 text-sm text-[#1E1B18] focus:outline-none ${
                  errors.name
                    ? 'border-[#C62828] bg-[#FFF5F5]/40 focus:border-[#C62828]'
                    : 'border-[#E0D8CE] focus:border-[#1E1B18]'
                }`}
              />
              {errors.name && (
                <p className="mt-1.5 text-xs text-[#C62828] flex items-center gap-1.5 font-medium" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.name}</span>
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-[#1E1B18] font-semibold uppercase tracking-wider mb-1">
                Collection Category *
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const val = e.target.value;
                  setCategory(val);
                  syncFieldValidation('category', { category: val });
                }}
                onBlur={() => syncFieldValidation('category')}
                aria-invalid={Boolean(errors.category)}
                className={`w-full bg-[#FAF8F5] border px-3.5 py-2.5 text-sm text-[#1E1B18] focus:outline-none cursor-pointer ${
                  errors.category
                    ? 'border-[#C62828] bg-[#FFF5F5]/40 focus:border-[#C62828]'
                    : 'border-[#E0D8CE] focus:border-[#1E1B18]'
                }`}
              >
                <option value="Anarkali">Anarkali</option>
                <option value="3-Piece Dresses">3-Piece Dresses</option>
                <option value="Co-ord Sets">Co-ord Sets</option>
                <option value="Chikankari Suit">Chikankari Suit</option>
              </select>
              {errors.category && (
                <p className="mt-1.5 text-xs text-[#C62828] flex items-center gap-1.5 font-medium" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.category}</span>
                </p>
              )}
            </div>

            {/* SKU */}
            <div>
              <label className="block text-[#1E1B18] font-semibold uppercase tracking-wider mb-1">
                Atelier SKU Code *
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => {
                  const val = e.target.value;
                  setSku(val);
                  syncFieldValidation('sku', { sku: val });
                }}
                onBlur={() => syncFieldValidation('sku')}
                placeholder="e.g. AB-ANA-548"
                aria-invalid={Boolean(errors.sku)}
                className={`w-full bg-[#FAF8F5] border px-3.5 py-2.5 text-sm font-mono text-[#1E1B18] focus:outline-none ${
                  errors.sku
                    ? 'border-[#C62828] bg-[#FFF5F5]/40 focus:border-[#C62828]'
                    : 'border-[#E0D8CE] focus:border-[#1E1B18]'
                }`}
              />
              {errors.sku && (
                <p className="mt-1.5 text-xs text-[#C62828] flex items-center gap-1.5 font-medium" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.sku}</span>
                </p>
              )}
            </div>

            {/* Selling Price */}
            <div>
              <label className="block text-[#1E1B18] font-semibold uppercase tracking-wider mb-1">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => {
                  const val = e.target.value;
                  setPrice(val);
                  syncFieldValidation('price', { price: val });
                }}
                onBlur={() => syncFieldValidation('price')}
                placeholder="1049"
                aria-invalid={Boolean(errors.price)}
                className={`w-full bg-[#FAF8F5] border px-3.5 py-2.5 text-sm font-mono text-[#1E1B18] focus:outline-none ${
                  errors.price
                    ? 'border-[#C62828] bg-[#FFF5F5]/40 focus:border-[#C62828]'
                    : 'border-[#E0D8CE] focus:border-[#1E1B18]'
                }`}
              />
              {errors.price && (
                <p className="mt-1.5 text-xs text-[#C62828] flex items-center gap-1.5 font-medium" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.price}</span>
                </p>
              )}
            </div>

            {/* MRP */}
            <div>
              <label className="block text-[#1E1B18] font-semibold uppercase tracking-wider mb-1">
                MRP / Original Price (₹) (Optional strikethrough)
              </label>
              <input
                type="number"
                value={originalPrice}
                onChange={(e) => {
                  const val = e.target.value;
                  setOriginalPrice(val);
                  syncFieldValidation('originalPrice', { originalPrice: val });
                }}
                onBlur={() => syncFieldValidation('originalPrice')}
                placeholder="1249"
                aria-invalid={Boolean(errors.originalPrice)}
                className={`w-full bg-[#FAF8F5] border px-3.5 py-2.5 text-sm font-mono text-[#1E1B18] focus:outline-none ${
                  errors.originalPrice
                    ? 'border-[#C62828] bg-[#FFF5F5]/40 focus:border-[#C62828]'
                    : 'border-[#E0D8CE] focus:border-[#1E1B18]'
                }`}
              />
              {errors.originalPrice && (
                <p className="mt-1.5 text-xs text-[#C62828] flex items-center gap-1.5 font-medium" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.originalPrice}</span>
                </p>
              )}
            </div>

            {/* Fabric */}
            <div>
              <label className="block text-[#1E1B18] font-semibold uppercase tracking-wider mb-1">
                Handloom Fabric & Weave Origin *
              </label>
              <input
                type="text"
                value={fabric}
                onChange={(e) => {
                  const val = e.target.value;
                  setFabric(val);
                  syncFieldValidation('fabric', { fabric: val });
                }}
                onBlur={() => syncFieldValidation('fabric')}
                placeholder="Handwoven Kora Silk-Cotton"
                aria-invalid={Boolean(errors.fabric)}
                className={`w-full bg-[#FAF8F5] border px-3.5 py-2.5 text-sm text-[#1E1B18] focus:outline-none ${
                  errors.fabric
                    ? 'border-[#C62828] bg-[#FFF5F5]/40 focus:border-[#C62828]'
                    : 'border-[#E0D8CE] focus:border-[#1E1B18]'
                }`}
              />
              {errors.fabric && (
                <p className="mt-1.5 text-xs text-[#C62828] flex items-center gap-1.5 font-medium" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.fabric}</span>
                </p>
              )}
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
            <div
              className={`md:col-span-2 p-4 bg-[#F3EFEA] border space-y-3 ${
                errors.sizes ? 'border-[#C62828] bg-[#FFF5F5]/40' : 'border-[#E0D8CE]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-[#1E1B18] font-semibold uppercase tracking-wider">
                    Size Inventory Organizer *
                  </label>
                  <p className="text-[11px] text-[#7C736A] mt-0.5">
                    Click size chips to enable/disable for customer selection:
                  </p>
                </div>
                <span
                  className={`text-xs font-mono font-medium ${
                    selectedSizes.length === 0 ? 'text-[#C62828]' : 'text-[#6E5043]'
                  }`}
                >
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

              {errors.sizes && (
                <p className="text-xs text-[#C62828] flex items-center gap-1.5 font-medium" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.sizes}</span>
                </p>
              )}
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[#1E1B18] font-semibold uppercase tracking-wider">
                  Garment Description & Cut Notes *
                </label>
                <button
                  type="button"
                  onClick={handleAutoGenerateDescription}
                  className="text-[11px] text-[#6E5043] hover:text-[#1E1B18] underline font-medium cursor-pointer"
                >
                  + Auto-Fill Atelier Craft Notes
                </button>
              </div>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => {
                  const val = e.target.value;
                  setDescription(val);
                  syncFieldValidation('description', { description: val });
                }}
                onBlur={() => syncFieldValidation('description')}
                placeholder="Cut with sixteen narrow godet panels (kalis) that flare gracefully from a high empire waist..."
                aria-invalid={Boolean(errors.description)}
                className={`w-full bg-[#FAF8F5] border p-3 text-xs text-[#1E1B18] focus:outline-none ${
                  errors.description
                    ? 'border-[#C62828] bg-[#FFF5F5]/40 focus:border-[#C62828]'
                    : 'border-[#E0D8CE] focus:border-[#1E1B18]'
                }`}
              />
              {errors.description && (
                <div className="mt-1.5 text-xs text-[#C62828] flex flex-wrap items-center justify-between gap-2 font-medium" role="alert">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.description}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAutoGenerateDescription}
                    className="px-2.5 py-0.5 bg-[#FAF8F5] border border-[#C62828] text-[#C62828] hover:bg-[#C62828] hover:text-white text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    + Auto-Fill Description Now
                  </button>
                </div>
              )}
            </div>

            {/* Color Variants & Interactive Swatches */}
            <div className="md:col-span-2 p-4 sm:p-5 bg-[#F3EFEA] border border-[#E0D8CE] space-y-4">
              <div className="flex items-center justify-between border-b border-[#E0D8CE] pb-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#6E5043]" />
                  <div>
                    <label className="block text-[#1E1B18] font-semibold uppercase tracking-wider text-xs">
                      Color Variants & Interactive Swatches
                    </label>
                    <p className="text-[11px] text-[#7C736A] mt-0.5">
                      Configure color choices displayed as interactive swatches on storefront product cards and PDP.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-medium text-[#6E5043]">
                  {colors.length} Variant{colors.length === 1 ? '' : 's'} Configured
                </span>
              </div>

              {/* Existing Swatches */}
              {colors.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {colors.map((c, idx) => (
                    <div
                      key={idx}
                      className="bg-[#FAF8F5] border border-[#D5CCC0] p-3 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-7 h-7 rounded-full shrink-0 border border-black/15 shadow-inner"
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#1E1B18] truncate">{c.name}</p>
                          <p className="text-[10px] font-mono text-[#7C736A]">{c.hex}</p>
                          {c.imageUrl && (
                            <p className="text-[9px] text-[#2E7D32] truncate">Photo linked</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveColor(idx)}
                        className="text-[#C62828] hover:bg-[#FFEBEE] p-1 transition-colors cursor-pointer"
                        title={`Remove ${c.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-[#7C736A] italic">
                  No color variants added yet. By default, the garment uses single primary shade ({fabric.split(' ').slice(0, 2).join(' ') || 'Artisan'}).
                </p>
              )}

              {/* Add New Color Swatch Form */}
              <div className="bg-[#FAF8F5] border border-[#E0D8CE] p-3.5 space-y-3">
                <span className="block text-[11px] font-semibold text-[#1E1B18] uppercase tracking-wider">
                  + Add Color Swatch
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-1 font-medium">
                      Color Name:
                    </label>
                    <input
                      type="text"
                      value={newColorName}
                      onChange={(e) => setNewColorName(e.target.value)}
                      placeholder="e.g. Rani Rose, Royal Emerald..."
                      className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-2.5 py-1.5 text-xs text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-1 font-medium">
                      Hex Shade:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={newColorHex}
                        onChange={(e) => setNewColorHex(e.target.value)}
                        className="w-8 h-8 rounded border border-[#E0D8CE] p-0.5 cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={newColorHex}
                        onChange={(e) => setNewColorHex(e.target.value)}
                        placeholder="#6E5043"
                        className="flex-1 bg-[#FAF8F5] border border-[#E0D8CE] px-2.5 py-1.5 text-xs font-mono text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-1 font-medium">
                      Swatch Photo URL (Optional):
                    </label>
                    <input
                      type="text"
                      value={newColorImageUrl}
                      onChange={(e) => setNewColorImageUrl(e.target.value)}
                      placeholder="https://... or /images/..."
                      className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-2.5 py-1.5 text-xs font-mono text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#ECE6DD]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-[#7C736A]">Quick Presets:</span>
                    {[
                      { name: 'Rani Rose', hex: '#BE3455' },
                      { name: 'Royal Emerald', hex: '#1B4D3E' },
                      { name: 'Ivory Gold', hex: '#E6D7B9' },
                      { name: 'Ochre Rust', hex: '#B86B35' },
                      { name: 'Midnight Indigo', hex: '#1C2A39' },
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setNewColorName(preset.name);
                          setNewColorHex(preset.hex);
                        }}
                        className="px-2 py-0.5 bg-[#FAF8F5] border border-[#D5CCC0] text-[10px] text-[#5C544D] hover:border-[#1E1B18] transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: preset.hex }} />
                        {preset.name}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddColor}
                    className="inline-flex items-center gap-1 px-4 py-1.5 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-wider hover:bg-[#14110E] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Swatch</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ACTIONABLE VALIDATION SUMMARY ALERT BOX NEAR SAVE BUTTON */}
        {(activeErrorEntries.length > 0 || serverError || uploadErrors.length > 0) && (
          <div
            role="alert"
            className="bg-[#FFF5F5] border border-[#C62828] p-4 sm:p-5 space-y-2.5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-[#C62828]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <h3 className="text-xs font-semibold uppercase tracking-wider">
                  {serverError
                    ? 'Save Blocked by Server / Payload Error'
                    : `Save Blocked — Please Fix ${activeErrorEntries.length + uploadErrors.length} Highlighted Issue${
                        activeErrorEntries.length + uploadErrors.length === 1 ? '' : 's'
                      }`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setServerError(null);
                  setErrors({});
                  setUploadErrors([]);
                }}
                className="text-xs text-[#C62828] hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>

            {serverError && (
              <p className="text-xs text-[#B71C1C] font-medium pl-6">{serverError}</p>
            )}

            {activeErrorEntries.length > 0 && (
              <ul className="list-disc pl-10 space-y-1 text-xs text-[#B71C1C]">
                {activeErrorEntries.map(([field, message]) => (
                  <li key={field}>
                    <span className="font-semibold">{FIELD_LABELS[field]}:</span> {message}
                  </li>
                ))}
              </ul>
            )}

            {uploadErrors.length > 0 && (
              <ul className="list-disc pl-10 space-y-1 text-xs text-[#B71C1C]">
                {uploadErrors.map((uErr, idx) => (
                  <li key={idx}>
                    <span className="font-semibold">Image Upload Limit:</span> {uErr}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* BOTTOM STICKY ACTION BAR */}
        <div className="sticky bottom-4 z-30 bg-[#FAF8F5]/95 backdrop-blur-sm border border-[#D5CCC0] p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#7C736A]">
            <span className="font-mono">{gallery.length} Photos Configured</span>
            <span>·</span>
            <span className="font-mono">{selectedSizes.length} Sizes</span>
            <span>·</span>
            <span className="font-mono text-[#6E5043]">Max {MAX_IMAGE_FILE_SIZE_MB} MB / Photo</span>
            {activeErrorEntries.length > 0 && (
              <>
                <span>·</span>
                <span className="text-[#C62828] font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {activeErrorEntries.length} Field Error{activeErrorEntries.length === 1 ? '' : 's'}
                </span>
              </>
            )}
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
