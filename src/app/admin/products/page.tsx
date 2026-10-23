'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Edit2,
  Trash2,
  Package,
  CheckCircle,
  XCircle,
  RefreshCw,
  X,
  Upload,
  Image as ImageIcon,
  Search,
  Filter,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Star,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Camera,
  Eye,
  AlertTriangle,
  HardDrive,
  Sliders,
  Copy,
  Download,
} from 'lucide-react';
import { AdminLayout } from '@/src/components/AdminLayout';
import { useAuth } from '@/src/context/AuthContext';
import {
  uploadAdminImage,
  compressDataUrlIfNeeded,
  safeParseJsonResponse,
  IMAGE_UPLOAD_LIMIT_BADGE,
  MAX_GALLERY_PHOTOS,
} from '@/src/lib/image-upload';
import {
  validateProductForm,
  validateImageFile,
  validateImageFilesBatch,
  validateJsonPayloadSize,
  ProductFormValues,
} from '@/src/lib/form-validation';


export interface GalleryItem {
  url: string;
  label?: string;
  focalClass?: string;
}

interface ProductItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  inStock: boolean;
  primaryImage: string;
  secondaryImage?: string;
  gallery?: GalleryItem[];
  fabric?: string;
  description?: string;
  sizes: string[];
  colors?: Array<{
    name: string;
    hex: string;
    imageUrl?: string;
    inStock?: boolean;
    stockQuantity?: number;
  }>;
  sizeStock?: Record<string, { inStock: boolean; quantity?: number }>;
}

const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'];
const PRODUCTS_PER_PAGE = 8;

