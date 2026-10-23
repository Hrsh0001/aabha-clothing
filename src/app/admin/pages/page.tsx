'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Compass,
  Layers,
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
  Search,
  Layout,
  ChevronRight,
  Sparkles,
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

type PageTab = 'pages_actions' | 'nav_menu' | 'footer_columns' | 'blur_opacity';

const SYSTEM_CORE_PAGES = [
  {
    id: 'sys-home',
    title: 'Storefront Home',
    slug: '/',
    description: 'Hero carousel, Category showcases, New arrivals, Brand story & Curated edits.',
    studioTab: 'hero',
    inNavbarDefault: true,
  },
  {
    id: 'sys-shop',
    title: 'Shop All Collection',
    slug: '/shop',
    description: 'Category filters (Anarkali, 3-Piece, Co-ords, Chikankari), sorting & product catalog.',
    studioTab: 'categories',
    inNavbarDefault: true,
  },
  {
    id: 'sys-about',
    title: 'About Atelier',
    slug: '/about',
    description: 'Artisanal heritage, foundational silhouettes narrative & craftsmanship ethos.',
    studioTab: 'story_about',
    inNavbarDefault: true,
  },
  {
    id: 'sys-contact',
    title: 'Contact & Concierge',
    slug: '/contact',
    description: 'WhatsApp concierge, phone assistance, studio address, hours & patron inquiries.',
    studioTab: 'contact_social',
    inNavbarDefault: true,
  },
  {
    id: 'sys-orders',
    title: 'Order Tracking & GST Invoices',
    slug: '/my-orders',
    description: 'Phone lookup for patrons to track status, inspect COD details & download bills.',
    studioTab: 'contact_social',
    inNavbarDefault: true,
  },
  {
    id: 'sys-shipping',
    title: 'Shipping Policy',
    slug: '/policy?topic=shipping',
    description: 'Express shipping timelines, COD verification, and pan-India insured dispatch.',
    studioTab: 'nav_footer',
    inNavbarDefault: false,
  },
  {
    id: 'sys-returns',
    title: '14-Day Exchange Policy',
    slug: '/policy?topic=returns',
    description: 'Exchange guidelines, return concierge pickup, and quality guarantee.',
    studioTab: 'nav_footer',
    inNavbarDefault: false,
  },
  {
    id: 'sys-faq',
    title: 'Frequently Asked Questions',
    slug: '/policy?topic=faq',
    description: 'Sizing guidance, care instructions, ordering assistance & delivery questions.',
    studioTab: 'nav_footer',
    inNavbarDefault: false,
  },
];

