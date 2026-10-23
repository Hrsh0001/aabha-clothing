'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Save,
  RefreshCw,
  Sliders,
  CheckCircle,
  AlertCircle,
  Globe,
  Tag,
  ArrowUp,
  ArrowDown,
  Palette,
  Check,
  X,
  Smartphone,
  Tablet,
  Monitor,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Clock,
  Layers,
  ChevronRight,
  Shield,
  MessageSquare,
  HelpCircle,
  Compass,
} from 'lucide-react';
import { AdminLayout } from '@/src/components/AdminLayout';
import { useAuth } from '@/src/context/AuthContext';
import {
  CustomPageItem,
  PageSectionItem,
  NavLinkItem,
  FooterColumn,
  SiteSettings,
  DEFAULT_CUSTOM_PAGES,
  DEFAULT_NAV_LINKS,
  DEFAULT_FOOTER_COLUMNS,
  DEFAULT_SETTINGS,
} from '@/src/lib/site-settings';

type EditorTab = 'sections' | 'blur_opacity' | 'animations' | 'dual_media' | 'seo_nav';
type ViewportMode = 'mobile' | 'tablet' | 'desktop';

const SYSTEM_CORE_PAGES = [
  {
    key: 'home',
    title: 'Storefront Home',
    slug: '/',
    description: 'Hero carousel, Category showcases, New arrivals, Brand story & Curated edits.',
  },
  {
    key: 'shop',
    title: 'Shop All Collection',
    slug: '/shop',
    description: 'Category filters (Anarkali, 3-Piece, Co-ords, Chikankari), sorting & product catalog.',
  },
  {
    key: 'about',
    title: 'About Atelier',
    slug: '/about',
    description: 'Artisanal heritage, foundational silhouettes narrative & craftsmanship ethos.',
  },
  {
    key: 'contact',
    title: 'Contact & Concierge',
    slug: '/contact',
    description: 'WhatsApp concierge, phone assistance, studio address, hours & patron inquiries.',
  },
  {
    key: 'orders',
    title: 'Order Tracking & GST Invoices',
    slug: '/my-orders',
    description: 'Phone lookup for patrons to track status, inspect COD details & download bills.',
  },
  {
    key: 'policy',
    title: 'Policies & FAQ',
    slug: '/policy?topic=shipping',
    description: 'Express shipping timelines, COD verification, 14-day exchanges and FAQs.',
  },
];