export default function AdminProductsPage() {
  const { adminToken } = useAuth();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [matrixProduct, setMatrixProduct] = useState<ProductItem | null>(null);
  const [updatingMatrix, setUpdatingMatrix] = useState(false);

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

  // Search, Filter & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Anarkali');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [primaryImage, setPrimaryImage] = useState('');
  const [secondaryImage, setSecondaryImage] = useState('');
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [newGalleryLabel, setNewGalleryLabel] = useState('');
  const [showAddUrlForm, setShowAddUrlForm] = useState(false);
  const [fabric, setFabric] = useState('Pure Handloom Chanderi Silk');
  const [description, setDescription] = useState('');
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
  const [customSizeInput, setCustomSizeInput] = useState('');

  // Simultaneous Validation & Image Upload Error States
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingSecondary, setUploadingSecondary] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const secondaryFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const getCurrentValues = (overrides?: Partial<ProductFormValues>): ProductFormValues => ({
    name,
    category,
    sku: editingProduct?.sku || 'AB-NEW-001',
    price,
    originalPrice,
    fabric,
    description,
    sizes: selectedSizes,
    primaryImage,
    gallery,
    ...overrides,
  });

  const revalidateField = (
    field: keyof ProductFormValues,
    overrides?: Partial<ProductFormValues>
  ) => {
    setServerError(null);
    const currentVals = getCurrentValues(overrides);
    const result = validateProductForm(currentVals);
    setErrors((prev) => {
      const next = { ...prev };
      if (result.errors[field]) {
        if (isSubmitted || prev[field]) {
          next[field] = result.errors[field];
        }
      } else {
        delete next[field];
      }
      if (field === 'price' || field === 'originalPrice') {
        if (result.errors.originalPrice) {
          if (isSubmitted || prev.originalPrice) next.originalPrice = result.errors.originalPrice;
        } else {
          delete next.originalPrice;
        }
      }
      return next;
    });
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      showToast('Error loading garments catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, stockFilter, searchQuery]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadErrors([]);
    const check = validateImageFile(file);
    if (!check.valid) {
      const errMsg = check.error || 'Invalid image file.';
      setUploadErrors([errMsg]);
      showToast(errMsg);
      if (e.target) e.target.value = '';
      return;
    }

    setUploadingImage(true);
    try {
      const data = await uploadAdminImage(file, getUploadHeaders());
      if (data.success && data.imageUrl) {
        const uploadedUrl = data.imageUrl;
        setPrimaryImage(uploadedUrl);
        setGallery((prev) => {
          const nextGallery =
            prev.length === 0
              ? [{ url: uploadedUrl, label: 'Full Studio Silhouette', focalClass: 'object-center' }]
              : prev.map((item, idx) => (idx === 0 ? { ...item, url: uploadedUrl } : item));
          revalidateField('gallery', { primaryImage: uploadedUrl, gallery: nextGallery });
          return nextGallery;
        });
        showToast('Primary cover image optimized & uploaded successfully!');
      } else {
        const msg = data.error || 'Failed to upload photo';
        setUploadErrors([msg]);
        showToast(msg);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadErrors(['Error during photo upload']);
      showToast('Error during photo upload');
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSecondaryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadErrors([]);
    const check = validateImageFile(file);
    if (!check.valid) {
      const errMsg = check.error || 'Invalid image file.';
      setUploadErrors([errMsg]);
      showToast(errMsg);
      if (e.target) e.target.value = '';
      return;
    }

    setUploadingSecondary(true);
    try {
      const data = await uploadAdminImage(file, getUploadHeaders());
      if (data.success && data.imageUrl) {
        const uploadedUrl = data.imageUrl;
        setSecondaryImage(uploadedUrl);
        setGallery((prev) => {
          const exists = prev.some((g) => g.url === uploadedUrl);
          if (!exists && prev.length < MAX_GALLERY_PHOTOS) {
            return [...prev, { url: uploadedUrl, label: 'Editorial Daylight Drape', focalClass: 'object-center' }];
          }
          return prev;
        });
        showToast('Secondary drape image optimized and added to gallery!');
      } else {
        const msg = data.error || 'Failed to upload secondary photo';
        setUploadErrors([msg]);
        showToast(msg);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadErrors(['Error during secondary photo upload']);
      showToast('Error during secondary photo upload');
    } finally {
      setUploadingSecondary(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadErrors([]);
    const batchResult = validateImageFilesBatch(files, gallery.length);
    if (batchResult.errors.length > 0) {
      setUploadErrors(batchResult.errors);
      showToast(batchResult.errors[0]);
    }

    if (batchResult.validFiles.length === 0) {
      if (e.target) e.target.value = '';
      return;
    }

    setUploadingGallery(true);
    try {
      let added = 0;
      const runtimeErrors: string[] = [...batchResult.errors];
      for (let i = 0; i < batchResult.validFiles.length; i++) {
        const file = batchResult.validFiles[i] as File;
        const data = await uploadAdminImage(file, getUploadHeaders());
        if (data.success && data.imageUrl) {
          const uploadedUrl = data.imageUrl;
          const defaultLabel =
            gallery.length + added === 0
              ? 'Full Studio Silhouette'
              : gallery.length + added === 1
              ? 'Bodice & Neckline Detail'
              : gallery.length + added === 2
              ? 'Kalidar Flare & Zari Hem'
              : `Studio Angle ${gallery.length + added + 1}`;
          setGallery((prev) => {
            const next = [
              ...prev,
              { url: uploadedUrl, label: defaultLabel, focalClass: 'object-center' },
            ];
            revalidateField('gallery', { gallery: next });
            return next;
          });
          added++;
        } else if (data.error) {
          runtimeErrors.push(data.error);
          showToast(data.error);
        }
      }
      if (runtimeErrors.length > 0) {
        setUploadErrors(runtimeErrors);
      }
      if (added > 0) {
        showToast(`Added ${added} optimized photo(s) to garment gallery!`);
      }
    } catch (err) {
      console.error('Gallery upload error:', err);
      setUploadErrors((prev) => [...prev, 'Error uploading gallery photos']);
      showToast('Error uploading gallery photos');
    } finally {
      setUploadingGallery(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleAddGalleryUrl = () => {
    if (!newGalleryUrl.trim()) return;
    if (gallery.length >= MAX_GALLERY_PHOTOS) {
      const msg = `Maximum ${MAX_GALLERY_PHOTOS} photos allowed per garment gallery.`;
      setUploadErrors([msg]);
      showToast(msg);
      return;
    }
    const cleanUrl = newGalleryUrl.trim();
    const cleanLabel =
      newGalleryLabel.trim() ||
      (gallery.length === 0
        ? 'Full Studio Silhouette'
        : gallery.length === 1
        ? 'Bodice & Neckline Detail'
        : `Studio Angle ${gallery.length + 1}`);

    setGallery((prev) => {
      const next = [
        ...prev,
        { url: cleanUrl, label: cleanLabel, focalClass: 'object-center' },
      ];
      revalidateField('gallery', { gallery: next });
      return next;
    });
    setNewGalleryUrl('');
    setNewGalleryLabel('');
    setShowAddUrlForm(false);
    showToast('Photo added to gallery!');
  };

  const handleUpdateGalleryItem = (index: number, updates: Partial<GalleryItem>) => {
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

  const handleRemoveGalleryItem = (index: number) => {
    setGallery((prev) => {
      const updated = prev.filter((_, idx) => idx !== index);
      if (index === 0) {
        setPrimaryImage(updated[0]?.url || '');
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

  const handleMoveGalleryItem = (index: number, direction: 'up' | 'down') => {
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

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    setCategory('Anarkali');
    setPrice('');
    setOriginalPrice('');
    setPrimaryImage('');
    setSecondaryImage('');
    setGallery([]);
    setFabric('Pure Handloom Chanderi Silk');
    setDescription('');
    setSelectedSizes(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
    setNewGalleryUrl('');
    setNewGalleryLabel('');
    setShowAddUrlForm(false);
    setErrors({});
    setIsSubmitted(false);
    setUploadErrors([]);
    setServerError(null);
    setModalOpen(true);
  };

  // Duplicate / Clone Garment Action
  const handleDuplicateProduct = (p: ProductItem) => {
    setEditingProduct(null); // New product payload
    setName(`${p.name} (Copy)`);
    setCategory(p.category);
    setPrice(p.price.toString());
    setOriginalPrice(p.originalPrice ? p.originalPrice.toString() : '');
    setPrimaryImage(p.primaryImage);
    setSecondaryImage(p.secondaryImage || p.primaryImage);
    setGallery(p.gallery || []);
    setFabric(p.fabric || 'Pure Handloom Chanderi Silk');
    setDescription(p.description || '');
    setSelectedSizes(p.sizes || ['XS', 'S', 'M', 'L', 'XL', 'XXL']);
    setNewGalleryUrl('');
    setNewGalleryLabel('');
    setShowAddUrlForm(false);
    setErrors({});
    setIsSubmitted(false);
    setUploadErrors([]);
    setServerError(null);
    setModalOpen(true);
    showToast(`Cloned "${p.name}". Review details and click "Add Garment" to save.`);
  };

  // Export Catalog to CSV Action
  const handleExportCatalogCSV = () => {
    if (products.length === 0) {
      showToast('No products available to export.');
      return;
    }
    const headers = [
      'SKU',
      'Name',
      'Category',
      'Price (INR)',
      'Original Price (INR)',
      'Fabric',
      'Stock Status',
      'Available Sizes',
      'Primary Image URL',
    ];

    const rows = products.map((p) => [
      `"${p.sku}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.category}"`,
      p.price,
      p.originalPrice || '',
      `"${(p.fabric || '').replace(/"/g, '""')}"`,
      p.inStock ? 'IN_STOCK' : 'OUT_OF_STOCK',
      `"${(p.sizes || []).join(', ')}"`,
      `"${p.primaryImage || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `aabha_garments_catalog_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${products.length} garments to CSV successfully!`);
  };

  const handleOpenEdit = (p: ProductItem) => {
    setEditingProduct(p);
    setName(p.name);
    setCategory(p.category);
    setPrice(p.price.toString());
    setOriginalPrice(p.originalPrice ? p.originalPrice.toString() : '');
    setPrimaryImage(p.primaryImage);
    setSecondaryImage(p.secondaryImage || p.primaryImage);

    let existingGallery: GalleryItem[] = [];
    if (p.gallery && Array.isArray(p.gallery) && p.gallery.length > 0) {
      existingGallery = p.gallery.map((g: any, idx: number) => {
        if (typeof g === 'string') {
          return {
            url: g,
            label: idx === 0 ? 'Full Studio Silhouette' : `Studio View ${idx + 1}`,
            focalClass: 'object-center',
          };
        }
        return {
          url: g.url || p.primaryImage,
          label: g.label || (idx === 0 ? 'Full Studio Silhouette' : `Studio View ${idx + 1}`),
          focalClass: g.focalClass || 'object-center',
        };
      });
    } else {
      existingGallery = [
        { url: p.primaryImage, label: 'Full Studio Silhouette', focalClass: 'object-center' },
      ];
      if (p.secondaryImage && p.secondaryImage !== p.primaryImage) {
        existingGallery.push({
          url: p.secondaryImage,
          label: 'Editorial Daylight Drape',
          focalClass: 'object-center',
        });
      }
    }

    setGallery(existingGallery);
    setFabric(p.fabric || 'Pure Handloom Chanderi Silk');
    setDescription(p.description || '');
    setSelectedSizes(p.sizes && p.sizes.length > 0 ? p.sizes : ['XS', 'S', 'M', 'L', 'XXL']);
    setNewGalleryUrl('');
    setNewGalleryLabel('');
    setShowAddUrlForm(false);
    setErrors({});
    setIsSubmitted(false);
    setUploadErrors([]);
    setServerError(null);
    setModalOpen(true);
  };

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) => {
      const next = prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size];
      revalidateField('sizes', { sizes: next });
      return next;
    });
  };

  const addCustomSize = () => {
    const cleaned = customSizeInput.trim().toUpperCase();
    if (!cleaned) return;
    if (!selectedSizes.includes(cleaned)) {
      setSelectedSizes((prev) => {
        const next = [...prev, cleaned];
        revalidateField('sizes', { sizes: next });
        return next;
      });
    }
    setCustomSizeInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setServerError(null);

    // Run simultaneous validation across all fields
    const validation = validateProductForm(getCurrentValues());
    setErrors(validation.errors);

    if (!validation.isValid) {
      const errorCount = Object.keys(validation.errors).length;
      showToast(`Please fix ${errorCount} highlighted validation issue(s) before saving.`);
      return;
    }

    const parsedPrice = Number(price);
    const validSizes = selectedSizes
      .map((s) => s.trim().toUpperCase())
      .filter((s) => Boolean(s));
    const rawLeadImage = gallery[0]?.url || primaryImage;

    setSaving(true);
    try {
      const rawGallery =
        gallery.length > 0
          ? gallery
          : [{ url: rawLeadImage, label: 'Full Studio Silhouette', focalClass: 'object-center' }];

      const galleryToSubmit: GalleryItem[] = [];
      for (let idx = 0; idx < rawGallery.length; idx++) {
        const item = rawGallery[idx];
        const compressedUrl = await compressDataUrlIfNeeded(item.url.trim());
        galleryToSubmit.push({
          url: compressedUrl,
          label: item.label?.trim() || (idx === 0 ? 'Full Studio Silhouette' : `Studio Angle ${idx + 1}`),
          focalClass: item.focalClass || 'object-center',
        });
      }

      const leadImage = galleryToSubmit[0]?.url || (await compressDataUrlIfNeeded(rawLeadImage));
      const drapeImage = secondaryImage
        ? await compressDataUrlIfNeeded(secondaryImage)
        : leadImage;

      const payloadObj = {
        ...(editingProduct ? { id: editingProduct.id } : {}),
        name: name.trim(),
        category,
        price: parsedPrice,
        originalPrice: originalPrice ? Number(originalPrice) : undefined,
        primaryImage: leadImage,
        secondaryImage: drapeImage,
        gallery: galleryToSubmit,
        fabric: fabric.trim() || 'Handcrafted Luxury Fabric',
        description: description.trim(),
        sizes: validSizes,
      };

      const payloadCheck = validateJsonPayloadSize(payloadObj);
      if (!payloadCheck.valid) {
        const msg = payloadCheck.error || 'Payload size exceeds serverless request limit.';
        setServerError(msg);
        showToast(msg);
        setSaving(false);
        return;
      }

      if (editingProduct) {
        const res = await fetch('/api/products', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payloadObj),
        });
        const data = await safeParseJsonResponse(res);
        if (data.success) {
          setProducts((prev) =>
            prev.map((p) =>
              p.id === editingProduct.id
                ? {
                    ...p,
                    ...data.product,
                    primaryImage: leadImage,
                    secondaryImage: drapeImage,
                    gallery: galleryToSubmit,
                  }
                : p
            )
          );
          setModalOpen(false);
          showToast(`Updated "${name}" & its multi-image gallery successfully!`);
        } else {
          const msg = data.error || 'Failed to update garment';
          setServerError(msg);
          showToast(`Save Error: ${msg}`);
        }
      } else {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payloadObj),
        });
        const data = await safeParseJsonResponse(res);
        if (data.success && data.product) {
          setProducts((prev) => [data.product, ...prev]);
          setModalOpen(false);
          showToast(`Added "${name}" with full gallery to collection!`);
        } else {
          const msg = data.error || 'Failed to add garment';
          setServerError(msg);
          showToast(`Save Error: ${msg}`);
        }
      }
    } catch (err: any) {
      console.error('Failed to save product:', err);
      const msg = err?.message || 'Error saving garment';
      setServerError(msg);
      showToast(`Save Error: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStock = async (p: ProductItem) => {
    try {
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: p.id,
          inStock: !p.inStock,
        }),
      });
      const data = await safeParseJsonResponse(res);
      if (data.success) {
        setProducts((prev) =>
          prev.map((item) => (item.id === p.id ? { ...item, inStock: !p.inStock } : item))
        );
        setMatrixProduct((prev) => (prev && prev.id === p.id ? { ...prev, inStock: !p.inStock } : prev));
        showToast(
          `${p.name} marked as ${!p.inStock ? 'In Stock (Available)' : 'Out of Stock (Sold Out)'}`
        );
      } else {
        showToast(data.error || 'Failed to toggle stock status');
      }
    } catch (err) {
      showToast('Failed to toggle stock status');
    }
  };

  const handleToggleSizeStock = async (product: ProductItem, sizeName: string) => {
    try {
      setUpdatingMatrix(true);
      const currentSizeStock = product.sizeStock || {};
      const currentItem = currentSizeStock[sizeName] || { inStock: true, quantity: 10 };
      const nextInStock = !currentItem.inStock;

      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: product.id,
          size: sizeName,
          inStock: nextInStock,
        }),
      });
      const data = await safeParseJsonResponse(res);
      if (data.success && data.product) {
        setProducts((prev) =>
          prev.map((item) => (item.id === product.id ? { ...item, ...data.product } : item))
        );
        setMatrixProduct((prev) => (prev ? { ...prev, ...data.product } : null));
        showToast(`Size ${sizeName} set to ${nextInStock ? 'In Stock' : 'Sold Out'}`);
      } else {
        showToast(data.error || 'Failed to update size stock');
      }
    } catch {
      showToast('Error updating size stock');
    } finally {
      setUpdatingMatrix(false);
    }
  };

  const handleUpdateSizeQuantity = async (product: ProductItem, sizeName: string, quantity: number) => {
    try {
      setUpdatingMatrix(true);
      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: product.id,
          size: sizeName,
          quantity: Math.max(0, quantity),
          inStock: quantity > 0,
        }),
      });
      const data = await safeParseJsonResponse(res);
      if (data.success && data.product) {
        setProducts((prev) =>
          prev.map((item) => (item.id === product.id ? { ...item, ...data.product } : item))
        );
        setMatrixProduct((prev) => (prev ? { ...prev, ...data.product } : null));
        showToast(`Size ${sizeName} inventory quantity updated to ${quantity}`);
      }
    } catch {
      showToast('Error updating size quantity');
    } finally {
      setUpdatingMatrix(false);
    }
  };

  const handleToggleColorStock = async (product: ProductItem, colorName: string) => {
    try {
      setUpdatingMatrix(true);
      const colors = product.colors || [];
      const match = colors.find((c) => c.name.toLowerCase() === colorName.toLowerCase());
      const nextInStock = match ? !match.inStock : false;

      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: product.id,
          colorName,
          inStock: nextInStock,
        }),
      });
      const data = await safeParseJsonResponse(res);
      if (data.success && data.product) {
        setProducts((prev) =>
          prev.map((item) => (item.id === product.id ? { ...item, ...data.product } : item))
        );
        setMatrixProduct((prev) => (prev ? { ...prev, ...data.product } : null));
        showToast(`Color ${colorName} set to ${nextInStock ? 'In Stock' : 'Sold Out'}`);
      } else {
        showToast(data.error || 'Failed to update color stock');
      }
    } catch {
      showToast('Error updating color stock');
    } finally {
      setUpdatingMatrix(false);
    }
  };

  const handleUpdateColorQuantity = async (product: ProductItem, colorName: string, quantity: number) => {
    try {
      setUpdatingMatrix(true);
      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: product.id,
          colorName,
          quantity: Math.max(0, quantity),
          inStock: quantity > 0,
        }),
      });
      const data = await safeParseJsonResponse(res);
      if (data.success && data.product) {
        setProducts((prev) =>
          prev.map((item) => (item.id === product.id ? { ...item, ...data.product } : item))
        );
        setMatrixProduct((prev) => (prev ? { ...prev, ...data.product } : null));
        showToast(`Color ${colorName} inventory quantity updated to ${quantity}`);
      }
    } catch {
      showToast('Error updating color quantity');
    } finally {
      setUpdatingMatrix(false);
    }
  };

  const handleDelete = async (id: string) => {
    const item = products.find((p) => p.id === id);
    if (!confirm(`Are you sure you want to remove "${item?.name || 'this garment'}" from the catalog?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/products?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await safeParseJsonResponse(res);
      if (data.success) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        showToast('Silhouette removed from catalog');
      } else {
        showToast(data.error || 'Failed to delete');
      }
    } catch (err) {
      showToast('Error deleting garment');
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;

      // Stock filter
      if (stockFilter === 'IN_STOCK' && !p.inStock) return false;
      if (stockFilter === 'OUT_OF_STOCK' && p.inStock) return false;

      // Search query
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchCategory = p.category.toLowerCase().includes(q);
        const matchFabric = (p.fabric || '').toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchCategory && !matchFabric) return false;
      }

      return true;
    });
  }, [products, searchQuery, categoryFilter, stockFilter]);

  // Paginated Slices
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const formatINR = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  return (
    <AdminLayout
      title="Garments & Stock Inventory"
      subtitle="Catalog of handcrafted Anarkalis, Co-ord sets, and suits. Manage sizes, pricing, and stock status."
      extraAction={
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCatalogCSV}
            className="flex items-center gap-1.5 px-3 py-2 border border-[#E0D8CE] bg-white text-xs font-medium text-[#1E1B18] hover:bg-[#231F1D] hover:text-[#FAF8F5] transition-colors cursor-pointer shadow-xs"
            title="Download full garments catalog as CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#6E5043]" />
            <span>Export Catalog (CSV)</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#D5CCC0] text-xs font-medium text-[#1E1B18] hover:bg-[#F3EFEA] transition-colors cursor-pointer"
            title="Open quick garment add modal"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Quick Add</span>
          </button>
          <Link
            href="/admin/products/edit?id=new"
            className="flex items-center gap-1.5 px-4 py-2 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-wider hover:bg-[#14110E] transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            <span>+ Add Garment</span>
          </Link>
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

      <div className="space-y-6">
        {/* Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#F3EFEA] border border-[#ECE6DD] p-4">
            <span className="text-xs uppercase tracking-wider text-[#7C736A] block">
              Total Silhouettes
            </span>
            <span className="font-mono text-2xl font-medium text-[#1E1B18] mt-1 block">
              {products.length}
            </span>
          </div>

          <div className="bg-[#F3EFEA] border border-[#ECE6DD] p-4">
            <span className="text-xs uppercase tracking-wider text-[#7C736A] block">In Stock</span>
            <span className="font-mono text-2xl font-medium text-[#2E7D32] mt-1 block">
              {products.filter((p) => p.inStock).length}
            </span>
          </div>

          <div className="bg-[#F3EFEA] border border-[#ECE6DD] p-4">
            <span className="text-xs uppercase tracking-wider text-[#7C736A] block">
              Sold Out / Inactive
            </span>
            <span className="font-mono text-2xl font-medium text-[#C62828] mt-1 block">
              {products.filter((p) => !p.inStock).length}
            </span>
          </div>

          <div className="bg-[#F3EFEA] border border-[#ECE6DD] p-4">
            <span className="text-xs uppercase tracking-wider text-[#7C736A] block">
              Categories
            </span>
            <span className="font-mono text-2xl font-medium text-[#6E5043] mt-1 block">
              {new Set(products.map((p) => p.category)).size}
            </span>
          </div>
        </div>

        {/* Search & Dynamic Filter Controls Bar */}
        <div className="bg-[#F3EFEA] border border-[#ECE6DD] p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#7C736A] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by silhouette name, SKU (e.g. AB-ANA-01), or fabric..."
              className="w-full bg-[#FAF8F5] border border-[#E0D8CE] pl-9 pr-3 py-2 text-xs text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#FAF8F5] border border-[#E0D8CE] px-3 py-2 text-xs text-[#1E1B18] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="Anarkali">Anarkali</option>
              <option value="3-Piece Dresses">3-Piece Dresses</option>
              <option value="Co-ord Sets">Co-ord Sets</option>
              <option value="Chikankari Suit">Chikankari Suit</option>
            </select>

            {/* Stock Filter */}
            <div className="flex border border-[#E0D8CE] bg-[#FAF8F5]">
              <button
                type="button"
                onClick={() => setStockFilter('ALL')}
                className={`px-3 py-1.5 cursor-pointer ${
                  stockFilter === 'ALL' ? 'bg-[#231F1D] text-[#FAF8F5]' : 'text-[#7C736A]'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('IN_STOCK')}
                className={`px-3 py-1.5 cursor-pointer ${
                  stockFilter === 'IN_STOCK' ? 'bg-[#231F1D] text-[#FAF8F5]' : 'text-[#7C736A]'
                }`}
              >
                In Stock
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('OUT_OF_STOCK')}
                className={`px-3 py-1.5 cursor-pointer ${
                  stockFilter === 'OUT_OF_STOCK' ? 'bg-[#231F1D] text-[#FAF8F5]' : 'text-[#7C736A]'
                }`}
              >
                Sold Out
              </button>
            </div>

            <button
              onClick={fetchProducts}
              className="p-2 border border-[#E0D8CE] bg-[#FAF8F5] text-[#7C736A] hover:text-[#1E1B18] cursor-pointer"
              title="Refresh Inventory"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Products List / Table */}
        {loading ? (
          <div className="py-20 text-center text-sm text-[#7C736A] flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#6E5043] animate-spin" />
            <span>Loading garments collection...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-[#ECE6DD] bg-[#FAF8F5] space-y-2">
            <Package className="w-8 h-8 text-[#9E948A] mx-auto stroke-[1.3]" />
            <p className="font-serif text-lg text-[#1E1B18]">No silhouettes match your filter.</p>
            <p className="text-xs text-[#7C736A]">Try clearing search or switching filter categories.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-[#F3EFEA] border border-[#ECE6DD] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left min-w-[760px]">
                  <thead className="bg-[#FAF8F5] border-b border-[#ECE6DD] text-[#7C736A] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Garment & SKU</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Available Sizes</th>
                      <th className="py-3 px-4">Price / MRP</th>
                      <th className="py-3 px-4">Stock Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECE6DD]">
                    {paginatedProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                        <td className="py-3 px-4 flex items-center gap-3">
                          <div className="relative w-12 h-16 shrink-0 bg-[#ECE6DD] border border-[#E0D8CE] overflow-hidden group">
                            <img
                              src={p.primaryImage}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <span className="absolute bottom-0 inset-x-0 bg-[#1E1B18]/80 text-[#FAF8F5] text-[8px] font-mono text-center py-0.2">
                              {(p.gallery && p.gallery.length) || 1}P
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/admin/products/edit?id=${p.id}`}
                                className="font-medium text-sm text-[#1E1B18] hover:text-[#6E5043] transition-colors line-clamp-1"
                                title="Open dedicated full-page editor"
                              >
                                {p.name}
                              </Link>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] font-mono text-[#7C736A]">{p.sku}</span>
                              <span className="text-[#D5CCC0]">·</span>
                              <a
                                href={`/product/${p.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-[#6E5043] hover:underline font-mono"
                              >
                                <span>Live Page</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                            {/* Gallery Mini Thumbnail Strip */}
                            <div className="flex items-center gap-1 mt-1.5">
                              {(p.gallery && p.gallery.length > 0
                                ? p.gallery
                                : [{ url: p.primaryImage }]
                              )
                                .slice(0, 4)
                                .map((g: any, gIdx: number) => (
                                  <img
                                    key={gIdx}
                                    src={typeof g === 'string' ? g : g.url}
                                    alt=""
                                    className="w-4 h-5 object-cover border border-[#D5CCC0] rounded-xs bg-[#ECE6DD]"
                                  />
                                ))}
                              {(p.gallery?.length || 0) > 4 && (
                                <span className="text-[9px] text-[#7C736A] font-mono">
                                  +{p.gallery!.length - 4}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-[#5C544D]">
                          <span className="px-2 py-0.5 bg-[#FAF8F5] border border-[#E0D8CE] text-[11px]">
                            {p.category}
                          </span>
                        </td>

                        {/* Sizes Badges */}
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {(p.sizes || []).map((s) => (
                              <span
                                key={s}
                                className="px-1.5 py-0.5 bg-[#FAF8F5] border border-[#D5CCC0] text-[10px] font-mono font-medium text-[#1E1B18]"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-mono text-sm font-semibold text-[#1E1B18]">
                            {formatINR(p.price)}
                          </div>
                          {p.originalPrice && (
                            <div className="font-mono text-[11px] text-[#8C8278] line-through">
                              {formatINR(p.originalPrice)}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleStock(p)}
                            className={`px-2.5 py-1 text-[11px] font-medium cursor-pointer border flex items-center gap-1.5 w-fit ${
                              p.inStock
                                ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                                : 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]'
                            }`}
                          >
                            {p.inStock ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5" /> In Stock
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5" /> Out of Stock
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setMatrixProduct(p)}
                            className="mt-1.5 px-2 py-0.5 text-[10px] font-mono text-[#6E5043] hover:text-[#1E1B18] bg-[#FAF8F5] hover:bg-[#F3EFEA] border border-[#D5CCC0] rounded-xs flex items-center gap-1 transition-colors cursor-pointer"
                            title="Manage Size & Color Stock Matrix"
                          >
                            <Sliders className="w-3 h-3 text-[#A85A32]" />
                            <span>Stock Matrix</span>
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={`/product/${p.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-[#6E5043] hover:text-[#1E1B18] border border-[#E0D8CE] bg-[#FAF8F5] cursor-pointer"
                              title="Preview Dynamic Product Page"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </a>
                            <Link
                              href={`/admin/products/edit?id=${p.id}`}
                              className="p-1.5 text-[#5C544D] hover:text-[#1E1B18] border border-[#E0D8CE] bg-[#FAF8F5] cursor-pointer flex items-center gap-1"
                              title="Edit Silhouette & Multi-Angle Photos on Full Page"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span className="text-[11px] font-medium hidden sm:inline">Edit</span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDuplicateProduct(p)}
                              className="p-1.5 text-[#6E5043] hover:text-[#1E1B18] border border-[#E0D8CE] bg-[#FAF8F5] cursor-pointer flex items-center gap-1"
                              title="Duplicate / Clone Garment with all details & photos"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span className="text-[11px] font-medium hidden sm:inline">Clone</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(p.id)}
                              className="p-1.5 text-[#C62828] hover:text-[#B71C1C] border border-[#FFCDD2] bg-[#FFF5F5] cursor-pointer"
                              title="Delete Silhouette"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#5C544D] border-t border-[#ECE6DD]">
                <p>
                  Showing <span className="font-mono font-medium text-[#1E1B18]">{(currentPage - 1) * PRODUCTS_PER_PAGE + 1}</span> to{' '}
                  <span className="font-mono font-medium text-[#1E1B18]">
                    {Math.min(currentPage * PRODUCTS_PER_PAGE, filteredProducts.length)}
                  </span>{' '}
                  of <span className="font-mono font-medium text-[#1E1B18]">{filteredProducts.length}</span> silhouettes
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 bg-[#F3EFEA] border border-[#ECE6DD] hover:bg-[#EAE4DC] disabled:opacity-40 disabled:cursor-not-allowed text-[#1E1B18]"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-3 py-1 font-mono text-xs bg-[#FAF8F5] border border-[#ECE6DD]">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 bg-[#F3EFEA] border border-[#ECE6DD] hover:bg-[#EAE4DC] disabled:opacity-40 disabled:cursor-not-allowed text-[#1E1B18]"
                    aria-label="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Modal with Size Inventory Organizer */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={() => setModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative bg-[#FAF8F5] border border-[#ECE6DD] max-w-2xl w-full p-5 sm:p-8 space-y-5 sm:space-y-6 relative max-h-[92vh] overflow-y-auto z-10 shadow-2xl">
            <button
              onClick={() => setModalOpen(false)}
              aria-label="Close editor"
              className="absolute top-4 right-4 p-1.5 text-[#7C736A] hover:text-[#1E1B18] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <p className="text-xs uppercase tracking-wider text-[#7C736A]">
                {editingProduct ? 'Edit Existing Garment' : 'Create New Silhouette'}
              </p>
              <h2 className="font-serif text-2xl text-[#1E1B18] font-normal mt-1">
                {editingProduct ? editingProduct.name : 'Add New Garment to Collection'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
              <div>
                <label className="block text-[#1E1B18] font-medium mb-1">Garment Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setName(val);
                    revalidateField('name', { name: val });
                  }}
                  placeholder="e.g. Anarkali 03 — Ivory Handspun Kalidar"
                  className={`w-full bg-[#FAF8F5] border px-3.5 py-2.5 text-sm text-[#1E1B18] focus:outline-none ${
                    errors.name
                      ? 'border-[#C62828] bg-[#FFF5F5]'
                      : 'border-[#E0D8CE] focus:border-[#1E1B18]'
                  }`}
                />
                {errors.name && (
                  <p className="text-[11px] text-[#C62828] mt-1 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[#1E1B18] font-medium mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCategory(val);
                      revalidateField('category', { category: val });
                    }}
                    className={`w-full bg-[#FAF8F5] border px-3.5 py-2.5 text-sm text-[#1E1B18] focus:outline-none cursor-pointer ${
                      errors.category ? 'border-[#C62828] bg-[#FFF5F5]' : 'border-[#E0D8CE]'
                    }`}
                  >
                    <option value="Anarkali">Anarkali</option>
                    <option value="3-Piece Dresses">3-Piece Dresses</option>
                    <option value="Co-ord Sets">Co-ord Sets</option>
                    <option value="Chikankari Suit">Chikankari Suit</option>
                  </select>
                  {errors.category && (
                    <p className="text-[11px] text-[#C62828] mt-1 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      {errors.category}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[#1E1B18] font-medium mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPrice(val);
                      revalidateField('price', { price: val });
                    }}
                    placeholder="4850"
                    className={`w-full bg-[#FAF8F5] border px-3.5 py-2.5 text-sm font-mono text-[#1E1B18] focus:outline-none ${
                      errors.price
                        ? 'border-[#C62828] bg-[#FFF5F5]'
                        : 'border-[#E0D8CE] focus:border-[#1E1B18]'
                    }`}
                  />
                  {errors.price && (
                    <p className="text-[11px] text-[#C62828] mt-1 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      {errors.price}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[#1E1B18] font-medium mb-1">
                    MRP / Original Price (₹) (Optional)
                  </label>
                  <input
                    type="number"
                    value={originalPrice}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOriginalPrice(val);
                      revalidateField('originalPrice', { originalPrice: val });
                    }}
                    placeholder="5800"
                    className={`w-full bg-[#FAF8F5] border px-3.5 py-2.5 text-sm font-mono text-[#1E1B18] focus:outline-none ${
                      errors.originalPrice
                        ? 'border-[#C62828] bg-[#FFF5F5]'
                        : 'border-[#E0D8CE] focus:border-[#1E1B18]'
                    }`}
                  />
                  {errors.originalPrice && (
                    <p className="text-[11px] text-[#C62828] mt-1 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      {errors.originalPrice}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[#1E1B18] font-medium mb-1">Fabric & Weave *</label>
                  <input
                    type="text"
                    value={fabric}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFabric(val);
                      revalidateField('fabric', { fabric: val });
                    }}
                    placeholder="Pure Handloom Chanderi Silk"
                    className={`w-full bg-[#FAF8F5] border px-3.5 py-2.5 text-sm text-[#1E1B18] focus:outline-none ${
                      errors.fabric
                        ? 'border-[#C62828] bg-[#FFF5F5]'
                        : 'border-[#E0D8CE] focus:border-[#1E1B18]'
                    }`}
                  />
                  {errors.fabric && (
                    <p className="text-[11px] text-[#C62828] mt-1 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      {errors.fabric}
                    </p>
                  )}
                </div>
              </div>

              {/* SIZE INVENTORY ORGANIZER */}
              <div
                className={`p-4 bg-[#F3EFEA] border space-y-3 ${
                  errors.sizes ? 'border-[#C62828]' : 'border-[#E0D8CE]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-[#1E1B18] font-medium">
                      Size Inventory Organizer *
                    </label>
                    <p className="text-[11px] text-[#7C736A] mt-0.5">
                      Toggle active sizes for this silhouette or add custom tailor sizing:
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-mono font-medium ${
                      selectedSizes.length === 0 ? 'text-[#C62828]' : 'text-[#6E5043]'
                    }`}
                  >
                    {selectedSizes.length} Active
                  </span>
                </div>

                {errors.sizes && (
                  <p className="text-[11px] text-[#C62828] font-medium flex items-center gap-1 bg-[#FFF5F5] border border-[#FFCDD2] p-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {errors.sizes}
                  </p>
                )}

                {/* Standard Sizes Toggle Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {STANDARD_SIZES.map((sz) => {
                    const isSelected = selectedSizes.includes(sz);
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => toggleSize(sz)}
                        className={`px-3 py-1.5 text-xs font-mono font-medium border transition-colors cursor-pointer ${
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

                {/* Custom Size Addition */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#E0D8CE]">
                  <input
                    type="text"
                    value={customSizeInput}
                    onChange={(e) => setCustomSizeInput(e.target.value)}
                    placeholder="Add custom size (e.g. 4XL, PETITE, STITCHED)..."
                    className="flex-1 bg-[#FAF8F5] border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none uppercase"
                  />
                  <button
                    type="button"
                    onClick={addCustomSize}
                    className="px-3 py-1.5 bg-[#FAF8F5] border border-[#1E1B18] text-[#1E1B18] font-medium text-xs hover:bg-[#1E1B18] hover:text-[#FAF8F5] transition-colors cursor-pointer"
                  >
                    + Add Size
                  </button>
                </div>
              </div>

              {/* STUDIO PHOTOGRAPHY & MULTI-IMAGE GALLERY MANAGER */}
              <div
                className={`p-4 sm:p-5 bg-[#F3EFEA] border space-y-4 ${
                  errors.gallery || uploadErrors.length > 0 ? 'border-[#C62828]' : 'border-[#E0D8CE]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E0D8CE] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-[#6E5043]" />
                      <h3 className="font-serif text-lg text-[#1E1B18] font-normal">
                        Studio Photography & Gallery Angles
                      </h3>
                      <span className="px-2 py-0.5 bg-[#231F1D] text-[#FAF8F5] text-[10px] font-mono">
                        {gallery.length} / {MAX_GALLERY_PHOTOS} Photos
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7C736A] mt-0.5">
                      Configure every angle shown in the customer product page gallery. First photo is catalog cover.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => galleryFileInputRef.current?.click()}
                      disabled={uploadingGallery || gallery.length >= MAX_GALLERY_PHOTOS}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium hover:bg-[#14110E] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingGallery ? 'Uploading...' : '+ Upload Photo(s)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddUrlForm(!showAddUrlForm)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF8F5] border border-[#1E1B18] text-[#1E1B18] text-xs font-medium hover:bg-[#1E1B18] hover:text-[#FAF8F5] transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add by URL
                    </button>
                  </div>
                </div>

                {/* Upload Size Limit Info Banner */}
                <div className="flex items-center gap-2 px-3 py-2 bg-[#FAF8F5] border border-[#D5CCC0] text-[11px] text-[#5C544D]">
                  <HardDrive className="w-3.5 h-3.5 text-[#6E5043] shrink-0" />
                  <span>
                    <strong className="text-[#1E1B18]">Upload Size Limit:</strong>{' '}
                    {IMAGE_UPLOAD_LIMIT_BADGE} · Max {MAX_GALLERY_PHOTOS} photos per garment
                  </span>
                </div>

                {/* Inline Image Upload / Gallery Validation Errors */}
                {(errors.gallery || uploadErrors.length > 0) && (
                  <div className="p-3 bg-[#FFF5F5] border border-[#C62828] space-y-1 text-xs text-[#C62828]">
                    {errors.gallery && (
                      <p className="font-medium flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {errors.gallery}
                      </p>
                    )}
                    {uploadErrors.map((err, i) => (
                      <p key={i} className="font-medium flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {err}
                      </p>
                    ))}
                  </div>
                )}

                {/* Hidden File Inputs */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
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
                  ref={galleryFileInputRef}
                  onChange={handleGalleryUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />

                {/* Inline Add by URL Form */}
                {showAddUrlForm && (
                  <div className="p-3 bg-[#FAF8F5] border border-[#D5CCC0] space-y-2">
                    <p className="text-[11px] font-medium text-[#1E1B18]">Add Photo via Image URL</p>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-7">
                        <input
                          type="text"
                          value={newGalleryUrl}
                          onChange={(e) => setNewGalleryUrl(e.target.value)}
                          placeholder="Paste image URL (e.g. /images/... or https://...)"
                          className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3 py-1.5 text-xs font-mono text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          value={newGalleryLabel}
                          onChange={(e) => setNewGalleryLabel(e.target.value)}
                          placeholder="Angle Label (e.g. Back Detail)"
                          className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handleAddGalleryUrl}
                          className="w-full py-1.5 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium hover:bg-[#14110E] cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lead Cover & Hover Drape Key Roles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#FAF8F5] border border-[#E0D8CE]">
                  {/* Primary Cover Role */}
                  <div className="flex items-center gap-3">
                    <div className="relative aspect-[3/4] w-14 shrink-0 bg-[#ECE6DD] border border-[#D5CCC0] overflow-hidden flex items-center justify-center">
                      {(gallery[0]?.url || primaryImage) ? (
                        <>
                          <img
                            src={gallery[0]?.url || primaryImage}
                            alt="Primary Cover"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-0 inset-x-0 bg-[#231F1D]/85 text-[#FAF8F5] text-[8px] font-mono text-center py-0.5">
                            COVER
                          </span>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center bg-[#ECE6DD]">
                          <Camera className="w-4 h-4 text-[#A89F91]" />
                          <span className="text-[8px] text-[#7C736A] mt-0.5">No Cover</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Star className="w-3 h-3 fill-[#D97706] text-[#D97706]" />
                        <span className="text-xs font-medium text-[#1E1B18]">Catalog Cover Photo</span>
                      </div>
                      <p className="text-[10px] text-[#7C736A] truncate">
                        {gallery[0]?.label || (gallery[0]?.url ? 'Position #1 in gallery' : 'No photo uploaded yet')}
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="text-[10px] text-[#6E5043] font-medium hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-2.5 h-2.5" />
                        {uploadingImage ? 'Uploading...' : (gallery[0]?.url ? 'Replace Cover Image' : 'Upload Cover Image')}
                      </button>
                    </div>
                  </div>

                  {/* Secondary Hover Drape Role */}
                  <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-[#E0D8CE] pt-2 sm:pt-0 sm:pl-3">
                    <div className="relative aspect-[3/4] w-14 shrink-0 bg-[#ECE6DD] border border-[#D5CCC0] overflow-hidden flex items-center justify-center">
                      {secondaryImage ? (
                        <>
                          <img
                            src={secondaryImage}
                            alt="Hover Drape"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-0 inset-x-0 bg-[#6E5043]/90 text-[#FAF8F5] text-[8px] font-mono text-center py-0.5">
                            HOVER
                          </span>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center bg-[#ECE6DD]">
                          <Sparkles className="w-4 h-4 text-[#A89F91]" />
                          <span className="text-[8px] text-[#7C736A] mt-0.5">No Drape</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-[#6E5043]" />
                        <span className="text-xs font-medium text-[#1E1B18]">Secondary Hover Drape</span>
                      </div>
                      <p className="text-[10px] text-[#7C736A] truncate">
                        Shown when customer hovers over card in catalog
                      </p>
                      <button
                        type="button"
                        onClick={() => secondaryFileInputRef.current?.click()}
                        disabled={uploadingSecondary}
                        className="text-[10px] text-[#6E5043] font-medium hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-2.5 h-2.5" />
                        {uploadingSecondary ? 'Uploading...' : (secondaryImage ? 'Replace Hover Drape' : 'Upload Hover Drape')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* All Gallery Photos Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-[#1E1B18]">
                    <span>Product Page Image Sequence ({gallery.length} Photos):</span>
                    <span className="text-[11px] text-[#7C736A] font-normal">
                      Drag / Reorder using buttons · Click "Make Cover" to swap primary
                    </span>
                  </div>

                  {gallery.length === 0 ? (
                    <div className="py-10 text-center bg-[#FAF8F5] border border-dashed border-[#D5CCC0] p-6 space-y-1">
                      <Camera className="w-6 h-6 text-[#A89F91] mx-auto mb-1" />
                      <p className="text-xs font-medium text-[#1E1B18]">No photos uploaded yet</p>
                      <p className="text-[11px] text-[#7C736A]">Upload high-resolution photography using the button above.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto p-1">
                      {gallery.map((item, idx) => {
                        const isPrimary = idx === 0;
                        const isSecondary = item.url === secondaryImage;
                        return (
                          <div
                            key={idx}
                            className={`p-2.5 bg-[#FAF8F5] border transition-all flex gap-3 ${
                              isPrimary
                                ? 'border-[#D97706] ring-1 ring-[#D97706]/40'
                                : 'border-[#D5CCC0] hover:border-[#1E1B18]'
                            }`}
                          >
                            {/* 3:4 Aspect Thumbnail */}
                            <div className="relative aspect-[3/4] w-20 shrink-0 bg-[#ECE6DD] border border-[#E0D8CE] overflow-hidden group">
                              <img
                                src={item.url}
                                alt={item.label || `Photo ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#1E1B18]/80 text-[#FAF8F5] font-mono text-[9px] font-medium">
                                #{idx + 1}
                              </span>
                            </div>

                            {/* Details & Controls */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {isPrimary && (
                                      <span className="px-1.5 py-0.2 bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-[9px] font-medium flex items-center gap-0.5">
                                        <Star className="w-2.5 h-2.5 fill-[#D97706]" /> Primary Cover
                                      </span>
                                    )}
                                    {isSecondary && (
                                      <span className="px-1.5 py-0.2 bg-[#E0E7FF] text-[#3730A3] border border-[#C7D2FE] text-[9px] font-medium">
                                        Hover Drape
                                      </span>
                                    )}
                                  </div>

                                  {/* Reorder Buttons */}
                                  <div className="flex items-center gap-0.5">
                                    <button
                                      type="button"
                                      onClick={() => handleMoveGalleryItem(idx, 'up')}
                                      disabled={idx === 0}
                                      title="Move earlier in gallery"
                                      className="p-1 text-[#7C736A] hover:text-[#1E1B18] disabled:opacity-20 cursor-pointer"
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMoveGalleryItem(idx, 'down')}
                                      disabled={idx === gallery.length - 1}
                                      title="Move later in gallery"
                                      className="p-1 text-[#7C736A] hover:text-[#1E1B18] disabled:opacity-20 cursor-pointer"
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Angle / Shot Label */}
                                <div>
                                  <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">
                                    Angle Description / Label:
                                  </label>
                                  <input
                                    type="text"
                                    value={item.label || ''}
                                    onChange={(e) =>
                                      handleUpdateGalleryItem(idx, { label: e.target.value })
                                    }
                                    placeholder="e.g. Pleated Bodice & Neckline Detail"
                                    className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-2 py-1 text-xs text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                                  />
                                </div>

                                {/* URL Input */}
                                <div>
                                  <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-0.5">
                                    Image URL:
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
                                        handleUpdateGalleryItem(idx, { url: val });
                                      }
                                    }}
                                    className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-2 py-0.5 text-[10px] font-mono text-[#5C544D] focus:outline-none"
                                  />
                                </div>
                              </div>

                              {/* Card Action Bar */}
                              <div className="flex items-center justify-between gap-1 pt-2 border-t border-[#E0D8CE] mt-2">
                                <div className="flex items-center gap-1.5">
                                  {!isPrimary && (
                                    <button
                                      type="button"
                                      onClick={() => handleSetPrimary(idx)}
                                      className="px-2 py-0.5 bg-[#FAF8F5] border border-[#D97706] text-[#92400E] text-[10px] font-medium hover:bg-[#FEF3C7] transition-colors cursor-pointer"
                                    >
                                      ★ Make Cover
                                    </button>
                                  )}
                                  {!isSecondary && (
                                    <button
                                      type="button"
                                      onClick={() => handleSetSecondary(idx)}
                                      className="px-2 py-0.5 bg-[#FAF8F5] border border-[#C7D2FE] text-[#3730A3] text-[10px] font-medium hover:bg-[#EEF2FF] transition-colors cursor-pointer"
                                    >
                                      Set Hover
                                    </button>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveGalleryItem(idx)}
                                  title="Delete photo"
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
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[#1E1B18] font-medium">
                    Garment Description & Cut Notes *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const autoDesc = `Handcrafted ${category.toLowerCase()} tailored from ${(fabric || 'pure handloom silk').toLowerCase()} with architectural kalidar panels, French seams, and deep functional side pockets.`;
                      setDescription(autoDesc);
                      revalidateField('description', { description: autoDesc });
                    }}
                    className="text-[11px] font-medium text-[#6E5043] hover:text-[#1E1B18] underline cursor-pointer"
                  >
                    + Auto-Fill Craftsmanship Note
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDescription(val);
                    revalidateField('description', { description: val });
                  }}
                  placeholder="Architectural kalidar panels, french seams, and deep functional pockets..."
                  className={`w-full bg-[#FAF8F5] border p-3 text-xs text-[#1E1B18] focus:outline-none ${
                    errors.description
                      ? 'border-[#C62828] bg-[#FFF5F5]'
                      : 'border-[#E0D8CE] focus:border-[#1E1B18]'
                  }`}
                />
                {errors.description && (
                  <p className="text-[11px] text-[#C62828] mt-1 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Validation Summary Alert Box directly above Save button */}
              {(Object.keys(errors).length > 0 || serverError || uploadErrors.length > 0) && (
                <div className="bg-[#FFF5F5] border border-[#C62828] p-3.5 space-y-1.5">
                  <div className="flex items-center gap-2 text-[#C62828] font-medium text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Please resolve the following issue(s) before saving this garment:
                    </span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-[#B71C1C] space-y-0.5 pl-1">
                    {serverError && <li className="font-semibold">{serverError}</li>}
                    {Object.entries(errors).map(([fieldKey, errMsg]) =>
                      errMsg ? <li key={fieldKey}>{errMsg}</li> : null
                    )}
                    {uploadErrors.map((uErr, idx) => (
                      <li key={`upload-${idx}`}>{uErr}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#ECE6DD]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 border border-[#E0D8CE] text-xs font-medium uppercase tracking-wider text-[#7C736A] hover:bg-[#F3EFEA] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-wider hover:bg-[#14110E] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingProduct ? 'Save Silhouette' : 'Add Garment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Inventory Matrix Modal */}
      {matrixProduct && (
        <div className="fixed inset-0 z-50 bg-[#1E1B18]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#FAF8F5] border border-[#D5CCC0] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0D8CE] bg-[#FAF8F5]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#EFE9E1] flex items-center justify-center border border-[#D5CCC0]">
                  <Sliders className="w-4 h-4 text-[#A85A32]" />
                </div>
                <div>
                  <h3 className="font-serif text-lg text-[#1E1B18]">Stock Inventory Matrix</h3>
                  <p className="text-[11px] text-[#7C736A]">
                    Live real-time inventory and availability control per size & color variant
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMatrixProduct(null)}
                className="p-1.5 text-[#7C736A] hover:text-[#1E1B18] border border-[#E0D8CE] bg-white cursor-pointer transition-colors"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Product Summary Header Card */}
              <div className="flex items-center gap-4 p-4 bg-white border border-[#E0D8CE] shadow-xs">
                <img
                  src={matrixProduct.primaryImage}
                  alt={matrixProduct.name}
                  className="w-16 h-20 object-cover border border-[#D5CCC0] rounded-xs bg-[#ECE6DD]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#A85A32] tracking-wider uppercase font-semibold">
                      SKU: {matrixProduct.sku}
                    </span>
                    <span className="px-1.5 py-0.5 text-[10px] bg-[#FAF8F5] border border-[#E0D8CE] text-[#5C544D]">
                      {matrixProduct.category}
                    </span>
                  </div>
                  <h4 className="font-serif text-base text-[#1E1B18] truncate mt-0.5">{matrixProduct.name}</h4>
                  <div className="font-mono text-sm font-semibold text-[#1E1B18] mt-1">
                    {formatINR(matrixProduct.price)}
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[#7C736A]">
                    Master Availability
                  </span>
                  <button
                    type="button"
                    disabled={updatingMatrix}
                    onClick={() => handleToggleStock(matrixProduct)}
                    className={`px-3 py-1 text-xs font-medium cursor-pointer border flex items-center gap-1.5 transition-colors ${
                      matrixProduct.inStock
                        ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                        : 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]'
                    }`}
                  >
                    {matrixProduct.inStock ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" /> In Stock
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" /> Out of Stock
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Sizes Stock Matrix */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium uppercase tracking-wider text-[#1E1B18] flex items-center gap-2">
                    <span>Size-Wise Inventory & Availability</span>
                    <span className="text-[10px] text-[#7C736A] font-mono normal-case">
                      ({(matrixProduct.sizes || STANDARD_SIZES).length} sizes)
                    </span>
                  </h4>
                  {updatingMatrix && (
                    <span className="text-[11px] font-mono text-[#A85A32] animate-pulse">
                      Updating catalog...
                    </span>
                  )}
                </div>

                <div className="border border-[#E0D8CE] bg-white overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#FAF8F5] border-b border-[#E0D8CE] text-[11px] font-mono uppercase tracking-wider text-[#7C736A]">
                        <th className="py-2.5 px-4 font-medium">Size</th>
                        <th className="py-2.5 px-4 font-medium">Status</th>
                        <th className="py-2.5 px-4 font-medium">Stock Units</th>
                        <th className="py-2.5 px-4 font-medium text-right">Quick Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ECE6DD]">
                      {(matrixProduct.sizes && matrixProduct.sizes.length > 0
                        ? matrixProduct.sizes
                        : STANDARD_SIZES
                      ).map((sz) => {
                        const stockObj = matrixProduct.sizeStock?.[sz] || {
                          inStock: matrixProduct.inStock !== false,
                          quantity: matrixProduct.inStock !== false ? 10 : 0,
                        };
                        const isInStock = stockObj.inStock;
                        const qty = stockObj.quantity ?? (isInStock ? 10 : 0);

                        return (
                          <tr key={sz} className="hover:bg-[#FAF8F5]/60 transition-colors">
                            <td className="py-2.5 px-4">
                              <span className="font-mono font-bold text-xs px-2 py-0.5 bg-[#FAF8F5] border border-[#D5CCC0] text-[#1E1B18]">
                                {sz}
                              </span>
                            </td>
                            <td className="py-2.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium border ${
                                  isInStock
                                    ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                                    : 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]'
                                }`}
                              >
                                {isInStock ? (
                                  <>
                                    <CheckCircle className="w-3 h-3" /> Available
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3" /> Sold Out
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={9999}
                                  key={`${sz}-${qty}`}
                                  defaultValue={qty}
                                  disabled={updatingMatrix}
                                  onBlur={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    if (!isNaN(val) && val !== qty) {
                                      handleUpdateSizeQuantity(matrixProduct, sz, val);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  className="w-20 px-2 py-1 font-mono text-xs border border-[#D5CCC0] bg-[#FAF8F5] text-[#1E1B18] focus:bg-white focus:outline-none focus:border-[#A85A32]"
                                  title="Enter quantity and click outside (or press Enter) to save"
                                />
                                <span className="text-[11px] text-[#7C736A] font-mono">pcs</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <button
                                type="button"
                                disabled={updatingMatrix}
                                onClick={() => handleToggleSizeStock(matrixProduct, sz)}
                                className={`px-2.5 py-1 text-[11px] font-medium border cursor-pointer transition-colors ${
                                  isInStock
                                    ? 'border-[#FFCDD2] text-[#C62828] bg-white hover:bg-[#FFF5F5]'
                                    : 'border-[#C8E6C9] text-[#2E7D32] bg-white hover:bg-[#E8F5E9]'
                                }`}
                              >
                                {isInStock ? 'Mark Sold Out' : 'Mark Available'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Colors Stock Matrix (if colors configured) */}
              {matrixProduct.colors && matrixProduct.colors.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-medium uppercase tracking-wider text-[#1E1B18] flex items-center gap-2">
                    <span>Color Variants Availability</span>
                    <span className="text-[10px] text-[#7C736A] font-mono normal-case">
                      ({matrixProduct.colors.length} shades)
                    </span>
                  </h4>

                  <div className="border border-[#E0D8CE] bg-white overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#FAF8F5] border-b border-[#E0D8CE] text-[11px] font-mono uppercase tracking-wider text-[#7C736A]">
                          <th className="py-2.5 px-4 font-medium">Color Swatch</th>
                          <th className="py-2.5 px-4 font-medium">Shade Name</th>
                          <th className="py-2.5 px-4 font-medium">Status</th>
                          <th className="py-2.5 px-4 font-medium">Stock Units</th>
                          <th className="py-2.5 px-4 font-medium text-right">Toggle Availability</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ECE6DD]">
                        {matrixProduct.colors.map((c, cIdx) => {
                          const isColorInStock = c.inStock !== false;
                          const cQty = c.stockQuantity ?? (isColorInStock ? 10 : 0);

                          return (
                            <tr key={cIdx} className="hover:bg-[#FAF8F5]/60 transition-colors">
                              <td className="py-2.5 px-4">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-5 h-5 rounded-full border border-[#D5CCC0] shadow-xs shrink-0"
                                    style={{ backgroundColor: c.hex }}
                                  />
                                  <span className="font-mono text-[10px] text-[#7C736A]">
                                    {c.hex}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 px-4">
                                <span className="font-medium text-[#1E1B18]">{c.name}</span>
                              </td>
                              <td className="py-2.5 px-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium border ${
                                    isColorInStock
                                      ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                                      : 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]'
                                  }`}
                                >
                                  {isColorInStock ? (
                                    <>
                                      <CheckCircle className="w-3 h-3" /> In Stock
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-3 h-3" /> Sold Out
                                    </>
                                  )}
                                </span>
                              </td>
                              <td className="py-2.5 px-4">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={0}
                                    max={9999}
                                    key={`${c.name}-${cQty}`}
                                    defaultValue={cQty}
                                    disabled={updatingMatrix}
                                    onBlur={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      if (!isNaN(val) && val !== cQty) {
                                        handleUpdateColorQuantity(matrixProduct, c.name, val);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.currentTarget.blur();
                                      }
                                    }}
                                    className="w-20 px-2 py-1 font-mono text-xs border border-[#D5CCC0] bg-[#FAF8F5] text-[#1E1B18] focus:bg-white focus:outline-none focus:border-[#A85A32]"
                                    title="Enter color quantity and press Enter"
                                  />
                                  <span className="text-[11px] text-[#7C736A] font-mono">pcs</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <button
                                  type="button"
                                  disabled={updatingMatrix}
                                  onClick={() => handleToggleColorStock(matrixProduct, c.name)}
                                  className={`px-2.5 py-1 text-[11px] font-medium border cursor-pointer transition-colors ${
                                    isColorInStock
                                      ? 'border-[#FFCDD2] text-[#C62828] bg-white hover:bg-[#FFF5F5]'
                                      : 'border-[#C8E6C9] text-[#2E7D32] bg-white hover:bg-[#E8F5E9]'
                                  }`}
                                >
                                  {isColorInStock ? 'Mark Sold Out' : 'Mark Available'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 bg-[#FAF8F5] border-t border-[#E0D8CE]">
              <span className="text-[11px] text-[#7C736A]">
                Changes are saved immediately and updated on the live storefront.
              </span>
              <button
                type="button"
                onClick={() => setMatrixProduct(null)}
                className="px-5 py-2 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-wider hover:bg-[#14110E] transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