export default function AdminPagesPage() {
  const { adminToken } = useAuth();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<PageTab>('pages_actions');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'custom' | 'system'>('all');

  // Page Modal state (Create / Edit Page)
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
    sections: [],
  });

  // Section Creator Modal state (+ Add Section to a Page)
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [targetPageForSection, setTargetPageForSection] = useState<CustomPageItem | null>(null);
  const [sectionForm, setSectionForm] = useState<PageSectionItem>({
    id: '',
    type: 'story',
    title: '',
    subtitle: '',
    content: '',
    imageUrl: '',
    buttonLabel: 'Explore Collection',
    buttonLink: '/shop',
    visible: true,
  });

  // Manage Sections Modal state (Reorder, Hide, Delete sections for a Page)
  const [manageSectionsModalOpen, setManageSectionsModalOpen] = useState(false);
  const [pageUnderSectionManagement, setPageUnderSectionManagement] = useState<CustomPageItem | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getAuthHeaders = () => {
    const token = adminToken || (typeof window !== 'undefined' ? localStorage.getItem('aabha_admin_token') : null);
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Load Settings
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...data.settings,
            customPages: Array.isArray(data.settings.customPages) && data.settings.customPages.length > 0
              ? data.settings.customPages
              : DEFAULT_CUSTOM_PAGES,
            navLinks: Array.isArray(data.settings.navLinks) && data.settings.navLinks.length > 0
              ? data.settings.navLinks
              : DEFAULT_NAV_LINKS,
            footerColumns: Array.isArray(data.settings.footerColumns) && data.settings.footerColumns.length > 0
              ? data.settings.footerColumns
              : DEFAULT_FOOTER_COLUMNS,
          });
        }
      })
      .catch(() => showToast('Could not load current pages from server.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Save Settings
  const handleSaveSettings = async (updatedSettings?: SiteSettings) => {
    setSaving(true);
    const payload = updatedSettings || settings;
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
        showToast('All page updates, sections, and navigation changes saved successfully!');
      } else {
        showToast(data.error || 'Failed to save changes.', 'error');
      }
    } catch {
      showToast('Network error saving changes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const customPages = settings.customPages || DEFAULT_CUSTOM_PAGES;

  // Page Modal Handlers
  const handleOpenCreateModal = () => {
    setEditingPageId(null);
    setPageForm({
      id: `page-${Date.now()}`,
      slug: '',
      title: '',
      subtitle: '',
      heroImage: '/images/brand_story_editorial_1791119191742.jpg',
      content: '',
      published: true,
      metaTitle: '',
      metaDescription: '',
      sections: [],
    });
    setPageModalOpen(true);
  };

  const handleOpenEditModal = (page: CustomPageItem) => {
    setEditingPageId(page.id);
    setPageForm({ ...page, sections: page.sections || [] });
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
    if (editingPageId) {
      updatedPages = customPages.map((p) => (p.id === editingPageId ? finalPage : p));
    } else {
      updatedPages = [...customPages, finalPage];
    }

    const newSettings = { ...settings, customPages: updatedPages };
    setSettings(newSettings);
    setPageModalOpen(false);
    handleSaveSettings(newSettings);
  };

  const handleDeletePage = (pageId: string, pageTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${pageTitle}"?`)) return;
    const updatedPages = customPages.filter((p) => p.id !== pageId);
    const newSettings = { ...settings, customPages: updatedPages };
    setSettings(newSettings);
    handleSaveSettings(newSettings);
    showToast(`Deleted page "${pageTitle}".`);
  };

  const handleTogglePublish = (pageId: string) => {
    const updatedPages = customPages.map((p) =>
      p.id === pageId ? { ...p, published: !p.published } : p
    );
    const newSettings = { ...settings, customPages: updatedPages };
    setSettings(newSettings);
    handleSaveSettings(newSettings);
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
    handleSaveSettings(newSettings);
    showToast(`Cloned page "${page.title}" as draft.`);
  };

  // Section Creator Modal Handlers (+ Add Section)
  const handleOpenAddSectionModal = (page: CustomPageItem) => {
    setTargetPageForSection(page);
    setSectionForm({
      id: `sec-${Date.now()}`,
      type: 'story',
      title: '',
      subtitle: '',
      content: '',
      imageUrl: '',
      buttonLabel: 'Explore Collection',
      buttonLink: '/shop',
      visible: true,
    });
    setSectionModalOpen(true);
  };

  const handleSaveNewSection = () => {
    if (!targetPageForSection) return;
    if (!sectionForm.title?.trim() && !sectionForm.content?.trim()) {
      showToast('Please provide a title or content for this section.', 'error');
      return;
    }

    const existingSections = Array.isArray(targetPageForSection.sections)
      ? targetPageForSection.sections
      : [];
    const updatedSections = [...existingSections, { ...sectionForm, id: `sec-${Date.now()}` }];

    const updatedPages = customPages.map((p) =>
      p.id === targetPageForSection.id ? { ...p, sections: updatedSections } : p
    );

    const newSettings = { ...settings, customPages: updatedPages };
    setSettings(newSettings);
    setSectionModalOpen(false);
    handleSaveSettings(newSettings);
    showToast(`Added new section to "${targetPageForSection.title}"!`);
  };

  // Manage Sections Modal Handlers
  const handleOpenManageSections = (page: CustomPageItem) => {
    setPageUnderSectionManagement(page);
    setManageSectionsModalOpen(true);
  };

  const handleMoveSection = (secIndex: number, direction: 'up' | 'down') => {
    if (!pageUnderSectionManagement) return;
    const sections = [...(pageUnderSectionManagement.sections || [])];
    const targetIdx = direction === 'up' ? secIndex - 1 : secIndex + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    const temp = sections[secIndex];
    sections[secIndex] = sections[targetIdx];
    sections[targetIdx] = temp;

    const updatedPage = { ...pageUnderSectionManagement, sections };
    setPageUnderSectionManagement(updatedPage);

    const updatedPages = customPages.map((p) =>
      p.id === updatedPage.id ? updatedPage : p
    );
    const newSettings = { ...settings, customPages: updatedPages };
    setSettings(newSettings);
    handleSaveSettings(newSettings);
  };

  const handleToggleSectionVisibility = (secIndex: number) => {
    if (!pageUnderSectionManagement) return;
    const sections = [...(pageUnderSectionManagement.sections || [])];
    sections[secIndex] = { ...sections[secIndex], visible: !sections[secIndex].visible };

    const updatedPage = { ...pageUnderSectionManagement, sections };
    setPageUnderSectionManagement(updatedPage);

    const updatedPages = customPages.map((p) =>
      p.id === updatedPage.id ? updatedPage : p
    );
    const newSettings = { ...settings, customPages: updatedPages };
    setSettings(newSettings);
    handleSaveSettings(newSettings);
  };

  const handleDeleteSection = (secIndex: number) => {
    if (!pageUnderSectionManagement) return;
    const sections = (pageUnderSectionManagement.sections || []).filter((_, idx) => idx !== secIndex);
    const updatedPage = { ...pageUnderSectionManagement, sections };
    setPageUnderSectionManagement(updatedPage);

    const updatedPages = customPages.map((p) =>
      p.id === updatedPage.id ? updatedPage : p
    );
    const newSettings = { ...settings, customPages: updatedPages };
    setSettings(newSettings);
    handleSaveSettings(newSettings);
    showToast('Section removed.');
  };

  // Navbar & Footer 1-Click Toggles
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

  // Navbar Management Handlers
  const navLinks = settings.navLinks || DEFAULT_NAV_LINKS;

  const handleMoveNavLink = (index: number, direction: 'up' | 'down') => {
    const newLinks = [...navLinks];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newLinks.length) return;
    const temp = newLinks[index];
    newLinks[index] = newLinks[targetIdx];
    newLinks[targetIdx] = temp;
    const newSettings = { ...settings, navLinks: newLinks };
    setSettings(newSettings);
    handleSaveSettings(newSettings);
  };

  const handleToggleNavVisibility = (index: number) => {
    const newLinks = [...navLinks];
    newLinks[index] = { ...newLinks[index], visible: !newLinks[index].visible };
    const newSettings = { ...settings, navLinks: newLinks };
    setSettings(newSettings);
    handleSaveSettings(newSettings);
  };

  const handleDeleteNavLink = (index: number) => {
    const newLinks = navLinks.filter((_, idx) => idx !== index);
    const newSettings = { ...settings, navLinks: newLinks };
    setSettings(newSettings);
    handleSaveSettings(newSettings);
  };

  const handleAddCustomNavLink = () => {
    const label = prompt('Enter navigation link title (e.g. "Festive Lookbook"):');
    if (!label) return;
    const href = prompt('Enter URL path (e.g. "/shop", "/about", or "/pages/our-craft"):', '/shop');
    if (!href) return;

    const newLink: NavLinkItem = {
      id: `nl-${Date.now()}`,
      label: label.trim(),
      href: href.trim(),
      visible: true,
    };
    const newSettings = { ...settings, navLinks: [...navLinks, newLink] };
    setSettings(newSettings);
    handleSaveSettings(newSettings);
  };

  if (loading) {
    return (
      <AdminLayout title="Pages & Navigation" subtitle="Loading page directory...">
        <div className="py-24 flex flex-col items-center justify-center gap-2 text-xs uppercase tracking-widest text-[#7C736A]">
          <RefreshCw className="w-5 h-5 text-[#6E5043] animate-spin" />
          <span>Loading Pages...</span>
        </div>
      </AdminLayout>
    );
  }

  const filteredCustomPages = customPages.filter((p) => {
    if (filterType === 'system') return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
  });

  const filteredSystemPages = SYSTEM_CORE_PAGES.filter((p) => {
    if (filterType === 'custom') return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
  });

  return (
    <AdminLayout
      title="Pages & Navigation"
      subtitle="Clean, dedicated controls to create pages, add sections, organize navigation, and tune styling."
      extraAction={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#D4AF37] hover:bg-[#C29D26] text-[#1A1715] text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add New Page</span>
          </button>
          <button
            type="button"
            onClick={() => handleSaveSettings()}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1A1715] hover:bg-[#2C2723] text-white text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Toast Alert */}
        {toast && (
          <div
            className={`p-3 text-xs flex items-center justify-between border ${
              toast.type === 'error'
                ? 'bg-[#FFF5F5] border-[#FFCDD2] text-[#B71C1C]'
                : 'bg-[#F1F8E9] border-[#C8E6C9] text-[#2E7D32]'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
              <span className="font-medium">{toast.message}</span>
            </div>
            <button type="button" onClick={() => setToast(null)} className="cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 4 Dedicated, Clean Segmented Sub-Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#ECE6DD] pb-2">
          {[
            { id: 'pages_actions', label: `1. Pages & Add Actions (${customPages.length + SYSTEM_CORE_PAGES.length})`, icon: FileText },
            { id: 'nav_menu', label: `2. Top Navbar Menu (${navLinks.length})`, icon: Compass },
            { id: 'footer_columns', label: '3. Footer Navigation', icon: Layers },
            { id: 'blur_opacity', label: '4. Blur & Opacity Studio', icon: Palette },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as PageTab)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-medium tracking-wider uppercase transition-colors cursor-pointer border ${
                  isActive
                    ? 'bg-[#1A1715] text-[#FAF8F5] border-[#1A1715] shadow-xs'
                    : 'bg-white text-[#5C544D] border-[#ECE6DD] hover:text-[#1E1B18] hover:border-[#1E1B18]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: PAGES & ADD ACTIONS (CLEAN, MODULAR, NO MIXING) */}
        {/* ========================================================================= */}
        {activeTab === 'pages_actions' && (
          <div className="space-y-6">
            {/* Clean Filter Header */}
            <div className="bg-white border border-[#ECE6DD] p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7C736A]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search pages by title or slug..."
                    className="w-full pl-9 pr-3 py-1.5 bg-[#FAF8F5] border border-[#ECE6DD] text-xs text-[#1E1B18]"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-3 py-1.5 bg-[#FAF8F5] border border-[#ECE6DD] text-xs text-[#1E1B18]"
                >
                  <option value="all">All Pages</option>
                  <option value="custom">Custom Lookbooks</option>
                  <option value="system">Core System Pages</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#231F1D] text-white text-xs font-semibold uppercase tracking-wider hover:bg-black transition-colors w-full sm:w-auto justify-center cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>+ Create Page</span>
              </button>
            </div>

            {/* CUSTOM CMS PAGES LIST WITH DEDICATED ADD ACTIONS */}
            {filterType !== 'system' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg text-[#1E1B18]">
                    Custom Lookbook &amp; Journal Pages ({customPages.length})
                  </h3>
                  <span className="text-[11px] text-[#7C736A] font-mono">
                    Routes at /pages/[slug]
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {filteredCustomPages.map((page) => {
                    const inNavbar = isPageInNavbar(page.slug);
                    const inFooter = isPageInFooter(page.slug);
                    const sectionsCount = Array.isArray(page.sections) ? page.sections.length : 0;

                    return (
                      <div
                        key={page.id}
                        className="bg-white border border-[#ECE6DD] p-5 hover:border-[#D5CCC0] transition-colors space-y-4"
                      >
                        {/* Page Top Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#ECE6DD] pb-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-serif text-lg font-medium text-[#1E1B18]">
                                {page.title}
                              </span>
                              <span
                                className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border ${
                                  page.published
                                    ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                                    : 'bg-[#FFF3E0] text-[#E65100] border-[#FFE0B2]'
                                }`}
                              >
                                {page.published ? 'Live Published' : 'Draft'}
                              </span>
                              <span className="px-2 py-0.5 text-[10px] font-mono bg-[#FAF8F5] text-[#6E5043] border border-[#ECE6DD]">
                                {sectionsCount} {sectionsCount === 1 ? 'Section' : 'Sections'}
                              </span>
                            </div>
                            <span className="text-xs text-[#7C736A] font-mono block">
                              /pages/{page.slug}
                            </span>
                          </div>

                          {/* Primary Action: Add Section Button */}
                          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                            <button
                              type="button"
                              onClick={() => handleOpenAddSectionModal(page)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-[#FAF8F5] border border-[#D4AF37] text-[#1A1715] hover:bg-[#D4AF37]/15 text-xs font-semibold tracking-wide cursor-pointer shadow-2xs"
                              title="Add a new section to this page"
                            >
                              <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                              <span>+ Add Section</span>
                            </button>

                            {sectionsCount > 0 && (
                              <button
                                type="button"
                                onClick={() => handleOpenManageSections(page)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#ECE6DD] hover:bg-[#FAF8F5] text-xs text-[#1E1B18] cursor-pointer"
                              >
                                <Layout className="w-3.5 h-3.5 text-[#6E5043]" />
                                <span>Manage Sections ({sectionsCount})</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Page Bottom Row: Controls & Navigation Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                          {/* Navigation Toggles */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleNavbarLink(page)}
                              className={`px-2.5 py-1 border text-xs flex items-center gap-1 cursor-pointer ${
                                inNavbar
                                  ? 'bg-[#E3F2FD] border-[#90CAF9] text-[#1565C0]'
                                  : 'bg-[#FAF8F5] border-[#ECE6DD] text-[#7C736A] hover:bg-[#ECE6DD]'
                              }`}
                            >
                              <Compass className="w-3 h-3" />
                              <span>{inNavbar ? 'In Navbar ✓' : '+ Add to Navbar'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleFooterLink(page)}
                              className={`px-2.5 py-1 border text-xs flex items-center gap-1 cursor-pointer ${
                                inFooter
                                  ? 'bg-[#F3E5F5] border-[#CE93D8] text-[#7B1FA2]'
                                  : 'bg-[#FAF8F5] border-[#ECE6DD] text-[#7C736A] hover:bg-[#ECE6DD]'
                              }`}
                            >
                              <Layers className="w-3 h-3" />
                              <span>{inFooter ? 'In Footer ✓' : '+ Add to Footer'}</span>
                            </button>
                          </div>

                          {/* Edit, Clone, Preview, Delete Actions */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleTogglePublish(page.id)}
                              className="px-2 py-1 bg-[#FAF8F5] border border-[#ECE6DD] hover:bg-[#ECE6DD] text-[#1E1B18] flex items-center gap-1 cursor-pointer"
                            >
                              {page.published ? <EyeOff className="w-3 h-3 text-[#E65100]" /> : <Eye className="w-3 h-3 text-[#2E7D32]" />}
                              <span>{page.published ? 'Unpublish' : 'Publish'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(page)}
                              className="px-2.5 py-1 bg-[#FAF8F5] border border-[#ECE6DD] hover:bg-[#ECE6DD] text-[#1E1B18] flex items-center gap-1 cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3 text-[#6E5043]" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleClonePage(page)}
                              className="p-1 bg-[#FAF8F5] border border-[#ECE6DD] hover:bg-[#ECE6DD] text-[#7C736A] cursor-pointer"
                              title="Duplicate Page"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            <a
                              href={`/pages/${page.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 bg-[#FAF8F5] border border-[#ECE6DD] hover:bg-[#ECE6DD] text-[#7C736A] hover:text-[#1E1B18] cursor-pointer"
                              title="Preview live page in new tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>

                            <button
                              type="button"
                              onClick={() => handleDeletePage(page.id, page.title)}
                              className="p-1 bg-[#FFF5F5] border border-[#FFCDD2] hover:bg-[#FFEBEE] text-[#C62828] cursor-pointer"
                              title="Delete Page"
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
            )}

            {/* CORE SYSTEM PAGES LIST */}
            {filterType !== 'custom' && (
              <div className="space-y-3 pt-6 border-t border-[#ECE6DD]">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg text-[#1E1B18]">
                    Built-in Storefront Pages ({SYSTEM_CORE_PAGES.length})
                  </h3>
                  <span className="text-[11px] text-[#7C736A]">
                    Primary storefront destinations
                  </span>
                </div>

                <div className="bg-white border border-[#ECE6DD] divide-y divide-[#ECE6DD]">
                  {filteredSystemPages.map((sysPage) => (
                    <div
                      key={sysPage.id}
                      className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-[#FAF8F5]/60 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-sm font-medium text-[#1E1B18]">
                            {sysPage.title}
                          </span>
                          <span className="px-2 py-0.2 text-[9px] font-mono bg-[#F3EFEA] border border-[#ECE6DD] text-[#6E5043]">
                            Core Route
                          </span>
                        </div>
                        <span className="text-xs text-[#7C736A] font-mono block">
                          {sysPage.slug}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/admin/branding?tab=${sysPage.studioTab}`}
                          className="px-3 py-1.5 bg-[#FAF8F5] border border-[#ECE6DD] hover:bg-[#ECE6DD] text-xs text-[#1E1B18] flex items-center gap-1 cursor-pointer"
                        >
                          <Sliders className="w-3.5 h-3.5 text-[#6E5043]" />
                          <span>+ Add Section / Edit in Studio</span>
                        </Link>
                        <a
                          href={sysPage.slug}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-[#FAF8F5] border border-[#ECE6DD] hover:bg-[#ECE6DD] text-[#7C736A] hover:text-[#1E1B18] cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: TOP NAVBAR MENU (CLEAN, ISOLATED) */}
        {/* ========================================================================= */}
        {activeTab === 'nav_menu' && (
          <div className="bg-white border border-[#ECE6DD] p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ECE6DD] pb-4">
              <div>
                <h3 className="font-serif text-xl text-[#1E1B18]">
                  Header Navigation Links
                </h3>
                <p className="text-xs text-[#7C736A] mt-0.5">
                  Order, show, or hide links visible in the top header.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddCustomNavLink}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#231F1D] text-white text-xs font-medium uppercase tracking-wider hover:bg-black transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>+ Add Nav Link</span>
              </button>
            </div>

            <div className="space-y-2">
              {navLinks.map((link, idx) => (
                <div
                  key={link.id || idx}
                  className="p-3 bg-[#FAF8F5] border border-[#ECE6DD] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-white border border-[#ECE6DD] text-[10px] font-mono text-[#7C736A] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-sm text-[#1E1B18] font-medium">
                          {link.label}
                        </span>
                        {link.visible === false && (
                          <span className="text-[9px] font-mono text-[#E65100] bg-[#FFF3E0] px-1 py-0.2 border border-[#FFE0B2]">
                            Hidden
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#7C736A] font-mono">
                        {link.href}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveNavLink(idx, 'up')}
                      className="p-1.5 bg-white border border-[#ECE6DD] hover:bg-[#FAF8F5] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5 text-[#1E1B18]" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === navLinks.length - 1}
                      onClick={() => handleMoveNavLink(idx, 'down')}
                      className="p-1.5 bg-white border border-[#ECE6DD] hover:bg-[#FAF8F5] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5 text-[#1E1B18]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleNavVisibility(idx)}
                      className="p-1.5 bg-white border border-[#ECE6DD] hover:bg-[#FAF8F5] cursor-pointer"
                    >
                      {link.visible === false ? (
                        <EyeOff className="w-3.5 h-3.5 text-[#E65100]" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-[#2E7D32]" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteNavLink(idx)}
                      className="p-1.5 bg-[#FFF5F5] border border-[#FFCDD2] hover:bg-[#FFEBEE] text-[#C62828] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: FOOTER NAVIGATION (CLEAN, ISOLATED) */}
        {/* ========================================================================= */}
        {activeTab === 'footer_columns' && (
          <div className="bg-white border border-[#ECE6DD] p-6 space-y-6">
            <div>
              <h3 className="font-serif text-xl text-[#1E1B18]">
                Storefront Footer Columns
              </h3>
              <p className="text-xs text-[#7C736A] mt-0.5">
                Organize navigation links and policy pages shown across the footer.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(settings.footerColumns || DEFAULT_FOOTER_COLUMNS).map((col, colIdx) => (
                <div key={col.id || colIdx} className="bg-[#FAF8F5] border border-[#ECE6DD] p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#ECE6DD] pb-2">
                    <span className="font-serif text-sm font-semibold uppercase tracking-wider text-[#1E1B18]">
                      {col.title}
                    </span>
                    <span className="text-[11px] text-[#7C736A] font-mono">
                      {col.links.length} links
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {col.links.map((link, linkIdx) => (
                      <div
                        key={link.id || linkIdx}
                        className="flex items-center justify-between text-xs py-1 px-2 bg-white border border-[#ECE6DD]"
                      >
                        <span className="font-medium text-[#1E1B18]">{link.label}</span>
                        <span className="font-mono text-[10px] text-[#7C736A]">{link.href}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: BLUR & OPACITY STUDIO (CLEAN, ISOLATED) */}
        {/* ========================================================================= */}
        {activeTab === 'blur_opacity' && (
          <div className="bg-white border border-[#ECE6DD] p-6 space-y-6">
            <div>
              <h3 className="font-serif text-xl text-[#1E1B18]">
                Atmospheric Blur &amp; Opacity Studio
              </h3>
              <p className="text-xs text-[#7C736A] mt-0.5">
                Fine-tune image background blurs and darkening overlays for high luxury contrast.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Hero Banner Controls */}
              <div className="bg-[#FAF8F5] border border-[#ECE6DD] p-5 space-y-4">
                <h4 className="font-serif text-base text-[#1E1B18]">Hero Carousel Overlay &amp; Blur</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-[#1E1B18] mb-1">
                      <span>Overlay Darkness Opacity</span>
                      <span className="font-mono text-[#6E5043]">{settings.heroOverlayOpacity ?? 25}%</span>
                    </div>
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
                    <div className="flex items-center justify-between text-xs font-semibold text-[#1E1B18] mb-1">
                      <span>Image Background Blur</span>
                      <span className="font-mono text-[#6E5043]">{settings.heroBannerBlur ?? 0}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="1"
                      value={settings.heroBannerBlur ?? 0}
                      onChange={(e) => setSettings({ ...settings, heroBannerBlur: Number(e.target.value) })}
                      className="w-full accent-[#231F1D]"
                    />
                  </div>
                </div>
              </div>

              {/* Header Blur Controls */}
              <div className="bg-[#FAF8F5] border border-[#ECE6DD] p-5 space-y-4">
                <h4 className="font-serif text-base text-[#1E1B18]">Top Header Glassmorphism</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-[#1E1B18] mb-1">
                      <span>Header Background Opacity</span>
                      <span className="font-mono text-[#6E5043]">{settings.headerOpacity ?? 95}%</span>
                    </div>
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
                    <div className="flex items-center justify-between text-xs font-semibold text-[#1E1B18] mb-1">
                      <span>Header Glass Backdrop Blur</span>
                      <span className="font-mono text-[#6E5043]">{settings.headerBlur ?? 8}px</span>
                    </div>
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
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => handleSaveSettings()}
                disabled={saving}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-[#1A1715] hover:bg-[#2C2723] text-white text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Blur &amp; Opacity Settings</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD SECTION TO A SPECIFIC PAGE */}
      {/* ========================================================================= */}
      {sectionModalOpen && targetPageForSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white border border-[#2C2723] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#ECE6DD] pb-3">
              <div>
                <h3 className="font-serif text-lg text-[#1E1B18]">
                  + Add Section to &ldquo;{targetPageForSection.title}&rdquo;
                </h3>
                <span className="text-xs text-[#7C736A]">
                  Choose section type and customize its content
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSectionModalOpen(false)}
                className="p-1 text-[#7C736A] hover:text-[#1E1B18] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1">
                  Section Type
                </label>
                <select
                  value={sectionForm.type}
                  onChange={(e) => setSectionForm({ ...sectionForm, type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#D5CCC0] text-xs text-[#1E1B18]"
                >
                  <option value="story">Artisan Craft &amp; Story Narrative</option>
                  <option value="lookbook">Editorial Lookbook Image Showcase</option>
                  <option value="text">Editorial Highlight / Paragraph Block</option>
                  <option value="faq">FAQ / Care Guide Accordion</option>
                  <option value="banner">Call-to-Action Banner Card</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1">
                  Section Heading / Title
                </label>
                <input
                  type="text"
                  value={sectionForm.title || ''}
                  onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                  placeholder="e.g. Master Weavers of Chanderi"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#D5CCC0] text-xs text-[#1E1B18]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1">
                  Eyebrow / Subtitle
                </label>
                <input
                  type="text"
                  value={sectionForm.subtitle || ''}
                  onChange={(e) => setSectionForm({ ...sectionForm, subtitle: e.target.value })}
                  placeholder="e.g. THE HANDLOOM LEGACY"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#D5CCC0] text-xs text-[#1E1B18]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1">
                  Section Image URL (Optional)
                </label>
                <input
                  type="text"
                  value={sectionForm.imageUrl || ''}
                  onChange={(e) => setSectionForm({ ...sectionForm, imageUrl: e.target.value })}
                  placeholder="e.g. /images/brand_story_editorial_1791119191742.jpg"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#D5CCC0] text-xs font-mono text-[#1E1B18]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1">
                  Narrative Text / Content
                </label>
                <textarea
                  rows={4}
                  value={sectionForm.content || ''}
                  onChange={(e) => setSectionForm({ ...sectionForm, content: e.target.value })}
                  placeholder="Enter the section story or information..."
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#D5CCC0] text-xs text-[#1E1B18]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1">
                    Button Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={sectionForm.buttonLabel || ''}
                    onChange={(e) => setSectionForm({ ...sectionForm, buttonLabel: e.target.value })}
                    placeholder="e.g. Explore Anarkalis"
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#D5CCC0] text-xs text-[#1E1B18]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1">
                    Button Link
                  </label>
                  <input
                    type="text"
                    value={sectionForm.buttonLink || ''}
                    onChange={(e) => setSectionForm({ ...sectionForm, buttonLink: e.target.value })}
                    placeholder="/shop"
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#D5CCC0] text-xs text-[#1E1B18]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#ECE6DD]">
              <button
                type="button"
                onClick={() => setSectionModalOpen(false)}
                className="px-3 py-1.5 bg-white border border-[#D5CCC0] text-xs text-[#7C736A] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewSection}
                className="px-4 py-1.5 bg-[#231F1D] text-white text-xs font-semibold uppercase tracking-wider hover:bg-black cursor-pointer"
              >
                + Add Section to Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: MANAGE PAGE SECTIONS (REORDER, HIDE, DELETE) */}
      {/* ========================================================================= */}
      {manageSectionsModalOpen && pageUnderSectionManagement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white border border-[#2C2723] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#ECE6DD] pb-3">
              <div>
                <h3 className="font-serif text-lg text-[#1E1B18]">
                  Manage Sections: {pageUnderSectionManagement.title}
                </h3>
                <span className="text-xs text-[#7C736A]">
                  Reorder or toggle visibility of sections
                </span>
              </div>
              <button
                type="button"
                onClick={() => setManageSectionsModalOpen(false)}
                className="p-1 text-[#7C736A] hover:text-[#1E1B18] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(!pageUnderSectionManagement.sections || pageUnderSectionManagement.sections.length === 0) ? (
              <div className="py-8 text-center text-xs text-[#7C736A]">
                No sections added yet. Click &ldquo;+ Add Section&rdquo; to add your first one.
              </div>
            ) : (
              <div className="space-y-2">
                {pageUnderSectionManagement.sections.map((sec, secIdx) => (
                  <div
                    key={sec.id || secIdx}
                    className="p-3 bg-[#FAF8F5] border border-[#ECE6DD] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-sm font-medium text-[#1E1B18] truncate">
                          {sec.title || `Section ${secIdx + 1}`}
                        </span>
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 bg-white border border-[#ECE6DD] text-[#6E5043]">
                          {sec.type}
                        </span>
                        {sec.visible === false && (
                          <span className="text-[9px] font-mono text-[#E65100] bg-[#FFF3E0] px-1 py-0.2 border border-[#FFE0B2]">
                            Hidden
                          </span>
                        )}
                      </div>
                      {sec.subtitle && (
                        <p className="text-[11px] text-[#7C736A] truncate">{sec.subtitle}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={secIdx === 0}
                        onClick={() => handleMoveSection(secIdx, 'up')}
                        className="p-1 bg-white border border-[#ECE6DD] hover:bg-[#FAF8F5] disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5 text-[#1E1B18]" />
                      </button>
                      <button
                        type="button"
                        disabled={secIdx === (pageUnderSectionManagement.sections?.length || 0) - 1}
                        onClick={() => handleMoveSection(secIdx, 'down')}
                        className="p-1 bg-white border border-[#ECE6DD] hover:bg-[#FAF8F5] disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5 text-[#1E1B18]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleSectionVisibility(secIdx)}
                        className="p-1 bg-white border border-[#ECE6DD] hover:bg-[#FAF8F5] cursor-pointer"
                        title={sec.visible === false ? 'Show' : 'Hide'}
                      >
                        {sec.visible === false ? (
                          <EyeOff className="w-3.5 h-3.5 text-[#E65100]" />
                        ) : (
                          <Eye className="w-3.5 h-3.5 text-[#2E7D32]" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSection(secIdx)}
                        className="p-1 bg-[#FFF5F5] border border-[#FFCDD2] hover:bg-[#FFEBEE] text-[#C62828] cursor-pointer"
                        title="Delete Section"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-[#ECE6DD]">
              <button
                type="button"
                onClick={() => setManageSectionsModalOpen(false)}
                className="px-4 py-1.5 bg-[#231F1D] text-white text-xs font-semibold uppercase tracking-wider cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE / EDIT CUSTOM PAGE */}
      {/* ========================================================================= */}
      {pageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-white border border-[#2C2723] shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-[#ECE6DD] pb-3">
              <div>
                <h3 className="font-serif text-xl text-[#1E1B18]">
                  {editingPageId ? 'Edit Page Details' : 'Create New Page'}
                </h3>
                <span className="text-xs text-[#7C736A]">
                  Accessible at /pages/{pageForm.slug || 'your-slug'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPageModalOpen(false)}
                className="p-1.5 text-[#7C736A] hover:text-[#1E1B18] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1">
                    Page Title *
                  </label>
                  <input
                    type="text"
                    value={pageForm.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      setPageForm((prev) => ({
                        ...prev,
                        title,
                        slug: prev.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
                      }));
                    }}
                    placeholder="e.g. Artisanal Silk Weaving"
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#D5CCC0] text-xs text-[#1E1B18]"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1">
                    URL Slug Path *
                  </label>
                  <div className="flex items-center">
                    <span className="px-2.5 py-2 bg-[#ECE6DD] text-xs font-mono text-[#7C736A] border border-r-0 border-[#D5CCC0]">
                      /pages/
                    </span>
                    <input
                      type="text"
                      value={pageForm.slug}
                      onChange={(e) =>
                        setPageForm({
                          ...pageForm,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                        })
                      }
                      placeholder="e.g. artisanal-silk-weaving"
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#D5CCC0] text-xs font-mono text-[#1E1B18]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1">
                  Subtitle (Optional)
                </label>
                <input
                  type="text"
                  value={pageForm.subtitle || ''}
                  onChange={(e) => setPageForm({ ...pageForm, subtitle: e.target.value })}
                  placeholder="e.g. Centuries-old handloom techniques crafted across Rajasthan."
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#D5CCC0] text-xs text-[#1E1B18]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1">
                  Hero Cover Image URL
                </label>
                <input
                  type="text"
                  value={pageForm.heroImage || ''}
                  onChange={(e) => setPageForm({ ...pageForm, heroImage: e.target.value })}
                  placeholder="/images/brand_story_editorial_1791119191742.jpg"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#D5CCC0] text-xs font-mono text-[#1E1B18]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1">
                  Page Content Narrative *
                </label>
                <textarea
                  rows={6}
                  value={pageForm.content}
                  onChange={(e) => setPageForm({ ...pageForm, content: e.target.value })}
                  placeholder="Write your story or guidelines here... (Separate paragraphs with blank lines)"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#D5CCC0] text-xs text-[#1E1B18] font-sans leading-relaxed"
                />
              </div>

              <div className="pt-2 border-t border-[#ECE6DD]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pageForm.published}
                    onChange={(e) => setPageForm({ ...pageForm, published: e.target.checked })}
                    className="w-4 h-4 accent-[#231F1D]"
                  />
                  <span className="text-xs font-medium text-[#1E1B18]">
                    Publish live immediately
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#ECE6DD]">
              <button
                type="button"
                onClick={() => setPageModalOpen(false)}
                className="px-4 py-2 bg-white border border-[#D5CCC0] text-xs text-[#7C736A] hover:bg-[#FAF8F5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePageModal}
                className="px-5 py-2 bg-[#231F1D] text-white text-xs font-semibold uppercase tracking-wider hover:bg-black cursor-pointer shadow-xs"
              >
                {editingPageId ? 'Save Changes' : 'Create Page'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
