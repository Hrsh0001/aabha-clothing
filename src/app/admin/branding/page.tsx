'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
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
  Compass,
  Smartphone,
  Tablet,
  Monitor,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Palette,
  FileText,
  Edit2,
  Globe,
  Check,
  Tag,
  X,
  Copy,
} from 'lucide-react';
import { AdminLayout } from '@/src/components/AdminLayout';
import { useAuth } from '@/src/context/AuthContext';
import type { SiteSettings } from '../../api/settings/route';
import {
  NavLinkItem,
  FooterLinkItem,
  FooterColumn,
  CustomPageItem,
  DEFAULT_NAV_LINKS,
  DEFAULT_FOOTER_COLUMNS,
  DEFAULT_CUSTOM_PAGES,
} from '@/src/lib/site-settings';
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

const DESTINATION_PRESETS = [
  { label: 'Home Page (/)', value: '/' },
  { label: 'New Arrivals Edit (/#new-arrivals)', value: '/#new-arrivals' },
  { label: 'All Collection Catalog (/shop)', value: '/shop' },
  { label: 'Anarkali Suits (/shop?category=Anarkali)', value: '/shop?category=Anarkali' },
  { label: '3-Piece Ensembles (/shop?category=3-Piece Dresses)', value: '/shop?category=3-Piece Dresses' },
  { label: 'Co-ord Twin Sets (/shop?category=Co-ord Sets)', value: '/shop?category=Co-ord Sets' },
  { label: 'Chikankari Handloom (/shop?category=Chikankari Suit)', value: '/shop?category=Chikankari Suit' },
  { label: 'About Atelier (/about)', value: '/about' },
  { label: 'Contact Concierge (/contact)', value: '/contact' },
  { label: 'Track Orders & Bills (/my-orders)', value: '/my-orders' },
  { label: 'WhatsApp Concierge (Direct Chat)', value: 'whatsapp' },
  { label: 'Customer Support Email', value: 'email' },
  { label: 'Shipping Policy (/policy?topic=shipping)', value: '/policy?topic=shipping' },
  { label: 'Returns & Exchange Policy (/policy?topic=returns)', value: '/policy?topic=returns' },
  { label: 'FAQ (/policy?topic=faq)', value: '/policy?topic=faq' },
  { label: 'Privacy Policy (/policy?topic=privacy)', value: '/policy?topic=privacy' },
  { label: 'Terms & Conditions (/policy?topic=terms)', value: '/policy?topic=terms' },
  { label: 'Custom Destination URL...', value: '__CUSTOM__' },
];

type BrandingTab =
  | 'pages_manager'
  | 'nav_footer'
  | 'hero'
  | 'categories'
  | 'arrivals_trust'
  | 'story_about'
  | 'contact_social'
  | 'themes'
  | 'layout_manager'
  | 'preview';