function AdminPagesStudio() {
  const { adminToken } = useAuth();
  const searchParams = useSearchParams();

  // Settings State
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Studio Selected Page & Tabs
  const pageParam = searchParams.get('page') || 'home';
  const actionParam = searchParams.get('action');
  const [selectedPageKey, setSelectedPageKey] = useState<string>(pageParam);
  const [activeEditorTab, setActiveEditorTab] = useState<EditorTab>('sections');

  // Live Preview Controls
  const [viewport, setViewport] = useState<ViewportMode>('desktop');
  const [previewReloadKey, setPreviewReloadKey] = useState<number>(Date.now());
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Add / Edit Section Modal
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSectionIdx, setEditingSectionIdx] = useState<number | null>(null);
  const [sectionForm, setSectionForm] = useState<PageSectionItem>({
    id: '',
    type: 'story',
    title: '',
    subtitle: '',
    content: '',
    imageUrl: '',
    mobileImageUrl: '',
    buttonLabel: 'Explore Silhouettes',
    buttonLink: '/shop',
    blurPx: 0,
    opacityPercent: 0,
    animationType: 'fade',
    visible: true,
  });

  // Create / Edit Page Modal
  const [pageModalOpen, setPageModalOpen] = useState(false);
  const [editingCustomPageId, setEditingCustomPageId] = useState<string | null>(null);
  const [pageForm, setPageForm] = useState<CustomPageItem>({
    id: '',
    slug: '',
    title: '',
    subtitle: '',
    heroImage: '/images/brand_story_editorial_1791119191742.webp',
    heroImageMobile: '',
    content: '',
    published: true,
    metaTitle: '',
    metaDescription: '',
    sections: [],
  });

  // File Upload State
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [uploadingSectionDesktop, setUploadingSectionDesktop] = useState(false);
  const [uploadingSectionMobile, setUploadingSectionMobile] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getAuthHeaders = () => {
    const token = adminToken || (typeof window !== 'undefined' ? localStorage.getItem('aabha_admin_token') : null);
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Sync with URL query parameter
  useEffect(() => {
    if (pageParam) {
      setSelectedPageKey(pageParam);
    }
    if (actionParam === 'create') {
      handleOpenCreatePageModal();
    }
  }, [pageParam, actionParam]);

  // Load Settings on Mount
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...data.settings,
            customPages:
              Array.isArray(data.settings.customPages) && data.settings.customPages.length > 0
                ? data.settings.customPages
                : DEFAULT_CUSTOM_PAGES,
            navLinks:
              Array.isArray(data.settings.navLinks) && data.settings.navLinks.length > 0
                ? data.settings.navLinks
                : DEFAULT_NAV_LINKS,
            footerColumns:
              Array.isArray(data.settings.footerColumns) && data.settings.footerColumns.length > 0
                ? data.settings.footerColumns
                : DEFAULT_FOOTER_COLUMNS,
          });
        }
      })
      .catch(() => showToast('Could not load current settings from server.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Save Settings to Backend API
  const handleSaveSettings = async (override?: SiteSettings) => {
    setSaving(true);
    const payload = override || settings;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(payload);
        showToast('All page updates, sections, blur, and animation settings saved successfully!');
        // Refresh live preview iframe
        setPreviewReloadKey(Date.now());
      } else {
        showToast(data.error || 'Failed to save changes.', 'error');
      }
    } catch {
      showToast('Network error saving changes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Image Upload Handler
  const uploadImageFile = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success && data.url) {
        return data.url;
      }
      showToast(data.error || 'Failed to upload photo.', 'error');
      return null;
    } catch {
      showToast('Photo upload failed due to network error.', 'error');
      return null;
    }
  };

  // Helper to determine active page and route preview URL
  const customPages = settings.customPages || DEFAULT_CUSTOM_PAGES;
  const isCustomPage = !SYSTEM_CORE_PAGES.some((p) => p.key === selectedPageKey);
  const activeCustomPage = isCustomPage
    ? customPages.find((p) => p.slug === selectedPageKey || p.id === selectedPageKey) || customPages[0]
    : null;

  const getPreviewUrl = () => {
    switch (selectedPageKey) {
      case 'home':
        return '/';
      case 'shop':
        return '/shop';
      case 'about':
        return '/about';
      case 'contact':
        return '/contact';
      case 'orders':
        return '/my-orders';
      case 'policy':
        return '/policy?topic=shipping';
      default:
        return activeCustomPage ? `/pages/${activeCustomPage.slug}` : '/';
    }
  };

  const previewPath = getPreviewUrl();
  const livePreviewUrl = `${previewPath}${previewPath.includes('?') ? '&' : '?'}_live=${previewReloadKey}`;

  // Custom Page Management
  const handleOpenCreatePageModal = () => {
    setEditingCustomPageId(null);
    setPageForm({
      id: `page-${Date.now()}`,
      slug: '',
      title: '',
      subtitle: '',
      heroImage: '/images/brand_story_editorial_1791119191742.webp',
      heroImageMobile: '',
      content: '',
      published: true,
      metaTitle: '',
      metaDescription: '',
      sections: [],
    });
    setPageModalOpen(true);
  };

  const handleOpenEditPageModal = (page: CustomPageItem) => {
    setEditingCustomPageId(page.id);
    setPageForm({ ...page });
    setPageModalOpen(true);
  };

  const handleSavePageModal = () => {
    if (!pageForm.title.trim()) {
      showToast('Please enter a Page Title.', 'error');
      return;
    }
    const cleanSlug = (pageForm.slug.trim() || pageForm.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!cleanSlug) {
      showToast('Please provide a valid URL slug.', 'error');
      return;
    }

    const finalPage: CustomPageItem = {
      ...pageForm,
      slug: cleanSlug,
      title: pageForm.title.trim(),
      updatedAt: new Date().toISOString(),
      createdAt: pageForm.createdAt || new Date().toISOString(),
    };

    let updatedPages: CustomPageItem[];
    if (editingCustomPageId) {
      updatedPages = customPages.map((p) => (p.id === editingCustomPageId ? finalPage : p));
    } else {
      updatedPages = [...customPages, finalPage];
    }

    const newSettings = { ...settings, customPages: updatedPages };
    setSettings(newSettings);
    setPageModalOpen(false);
    setSelectedPageKey(finalPage.slug);
    handleSaveSettings(newSettings);
  };

  const handleDeletePage = (pageId: string, pageTitle: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${pageTitle}"?`)) return;
    const updatedPages = customPages.filter((p) => p.id !== pageId);
    const newSettings = { ...settings, customPages: updatedPages };
    setSettings(newSettings);
    setSelectedPageKey('home');
    handleSaveSettings(newSettings);
    showToast(`Deleted page "${pageTitle}".`);
  };

  const handleClonePage = (page: CustomPageItem) => {
    const clone: CustomPageItem = {
      ...page,
      id: `page-${Date.now()}`,
      slug: `${page.slug}-copy`,
      title: `${page.title} (Copy)`,
      published: false,
      createdAt: new Date().toISOString(),
    };
    const newSettings = { ...settings, customPages: [...customPages, clone] };
    setSettings(newSettings);
    setSelectedPageKey(clone.slug);
    handleSaveSettings(newSettings);
    showToast(`Cloned page "${page.title}".`);
  };

  // Section CRUD Handlers
  const handleOpenAddSectionModal = () => {
    setEditingSectionIdx(null);
    setSectionForm({
      id: `sec-${Date.now()}`,
      type: 'story',
      title: '',
      subtitle: '',
      content: '',
      imageUrl: '',
      mobileImageUrl: '',
      buttonLabel: 'Explore Silhouettes',
      buttonLink: '/shop',
      blurPx: 0,
      opacityPercent: 0,
      animationType: 'fade',
      visible: true,
    });
    setSectionModalOpen(true);
  };

  const handleOpenEditSectionModal = (sec: PageSectionItem, idx: number) => {
    setEditingSectionIdx(idx);
    setSectionForm({ ...sec });
    setSectionModalOpen(true);
  };

  const handleSaveSectionModal = () => {
    if (!activeCustomPage) return;
    if (!sectionForm.title?.trim() && !sectionForm.content?.trim()) {
      showToast('Please provide a title or content for this section.', 'error');
      return;
    }

    const existingSections = Array.isArray(activeCustomPage.sections)
      ? [...activeCustomPage.sections]
      : [];

    let updatedSections: PageSectionItem[];
    if (editingSectionIdx !== null && editingSectionIdx >= 0) {
      updatedSections = existingSections.map((s, idx) =>
        idx === editingSectionIdx ? { ...sectionForm } : s
      );
    } else {
      updatedSections = [...existingSections, { ...sectionForm, id: `sec-${Date.now()}` }];
    }

    const updatedPage: CustomPageItem = {
      ...activeCustomPage,
      sections: updatedSections,
      updatedAt: new Date().toISOString(),
    };

    const updatedPages = customPages.map((p) =>
      p.id === activeCustomPage.id ? updatedPage : p
    );

    const newSettings = { ...settings, customPages: updatedPages };
    setSettings(newSettings);
    setSectionModalOpen(false);
    handleSaveSettings(newSettings);
    showToast('Section saved successfully!');
  };

  const handleMoveSection = (idx: number, direction: 'up' | 'down') => {
    if (!activeCustomPage || !activeCustomPage.sections) return;
    const sections = [...activeCustomPage.sections];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    const temp = sections[idx];
    sections[idx] = sections[targetIdx];
    sections[targetIdx] = temp;

    const updatedPage = { ...activeCustomPage, sections };
    const updatedPages = customPages.map((p) =>
      p.id === activeCustomPage.id ? updatedPage : p
    );

    const newSettings = { ...settings, customPages: updatedPages };
    setSettings(newSettings);
    handleSaveSettings(newSettings);
  };

  const handleToggleSectionVisibility = (idx: number) => {
    if (!activeCustomPage || !activeCustomPage.sections) return;
    const sections = [...activeCustomPage.sections];
    sections[idx] = { ...sections[idx], visible: !sections[idx].visible };

    const updatedPage = { ...activeCustomPage, sections };
    const updatedPages = customPages.map((p) =>
      p.id === activeCustomPage.id ? updatedPage : p
    );

    const newSettings = { ...settings, customPages: updatedPages };
    setSettings(newSettings);
    handleSaveSettings(newSettings);
  };

  const handleDeleteSection = (idx: number) => {
    if (!activeCustomPage || !activeCustomPage.sections) return;
    if (!confirm('Are you sure you want to remove this section?')) return;
    const sections = activeCustomPage.sections.filter((_, i) => i !== idx);

    const updatedPage = { ...activeCustomPage, sections };
    const updatedPages = customPages.map((p) =>
      p.id === activeCustomPage.id ? updatedPage : p
    );

    const newSettings = { ...settings, customPages: updatedPages };
    setSettings(newSettings);
    handleSaveSettings(newSettings);
    showToast('Section removed.');
  };

  // 1-Click Navbar & Footer Placements
  const isPageInNavbar = (slug: string) => {
    const navLinks = settings.navLinks || DEFAULT_NAV_LINKS;
    return navLinks.some((nl) => nl.href === `/pages/${slug}` || nl.href === `/page/${slug}` || nl.href === slug);
  };

  const handleToggleNavbarLink = (page: CustomPageItem) => {
    const navLinks = [...(settings.navLinks || DEFAULT_NAV_LINKS)];
    const targetHref = `/pages/${page.slug}`;
    const existingIndex = navLinks.findIndex(
      (nl) => nl.href === targetHref || nl.href === `/page/${page.slug}`
    );

    let updatedNav: NavLinkItem[];
    if (existingIndex >= 0) {
      updatedNav = navLinks.filter((_, idx) => idx !== existingIndex);
      showToast(`Removed "${page.title}" from navbar.`);
    } else {
      updatedNav = [
        ...navLinks,
        {
          id: `nl-${Date.now()}`,
          label: page.title,
          href: targetHref,
          visible: true,
        },
      ];
      showToast(`Added "${page.title}" to header navbar!`);
    }

    const newSettings = { ...settings, navLinks: updatedNav };
    setSettings(newSettings);
    handleSaveSettings(newSettings);
  };

  const isPageInFooter = (slug: string) => {
    const columns = settings.footerColumns || DEFAULT_FOOTER_COLUMNS;
    return columns.some((col) =>
      col.links.some((l) => l.href === `/pages/${slug}` || l.href === `/page/${slug}`)
    );
  };

  const handleToggleFooterLink = (page: CustomPageItem) => {
    const columns = JSON.parse(JSON.stringify(settings.footerColumns || DEFAULT_FOOTER_COLUMNS)) as FooterColumn[];
    const targetHref = `/pages/${page.slug}`;
    const targetCol = columns[0] || columns[columns.length - 1];
    if (!targetCol) return;

    const existingIdx = targetCol.links.findIndex(
      (l) => l.href === targetHref || l.href === `/page/${page.slug}`
    );

    if (existingIdx >= 0) {
      targetCol.links.splice(existingIdx, 1);
      showToast(`Removed "${page.title}" from footer.`);
    } else {
      targetCol.links.push({
        id: `fl-${Date.now()}`,
        label: page.title,
        href: targetHref,
        visible: true,
      });
      showToast(`Added "${page.title}" to footer!`);
    }

    const newSettings = { ...settings, footerColumns: columns };
    setSettings(newSettings);
    handleSaveSettings(newSettings);
  };

  return (
    <AdminLayout
      title="Pages & Live Studio"
      subtitle="Interactive live preview, section CRUD, dual image uploads, blur & opacity controls, and animation timings."
      extraAction={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenCreatePageModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs uppercase tracking-wider font-medium rounded-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Page</span>
          </button>
          <button
            type="button"
            onClick={() => handleSaveSettings()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#231F1D] hover:bg-black text-[#FAF8F5] text-xs uppercase tracking-wider font-medium rounded-xs transition-colors cursor-pointer shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 text-[#D4AF37]" />
            )}
            <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
          </button>
        </div>
      }
    >
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded shadow-xl text-xs font-medium transition-all ${
            toast.type === 'error'
              ? 'bg-[#B71C1C] text-white'
              : 'bg-[#1B5E20] text-white border border-[#2E7D32]'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 shrink-0 text-[#A8E6CF]" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* TOP BAR: Horizontal Page Switcher Pills */}
      <div className="bg-[#FAF8F5] border-b border-[#ECE6DD] sticky top-0 z-20 px-4 py-3">
        <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1 scrollbar-thin">
          {/* Core System Pages */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] uppercase tracking-wider text-[#8C8075] font-semibold pr-1">
              Storefront:
            </span>
            {SYSTEM_CORE_PAGES.map((p) => {
              const isSelected = selectedPageKey === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setSelectedPageKey(p.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-xs transition-colors cursor-pointer whitespace-nowrap border ${
                    isSelected
                      ? 'bg-[#231F1D] text-[#FAF8F5] border-[#231F1D] shadow-xs'
                      : 'bg-[#F3EFEA] text-[#5A5046] border-[#ECE6DD] hover:bg-[#EAE4DC] hover:text-[#1E1B18]'
                  }`}
                >
                  {p.title}
                </button>
              );
            })}
          </div>

          {/* Custom Pages */}
          <div className="flex items-center gap-1.5 shrink-0 pl-3 border-l border-[#ECE6DD]">
            <span className="text-[10px] uppercase tracking-wider text-[#8C8075] font-semibold pr-1">
              Custom:
            </span>
            {customPages.map((cp) => {
              const isSelected = selectedPageKey === cp.slug || selectedPageKey === cp.id;
              return (
                <button
                  key={cp.id}
                  type="button"
                  onClick={() => setSelectedPageKey(cp.slug)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-xs transition-colors cursor-pointer whitespace-nowrap border ${
                    isSelected
                      ? 'bg-[#6E5043] text-white border-[#6E5043] shadow-xs'
                      : 'bg-[#F3EFEA] text-[#5A5046] border-[#ECE6DD] hover:bg-[#EAE4DC] hover:text-[#1E1B18]'
                  }`}
                >
                  {cp.title}
                </button>
              );
            })}
            <button
              type="button"
              onClick={handleOpenCreatePageModal}
              className="px-2.5 py-1.5 text-xs font-medium bg-[#1F2C23] hover:bg-[#2E4233] text-[#A8E6CF] border border-[#2E4535] rounded-xs cursor-pointer flex items-center gap-1 whitespace-nowrap"
            >
              <Plus className="w-3 h-3" />
              <span>Add Page</span>
            </button>
          </div>
        </div>
      </div>

      {/* DUAL-PANE LIVE STUDIO GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 min-h-[calc(100vh-140px)] gap-0">
        {/* LEFT COLUMN: Clean, Separated Page Editor (xl:col-span-6) */}
        <div className="xl:col-span-6 border-r border-[#ECE6DD] bg-white flex flex-col p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Active Page Header Card */}
          <div className="bg-[#FAF8F5] border border-[#ECE6DD] p-4 sm:p-5 rounded-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-xl sm:text-2xl text-[#1E1B18] font-normal">
                    {isCustomPage ? activeCustomPage?.title : SYSTEM_CORE_PAGES.find((p) => p.key === selectedPageKey)?.title}
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-[#231F1D] text-[#D4AF37] rounded-xs">
                    {previewPath}
                  </span>
                </div>
                <p className="text-xs text-[#7C736A] font-light mt-1">
                  {isCustomPage ? activeCustomPage?.subtitle || 'Custom dynamic boutique page' : SYSTEM_CORE_PAGES.find((p) => p.key === selectedPageKey)?.description}
                </p>
              </div>

              {/* Actions for custom page */}
              {isCustomPage && activeCustomPage && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditPageModal(activeCustomPage)}
                    className="p-1.5 text-[#5A5046] hover:text-[#1E1B18] bg-white border border-[#ECE6DD] rounded-xs cursor-pointer text-xs flex items-center gap-1"
                    title="Edit Page Title, Slug & Meta"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Page Info</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleClonePage(activeCustomPage)}
                    className="p-1.5 text-[#5A5046] hover:text-[#1E1B18] bg-white border border-[#ECE6DD] rounded-xs cursor-pointer text-xs"
                    title="Duplicate Page"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePage(activeCustomPage.id, activeCustomPage.title)}
                    className="p-1.5 text-[#C62828] hover:text-white hover:bg-[#C62828] bg-white border border-[#ECE6DD] rounded-xs cursor-pointer text-xs transition-colors"
                    title="Delete Page"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* 1-Click Navigation Placement Quick Badges */}
            {isCustomPage && activeCustomPage && (
              <div className="pt-2 border-t border-[#ECE6DD] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleNavbarLink(activeCustomPage)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-xs border transition-colors cursor-pointer ${
                      isPageInNavbar(activeCustomPage.slug)
                        ? 'bg-[#1B5E20] text-white border-[#1B5E20]'
                        : 'bg-white text-[#7C736A] border-[#ECE6DD] hover:bg-[#F3EFEA]'
                    }`}
                  >
                    <Check className={`w-3 h-3 ${isPageInNavbar(activeCustomPage.slug) ? 'opacity-100' : 'opacity-0'}`} />
                    <span>In Header Navbar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleFooterLink(activeCustomPage)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-xs border transition-colors cursor-pointer ${
                      isPageInFooter(activeCustomPage.slug)
                        ? 'bg-[#1B5E20] text-white border-[#1B5E20]'
                        : 'bg-white text-[#7C736A] border-[#ECE6DD] hover:bg-[#F3EFEA]'
                    }`}
                  >
                    <Check className={`w-3 h-3 ${isPageInFooter(activeCustomPage.slug) ? 'opacity-100' : 'opacity-0'}`} />
                    <span>In Footer Menu</span>
                  </button>
                </div>

                <div className="text-[11px] text-[#8C8075]">
                  Status:{' '}
                  <span className={`font-semibold ${activeCustomPage.published ? 'text-[#2E7D32]' : 'text-[#D97706]'}`}>
                    {activeCustomPage.published ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Clean Sub-Tabs: No Congestion! */}
          <div className="border-b border-[#ECE6DD] flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveEditorTab('sections')}
              className={`px-3.5 py-2 text-xs uppercase tracking-wider font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeEditorTab === 'sections'
                  ? 'border-[#231F1D] text-[#1E1B18] font-semibold'
                  : 'border-transparent text-[#8C8075] hover:text-[#1E1B18]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Sections CRUD</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveEditorTab('blur_opacity')}
              className={`px-3.5 py-2 text-xs uppercase tracking-wider font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeEditorTab === 'blur_opacity'
                  ? 'border-[#231F1D] text-[#1E1B18] font-semibold'
                  : 'border-transparent text-[#8C8075] hover:text-[#1E1B18]'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Atmospheric Blur &amp; Opacity</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveEditorTab('animations')}
              className={`px-3.5 py-2 text-xs uppercase tracking-wider font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeEditorTab === 'animations'
                  ? 'border-[#231F1D] text-[#1E1B18] font-semibold'
                  : 'border-transparent text-[#8C8075] hover:text-[#1E1B18]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Animations &amp; Timing</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveEditorTab('dual_media')}
              className={`px-3.5 py-2 text-xs uppercase tracking-wider font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeEditorTab === 'dual_media'
                  ? 'border-[#231F1D] text-[#1E1B18] font-semibold'
                  : 'border-transparent text-[#8C8075] hover:text-[#1E1B18]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Dual Desktop &amp; Mobile Media</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveEditorTab('seo_nav')}
              className={`px-3.5 py-2 text-xs uppercase tracking-wider font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeEditorTab === 'seo_nav'
                  ? 'border-[#231F1D] text-[#1E1B18] font-semibold'
                  : 'border-transparent text-[#8C8075] hover:text-[#1E1B18]'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>SEO &amp; Navigation</span>
            </button>
          </div>

          {/* TAB 1: SECTIONS CRUD */}
          {activeEditorTab === 'sections' && (
            <div className="space-y-5">
              {/* Home Page Dedicated Sections Manager */}
              {selectedPageKey === 'home' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-serif text-lg text-[#1E1B18]">Storefront Home Sections</h3>
                      <p className="text-xs text-[#7C736A]">
                        Toggle visibility, reorder and tune each section on the home page.
                      </p>
                    </div>
                  </div>

                  {/* 1. Hero Carousel */}
                  <div className="p-4 border border-[#ECE6DD] bg-[#FAF8F5] rounded-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                        <span className="font-serif text-base text-[#1E1B18]">Hero Editorial Carousel (3 Slides)</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.showHeroCarousel !== false}
                          onChange={(e) => {
                            const newSettings = { ...settings, showHeroCarousel: e.target.checked };
                            setSettings(newSettings);
                            handleSaveSettings(newSettings);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#231F1D]" />
                      </label>
                    </div>
                    <p className="text-xs text-[#7C736A]">
                      Full-bleed editorial banner with Slide 1 (Anarkali), Slide 2 (Co-ord Sets), and Slide 3 (Festive Silk).
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                      <div className="p-2.5 bg-white border border-[#ECE6DD] rounded-xs">
                        <span className="font-medium text-[#1E1B18] block">Slide 1: {settings.heroSlide1Heading || 'The Anarkali Revival'}</span>
                        <span className="text-[10px] text-[#7C736A] truncate block">{settings.heroBanner}</span>
                      </div>
                      <div className="p-2.5 bg-white border border-[#ECE6DD] rounded-xs">
                        <span className="font-medium text-[#1E1B18] block">Slide 2: {settings.heroSlide2Heading || 'Architectural Co-ords'}</span>
                        <span className="text-[10px] text-[#7C736A] truncate block">{settings.heroCoords}</span>
                      </div>
                      <div className="p-2.5 bg-white border border-[#ECE6DD] rounded-xs">
                        <span className="font-medium text-[#1E1B18] block">Slide 3: {settings.heroSlide3Heading || 'Festive Chanderi Silk'}</span>
                        <span className="text-[10px] text-[#7C736A] truncate block">{settings.heroEthnic}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Shop By Category Showcase */}
                  <div className="p-4 border border-[#ECE6DD] bg-[#FAF8F5] rounded-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-base text-[#1E1B18]">Category Showcase (Anarkali, 3-Piece, Co-ords, Chikankari)</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.showCategorySection !== false}
                          onChange={(e) => {
                            const newSettings = { ...settings, showCategorySection: e.target.checked };
                            setSettings(newSettings);
                            handleSaveSettings(newSettings);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#231F1D]" />
                      </label>
                    </div>
                    <p className="text-xs text-[#7C736A]">
                      Interactive silhouette selector cards linking patrons to targeted wardrobe edits.
                    </p>
                  </div>

                  {/* 3. New Arrivals Showcase */}
                  <div className="p-4 border border-[#ECE6DD] bg-[#FAF8F5] rounded-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-base text-[#1E1B18]">New Arrivals Showcase &amp; Carousel</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.showNewArrivals !== false}
                          onChange={(e) => {
                            const newSettings = { ...settings, showNewArrivals: e.target.checked };
                            setSettings(newSettings);
                            handleSaveSettings(newSettings);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#231F1D]" />
                      </label>
                    </div>
                    <p className="text-xs text-[#7C736A]">
                      Dynamic carousel displaying latest artisanal releases with quick-bag drawer.
                    </p>
                  </div>

                  {/* 4. Brand Story Editorial */}
                  <div className="p-4 border border-[#ECE6DD] bg-[#FAF8F5] rounded-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-base text-[#1E1B18]">Brand Story &amp; Artisanal Weaves Narrative</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.showBrandStory !== false}
                          onChange={(e) => {
                            const newSettings = { ...settings, showBrandStory: e.target.checked };
                            setSettings(newSettings);
                            handleSaveSettings(newSettings);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#231F1D]" />
                      </label>
                    </div>
                    <p className="text-xs text-[#7C736A]">
                      Editorial two-column narrative detailing handloom roots, French seam construction, and karigar ethos.
                    </p>
                  </div>

                  {/* 5. Heritage & 4 Trust Badges */}
                  <div className="p-4 border border-[#ECE6DD] bg-[#FAF8F5] rounded-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-base text-[#1E1B18]">Heritage Trust Badges (4 Pillars)</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.showTrustBadges !== false}
                          onChange={(e) => {
                            const newSettings = { ...settings, showTrustBadges: e.target.checked };
                            setSettings(newSettings);
                            handleSaveSettings(newSettings);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#231F1D]" />
                      </label>
                    </div>
                    <p className="text-xs text-[#7C736A]">
                      Handcrafted handloom, French seams, complimentary pan-India COD, and 14-day exchange guarantee.
                    </p>
                  </div>

                  {/* 6. Living Atelier Instagram Feed */}
                  <div className="p-4 border border-[#ECE6DD] bg-[#FAF8F5] rounded-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-base text-[#1E1B18]">Living Atelier Instagram Feed</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.showInstagramSection !== false}
                          onChange={(e) => {
                            const newSettings = { ...settings, showInstagramSection: e.target.checked };
                            setSettings(newSettings);
                            handleSaveSettings(newSettings);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#231F1D]" />
                      </label>
                    </div>
                    <p className="text-xs text-[#7C736A]">
                      Editorial photo mosaic showcasing real patrons, ateliers, and drape styling.
                    </p>
                  </div>
                </div>
              ) : isCustomPage && activeCustomPage ? (
                /* Dynamic Custom Page Sections Manager */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-serif text-lg text-[#1E1B18]">
                        Sections on &ldquo;{activeCustomPage.title}&rdquo;
                      </h3>
                      <p className="text-xs text-[#7C736A]">
                        Add hero slides, story narratives, lookbook grids, or trust pillars.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenAddSectionModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#231F1D] text-white hover:bg-black text-xs font-medium rounded-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>+ Add Section</span>
                    </button>
                  </div>

                  {/* Sections List */}
                  {Array.isArray(activeCustomPage.sections) && activeCustomPage.sections.length > 0 ? (
                    <div className="space-y-3">
                      {activeCustomPage.sections.map((sec, idx) => (
                        <div
                          key={sec.id || idx}
                          className="p-4 bg-[#FAF8F5] border border-[#ECE6DD] rounded-xs flex items-center justify-between gap-4"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-[#ECE6DD] text-[#5A5046] rounded-xs">
                                {sec.type}
                              </span>
                              <h4 className="font-serif text-base text-[#1E1B18] truncate">
                                {sec.title || `Section ${idx + 1}`}
                              </h4>
                              {sec.visible === false && (
                                <span className="text-[10px] uppercase px-1.5 py-0.5 bg-[#C62828] text-white rounded-xs">
                                  Hidden
                                </span>
                              )}
                            </div>
                            {sec.subtitle && (
                              <p className="text-xs text-[#7C736A] truncate">{sec.subtitle}</p>
                            )}
                            <div className="flex items-center gap-3 text-[10px] text-[#8C8075]">
                              {sec.imageUrl && <span>Desktop Media: ✓</span>}
                              {sec.mobileImageUrl && <span>Mobile Media: ✓</span>}
                              {sec.blurPx ? <span>Blur: {sec.blurPx}px</span> : null}
                              {sec.opacityPercent ? <span>Overlay: {sec.opacityPercent}%</span> : null}
                            </div>
                          </div>

                          {/* Reorder, Visibility, Edit, Delete Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveSection(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1.5 text-[#7C736A] hover:text-[#1E1B18] bg-white border border-[#ECE6DD] rounded-xs disabled:opacity-30 cursor-pointer"
                              title="Move Section Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveSection(idx, 'down')}
                              disabled={idx === (activeCustomPage.sections?.length || 0) - 1}
                              className="p-1.5 text-[#7C736A] hover:text-[#1E1B18] bg-white border border-[#ECE6DD] rounded-xs disabled:opacity-30 cursor-pointer"
                              title="Move Section Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleSectionVisibility(idx)}
                              className="p-1.5 text-[#7C736A] hover:text-[#1E1B18] bg-white border border-[#ECE6DD] rounded-xs cursor-pointer"
                              title={sec.visible !== false ? 'Hide Section' : 'Show Section'}
                            >
                              {sec.visible !== false ? (
                                <Eye className="w-3.5 h-3.5 text-[#2E7D32]" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5 text-[#C62828]" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditSectionModal(sec, idx)}
                              className="p-1.5 text-[#5A5046] hover:text-[#1E1B18] bg-white border border-[#ECE6DD] rounded-xs cursor-pointer"
                              title="Edit Section Content & Images"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSection(idx)}
                              className="p-1.5 text-[#C62828] hover:text-white hover:bg-[#C62828] bg-white border border-[#ECE6DD] rounded-xs cursor-pointer transition-colors"
                              title="Delete Section"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 border-2 border-dashed border-[#ECE6DD] rounded-xs text-center space-y-3">
                      <Layers className="w-8 h-8 text-[#A69C91] mx-auto stroke-[1.2]" />
                      <p className="text-xs text-[#7C736A]">
                        No dynamic sections added yet for &ldquo;{activeCustomPage.title}&rdquo;.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenAddSectionModal}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#231F1D] text-white hover:bg-black text-xs font-medium rounded-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Add First Section</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Other Core System Pages (Shop, About, Contact, Orders, Policy) */
                <div className="p-6 bg-[#FAF8F5] border border-[#ECE6DD] rounded-xs space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-serif text-lg text-[#1E1B18]">
                      {SYSTEM_CORE_PAGES.find((p) => p.key === selectedPageKey)?.title} Settings
                    </h3>
                    <p className="text-xs text-[#7C736A]">
                      Configure layout, lead headings, and visual atmospheric styling.
                    </p>
                  </div>

                  {selectedPageKey === 'about' && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-xs font-medium text-[#1E1B18] mb-1">About Hero Headline</label>
                        <input
                          type="text"
                          value={settings.aboutHeroHeading || ''}
                          onChange={(e) => setSettings({ ...settings, aboutHeroHeading: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-[#ECE6DD] rounded-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#1E1B18] mb-1">Artisanal Ethos Narrative</label>
                        <textarea
                          rows={4}
                          value={settings.aboutHeroLead || ''}
                          onChange={(e) => setSettings({ ...settings, aboutHeroLead: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-[#ECE6DD] rounded-xs"
                        />
                      </div>
                    </div>
                  )}

                  {selectedPageKey === 'shop' && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-xs font-medium text-[#1E1B18] mb-1">Catalog Banner Title</label>
                        <input
                          type="text"
                          value={settings.shopHeaderTitle || 'The Complete Collection'}
                          onChange={(e) => setSettings({ ...settings, shopHeaderTitle: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-[#ECE6DD] rounded-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#1E1B18] mb-1">Catalog Subtitle</label>
                        <input
                          type="text"
                          value={settings.shopHeaderSubtitle || ''}
                          onChange={(e) => setSettings({ ...settings, shopHeaderSubtitle: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-[#ECE6DD] rounded-xs"
                        />
                      </div>
                    </div>
                  )}

                  {selectedPageKey === 'contact' && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-xs font-medium text-[#1E1B18] mb-1">WhatsApp Concierge Number</label>
                        <input
                          type="text"
                          value={settings.whatsappNumber || ''}
                          onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-[#ECE6DD] rounded-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#1E1B18] mb-1">Studio Physical Address</label>
                        <input
                          type="text"
                          value={settings.storeAddress || ''}
                          onChange={(e) => setSettings({ ...settings, storeAddress: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-[#ECE6DD] rounded-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ATMOSPHERIC BLUR & OPACITY */}
          {activeEditorTab === 'blur_opacity' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="font-serif text-lg text-[#1E1B18]">Atmospheric Blur &amp; Opacity Tuning</h3>
                <p className="text-xs text-[#7C736A]">
                  Control overlay darkness, depth-of-field blur, and glassmorphism across the boutique.
                </p>
              </div>

              {/* Slider 1: Hero Overlay Darkness */}
              <div className="p-4 bg-[#FAF8F5] border border-[#ECE6DD] rounded-xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#1E1B18]">Darkening Overlay Opacity</label>
                  <span className="text-xs font-mono font-bold text-[#6E5043]">{settings.heroOverlayOpacity ?? 25}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={90}
                  step={5}
                  value={settings.heroOverlayOpacity ?? 25}
                  onChange={(e) => setSettings({ ...settings, heroOverlayOpacity: Number(e.target.value) })}
                  className="w-full accent-[#6E5043] cursor-pointer"
                />
                <p className="text-[11px] text-[#7C736A]">
                  Dims background banners to ensure high contrast and readability for artisanal titles.
                </p>
              </div>

              {/* Slider 2: Atmospheric Image Blur */}
              <div className="p-4 bg-[#FAF8F5] border border-[#ECE6DD] rounded-xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#1E1B18]">Image Background Blur Effect</label>
                  <span className="text-xs font-mono font-bold text-[#6E5043]">{settings.heroBannerBlur ?? 0} px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={1}
                  value={settings.heroBannerBlur ?? 0}
                  onChange={(e) => setSettings({ ...settings, heroBannerBlur: Number(e.target.value) })}
                  className="w-full accent-[#6E5043] cursor-pointer"
                />
                <p className="text-[11px] text-[#7C736A]">
                  Applies depth blur to background media (0px = crisp silk luster, 10px = soft dreamlike editorial).
                </p>
              </div>

              {/* Slider 3: Glassmorphism Backdrop Blur */}
              <div className="p-4 bg-[#FAF8F5] border border-[#ECE6DD] rounded-xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#1E1B18]">Glassmorphism Backdrop Blur</label>
                  <span className="text-xs font-mono font-bold text-[#6E5043]">{settings.headerBlur ?? 8} px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={24}
                  step={2}
                  value={settings.headerBlur ?? 8}
                  onChange={(e) => setSettings({ ...settings, headerBlur: Number(e.target.value) })}
                  className="w-full accent-[#6E5043] cursor-pointer"
                />
                <p className="text-[11px] text-[#7C736A]">
                  Controls frosted glass translucency on the header navigation bar when scrolling over product images.
                </p>
              </div>

              {/* Slider 4: Header Opacity */}
              <div className="p-4 bg-[#FAF8F5] border border-[#ECE6DD] rounded-xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#1E1B18]">Header Translucency / Opacity</label>
                  <span className="text-xs font-mono font-bold text-[#6E5043]">{settings.headerOpacity ?? 95}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={100}
                  step={5}
                  value={settings.headerOpacity ?? 95}
                  onChange={(e) => setSettings({ ...settings, headerOpacity: Number(e.target.value) })}
                  className="w-full accent-[#6E5043] cursor-pointer"
                />
              </div>

              {/* Slider 5: Bag Drawer Blur & Opacity */}
              <div className="p-4 bg-[#FAF8F5] border border-[#ECE6DD] rounded-xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#1E1B18]">Cart &amp; Bag Drawer Dimming</label>
                  <span className="text-xs font-mono font-bold text-[#6E5043]">{settings.drawerBackdropOpacity ?? 60}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={90}
                  step={5}
                  value={settings.drawerBackdropOpacity ?? 60}
                  onChange={(e) => setSettings({ ...settings, drawerBackdropOpacity: Number(e.target.value) })}
                  className="w-full accent-[#6E5043] cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 3: ANIMATIONS & TIMING */}
          {activeEditorTab === 'animations' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="font-serif text-lg text-[#1E1B18]">Animation &amp; Carousel Timing Controls</h3>
                <p className="text-xs text-[#7C736A]">
                  Fine-tune transition cadence, page entrance animations, and slide intervals.
                </p>
              </div>

              {/* Toggle 1: Enable Page Animations */}
              <div className="p-4 bg-[#FAF8F5] border border-[#ECE6DD] rounded-xs flex items-center justify-between">
                <div>
                  <span className="font-medium text-xs text-[#1E1B18] block">Smooth Page &amp; Section Transitions</span>
                  <span className="text-[11px] text-[#7C736A]">Framer Motion entry animations and gentle scroll reveals.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enablePageAnimations !== false}
                    onChange={(e) => setSettings({ ...settings, enablePageAnimations: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#231F1D]" />
                </label>
              </div>

              {/* Speed Timing Selector */}
              <div className="p-4 bg-[#FAF8F5] border border-[#ECE6DD] rounded-xs space-y-2">
                <label className="text-xs font-medium text-[#1E1B18] block">Animation Timing Speed</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'fast', label: 'Fast (0.3s)', desc: 'Snappy response' },
                    { value: 'smooth', label: 'Smooth (0.5s)', desc: 'Luxury standard' },
                    { value: 'cinematic', label: 'Cinematic (0.8s)', desc: 'Slow & poetic' },
                  ].map((spd) => {
                    const isSelected = (settings.animationTimingSpeed || 'smooth') === spd.value;
                    return (
                      <button
                        key={spd.value}
                        type="button"
                        onClick={() => setSettings({ ...settings, animationTimingSpeed: spd.value as any })}
                        className={`p-3 text-left border rounded-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#231F1D] text-white border-[#231F1D]'
                            : 'bg-white text-[#5A5046] border-[#ECE6DD] hover:border-[#1E1B18]'
                        }`}
                      >
                        <span className="text-xs font-medium block">{spd.label}</span>
                        <span className="text-[10px] opacity-75">{spd.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toggle 2: Hero Carousel Autoplay */}
              <div className="p-4 bg-[#FAF8F5] border border-[#ECE6DD] rounded-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-xs text-[#1E1B18] block">Hero Banner Autoplay</span>
                    <span className="text-[11px] text-[#7C736A]">Automatically advances slides on the home page.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enableHeroAutoplay !== false}
                      onChange={(e) => setSettings({ ...settings, enableHeroAutoplay: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#231F1D]" />
                  </label>
                </div>

                {settings.enableHeroAutoplay !== false && (
                  <div className="pt-2 border-t border-[#ECE6DD] space-y-1">
                    <label className="text-xs font-medium text-[#1E1B18]">Slide Dwell Interval</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[3, 5, 7].map((sec) => {
                        const isSelected = (settings.heroAutoplayInterval || 5) === sec;
                        return (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => setSettings({ ...settings, heroAutoplayInterval: sec })}
                            className={`py-2 text-xs font-medium rounded-xs border transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#6E5043] text-white border-[#6E5043]'
                                : 'bg-white text-[#5A5046] border-[#ECE6DD]'
                            }`}
                          >
                            {sec} Seconds
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Toggle 3: Image Hover Micro-interactions */}
              <div className="p-4 bg-[#FAF8F5] border border-[#ECE6DD] rounded-xs flex items-center justify-between">
                <div>
                  <span className="font-medium text-xs text-[#1E1B18] block">Image Hover Subtle Zoom</span>
                  <span className="text-[11px] text-[#7C736A]">Gentle 105% magnification on garment cards when hovering.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableImageZoomOnHover !== false}
                    onChange={(e) => setSettings({ ...settings, enableImageZoomOnHover: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#231F1D]" />
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: DUAL DESKTOP & MOBILE MEDIA */}
          {activeEditorTab === 'dual_media' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="font-serif text-lg text-[#1E1B18]">Dual Media Management</h3>
                <p className="text-xs text-[#7C736A]">
                  Upload dedicated landscape banners for wide monitors and portrait banners for mobile screens.
                </p>
              </div>

              {/* 1. Desktop Image Banner */}
              <div className="p-4 bg-[#FAF8F5] border border-[#ECE6DD] rounded-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-xs text-[#1E1B18] flex items-center gap-1.5">
                    <Monitor className="w-4 h-4 text-[#6E5043]" />
                    <span>Desktop Hero Banner (Recommended 1920 × 1080)</span>
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={
                      isCustomPage
                        ? activeCustomPage?.heroImage || ''
                        : settings.heroBanner || ''
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (isCustomPage && activeCustomPage) {
                        const updated = customPages.map((p) =>
                          p.id === activeCustomPage.id ? { ...p, heroImage: val } : p
                        );
                        setSettings({ ...settings, customPages: updated });
                      } else {
                        setSettings({ ...settings, heroBanner: val });
                      }
                    }}
                    placeholder="/images/hero_editorial_banner_1791119088652.webp or https://..."
                    className="flex-1 px-3 py-2 text-xs border border-[#ECE6DD] rounded-xs font-mono"
                  />

                  <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#231F1D] text-white hover:bg-black text-xs font-medium rounded-xs cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>{uploadingDesktop ? 'Uploading...' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingDesktop}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingDesktop(true);
                        const url = await uploadImageFile(file);
                        setUploadingDesktop(false);
                        if (url) {
                          if (isCustomPage && activeCustomPage) {
                            const updated = customPages.map((p) =>
                              p.id === activeCustomPage.id ? { ...p, heroImage: url } : p
                            );
                            setSettings({ ...settings, customPages: updated });
                          } else {
                            setSettings({ ...settings, heroBanner: url });
                          }
                          showToast('Desktop image uploaded!');
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Thumbnail Preview */}
                {(isCustomPage ? activeCustomPage?.heroImage : settings.heroBanner) && (
                  <div className="relative w-full h-32 overflow-hidden rounded-xs border border-[#ECE6DD]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={isCustomPage ? activeCustomPage?.heroImage : settings.heroBanner}
                      alt="Desktop Preview"
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                )}
              </div>

              {/* 2. Mobile Image Banner */}
              <div className="p-4 bg-[#FAF8F5] border border-[#ECE6DD] rounded-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-xs text-[#1E1B18] flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-[#6E5043]" />
                    <span>Mobile Screen Banner (Recommended 800 × 1200 Portrait)</span>
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={
                      isCustomPage
                        ? activeCustomPage?.heroImageMobile || ''
                        : settings.heroBannerMobile || ''
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (isCustomPage && activeCustomPage) {
                        const updated = customPages.map((p) =>
                          p.id === activeCustomPage.id ? { ...p, heroImageMobile: val } : p
                        );
                        setSettings({ ...settings, customPages: updated });
                      } else {
                        setSettings({ ...settings, heroBannerMobile: val });
                      }
                    }}
                    placeholder="Mobile portrait banner URL..."
                    className="flex-1 px-3 py-2 text-xs border border-[#ECE6DD] rounded-xs font-mono"
                  />

                  <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#231F1D] text-white hover:bg-black text-xs font-medium rounded-xs cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>{uploadingMobile ? 'Uploading...' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingMobile}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingMobile(true);
                        const url = await uploadImageFile(file);
                        setUploadingMobile(false);
                        if (url) {
                          if (isCustomPage && activeCustomPage) {
                            const updated = customPages.map((p) =>
                              p.id === activeCustomPage.id ? { ...p, heroImageMobile: url } : p
                            );
                            setSettings({ ...settings, customPages: updated });
                          } else {
                            setSettings({ ...settings, heroBannerMobile: url });
                          }
                          showToast('Mobile image uploaded!');
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Thumbnail Preview */}
                {(isCustomPage ? activeCustomPage?.heroImageMobile : settings.heroBannerMobile) ? (
                  <div className="relative w-36 h-48 overflow-hidden rounded-xs border border-[#ECE6DD]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={isCustomPage ? activeCustomPage?.heroImageMobile : settings.heroBannerMobile}
                      alt="Mobile Preview"
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                ) : (
                  <p className="text-[11px] text-[#8C8075] italic">
                    No dedicated mobile banner set. Storefront will cleanly adapt the desktop asset.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: SEO & NAVIGATION */}
          {activeEditorTab === 'seo_nav' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="font-serif text-lg text-[#1E1B18]">Search Engine (SEO) &amp; Placement</h3>
                <p className="text-xs text-[#7C736A]">
                  Configure page title tags, search preview, and header/footer integration.
                </p>
              </div>

              {isCustomPage && activeCustomPage ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#1E1B18] mb-1">Meta Title</label>
                    <input
                      type="text"
                      value={activeCustomPage.metaTitle || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updated = customPages.map((p) =>
                          p.id === activeCustomPage.id ? { ...p, metaTitle: val } : p
                        );
                        setSettings({ ...settings, customPages: updated });
                      }}
                      placeholder="e.g. Artisanal Silhouettes | AABHA CLOTHING"
                      className="w-full px-3 py-2 text-xs border border-[#ECE6DD] rounded-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#1E1B18] mb-1">Meta Description</label>
                    <textarea
                      rows={3}
                      value={activeCustomPage.metaDescription || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updated = customPages.map((p) =>
                          p.id === activeCustomPage.id ? { ...p, metaDescription: val } : p
                        );
                        setSettings({ ...settings, customPages: updated });
                      }}
                      placeholder="Meta summary for Google & social sharing cards..."
                      className="w-full px-3 py-2 text-xs border border-[#ECE6DD] rounded-xs"
                    />
                  </div>

                  {/* Google SERP Live Simulation */}
                  <div className="p-4 bg-[#F8F9FA] border border-[#ECE6DD] rounded-xs space-y-1">
                    <span className="text-[10px] uppercase font-mono text-[#5F6368] block">Google SERP Snippet Preview</span>
                    <span className="text-xs text-[#202124] block truncate">
                      https://aabhaclothing.com/pages/{activeCustomPage.slug}
                    </span>
                    <span className="text-sm font-medium text-[#1A0DAB] hover:underline cursor-pointer block">
                      {activeCustomPage.metaTitle || `${activeCustomPage.title} | AABHA CLOTHING`}
                    </span>
                    <p className="text-xs text-[#4D5156] line-clamp-2">
                      {activeCustomPage.metaDescription || activeCustomPage.content || 'Explore artisanal handloom ensembles crafted by master karigars.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-[#FAF8F5] border border-[#ECE6DD] rounded-xs text-xs text-[#7C736A]">
                  This is a core system page. Its base SEO metadata is managed automatically by the atelier engine.
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Interactive In-Admin Live Storefront Preview (xl:col-span-6) */}
        <div className="xl:col-span-6 bg-[#1A1715] flex flex-col items-center justify-start p-4 sm:p-6 sticky top-[57px] h-[calc(100vh-140px)] overflow-hidden">
          {/* Preview Viewport Toolbar */}
          <div className="w-full flex items-center justify-between pb-3 text-white border-b border-[#2C2723] mb-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#A8E6CF] animate-pulse" />
              <span className="text-xs font-mono tracking-wide text-[#FAF8F5]">
                LIVE STOREFRONT STUDIO
              </span>
            </div>

            {/* Viewport Toggles: Mobile (375px), Tablet (768px), Desktop (100%) */}
            <div className="flex items-center gap-1 bg-[#25211D] border border-[#3E3832] p-1 rounded-xs">
              <button
                type="button"
                onClick={() => setViewport('mobile')}
                className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
                  viewport === 'mobile'
                    ? 'bg-[#D4AF37] text-[#1A1715] font-bold'
                    : 'text-[#A69C91] hover:text-white'
                }`}
                title="Mobile Viewport (375px Handset)"
              >
                <Smartphone className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setViewport('tablet')}
                className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
                  viewport === 'tablet'
                    ? 'bg-[#D4AF37] text-[#1A1715] font-bold'
                    : 'text-[#A69C91] hover:text-white'
                }`}
                title="Tablet Viewport (768px)"
              >
                <Tablet className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setViewport('desktop')}
                className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
                  viewport === 'desktop'
                    ? 'bg-[#D4AF37] text-[#1A1715] font-bold'
                    : 'text-[#A69C91] hover:text-white'
                }`}
                title="Desktop Viewport (100%)"
              >
                <Monitor className="w-4 h-4" />
              </button>
            </div>

            {/* Reload & Open External */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewReloadKey(Date.now())}
                className="p-1.5 text-[#D5CCC0] hover:text-white hover:bg-[#2A2521] border border-[#3E3832] rounded-xs cursor-pointer transition-colors"
                title="Refresh Live Frame"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <a
                href={previewPath}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-[#D5CCC0] hover:text-white hover:bg-[#2A2521] border border-[#3E3832] rounded-xs transition-colors"
                title="Open Live Page in New Browser Window"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Simulated Browser Address Bar */}
          <div className="w-full max-w-full bg-[#25211D] border border-[#3E3832] px-3 py-1.5 rounded-t-xs flex items-center justify-between text-xs text-[#A69C91] font-mono mb-0">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-[#4CAF50]" />
              <span className="text-[#D5CCC0] truncate">https://aabhaclothing.com{previewPath}</span>
            </div>
            <span className="text-[10px] text-[#A8E6CF] uppercase tracking-wider shrink-0">
              Live Edge Cache
            </span>
          </div>

          {/* Hardware Frame Shell */}
          <div
            className={`w-full flex-1 flex items-center justify-center overflow-auto transition-all duration-300 ${
              viewport === 'mobile'
                ? 'max-w-[390px]'
                : viewport === 'tablet'
                ? 'max-w-[768px]'
                : 'max-w-full'
            }`}
          >
            <div
              className={`w-full h-full bg-white shadow-2xl overflow-hidden transition-all duration-300 ${
                viewport === 'mobile'
                  ? 'border-[8px] border-[#2C2723] rounded-[28px]'
                  : viewport === 'tablet'
                  ? 'border-[10px] border-[#2C2723] rounded-[16px]'
                  : 'border border-[#3E3832] rounded-b-xs'
              }`}
            >
              <iframe
                key={livePreviewUrl}
                ref={iframeRef}
                src={livePreviewUrl}
                title="Interactive Live Page Preview"
                className="w-full h-full border-none bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION MODAL (+ Add Section / Edit Section) */}
      {sectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white max-w-2xl w-full rounded-xs shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#ECE6DD] pb-3">
              <h3 className="font-serif text-xl text-[#1E1B18]">
                {editingSectionIdx !== null ? 'Edit Page Section' : '+ Add Section to Page'}
              </h3>
              <button
                type="button"
                onClick={() => setSectionModalOpen(false)}
                className="p-1 text-[#7C736A] hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Section Type */}
              <div>
                <label className="block font-medium text-[#1E1B18] mb-1">Section Archetype</label>
                <select
                  value={sectionForm.type}
                  onChange={(e) => setSectionForm({ ...sectionForm, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-[#ECE6DD] rounded-xs bg-[#FAF8F5]"
                >
                  <option value="story">Editorial Narrative &amp; Craft Story</option>
                  <option value="hero">Full-Bleed Hero Banner</option>
                  <option value="products">Curated Product Shelf</option>
                  <option value="lookbook">Lookbook Gallery Grid</option>
                  <option value="faq">Patron FAQ Accordion</option>
                  <option value="banner">Call-to-Action Promo Banner</option>
                  <option value="text">Custom Editorial Text Block</option>
                </select>
              </div>

              {/* Title & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#1E1B18] mb-1">Section Heading / Title</label>
                  <input
                    type="text"
                    value={sectionForm.title || ''}
                    onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                    placeholder="e.g. The Chanderi Weaving Loom"
                    className="w-full px-3 py-2 border border-[#ECE6DD] rounded-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#1E1B18] mb-1">Eyebrow / Subtitle</label>
                  <input
                    type="text"
                    value={sectionForm.subtitle || ''}
                    onChange={(e) => setSectionForm({ ...sectionForm, subtitle: e.target.value })}
                    placeholder="e.g. ARTISANAL DISPATCH"
                    className="w-full px-3 py-2 border border-[#ECE6DD] rounded-xs"
                  />
                </div>
              </div>

              {/* Content Narrative */}
              <div>
                <label className="block font-medium text-[#1E1B18] mb-1">Body Content &amp; Description</label>
                <textarea
                  rows={4}
                  value={sectionForm.content || ''}
                  onChange={(e) => setSectionForm({ ...sectionForm, content: e.target.value })}
                  placeholder="Share the textile journey, karigar details, or styling tips..."
                  className="w-full px-3 py-2 border border-[#ECE6DD] rounded-xs"
                />
              </div>

              {/* Dual Media: Desktop Image & Mobile Image */}
              <div className="p-3 bg-[#FAF8F5] border border-[#ECE6DD] rounded-xs space-y-3">
                <span className="font-semibold text-[#1E1B18] block">Dual Media Assets</span>

                {/* Desktop Image */}
                <div>
                  <label className="block text-[#5A5046] mb-1">Desktop Image (Landscape)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={sectionForm.imageUrl || ''}
                      onChange={(e) => setSectionForm({ ...sectionForm, imageUrl: e.target.value })}
                      placeholder="/images/... or URL"
                      className="flex-1 px-3 py-2 border border-[#ECE6DD] rounded-xs font-mono text-[11px]"
                    />
                    <label className="inline-flex items-center gap-1 px-3 py-2 bg-[#231F1D] text-white rounded-xs cursor-pointer">
                      <Upload className="w-3 h-3 text-[#D4AF37]" />
                      <span>{uploadingSectionDesktop ? '...' : 'Upload'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingSectionDesktop}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingSectionDesktop(true);
                          const url = await uploadImageFile(file);
                          setUploadingSectionDesktop(false);
                          if (url) setSectionForm({ ...sectionForm, imageUrl: url });
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Mobile Image */}
                <div>
                  <label className="block text-[#5A5046] mb-1">Mobile Image (Portrait)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={sectionForm.mobileImageUrl || ''}
                      onChange={(e) => setSectionForm({ ...sectionForm, mobileImageUrl: e.target.value })}
                      placeholder="Optional mobile portrait image..."
                      className="flex-1 px-3 py-2 border border-[#ECE6DD] rounded-xs font-mono text-[11px]"
                    />
                    <label className="inline-flex items-center gap-1 px-3 py-2 bg-[#231F1D] text-white rounded-xs cursor-pointer">
                      <Upload className="w-3 h-3 text-[#D4AF37]" />
                      <span>{uploadingSectionMobile ? '...' : 'Upload'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingSectionMobile}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingSectionMobile(true);
                          const url = await uploadImageFile(file);
                          setUploadingSectionMobile(false);
                          if (url) setSectionForm({ ...sectionForm, mobileImageUrl: url });
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Atmospheric Blur & Opacity Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#FAF8F5] border border-[#ECE6DD] rounded-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="font-medium text-[#1E1B18]">Image Blur (px)</label>
                    <span className="font-mono text-[#6E5043] font-bold">{sectionForm.blurPx || 0}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    step={1}
                    value={sectionForm.blurPx || 0}
                    onChange={(e) => setSectionForm({ ...sectionForm, blurPx: Number(e.target.value) })}
                    className="w-full accent-[#6E5043] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="font-medium text-[#1E1B18]">Dark Overlay (%)</label>
                    <span className="font-mono text-[#6E5043] font-bold">{sectionForm.opacityPercent || 0}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={90}
                    step={5}
                    value={sectionForm.opacityPercent || 0}
                    onChange={(e) => setSectionForm({ ...sectionForm, opacityPercent: Number(e.target.value) })}
                    className="w-full accent-[#6E5043] cursor-pointer"
                  />
                </div>
              </div>

              {/* Animation Type & Button Action */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-[#1E1B18] mb-1">Animation Transition</label>
                  <select
                    value={sectionForm.animationType || 'fade'}
                    onChange={(e) => setSectionForm({ ...sectionForm, animationType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-[#ECE6DD] rounded-xs bg-[#FAF8F5]"
                  >
                    <option value="fade">Gentle Fade In</option>
                    <option value="slide">Slide From Bottom</option>
                    <option value="zoom">Subtle Hover Zoom</option>
                    <option value="none">None (Instant)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#1E1B18] mb-1">Button Label</label>
                  <input
                    type="text"
                    value={sectionForm.buttonLabel || ''}
                    onChange={(e) => setSectionForm({ ...sectionForm, buttonLabel: e.target.value })}
                    placeholder="e.g. Explore Collection"
                    className="w-full px-3 py-2 border border-[#ECE6DD] rounded-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#1E1B18] mb-1">Button Link URL</label>
                  <input
                    type="text"
                    value={sectionForm.buttonLink || ''}
                    onChange={(e) => setSectionForm({ ...sectionForm, buttonLink: e.target.value })}
                    placeholder="/shop"
                    className="w-full px-3 py-2 border border-[#ECE6DD] rounded-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[#ECE6DD]">
              <button
                type="button"
                onClick={() => setSectionModalOpen(false)}
                className="px-4 py-2 text-xs text-[#5A5046] hover:bg-[#F3EFEA] rounded-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSectionModal}
                className="px-5 py-2 text-xs font-medium bg-[#231F1D] text-white hover:bg-black rounded-xs cursor-pointer"
              >
                Save Section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT PAGE MODAL */}
      {pageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white max-w-xl w-full rounded-xs shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#ECE6DD] pb-3">
              <h3 className="font-serif text-xl text-[#1E1B18]">
                {editingCustomPageId ? 'Edit Page Details' : '+ Create New Storefront Page'}
              </h3>
              <button
                type="button"
                onClick={() => setPageModalOpen(false)}
                className="p-1 text-[#7C736A] hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#1E1B18] mb-1">Page Title *</label>
                <input
                  type="text"
                  value={pageForm.title}
                  onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })}
                  placeholder="e.g. Festive Silk Edition"
                  className="w-full px-3 py-2 border border-[#ECE6DD] rounded-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-[#1E1B18] mb-1">URL Slug *</label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-[#FAF8F5] border border-r-0 border-[#ECE6DD] text-[#8C8075] text-xs">
                    /pages/
                  </span>
                  <input
                    type="text"
                    value={pageForm.slug}
                    onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value })}
                    placeholder="festive-silk"
                    className="flex-1 px-3 py-2 border border-[#ECE6DD] rounded-r-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#1E1B18] mb-1">Subtitle / Editorial Tagline</label>
                <input
                  type="text"
                  value={pageForm.subtitle || ''}
                  onChange={(e) => setPageForm({ ...pageForm, subtitle: e.target.value })}
                  placeholder="e.g. Limited Edition Handloom Weaves"
                  className="w-full px-3 py-2 border border-[#ECE6DD] rounded-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-[#1E1B18] mb-1">Hero Editorial Banner Image</label>
                <input
                  type="text"
                  value={pageForm.heroImage || ''}
                  onChange={(e) => setPageForm({ ...pageForm, heroImage: e.target.value })}
                  placeholder="/images/... or URL"
                  className="w-full px-3 py-2 border border-[#ECE6DD] rounded-xs font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#1E1B18] mb-1">Introductory Narrative / Journal Entry</label>
                <textarea
                  rows={4}
                  value={pageForm.content || ''}
                  onChange={(e) => setPageForm({ ...pageForm, content: e.target.value })}
                  placeholder="Write the introduction for this page..."
                  className="w-full px-3 py-2 border border-[#ECE6DD] rounded-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="pagePublishedCheck"
                  checked={pageForm.published}
                  onChange={(e) => setPageForm({ ...pageForm, published: e.target.checked })}
                  className="rounded border-[#ECE6DD] text-[#231F1D]"
                />
                <label htmlFor="pagePublishedCheck" className="text-xs font-medium text-[#1E1B18] cursor-pointer">
                  Publish page immediately (make accessible to public patrons)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[#ECE6DD]">
              <button
                type="button"
                onClick={() => setPageModalOpen(false)}
                className="px-4 py-2 text-xs text-[#5A5046] hover:bg-[#F3EFEA] rounded-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePageModal}
                className="px-5 py-2 text-xs font-medium bg-[#231F1D] text-white hover:bg-black rounded-xs cursor-pointer"
              >
                {editingCustomPageId ? 'Update Page' : 'Create Page'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default function AdminPagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6 text-xs text-[#7C736A]">
          Loading Pages Live Studio...
        </div>
      }
    >
      <AdminPagesStudio />
    </Suspense>
  );
}