export default function AdminBrandingPage() {
  const { adminToken } = useAuth();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<BrandingTab>('nav_footer');

  // Synchronize active tab with URL query parameter ?tab=
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (
        tabParam &&
        [
          'pages_manager',
          'nav_footer',
          'hero',
          'categories',
          'arrivals_trust',
          'story_about',
          'contact_social',
          'themes',
          'layout_manager',
          'preview',
        ].includes(tabParam)
      ) {
        setActiveTab(tabParam as BrandingTab);
      }
    }
  }, []);

  const switchTab = (tab: BrandingTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    }
  };
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [previewPage, setPreviewPage] = useState<string>('/');
  const [iframeKey, setIframeKey] = useState<number>(0);

  // Dynamic Pages Manager State
  const [pageModalOpen, setPageModalOpen] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [pageForm, setPageForm] = useState<CustomPageItem>({
    id: '',
    slug: '',
    title: '',
    subtitle: '',
    heroImage: '',
    content: '',
    published: true,
    metaTitle: '',
    metaDescription: '',
  });

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
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as BrandingTab;
      const validTabs: BrandingTab[] = [
        'nav_footer',
        'hero',
        'categories',
        'arrivals_trust',
        'story_about',
        'contact_social',
        'themes',
        'layout_manager',
        'preview',
      ];
      if (tabParam && validTabs.includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
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
        if (fieldKey === 'custom_page_hero') {
          setPageForm((prev) => ({ ...prev, heroImage: data.imageUrl }));
          showToast('Page hero photo uploaded!');
          return;
        }
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

  // Dynamic Destination Presets (System pages + Admin custom pages)
  const dynamicDestinationPresets = React.useMemo(() => {
    const list = [...DESTINATION_PRESETS];
    if (settings?.customPages && settings.customPages.length > 0) {
      const customItems = settings.customPages.map((cp) => ({
        label: `📄 ${cp.title} (/pages/${cp.slug})`,
        value: `/pages/${cp.slug}`,
      }));
      list.splice(list.length - 1, 0, ...customItems);
    }
    return list;
  }, [settings?.customPages]);

  // Custom Dynamic Pages Manager Helpers
  const currentCustomPages: CustomPageItem[] = settings?.customPages || DEFAULT_CUSTOM_PAGES;

  const handleOpenCreatePage = () => {
    setEditingPageId(null);
    setPageForm({
      id: `page_${Date.now()}`,
      slug: '',
      title: '',
      subtitle: '',
      heroImage: '/images/brand_story_editorial_1791119191742.jpg',
      content: '',
      published: true,
      metaTitle: '',
      metaDescription: '',
    });
    setPageModalOpen(true);
  };

  const handleOpenEditPage = (page: CustomPageItem) => {
    setEditingPageId(page.id);
    setPageForm({ ...page });
    setPageModalOpen(true);
  };

  const handleDuplicateCustomPage = (page: CustomPageItem) => {
    setEditingPageId(null);
    setPageForm({
      ...page,
      id: `page_${Date.now()}`,
      slug: `${page.slug}-copy`,
      title: `${page.title} (Copy)`,
      published: false,
    });
    setPageModalOpen(true);
    showToast(`Cloned "${page.title}". Review details and save to create.`);
  };

  const handleSaveCustomPage = () => {
    if (!pageForm.title.trim()) {
      showToast('Page Title is required', 'error');
      return;
    }
    const cleanSlug = (pageForm.slug || pageForm.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    if (!cleanSlug) {
      showToast('A valid URL slug is required', 'error');
      return;
    }

    if (!settings) return;
    const currentList = Array.isArray(settings.customPages)
      ? [...settings.customPages]
      : [...DEFAULT_CUSTOM_PAGES];
    const now = new Date().toISOString().split('T')[0];

    const finalizedItem: CustomPageItem = {
      ...pageForm,
      id: pageForm.id || `page_${Date.now()}`,
      slug: cleanSlug,
      updatedAt: now,
      createdAt: pageForm.createdAt || now,
    };

    let updatedList: CustomPageItem[];
    if (editingPageId) {
      updatedList = currentList.map((p) => (p.id === editingPageId ? finalizedItem : p));
    } else {
      updatedList = [finalizedItem, ...currentList.filter((p) => p.slug !== cleanSlug)];
    }

    setSettings({
      ...settings,
      customPages: updatedList,
    });

    setPageModalOpen(false);
    showToast(editingPageId ? 'Page updated. Click "Save All Changes" to publish.' : 'New page created. Click "Save All Changes" to publish.');
  };

  const handleDeleteCustomPage = (pageId: string) => {
    if (!settings) return;
    const target = (settings.customPages || DEFAULT_CUSTOM_PAGES).find((p) => p.id === pageId);
    const title = target ? `"${target.title}"` : 'this page';
    if (!window.confirm(`Are you sure you want to delete ${title}? This action cannot be undone.`)) {
      return;
    }
    const updated = (settings.customPages || DEFAULT_CUSTOM_PAGES).filter((p) => p.id !== pageId);
    setSettings({
      ...settings,
      customPages: updated,
    });
    showToast(`Page deleted. Click "Save All Changes" to commit.`);
  };

  const handleTogglePublishCustomPage = (pageId: string) => {
    if (!settings) return;
    const updated = (settings.customPages || DEFAULT_CUSTOM_PAGES).map((p) =>
      p.id === pageId ? { ...p, published: !p.published } : p
    );
    setSettings({
      ...settings,
      customPages: updated,
    });
    showToast('Page publish status toggled');
  };

  const handleAddCustomPageToNavbar = (page: CustomPageItem) => {
    if (!settings) return;
    const links = [...(settings.navLinks || DEFAULT_NAV_LINKS)];
    const pageHref = `/pages/${page.slug}`;
    if (links.some((l) => l.href === pageHref)) {
      showToast(`"${page.title}" is already in the navigation menu.`);
      return;
    }
    const newItem: NavLinkItem = {
      id: `nav_${page.slug}_${Date.now()}`,
      label: page.title,
      href: pageHref,
      visible: true,
    };
    setSettings({ ...settings, navLinks: [...links, newItem] });
    showToast(`Added "${page.title}" to Header Navigation!`);
  };

  const handleAddCustomPageToFooter = (page: CustomPageItem) => {
    if (!settings) return;
    const cols = [...(settings.footerColumns || DEFAULT_FOOTER_COLUMNS)];
    const pageHref = `/pages/${page.slug}`;
    const targetIdx = cols.findIndex((c) => c.id === 'col-house') >= 0 ? cols.findIndex((c) => c.id === 'col-house') : 0;
    if (cols[targetIdx]) {
      cols[targetIdx] = {
        ...cols[targetIdx],
        links: [
          ...cols[targetIdx].links,
          {
            id: `fl_${page.slug}_${Date.now()}`,
            label: page.title,
            href: pageHref,
            visible: true,
          },
        ],
      };
      setSettings({ ...settings, footerColumns: cols });
      showToast(`Added "${page.title}" to Footer!`);
    }
  };

  // Navbar Links Helpers
  const currentNavLinks: NavLinkItem[] = settings?.navLinks || DEFAULT_NAV_LINKS;

  const updateNavLink = (id: string, updates: Partial<NavLinkItem>) => {
    if (!settings) return;
    const links = [...(settings.navLinks || DEFAULT_NAV_LINKS)];
    const idx = links.findIndex((l) => l.id === id);
    if (idx !== -1) {
      links[idx] = { ...links[idx], ...updates };
      setSettings({ ...settings, navLinks: links });
    }
  };

  const addNavLink = () => {
    if (!settings) return;
    const links = [...(settings.navLinks || DEFAULT_NAV_LINKS)];
    const newItem: NavLinkItem = {
      id: `nav_${Date.now()}`,
      label: 'New Link',
      href: '/shop',
      visible: true,
    };
    setSettings({ ...settings, navLinks: [...links, newItem] });
    showToast('New navbar link added');
  };

  const removeNavLink = (id: string) => {
    if (!settings) return;
    const links = (settings.navLinks || DEFAULT_NAV_LINKS).filter((l) => l.id !== id);
    setSettings({ ...settings, navLinks: links });
    showToast('Navbar link removed');
  };

  const moveNavLink = (index: number, direction: 'up' | 'down') => {
    if (!settings) return;
    const links = [...(settings.navLinks || DEFAULT_NAV_LINKS)];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= links.length) return;
    const temp = links[index];
    links[index] = links[target];
    links[target] = temp;
    setSettings({ ...settings, navLinks: links });
  };

  const resetNavLinks = () => {
    if (!settings) return;
    setSettings({ ...settings, navLinks: [...DEFAULT_NAV_LINKS] });
    showToast('Storefront navbar reset to defaults');
  };

  // Footer Columns Helpers
  const currentFooterColumns: FooterColumn[] = settings?.footerColumns || DEFAULT_FOOTER_COLUMNS;

  const updateFooterColumn = (colId: string, updates: Partial<FooterColumn>) => {
    if (!settings) return;
    const cols = [...(settings.footerColumns || DEFAULT_FOOTER_COLUMNS)];
    const idx = cols.findIndex((c) => c.id === colId);
    if (idx !== -1) {
      cols[idx] = { ...cols[idx], ...updates };
      setSettings({ ...settings, footerColumns: cols });
    }
  };

  const addFooterColumn = () => {
    if (!settings) return;
    const cols = [...(settings.footerColumns || DEFAULT_FOOTER_COLUMNS)];
    const newCol: FooterColumn = {
      id: `col_${Date.now()}`,
      title: 'NEW SECTION',
      visible: true,
      links: [
        { id: `fl_${Date.now()}_1`, label: 'All Silhouettes', href: '/shop', visible: true },
      ],
    };
    setSettings({ ...settings, footerColumns: [...cols, newCol] });
    showToast('New footer column added');
  };

  const removeFooterColumn = (colId: string) => {
    if (!settings) return;
    const cols = (settings.footerColumns || DEFAULT_FOOTER_COLUMNS).filter((c) => c.id !== colId);
    setSettings({ ...settings, footerColumns: cols });
    showToast('Footer column removed');
  };

  const moveFooterColumn = (index: number, direction: 'up' | 'down') => {
    if (!settings) return;
    const cols = [...(settings.footerColumns || DEFAULT_FOOTER_COLUMNS)];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= cols.length) return;
    const temp = cols[index];
    cols[index] = cols[target];
    cols[target] = temp;
    setSettings({ ...settings, footerColumns: cols });
  };

  const addFooterLink = (colId: string) => {
    if (!settings) return;
    const cols = [...(settings.footerColumns || DEFAULT_FOOTER_COLUMNS)];
    const col = cols.find((c) => c.id === colId);
    if (col) {
      col.links = [
        ...(col.links || []),
        { id: `fl_${Date.now()}`, label: 'New Link', href: '/shop', visible: true },
      ];
      setSettings({ ...settings, footerColumns: cols });
      showToast('Footer link added');
    }
  };

  const updateFooterLink = (colId: string, linkId: string, updates: Partial<FooterLinkItem>) => {
    if (!settings) return;
    const cols = [...(settings.footerColumns || DEFAULT_FOOTER_COLUMNS)];
    const col = cols.find((c) => c.id === colId);
    if (col && col.links) {
      const lIdx = col.links.findIndex((l) => l.id === linkId);
      if (lIdx !== -1) {
        col.links[lIdx] = { ...col.links[lIdx], ...updates };
        setSettings({ ...settings, footerColumns: cols });
      }
    }
  };

  const removeFooterLink = (colId: string, linkId: string) => {
    if (!settings) return;
    const cols = [...(settings.footerColumns || DEFAULT_FOOTER_COLUMNS)];
    const col = cols.find((c) => c.id === colId);
    if (col && col.links) {
      col.links = col.links.filter((l) => l.id !== linkId);
      setSettings({ ...settings, footerColumns: cols });
      showToast('Footer link removed');
    }
  };

  const moveFooterLink = (colId: string, linkIndex: number, direction: 'up' | 'down') => {
    if (!settings) return;
    const cols = [...(settings.footerColumns || DEFAULT_FOOTER_COLUMNS)];
    const col = cols.find((c) => c.id === colId);
    if (col && col.links) {
      const target = direction === 'up' ? linkIndex - 1 : linkIndex + 1;
      if (target < 0 || target >= col.links.length) return;
      const temp = col.links[linkIndex];
      col.links[linkIndex] = col.links[target];
      col.links[target] = temp;
      setSettings({ ...settings, footerColumns: cols });
    }
  };

  const resetFooterColumns = () => {
    if (!settings) return;
    setSettings({
      ...settings,
      footerColumns: [...DEFAULT_FOOTER_COLUMNS],
      footerTagline: 'Premium Indian women’s ethnic wear crafted in small handloom batches with modern silhouettes and timeless elegance.',
      footerCopyright: '© 2026 AABHA CLOTHING. All rights reserved.',
    });
    showToast('Footer layout restored to defaults');
  };

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
          {/* Quick Dedicated Pages Hub Link */}
          <div className="bg-[#1A1715] text-[#FAF8F5] p-3 px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs border border-[#2C2723]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#A8E6CF] animate-pulse"></span>
              <span className="font-serif tracking-wide text-sm">Dedicated Pages &amp; Navigation Manager Available</span>
              <span className="text-[#A69C91] text-[11px]">— Manage all system &amp; custom lookbook pages in a dedicated view</span>
            </div>
            <Link
              href="/admin/pages"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#D4AF37] hover:bg-[#C29D26] text-[#1A1715] font-semibold text-[11px] uppercase tracking-wider shrink-0"
            >
              <span>Open Dedicated Pages Manager →</span>
            </Link>
          </div>

          {/* Top Tabs Navigation */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[#ECE6DD] pb-2 bg-[#FAF8F5] p-2">
            {[
              { id: 'pages_manager', label: '0. Custom Pages & Actions', icon: FileText },
              { id: 'nav_footer', label: '1. Navbar & Footer Manager', icon: Compass },
              { id: 'hero', label: '2. Hero & Notice Bar', icon: Layers },
              { id: 'categories', label: '3. Category & Curated', icon: ShoppingBag },
              { id: 'arrivals_trust', label: '4. New Arrivals & Pillars', icon: Award },
              { id: 'story_about', label: '5. Brand Story & About Page', icon: BookOpen },
              { id: 'contact_social', label: '6. Concierge, PDP & Orders', icon: MessageCircle },
              { id: 'themes', label: '7. Themes, Blur & Opacity', icon: Palette },
              { id: 'layout_manager', label: '8. Page Sections Add/Remove', icon: Sliders },
              { id: 'preview', label: '9. Live Device Preview', icon: Smartphone },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => switchTab(tab.id as BrandingTab)}
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

          {/* TAB 0: MASTER DYNAMIC PAGES & ACTIONS MANAGER */}
          {activeTab === 'pages_manager' && (
            <div className="space-y-10 animate-fadeIn">
              {/* Header Banner */}
              <div className="bg-[#F3EFEA] p-6 border border-[#ECE6DD] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <FileText className="w-5 h-5 text-[#6E5043]" />
                    <h2 className="font-serif text-2xl text-[#1E1B18]">
                      Master Custom Pages &amp; Editorial Actions Manager
                    </h2>
                  </div>
                  <p className="text-xs text-[#5C544D] leading-relaxed max-w-2xl">
                    Create unlimited custom pages for lookbooks, artisan craft stories, press notes, or customer guides. Publish or unpublish with 1 click, or delete with confirmation. Automatically add any page to Header Navbar or Footer. Click &ldquo;Save All Changes&rdquo; above to persist everything.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreatePage}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#231F1D] text-[#FAF8F5] text-xs uppercase tracking-wider font-medium hover:bg-[#14110E] transition-colors cursor-pointer shrink-0 shadow-sm"
                >
                  <Plus className="w-4 h-4 text-[#D4AF37]" />
                  <span>Create New Custom Page</span>
                </button>
              </div>

              {/* 1. Core System Pages */}
              <div className="bg-white p-6 border border-[#ECE6DD] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#ECE6DD]">
                  <div>
                    <h3 className="font-serif text-lg text-[#1E1B18]">Standard Boutique Pages</h3>
                    <p className="text-xs text-[#7C736A]">Built-in core pages always active on the storefront.</p>
                  </div>
                  <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 bg-[#F3EFEA] text-[#6E5043] border border-[#ECE6DD]">
                    System Default
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { title: 'Home Page', path: '/', desc: 'Hero carousel, categories, new arrivals, brand story', tab: 'hero' },
                    { title: 'All Collection Catalog', path: '/shop', desc: 'Garment catalog, silhouette filters, sorting', tab: 'categories' },
                    { title: 'About Atelier', path: '/about', desc: 'Atelier story, foundational silhouettes narrative', tab: 'story_about' },
                    { title: 'Contact Concierge', path: '/contact', desc: 'WhatsApp, helpline, studio location, inquiry form', tab: 'contact_social' },
                    { title: 'COD Tracking & GST Bills', path: '/my-orders', desc: 'Customer phone order lookup & printable invoices', tab: 'contact_social' },
                    { title: 'Legal & Shipping Policies', path: '/policy', desc: 'Shipping, 14-day exchange, FAQ, Privacy, Terms', tab: 'nav_footer' },
                  ].map((p) => (
                    <div key={p.path} className="p-4 bg-[#FAF8F5] border border-[#E0D8CE] flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-serif text-base text-[#1E1B18]">{p.title}</span>
                          <span className="text-[10px] font-mono text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-full font-bold">
                            ACTIVE
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-[#7C736A] block mt-0.5">{p.path}</span>
                        <p className="text-xs text-[#5C544D] mt-1.5">{p.desc}</p>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-[#ECE6DD]">
                        <button
                          type="button"
                          onClick={() => setActiveTab(p.tab as BrandingTab)}
                          className="px-2.5 py-1 text-[11px] uppercase tracking-wider font-medium text-[#231F1D] bg-white border border-[#D5CCC0] hover:bg-[#231F1D] hover:text-white transition-colors cursor-pointer"
                        >
                          Configure
                        </button>
                        <a
                          href={p.path}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 text-[11px] text-[#7C736A] hover:text-[#1E1B18] inline-flex items-center gap-1"
                        >
                          <span>Live ↗</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Custom Dynamic Pages Created by Admin */}
              <div className="bg-white p-6 border border-[#ECE6DD] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#ECE6DD]">
                  <div>
                    <h3 className="font-serif text-lg text-[#1E1B18]">
                      Custom Atelier Pages ({currentCustomPages.length})
                    </h3>
                    <p className="text-xs text-[#7C736A]">
                      Admin-created bespoke editorial pages accessible via <code className="font-mono text-[#6E5043]">/pages/[slug]</code>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenCreatePage}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF8F5] border border-[#D5CCC0] text-xs font-medium text-[#1E1B18] hover:bg-[#231F1D] hover:text-white transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Page</span>
                  </button>
                </div>

                {currentCustomPages.length === 0 ? (
                  <div className="py-12 text-center bg-[#FAF8F5] border border-dashed border-[#D5CCC0] space-y-3">
                    <FileText className="w-8 h-8 text-[#7C736A] mx-auto opacity-50" />
                    <p className="font-serif text-lg text-[#1E1B18]">No custom pages created yet</p>
                    <p className="text-xs text-[#7C736A] max-w-sm mx-auto">
                      Create your first custom page (e.g. Lookbook, Silk Handloom Care, or Karigar Legacy).
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenCreatePage}
                      className="px-4 py-2 bg-[#231F1D] text-[#FAF8F5] text-xs uppercase tracking-wider font-medium"
                    >
                      Create Custom Page
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentCustomPages.map((page) => {
                      const isPublished = page.published !== false;
                      const pageUrl = `/pages/${page.slug}`;
                      return (
                        <div
                          key={page.id}
                          className="p-4 bg-[#FAF8F5] border border-[#E0D8CE] flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:border-[#1E1B18]"
                        >
                          <div className="flex items-start gap-4 min-w-0">
                            {page.heroImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={page.heroImage}
                                alt={page.title}
                                className="w-16 h-16 object-cover border border-[#ECE6DD] shrink-0"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-[#ECE6DD] flex items-center justify-center text-[#7C736A] shrink-0">
                                <FileText className="w-6 h-6" />
                              </div>
                            )}

                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-serif text-base text-[#1E1B18] font-normal truncate">
                                  {page.title}
                                </span>
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-bold rounded-full ${
                                    isPublished
                                      ? 'bg-[#E8F5E9] text-[#2E7D32]'
                                      : 'bg-[#ECE6DD] text-[#7C736A]'
                                  }`}
                                >
                                  {isPublished ? 'PUBLISHED' : 'DRAFT'}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-xs font-mono text-[#6E5043]">
                                <span>{pageUrl}</span>
                                <span className="text-[#A69C91]">·</span>
                                <span className="text-[11px] text-[#7C736A] font-sans">
                                  Updated: {page.updatedAt || 'Recently'}
                                </span>
                              </div>

                              {page.subtitle && (
                                <p className="text-xs text-[#5C544D] line-clamp-1 italic font-light">
                                  {page.subtitle}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEditPage(page)}
                              className="px-2.5 py-1.5 text-xs font-medium text-[#1E1B18] bg-white border border-[#D5CCC0] hover:bg-[#231F1D] hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="Edit Page Content & Details"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDuplicateCustomPage(page)}
                              className="px-2.5 py-1.5 text-xs font-medium text-[#6E5043] bg-white border border-[#D5CCC0] hover:bg-[#231F1D] hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="Duplicate / Clone Page"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Clone</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleTogglePublishCustomPage(page.id)}
                              className={`px-2.5 py-1.5 text-xs font-medium border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                                isPublished
                                  ? 'bg-white text-[#7C736A] border-[#D5CCC0] hover:bg-[#ECE6DD]'
                                  : 'bg-[#2E7D32] text-white border-[#2E7D32]'
                              }`}
                              title={isPublished ? 'Unpublish page to Draft' : 'Publish page to live site'}
                            >
                              {isPublished ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              <span>{isPublished ? 'Draft' : 'Publish'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleAddCustomPageToNavbar(page)}
                              className="px-2.5 py-1.5 text-xs font-medium text-[#1E1B18] bg-white border border-[#D5CCC0] hover:bg-[#F3EFEA] transition-colors cursor-pointer"
                              title="Add link to Header Navbar"
                            >
                              + Navbar
                            </button>

                            <button
                              type="button"
                              onClick={() => handleAddCustomPageToFooter(page)}
                              className="px-2.5 py-1.5 text-xs font-medium text-[#1E1B18] bg-white border border-[#D5CCC0] hover:bg-[#F3EFEA] transition-colors cursor-pointer"
                              title="Add link to Footer"
                            >
                              + Footer
                            </button>

                            <a
                              href={pageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-[#7C736A] hover:text-[#1E1B18] hover:bg-white border border-transparent hover:border-[#D5CCC0] transition-colors"
                              title="View page live in new tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>

                            <button
                              type="button"
                              onClick={() => handleDeleteCustomPage(page.id)}
                              className="p-1.5 text-[#C62828] hover:bg-[#FFEBEE] border border-transparent hover:border-[#FFCDD2] transition-colors cursor-pointer"
                              title="Delete this custom page"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: HEADER NAV & FOOTER MANAGER */}
          {activeTab === 'nav_footer' && (
            <div className="space-y-10 animate-fadeIn">
              {/* Header Banner */}
              <div className="bg-[#F3EFEA] p-6 border border-[#ECE6DD]">
                <div className="flex items-center gap-2 mb-2">
                  <Compass className="w-5 h-5 text-[#6E5043]" />
                  <h2 className="font-serif text-2xl text-[#1E1B18]">
                    Header Navigation &amp; Footer Layout Manager
                  </h2>
                </div>
                <p className="text-xs text-[#5C544D] leading-relaxed max-w-3xl">
                  Manage all storefront navigation links in real time. Add custom links, edit labels, choose page or category destinations, toggle visibility, and organize footer columns. Click &ldquo;Save All Branding &amp; Media&rdquo; at the bottom to apply changes to the live storefront.
                </p>
              </div>

              {/* 1. HEADER NAVBAR LINKS MANAGER */}
              <div className="bg-white border border-[#ECE6DD] p-6 space-y-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ECE6DD] pb-4">
                  <div>
                    <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-[#7C736A] block">
                      STOREFRONT TOP HEADER
                    </span>
                    <h3 className="font-serif text-xl text-[#1E1B18] font-normal mt-0.5">
                      Navbar Links &amp; Menu Manager
                    </h3>
                    <p className="text-xs text-[#7C736A] mt-0.5">
                      Controls the links displayed across the desktop top navigation and mobile slide drawer.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={resetNavLinks}
                      className="px-3 py-1.5 text-xs text-[#7C736A] hover:text-[#1E1B18] border border-[#ECE6DD] hover:bg-[#F3EFEA] transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Reset storefront navbar to default links"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Defaults</span>
                    </button>
                    <button
                      type="button"
                      onClick={addNavLink}
                      className="px-3.5 py-1.5 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-wider hover:bg-[#14110E] transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Nav Item</span>
                    </button>
                  </div>
                </div>

                {/* Navbar Visual Simulation Bar */}
                <div className="p-4 bg-[#FAF8F5] border border-[#ECE6DD]">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-[#7C736A] mb-2.5">
                    Live Navbar Preview (Active items visible to shoppers):
                  </p>
                  <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar py-1 text-xs">
                    <span className="font-serif font-medium text-sm text-[#1E1B18] shrink-0 pr-3 border-r border-[#ECE6DD]">
                      AABHA
                    </span>
                    {currentNavLinks.filter((l) => l.visible !== false).map((item) => (
                      <span
                        key={item.id}
                        className="px-2.5 py-1 bg-white border border-[#E0D8CE] text-[#1E1B18] whitespace-nowrap text-[11px] font-medium tracking-wide flex items-center gap-1 shrink-0"
                      >
                        <span>{item.label}</span>
                        <span className="text-[9px] text-[#7C736A] font-mono">({item.href})</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Items List */}
                <div className="divide-y divide-[#ECE6DD]">
                  {currentNavLinks.map((item, index) => {
                    const isVisible = item.visible !== false;
                    const isPreset = DESTINATION_PRESETS.some((p) => p.value === item.href);

                    return (
                      <div
                        key={item.id}
                        className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                      >
                        {/* Left: Reorder controls + Index */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="w-6 text-center font-mono text-xs text-[#7C736A]">
                            #{index + 1}
                          </span>
                          <div className="flex flex-col">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => moveNavLink(index, 'up')}
                              className="p-1 text-[#7C736A] hover:text-[#1E1B18] disabled:opacity-30 cursor-pointer"
                              title="Move up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={index === currentNavLinks.length - 1}
                              onClick={() => moveNavLink(index, 'down')}
                              className="p-1 text-[#7C736A] hover:text-[#1E1B18] disabled:opacity-30 cursor-pointer"
                              title="Move down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Mid: Inputs (Label + Destination) */}
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3">
                          {/* Label input */}
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] uppercase font-semibold text-[#7C736A] mb-1">
                              Link Label
                            </label>
                            <input
                              type="text"
                              value={item.label}
                              onChange={(e) => updateNavLink(item.id, { label: e.target.value })}
                              placeholder="e.g. Anarkali Suits"
                              className="w-full px-3 py-1.5 bg-[#FAF8F5] border border-[#D5CCC0] focus:border-[#231F1D] text-xs text-[#1E1B18] font-medium"
                            />
                          </div>

                          {/* Destination preset */}
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] uppercase font-semibold text-[#7C736A] mb-1">
                              Destination Page / Action
                            </label>
                            <select
                              value={isPreset ? item.href : '__CUSTOM__'}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val !== '__CUSTOM__') {
                                  updateNavLink(item.id, { href: val });
                                } else {
                                  updateNavLink(item.id, { href: '' });
                                }
                              }}
                              className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#D5CCC0] focus:border-[#231F1D] text-xs text-[#1E1B18]"
                            >
                              {dynamicDestinationPresets.map((p) => (
                                <option key={p.value} value={p.value}>
                                  {p.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Custom URL or Exact Path input */}
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] uppercase font-semibold text-[#7C736A] mb-1">
                              Target URL / Path
                            </label>
                            <input
                              type="text"
                              value={item.href}
                              onChange={(e) => updateNavLink(item.id, { href: e.target.value })}
                              placeholder="e.g. /shop or https://..."
                              className="w-full px-3 py-1.5 bg-[#FAF8F5] border border-[#D5CCC0] focus:border-[#231F1D] text-xs font-mono text-[#1E1B18]"
                            />
                          </div>
                        </div>

                        {/* Right: Visibility Toggle & Delete */}
                        <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0">
                          <label className="flex items-center gap-1.5 text-[11px] text-[#7C736A] mr-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(item.openInNewTab)}
                              onChange={(e) => updateNavLink(item.id, { openInNewTab: e.target.checked })}
                              className="accent-[#231F1D]"
                            />
                            <span>New Tab</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => updateNavLink(item.id, { visible: !isVisible })}
                            className={`px-2.5 py-1 text-xs font-medium uppercase tracking-wider border flex items-center gap-1.5 cursor-pointer ${
                              isVisible
                                ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                                : 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]'
                            }`}
                          >
                            {isVisible ? (
                              <>
                                <Eye className="w-3.5 h-3.5" /> Visible
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5" /> Hidden
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => removeNavLink(item.id)}
                            className="p-1.5 text-[#C62828] hover:text-[#B71C1C] border border-[#FFCDD2] bg-[#FFF5F5] cursor-pointer"
                            title="Remove navbar item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. FOOTER LAYOUT & COLUMNS MANAGER */}
              <div className="bg-white border border-[#ECE6DD] p-6 space-y-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ECE6DD] pb-4">
                  <div>
                    <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-[#7C736A] block">
                      STOREFRONT FOOTER
                    </span>
                    <h3 className="font-serif text-xl text-[#1E1B18] font-normal mt-0.5">
                      Footer Columns &amp; Links Manager
                    </h3>
                    <p className="text-xs text-[#7C736A] mt-0.5">
                      Customize footer columns (e.g. THE SILHOUETTES, THE HOUSE, CLIENT CARE), manage destination links, and edit brand statements.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={resetFooterColumns}
                      className="px-3 py-1.5 text-xs text-[#7C736A] hover:text-[#1E1B18] border border-[#ECE6DD] hover:bg-[#F3EFEA] transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Reset footer to default columns"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Defaults</span>
                    </button>
                    <button
                      type="button"
                      onClick={addFooterColumn}
                      className="px-3.5 py-1.5 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-wider hover:bg-[#14110E] transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add New Column</span>
                    </button>
                  </div>
                </div>

                {/* Footer Brand Statement & Copyright text inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[#FAF8F5] border border-[#ECE6DD]">
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-[#7C736A] mb-1">
                      Footer Brand Tagline (Under Atelier Logo)
                    </label>
                    <input
                      type="text"
                      value={settings.footerTagline || ''}
                      onChange={(e) => setSettings({ ...settings, footerTagline: e.target.value })}
                      placeholder="e.g. Premium Indian women’s ethnic wear crafted in small handloom batches..."
                      className="w-full px-3 py-1.5 bg-white border border-[#D5CCC0] focus:border-[#231F1D] text-xs text-[#1E1B18]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-[#7C736A] mb-1">
                      Copyright Notice Text (Bottom Row)
                    </label>
                    <input
                      type="text"
                      value={settings.footerCopyright || ''}
                      onChange={(e) => setSettings({ ...settings, footerCopyright: e.target.value })}
                      placeholder="e.g. © 2026 AABHA CLOTHING. All rights reserved."
                      className="w-full px-3 py-1.5 bg-white border border-[#D5CCC0] focus:border-[#231F1D] text-xs text-[#1E1B18]"
                    />
                  </div>
                </div>

                {/* Columns List */}
                <div className="space-y-6">
                  {currentFooterColumns.map((col, colIdx) => {
                    const isColVisible = col.visible !== false;

                    return (
                      <div
                        key={col.id}
                        className="bg-[#FAF8F5] border border-[#E0D8CE] p-5 space-y-4 shadow-2xs"
                      >
                        {/* Column Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ECE6DD] pb-3">
                          <div className="flex items-center gap-2.5 flex-1 max-w-lg">
                            <span className="text-xs font-mono font-bold text-[#7C736A]">
                              Col #{colIdx + 1}
                            </span>
                            <div className="flex-1">
                              <label className="sr-only">Column Title</label>
                              <input
                                type="text"
                                value={col.title}
                                onChange={(e) => updateFooterColumn(col.id, { title: e.target.value })}
                                placeholder="e.g. THE SILHOUETTES"
                                className="w-full px-3 py-1 bg-white border border-[#D5CCC0] focus:border-[#231F1D] text-sm font-semibold uppercase tracking-wider text-[#1E1B18]"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={colIdx === 0}
                              onClick={() => moveFooterColumn(colIdx, 'up')}
                              className="p-1.5 text-[#7C736A] hover:text-[#1E1B18] border border-[#ECE6DD] bg-white disabled:opacity-30 cursor-pointer"
                              title="Move column left"
                            >
                              <ArrowUp className="w-3.5 h-3.5 rotate-[-90deg]" />
                            </button>
                            <button
                              type="button"
                              disabled={colIdx === currentFooterColumns.length - 1}
                              onClick={() => moveFooterColumn(colIdx, 'down')}
                              className="p-1.5 text-[#7C736A] hover:text-[#1E1B18] border border-[#ECE6DD] bg-white disabled:opacity-30 cursor-pointer"
                              title="Move column right"
                            >
                              <ArrowDown className="w-3.5 h-3.5 rotate-[-90deg]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateFooterColumn(col.id, { visible: !isColVisible })}
                              className={`px-2.5 py-1 text-xs font-medium uppercase tracking-wider border flex items-center gap-1.5 cursor-pointer ${
                                isColVisible
                                  ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                                  : 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]'
                              }`}
                            >
                              {isColVisible ? (
                                <>
                                  <Eye className="w-3 h-3" /> Active
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3 h-3" /> Hidden
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeFooterColumn(col.id)}
                              className="p-1 text-[#C62828] hover:text-[#B71C1C] border border-[#FFCDD2] bg-white cursor-pointer"
                              title="Delete column"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => addFooterLink(col.id)}
                              className="px-3 py-1 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium tracking-wide uppercase hover:bg-[#14110E] transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>+ Add Link</span>
                            </button>
                          </div>
                        </div>

                        {/* Column Links List */}
                        <div className="space-y-2">
                          {(col.links || []).length === 0 ? (
                            <p className="text-xs text-[#7C736A] italic py-2">
                              No links in this column yet. Click &ldquo;+ Add Link&rdquo; to add items.
                            </p>
                          ) : (
                            col.links.map((link, lIdx) => {
                              const isLinkVis = link.visible !== false;
                              const isPreset = DESTINATION_PRESETS.some((p) => p.value === link.href);

                              return (
                                <div
                                  key={link.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-2.5 border border-[#ECE6DD]"
                                >
                                  {/* Reorder link */}
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="w-5 text-[11px] font-mono text-[#7C736A]">
                                      .{lIdx + 1}
                                    </span>
                                    <div className="flex items-center">
                                      <button
                                        type="button"
                                        disabled={lIdx === 0}
                                        onClick={() => moveFooterLink(col.id, lIdx, 'up')}
                                        className="p-0.5 text-[#7C736A] hover:text-[#1E1B18] disabled:opacity-30 cursor-pointer"
                                        title="Move up"
                                      >
                                        <ArrowUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={lIdx === col.links.length - 1}
                                        onClick={() => moveFooterLink(col.id, lIdx, 'down')}
                                        className="p-0.5 text-[#7C736A] hover:text-[#1E1B18] disabled:opacity-30 cursor-pointer"
                                        title="Move down"
                                      >
                                        <ArrowDown className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Inputs */}
                                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2">
                                    <input
                                      type="text"
                                      value={link.label}
                                      onChange={(e) =>
                                        updateFooterLink(col.id, link.id, { label: e.target.value })
                                      }
                                      placeholder="Link label"
                                      className="sm:col-span-4 px-2.5 py-1 bg-[#FAF8F5] border border-[#D5CCC0] text-xs font-medium text-[#1E1B18]"
                                    />
                                    <select
                                      value={isPreset ? link.href : '__CUSTOM__'}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val !== '__CUSTOM__') {
                                          updateFooterLink(col.id, link.id, { href: val });
                                        } else {
                                          updateFooterLink(col.id, link.id, { href: '' });
                                        }
                                      }}
                                      className="sm:col-span-4 px-2 py-1 bg-[#FAF8F5] border border-[#D5CCC0] text-xs text-[#1E1B18]"
                                    >
                                      {dynamicDestinationPresets.map((p) => (
                                        <option key={p.value} value={p.value}>
                                          {p.label}
                                        </option>
                                      ))}
                                    </select>
                                    <input
                                      type="text"
                                      value={link.href}
                                      onChange={(e) =>
                                        updateFooterLink(col.id, link.id, { href: e.target.value })
                                      }
                                      placeholder="URL / action"
                                      className="sm:col-span-4 px-2 py-1 bg-[#FAF8F5] border border-[#D5CCC0] text-xs font-mono text-[#1E1B18]"
                                    />
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateFooterLink(col.id, link.id, { visible: !isLinkVis })
                                      }
                                      className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider border cursor-pointer ${
                                        isLinkVis
                                          ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                                          : 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]'
                                      }`}
                                    >
                                      {isLinkVis ? 'Visible' : 'Hidden'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeFooterLink(col.id, link.id)}
                                      className="p-1 text-[#C62828] hover:text-[#B71C1C] cursor-pointer"
                                      title="Delete link"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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

          {/* TAB: VISUAL THEMES & MEDIA STYLING */}
          {activeTab === 'themes' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="bg-[#F3EFEA] p-6 border border-[#ECE6DD]">
                <div className="flex items-center gap-2 mb-2">
                  <Palette className="w-5 h-5 text-[#6E5043]" />
                  <h2 className="font-serif text-2xl text-[#1E1B18]">
                    Visual Themes, Media Sizing &amp; Design Styling
                  </h2>
                </div>
                <p className="text-xs text-[#5C544D] leading-relaxed max-w-3xl">
                  Configure storefront hero dimensions, glassmorphism blur intensity, color tint palettes, and micro-interactions.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Hero Height & Focal Alignment */}
                <div className="bg-white border border-[#ECE6DD] p-6 space-y-4">
                  <h3 className="font-serif text-lg text-[#1E1B18]">Hero Dimensions &amp; Focal Alignment</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1">
                        Hero Banner Height Mode
                      </label>
                      <select
                        value={settings.heroBannerHeight || 'standard'}
                        onChange={(e) => setSettings({ ...settings, heroBannerHeight: e.target.value as any })}
                        className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#D5CCC0] text-xs text-[#1E1B18]"
                      >
                        <option value="standard">Standard Atelier (80vh / 750px)</option>
                        <option value="fullscreen">Full Screen Editorial (100vh)</option>
                        <option value="compact">Compact Lookbook (60vh / 550px)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1">
                        Hero Image Focal Alignment
                      </label>
                      <select
                        value={settings.heroFocalAlignment || 'center'}
                        onChange={(e) => setSettings({ ...settings, heroFocalAlignment: e.target.value as any })}
                        className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#D5CCC0] text-xs text-[#1E1B18]"
                      >
                        <option value="center">Center / Balanced</option>
                        <option value="top">Top (Portrait / Head &amp; Neckline Focus)</option>
                        <option value="bottom">Bottom (Hemline / Kalidar Flare Focus)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1">
                        Hero Darkening Overlay Opacity: {settings.heroOverlayOpacity ?? 25}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="90"
                        step="5"
                        value={settings.heroOverlayOpacity ?? 25}
                        onChange={(e) => setSettings({ ...settings, heroOverlayOpacity: Number(e.target.value) })}
                        className="w-full accent-[#231F1D]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1">
                        Hero Image Background Blur: {settings.heroBannerBlur ?? 0}px
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        step="1"
                        value={settings.heroBannerBlur ?? 0}
                        onChange={(e) => setSettings({ ...settings, heroBannerBlur: Number(e.target.value) })}
                        className="w-full accent-[#231F1D]"
                      />
                      <span className="text-[10px] text-[#7C736A] block mt-0.5">
                        0px (Crisp Sharp) · 4px (Soft Focus) · 12px (Editorial Depth)
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1">
                        Hero Overlay Frosted Glass Blur: {settings.heroBackdropBlur ?? 0}px
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        step="1"
                        value={settings.heroBackdropBlur ?? 0}
                        onChange={(e) => setSettings({ ...settings, heroBackdropBlur: Number(e.target.value) })}
                        className="w-full accent-[#231F1D]"
                      />
                    </div>
                  </div>
                </div>

                {/* Glassmorphism & Micro-Interactions */}
                <div className="bg-white border border-[#ECE6DD] p-6 space-y-4">
                  <h3 className="font-serif text-lg text-[#1E1B18]">Header Blur, Opacity &amp; Atmosphere</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1">
                        Top Header Background Opacity: {settings.headerOpacity ?? 95}%
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="100"
                        step="5"
                        value={settings.headerOpacity ?? 95}
                        onChange={(e) => setSettings({ ...settings, headerOpacity: Number(e.target.value) })}
                        className="w-full accent-[#231F1D]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1">
                        Top Header Glass Backdrop Blur: {settings.headerBlur ?? 8}px
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="24"
                        step="2"
                        value={settings.headerBlur ?? 8}
                        onChange={(e) => setSettings({ ...settings, headerBlur: Number(e.target.value) })}
                        className="w-full accent-[#231F1D]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1">
                        Glass Blur Intensity Preset
                      </label>
                      <select
                        value={settings.glassBlurIntensity || 'subtle'}
                        onChange={(e) => setSettings({ ...settings, glassBlurIntensity: e.target.value as any })}
                        className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#D5CCC0] text-xs text-[#1E1B18]"
                      >
                        <option value="none">None (Crisp Solid Backgrounds)</option>
                        <option value="subtle">Subtle Atelier (Optimized for Mobile)</option>
                        <option value="rich">Rich Frosted Glass (Desktop High-End)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1">
                        Storefront Background Tint
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={settings.storefrontBgTint || '#FAF8F5'}
                          onChange={(e) => setSettings({ ...settings, storefrontBgTint: e.target.value })}
                          className="w-8 h-8 rounded border border-[#ECE6DD] cursor-pointer"
                        />
                        <input
                          type="text"
                          value={settings.storefrontBgTint || '#FAF8F5'}
                          onChange={(e) => setSettings({ ...settings, storefrontBgTint: e.target.value })}
                          className="flex-1 px-3 py-1.5 bg-[#FAF8F5] border border-[#D5CCC0] text-xs font-mono text-[#1E1B18]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1">
                        Primary Atelier Accent Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={settings.storefrontAccentColor || '#6E5043'}
                          onChange={(e) => setSettings({ ...settings, storefrontAccentColor: e.target.value })}
                          className="w-8 h-8 rounded border border-[#ECE6DD] cursor-pointer"
                        />
                        <input
                          type="text"
                          value={settings.storefrontAccentColor || '#6E5043'}
                          onChange={(e) => setSettings({ ...settings, storefrontAccentColor: e.target.value })}
                          className="flex-1 px-3 py-1.5 bg-[#FAF8F5] border border-[#D5CCC0] text-xs font-mono text-[#1E1B18]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Animations & Slideshow Timing */}
                <div className="bg-white border border-[#ECE6DD] p-6 space-y-4 md:col-span-2">
                  <h3 className="font-serif text-lg text-[#1E1B18]">Animations &amp; Editorial Performance</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <label className="flex items-center gap-2.5 p-3 bg-[#FAF8F5] border border-[#ECE6DD] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.enableHeroAutoplay !== false}
                        onChange={(e) => setSettings({ ...settings, enableHeroAutoplay: e.target.checked })}
                        className="accent-[#231F1D]"
                      />
                      <div>
                        <span className="text-xs font-medium text-[#1E1B18] block">Hero Carousel Autoplay</span>
                        <span className="text-[10px] text-[#7C736A]">Smooth auto-transition between 3 slides</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 bg-[#FAF8F5] border border-[#ECE6DD] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.enableImageZoomOnHover !== false}
                        onChange={(e) => setSettings({ ...settings, enableImageZoomOnHover: e.target.checked })}
                        className="accent-[#231F1D]"
                      />
                      <div>
                        <span className="text-xs font-medium text-[#1E1B18] block">Interactive Image Zoom</span>
                        <span className="text-[10px] text-[#7C736A]">Hover micro-zoom on garment cards &amp; PDP</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 bg-[#FAF8F5] border border-[#ECE6DD] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.enablePageAnimations !== false}
                        onChange={(e) => setSettings({ ...settings, enablePageAnimations: e.target.checked })}
                        className="accent-[#231F1D]"
                      />
                      <div>
                        <span className="text-xs font-medium text-[#1E1B18] block">60 FPS Page Fade Transitions</span>
                        <span className="text-[10px] text-[#7C736A]">Silky fade transitions across navigation</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: LIVE DEVICE STOREFRONT PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-[#F3EFEA] p-6 border border-[#ECE6DD]">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Smartphone className="w-5 h-5 text-[#6E5043]" />
                      <h2 className="font-serif text-2xl text-[#1E1B18]">
                        Live Device Storefront Preview
                      </h2>
                    </div>
                    <p className="text-xs text-[#5C544D]">
                      Inspect how your branding, navbar links, and footer look across different screen viewports.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Page selector dropdown */}
                    <div className="flex items-center gap-1.5 bg-white border border-[#D5CCC0] px-2.5 py-1">
                      <span className="text-[10px] uppercase font-semibold text-[#7C736A]">Page:</span>
                      <select
                        value={previewPage}
                        onChange={(e) => setPreviewPage(e.target.value)}
                        className="text-xs bg-transparent text-[#1E1B18] font-medium focus:outline-none cursor-pointer"
                      >
                        <option value="/">Home Page (/)</option>
                        <option value="/?page=shop">Shop Catalog (/shop)</option>
                        <option value="/?page=shop&category=Anarkali">Anarkali Suits (/shop?category=Anarkali)</option>
                        <option value="/?page=about">About Atelier (/about)</option>
                        <option value="/?page=contact">Contact Concierge (/contact)</option>
                        <option value="/?page=policy">Policies (/policy)</option>
                        <option value="/my-orders">Track Orders (/my-orders)</option>
                        <option value="/product/anarkali-01">Product Detail Page (Sample PDP)</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIframeKey((k) => k + 1)}
                      className="px-2.5 py-1.5 text-xs font-medium text-[#7C736A] hover:text-[#1E1B18] bg-white border border-[#D5CCC0] hover:bg-[#F3EFEA] transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Reload preview iframe"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reload</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewDevice('mobile')}
                      className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 border cursor-pointer ${
                        previewDevice === 'mobile'
                          ? 'bg-[#231F1D] text-[#FAF8F5] border-[#231F1D]'
                          : 'bg-white text-[#5C544D] border-[#D5CCC0] hover:text-[#1E1B18]'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Mobile (375px)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('tablet')}
                      className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 border cursor-pointer ${
                        previewDevice === 'tablet'
                          ? 'bg-[#231F1D] text-[#FAF8F5] border-[#231F1D]'
                          : 'bg-white text-[#5C544D] border-[#D5CCC0] hover:text-[#1E1B18]'
                      }`}
                    >
                      <Tablet className="w-3.5 h-3.5" />
                      <span>Tablet (768px)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('desktop')}
                      className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 border cursor-pointer ${
                        previewDevice === 'desktop'
                          ? 'bg-[#231F1D] text-[#FAF8F5] border-[#231F1D]'
                          : 'bg-white text-[#5C544D] border-[#D5CCC0] hover:text-[#1E1B18]'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span>Desktop (Full)</span>
                    </button>
                    <a
                      href={previewPage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs font-medium text-[#6E5043] bg-white border border-[#D5CCC0] hover:bg-[#231F1D] hover:text-[#FAF8F5] hover:border-[#231F1D] transition-colors flex items-center gap-1.5 cursor-pointer ml-1"
                    >
                      <span>Open Page</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Viewport Frame */}
              <div className="flex justify-center p-4 bg-[#E5DFD5] border border-[#D5CCC0] min-h-[700px] overflow-auto">
                <div
                  className={`bg-white shadow-2xl transition-all duration-300 border border-[#231F1D]/20 overflow-hidden ${
                    previewDevice === 'mobile'
                      ? 'w-[375px] h-[750px] rounded-[36px] border-[10px] border-[#231F1D]'
                      : previewDevice === 'tablet'
                      ? 'w-[768px] h-[850px] rounded-[24px] border-[10px] border-[#231F1D]'
                      : 'w-full max-w-[1400px] h-[850px] rounded-md'
                  }`}
                >
                  <iframe
                    key={iframeKey}
                    src={previewPage}
                    title="Live Storefront Preview"
                    className="w-full h-full border-none"
                  />
                </div>
              </div>
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

      {/* 4. MODAL: CREATE / EDIT CUSTOM PAGE */}
      {pageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#FAF8F5] border border-[#231F1D] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col justify-between">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#ECE6DD] bg-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#6E5043] block">
                  ATELIER EDITORIAL CMS
                </span>
                <h3 className="font-serif text-2xl text-[#1E1B18] mt-0.5">
                  {editingPageId ? 'Edit Custom Page' : 'Create New Custom Page'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPageModalOpen(false)}
                className="p-2 text-[#7C736A] hover:text-[#1E1B18] hover:bg-[#F3EFEA] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <div className="p-6 space-y-5 flex-1">
              {/* Page Title */}
              <div>
                <label className="block text-xs uppercase font-semibold text-[#1E1B18] mb-1.5">
                  Page Title *
                </label>
                <input
                  type="text"
                  value={pageForm.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    const autoSlug =
                      !editingPageId && !pageForm.slug
                        ? title
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-|-$/g, '')
                        : pageForm.slug;
                    setPageForm({ ...pageForm, title, slug: autoSlug });
                  }}
                  placeholder="e.g. The Artisanal Weaves of AABHA"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D5CCC0] focus:border-[#231F1D] text-sm text-[#1E1B18] font-medium"
                />
              </div>

              {/* URL Slug */}
              <div>
                <label className="block text-xs uppercase font-semibold text-[#1E1B18] mb-1.5">
                  URL Slug * (Destination link)
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2.5 bg-[#ECE6DD] border border-r-0 border-[#D5CCC0] text-xs font-mono text-[#5C544D]">
                    /pages/
                  </span>
                  <input
                    type="text"
                    value={pageForm.slug}
                    onChange={(e) =>
                      setPageForm({
                        ...pageForm,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''),
                      })
                    }
                    placeholder="our-craft"
                    className="flex-1 px-3.5 py-2.5 bg-white border border-[#D5CCC0] focus:border-[#231F1D] text-sm text-[#1E1B18] font-mono"
                  />
                </div>
                <p className="text-[11px] text-[#7C736A] mt-1">
                  Accessible directly via{' '}
                  <code className="font-mono text-[#6E5043]">
                    https://aabhaclothing.in/pages/{pageForm.slug || 'your-slug'}
                  </code>
                </p>
              </div>

              {/* Subtitle / Eyebrow */}
              <div>
                <label className="block text-xs uppercase font-semibold text-[#1E1B18] mb-1.5">
                  Subtitle / Editorial Tagline
                </label>
                <input
                  type="text"
                  value={pageForm.subtitle || ''}
                  onChange={(e) => setPageForm({ ...pageForm, subtitle: e.target.value })}
                  placeholder="e.g. Preserving handloom craftsmanship across Rajasthan & Bengal"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D5CCC0] focus:border-[#231F1D] text-xs text-[#1E1B18]"
                />
              </div>

              {/* Hero Banner Image */}
              <div>
                <label className="block text-xs uppercase font-semibold text-[#1E1B18] mb-1.5">
                  Hero Banner Photo URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pageForm.heroImage || ''}
                    onChange={(e) => setPageForm({ ...pageForm, heroImage: e.target.value })}
                    placeholder="/images/brand_story_editorial_1791119191742.jpg"
                    className="flex-1 px-3.5 py-2 bg-white border border-[#D5CCC0] text-xs text-[#1E1B18] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentFieldToUpload('custom_page_hero');
                      fileInputRef.current?.click();
                    }}
                    className="px-3 py-2 bg-[#231F1D] text-[#FAF8F5] text-xs uppercase tracking-wider font-medium hover:bg-[#14110E] transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                  </button>
                </div>
              </div>

              {/* Page Body Content */}
              <div>
                <label className="block text-xs uppercase font-semibold text-[#1E1B18] mb-1.5">
                  Editorial Body Content (Multi-paragraph) *
                </label>
                <textarea
                  rows={8}
                  value={pageForm.content}
                  onChange={(e) => setPageForm({ ...pageForm, content: e.target.value })}
                  placeholder="Write your editorial story, lookbook narrative, or garment guide. Use blank lines to separate paragraphs."
                  className="w-full p-3 bg-white border border-[#D5CCC0] focus:border-[#231F1D] text-xs leading-relaxed text-[#1E1B18]"
                />
                <p className="text-[11px] text-[#7C736A] mt-1">
                  Paragraph breaks are automatically rendered as luxury atelier typography.
                </p>
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center gap-3 p-3 bg-white border border-[#ECE6DD]">
                <input
                  type="checkbox"
                  id="pagePublished"
                  checked={pageForm.published !== false}
                  onChange={(e) => setPageForm({ ...pageForm, published: e.target.checked })}
                  className="w-4 h-4 accent-[#231F1D] cursor-pointer"
                />
                <label
                  htmlFor="pagePublished"
                  className="text-xs font-medium text-[#1E1B18] cursor-pointer"
                >
                  Publish this page immediately (Accessible to storefront visitors)
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-white border-t border-[#ECE6DD] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPageModalOpen(false)}
                className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-[#7C736A] hover:text-[#1E1B18] border border-[#D5CCC0] bg-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomPage}
                className="px-6 py-2 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-wider hover:bg-[#14110E] transition-colors cursor-pointer shadow-sm"
              >
                {editingPageId ? 'Update Page' : 'Create & Apply Page'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
