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
  Filter,
} from 'lucide-react';
import { AdminLayout } from '@/src/components/AdminLayout';
import { useAuth } from '@/src/context/AuthContext';
import {
  CustomPageItem,
  NavLinkItem,
  FooterColumn,
  SiteSettings,
  DEFAULT_CUSTOM_PAGES,
  DEFAULT_NAV_LINKS,
  DEFAULT_FOOTER_COLUMNS,
  DEFAULT_SETTINGS,
} from '@/src/lib/site-settings';

type PageTab = 'all_pages' | 'nav_menu' | 'footer_columns' | 'blur_opacity';

const SYSTEM_CORE_PAGES = [
  {
    id: 'sys-home',
    title: 'Storefront Home',
    slug: '/',
    description: 'Hero carousel, Category showcase, New arrivals, Brand story & Curated edits.',
    studioTab: 'hero',
    inNavbarDefault: true,
  },
  {
    id: 'sys-shop',
    title: 'Shop All Collection',
    slug: '/shop',
    description: 'Category filters (Anarkali, 3-Piece, Co-ords, Chikankari), sorting & product grid.',
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
    description: 'Exchange guidelines, return concierge pickup, and guarantee.',
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
  {
    id: 'sys-privacy',
    title: 'Privacy Policy',
    slug: '/policy?topic=privacy',
    description: 'Patron privacy standards and customer data protections.',
    studioTab: 'nav_footer',
    inNavbarDefault: false,
  },
  {
    id: 'sys-terms',
    title: 'Terms & Conditions',
    slug: '/policy?topic=terms',
    description: 'Store policies, billing terms, and legal governance.',
    studioTab: 'nav_footer',
    inNavbarDefault: false,
  },
];

export default function AdminPagesPage() {
  const { adminToken } = useAuth();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<PageTab>('all_pages');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [pageTypeFilter, setPageTypeFilter] = useState<'all' | 'custom' | 'system'>('all');

  // Custom Page Modal state
  const [modalOpen, setModalOpen] = useState(false);
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

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getAuthHeaders = () => {
    const token = adminToken || (typeof window !== 'undefined' ? localStorage.getItem('aabha_admin_token') : null);
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Load Settings from API
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
      .catch((err) => {
        console.error('Failed to load settings:', err);
        showToast('Could not load current pages from server.', 'error');
      })
      .finally(() => setLoading(false));
  }, []);

  // Save Settings to API
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
        showToast('All page updates, navigation menus, and blur/opacity settings saved!');
      } else {
        showToast(data.error || 'Failed to save settings', 'error');
      }
    } catch {
      showToast('Network error saving settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Custom Pages CRUD
  const customPages = settings.customPages || DEFAULT_CUSTOM_PAGES;

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
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (page: CustomPageItem) => {
    setEditingPageId(page.id);
    setPageForm({ ...page });
    setModalOpen(true);
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
    setModalOpen(false);
    handleSaveSettings(newSettings);
  };

  const handleDeletePage = (pageId: string, pageTitle: string) => {
    if (!confirm(`Are you sure you want to delete the custom page "${pageTitle}"?`)) return;

    const updatedPages = customPages.filter((p) => p.id !== pageId);
    // Also remove from nav links if present
    const updatedNav = (settings.navLinks || DEFAULT_NAV_LINKS).filter(
      (nl) => !nl.href.includes(pageId) && !nl.href.includes(customPages.find((p) => p.id === pageId)?.slug || '')
    );
    const newSettings = { ...settings, customPages: updatedPages, navLinks: updatedNav };
    setSettings(newSettings);
    handleSaveSettings(newSettings);
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
    const updatedPages = [...customPages, clone];
    const newSettings = { ...settings, customPages: updatedPages };
    setSettings(newSettings);
    handleSaveSettings(newSettings);
    showToast(`Cloned page "${page.title}" as draft!`);
  };

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
      showToast(`Removed "${page.title}" from header navbar.`);
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

    // Look for column 0 (Atelier / Explore)
    const targetCol = columns[0] || columns[columns.length - 1];
    if (!targetCol) return;

    const existingIdx = targetCol.links.findIndex(
      (l) => l.href === targetHref || l.href === `/page/${page.slug}`
    );

    if (existingIdx >= 0) {
      targetCol.links.splice(existingIdx, 1);
      showToast(`Removed "${page.title}" from footer links.`);
    } else {
      targetCol.links.push({
        id: `fl-${Date.now()}`,
        label: page.title,
        href: targetHref,
        visible: true,
      });
      showToast(`Added "${page.title}" to footer under "${targetCol.title}"!`);
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
    const label = prompt('Enter Navigation Link Label (e.g., "Festive Edit"):');
    if (!label) return;
    const href = prompt('Enter Destination URL path (e.g., "/shop", "/about", or "/pages/my-story"):', '/shop');
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
      <AdminLayout title="Pages & Navigation Manager" subtitle="Loading page directory...">
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-xs uppercase tracking-widest text-[#7C736A]">
          <RefreshCw className="w-6 h-6 text-[#6E5043] animate-spin" />
          <span>Loading Storefront Pages...</span>
        </div>
      </AdminLayout>
    );
  }

  // Filtered lists
  const filteredCustomPages = customPages.filter((p) => {
    if (pageTypeFilter === 'system') return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
  });

  const filteredSystemPages = SYSTEM_CORE_PAGES.filter((p) => {
    if (pageTypeFilter === 'custom') return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
  });

  return (
    <AdminLayout
      title="Pages & Storefront Navigation"
      subtitle="Clean, complete control over all storefront pages, custom lookbooks, craft stories, header navbar links, and blur & opacity styling."
      extraAction={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#D4AF37] hover:bg-[#C29D26] text-[#1A1715] text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Page</span>
          </button>
          <button
            type="button"
            onClick={() => handleSaveSettings()}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1A1715] hover:bg-[#2C2723] text-white text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save All</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Toast Alert */}
        {toast && (
          <div
            className={`p-3.5 text-xs flex items-center justify-between border ${
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

        {/* Top Tab Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#ECE6DD] pb-2">
          {[
            { id: 'all_pages', label: `All Storefront Pages (${customPages.length + SYSTEM_CORE_PAGES.length})`, icon: FileText },
            { id: 'nav_menu', label: `Header Navbar Links (${navLinks.length})`, icon: Compass },
            { id: 'footer_columns', label: 'Footer Links & Columns', icon: Layers },
            { id: 'blur_opacity', label: 'Blur, Opacity & Atmosphere', icon: Palette },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as PageTab)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium tracking-wider uppercase transition-colors cursor-pointer border ${
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
        {/* TAB 1: ALL PAGES (CORE SYSTEM + CUSTOM CMS) */}
        {/* ========================================================================= */}
        {activeTab === 'all_pages' && (
          <div className="space-y-6">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-[#ECE6DD] p-4">
                <span className="text-[10px] uppercase tracking-widest text-[#7C736A] block">Total Storefront Pages</span>
                <span className="font-serif text-2xl text-[#1E1B18] mt-1 block">
                  {customPages.length + SYSTEM_CORE_PAGES.length}
                </span>
              </div>
              <div className="bg-white border border-[#ECE6DD] p-4">
                <span className="text-[10px] uppercase tracking-widest text-[#7C736A] block">Published Live</span>
                <span className="font-serif text-2xl text-[#2E7D32] mt-1 block">
                  {SYSTEM_CORE_PAGES.length + customPages.filter((p) => p.published).length}
                </span>
              </div>
              <div className="bg-white border border-[#ECE6DD] p-4">
                <span className="text-[10px] uppercase tracking-widest text-[#7C736A] block">Custom CMS Pages</span>
                <span className="font-serif text-2xl text-[#6E5043] mt-1 block">
                  {customPages.length}
                </span>
              </div>
              <div className="bg-white border border-[#ECE6DD] p-4">
                <span className="text-[10px] uppercase tracking-widest text-[#7C736A] block">In Top Navbar Menu</span>
                <span className="font-serif text-2xl text-[#1E1B18] mt-1 block">
                  {navLinks.filter((n) => n.visible !== false).length}
                </span>
              </div>
            </div>

            {/* Filters & Action Header */}
            <div className="bg-white border border-[#ECE6DD] p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7C736A]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by page title or slug..."
                    className="w-full pl-9 pr-3 py-1.5 bg-[#FAF8F5] border border-[#ECE6DD] text-xs text-[#1E1B18]"
                  />
                </div>
                <select
                  value={pageTypeFilter}
                  onChange={(e) => setPageTypeFilter(e.target.value as any)}
                  className="px-3 py-1.5 bg-[#FAF8F5] border border-[#ECE6DD] text-xs text-[#1E1B18]"
                >
                  <option value="all">All Pages</option>
                  <option value="custom">Custom Lookbooks &amp; Stories</option>
                  <option value="system">Core System Pages</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#231F1D] text-white text-xs font-semibold uppercase tracking-wider hover:bg-black transition-colors w-full sm:w-auto justify-center cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>+ Create Custom Page</span>
              </button>
            </div>

            {/* Custom Pages Section */}
            {pageTypeFilter !== 'system' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#6E5043]" />
                    <h3 className="font-serif text-lg text-[#1E1B18]">
                      Custom CMS Pages ({customPages.length})
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#7C736A]">
                    Pages dynamically rendered at <code className="bg-[#ECE6DD] px-1 py-0.5 font-mono">/pages/[slug]</code>
                  </span>
                </div>

                {filteredCustomPages.length === 0 ? (
                  <div className="bg-white border border-[#ECE6DD] p-8 text-center space-y-2">
                    <p className="text-xs text-[#7C736A]">No custom pages match the search criteria.</p>
                    <button
                      type="button"
                      onClick={handleOpenCreateModal}
                      className="inline-flex items-center gap-1 text-xs text-[#6E5043] font-medium underline cursor-pointer"
                    >
                      + Create your first custom story or lookbook page
                    </button>
                  </div>
                ) : (
                  <div className="bg-white border border-[#ECE6DD] divide-y divide-[#ECE6DD]">
                    {filteredCustomPages.map((page) => {
                      const inNavbar = isPageInNavbar(page.slug);
                      const inFooter = isPageInFooter(page.slug);

                      return (
                        <div key={page.id} className="p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 hover:bg-[#FAF8F5]/60 transition-colors">
                          {/* Page Info */}
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-serif text-base text-[#1E1B18] font-medium">
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
                              {inNavbar && (
                                <span className="px-2 py-0.5 text-[10px] font-mono bg-[#E3F2FD] text-[#1565C0] border border-[#BBDEFB]">
                                  In Navbar
                                </span>
                              )}
                              {inFooter && (
                                <span className="px-2 py-0.5 text-[10px] font-mono bg-[#F3E5F5] text-[#7B1FA2] border border-[#E1BEE7]">
                                  In Footer
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-[#7C736A]">
                              <span className="font-mono text-[#6E5043]">
                                /pages/{page.slug}
                              </span>
                              {page.subtitle && (
                                <>
                                  <span>·</span>
                                  <span className="truncate max-w-md">{page.subtitle}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Actions Toolbar */}
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {/* Toggle Publish */}
                            <button
                              type="button"
                              onClick={() => handleTogglePublish(page.id)}
                              className="px-2.5 py-1.5 bg-[#FAF8F5] border border-[#ECE6DD] hover:bg-[#ECE6DD] text-xs text-[#1E1B18] flex items-center gap-1 cursor-pointer"
                              title={page.published ? 'Unpublish to draft' : 'Publish page'}
                            >
                              {page.published ? <EyeOff className="w-3.5 h-3.5 text-[#E65100]" /> : <Eye className="w-3.5 h-3.5 text-[#2E7D32]" />}
                              <span>{page.published ? 'Unpublish' : 'Publish'}</span>
                            </button>

                            {/* 1-Click Navbar Link */}
                            <button
                              type="button"
                              onClick={() => handleToggleNavbarLink(page)}
                              className={`px-2.5 py-1.5 border text-xs flex items-center gap-1 cursor-pointer ${
                                inNavbar
                                  ? 'bg-[#E3F2FD] border-[#90CAF9] text-[#1565C0]'
                                  : 'bg-[#FAF8F5] border-[#ECE6DD] text-[#5C544D] hover:bg-[#ECE6DD]'
                              }`}
                              title={inNavbar ? 'Remove from top header navigation' : 'Add to top header navigation'}
                            >
                              <Compass className="w-3.5 h-3.5" />
                              <span>{inNavbar ? 'In Navbar ✓' : '+ Navbar'}</span>
                            </button>

                            {/* 1-Click Footer Link */}
                            <button
                              type="button"
                              onClick={() => handleToggleFooterLink(page)}
                              className={`px-2.5 py-1.5 border text-xs flex items-center gap-1 cursor-pointer ${
                                inFooter
                                  ? 'bg-[#F3E5F5] border-[#CE93D8] text-[#7B1FA2]'
                                  : 'bg-[#FAF8F5] border-[#ECE6DD] text-[#5C544D] hover:bg-[#ECE6DD]'
                              }`}
                              title={inFooter ? 'Remove from footer column' : 'Add to footer'}
                            >
                              <Layers className="w-3.5 h-3.5" />
                              <span>{inFooter ? 'In Footer ✓' : '+ Footer'}</span>
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(page)}
                              className="px-2.5 py-1.5 bg-[#FAF8F5] border border-[#ECE6DD] hover:bg-[#ECE6DD] text-xs text-[#1E1B18] flex items-center gap-1 cursor-pointer"
                              title="Edit content and details"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-[#6E5043]" />
                              <span>Edit</span>
                            </button>

                            {/* Clone */}
                            <button
                              type="button"
                              onClick={() => handleClonePage(page)}
                              className="p-1.5 bg-[#FAF8F5] border border-[#ECE6DD] hover:bg-[#ECE6DD] text-[#7C736A] cursor-pointer"
                              title="Clone as draft"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* View Live */}
                            <a
                              href={`/pages/${page.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-[#FAF8F5] border border-[#ECE6DD] hover:bg-[#ECE6DD] text-[#7C736A] hover:text-[#1E1B18] cursor-pointer"
                              title="Preview live page in new tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeletePage(page.id, page.title)}
                              className="p-1.5 bg-[#FFF5F5] border border-[#FFCDD2] hover:bg-[#FFEBEE] text-[#C62828] cursor-pointer"
                              title="Delete page"
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
            )}

            {/* Core System Pages Section */}
            {pageTypeFilter !== 'custom' && (
              <div className="space-y-3 pt-4 border-t border-[#ECE6DD]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#1E1B18]" />
                    <h3 className="font-serif text-lg text-[#1E1B18]">
                      Core System Storefront Pages ({SYSTEM_CORE_PAGES.length})
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#7C736A]">
                    Built-in routes with customizable copy, banners, and layout blocks
                  </span>
                </div>

                <div className="bg-white border border-[#ECE6DD] divide-y divide-[#ECE6DD]">
                  {filteredSystemPages.map((sysPage) => (
                    <div
                      key={sysPage.id}
                      className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-[#FAF8F5]/60 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-sm font-medium text-[#1E1B18]">
                            {sysPage.title}
                          </span>
                          <span className="px-2 py-0.2 text-[9px] font-mono uppercase tracking-wider bg-[#F3EFEA] border border-[#ECE6DD] text-[#6E5043]">
                            Core System
                          </span>
                        </div>
                        <p className="text-xs text-[#7C736A] leading-relaxed">
                          {sysPage.description}
                        </p>
                        <code className="text-[11px] text-[#6E5043] font-mono block">
                          {sysPage.slug}
                        </code>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/admin/branding?tab=${sysPage.studioTab}`}
                          className="px-3 py-1.5 bg-[#FAF8F5] border border-[#ECE6DD] hover:bg-[#ECE6DD] text-xs text-[#1E1B18] flex items-center gap-1 cursor-pointer"
                        >
                          <Sliders className="w-3.5 h-3.5 text-[#6E5043]" />
                          <span>Edit in Studio</span>
                        </Link>
                        <a
                          href={sysPage.slug}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-[#FAF8F5] border border-[#ECE6DD] hover:bg-[#ECE6DD] text-[#7C736A] hover:text-[#1E1B18] cursor-pointer"
                          title="View live page in new tab"
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
        {/* TAB 2: HEADER NAVBAR NAVIGATION MENU */}
        {/* ========================================================================= */}
        {activeTab === 'nav_menu' && (
          <div className="bg-white border border-[#ECE6DD] p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ECE6DD] pb-4">
              <div>
                <h3 className="font-serif text-xl text-[#1E1B18]">
                  Header Navigation Menu
                </h3>
                <p className="text-xs text-[#7C736A] mt-0.5">
                  Reorder, show, hide, or add custom links to the main top storefront navbar.
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
                  className="p-3.5 bg-[#FAF8F5] border border-[#ECE6DD] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-white border border-[#ECE6DD] text-[11px] font-mono text-[#7C736A] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-sm text-[#1E1B18] font-medium">
                          {link.label}
                        </span>
                        {link.visible === false && (
                          <span className="text-[10px] font-mono text-[#E65100] bg-[#FFF3E0] px-1.5 py-0.2 border border-[#FFE0B2]">
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
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5 text-[#1E1B18]" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === navLinks.length - 1}
                      onClick={() => handleMoveNavLink(idx, 'down')}
                      className="p-1.5 bg-white border border-[#ECE6DD] hover:bg-[#FAF8F5] disabled:opacity-30 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5 text-[#1E1B18]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleNavVisibility(idx)}
                      className="p-1.5 bg-white border border-[#ECE6DD] hover:bg-[#FAF8F5] cursor-pointer"
                      title={link.visible === false ? 'Make visible' : 'Hide from navbar'}
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
                      title="Delete link"
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
        {/* TAB 3: FOOTER COLUMNS & LINKS */}
        {/* ========================================================================= */}
        {activeTab === 'footer_columns' && (
          <div className="bg-white border border-[#ECE6DD] p-6 space-y-6">
            <div>
              <h3 className="font-serif text-xl text-[#1E1B18]">
                Storefront Footer Columns &amp; Links
              </h3>
              <p className="text-xs text-[#7C736A] mt-0.5">
                Organize navigation links, boutique policies, and brand narratives shown in the footer.
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

            <div className="pt-4 border-t border-[#ECE6DD]">
              <Link
                href="/admin/branding?tab=nav_footer"
                className="inline-flex items-center gap-1.5 text-xs text-[#6E5043] font-medium underline"
              >
                <span>→ Open Full Advanced Footer Builder in Studio</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: BLUR, OPACITY & ATMOSPHERE CONTROLS */}
        {/* ========================================================================= */}
        {activeTab === 'blur_opacity' && (
          <div className="space-y-6">
            <div className="bg-[#F3EFEA] border border-[#ECE6DD] p-6 space-y-2">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#6E5043]" />
                <h3 className="font-serif text-2xl text-[#1E1B18]">
                  Atmospheric Blur, Opacity &amp; Glassmorphism Studio
                </h3>
              </div>
              <p className="text-xs text-[#5C544D] leading-relaxed max-w-3xl">
                Fine-tune image background blurs, darkening overlays, frosted glass headers, and modal backdrop dimming to ensure high contrast, readability, and haute atelier luxury aesthetics.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Hero Overlay Opacity & Banner Blur */}
              <div className="bg-white border border-[#ECE6DD] p-6 space-y-5">
                <div className="border-b border-[#ECE6DD] pb-3">
                  <h4 className="font-serif text-lg text-[#1E1B18]">
                    1. Hero Carousel Blur &amp; Opacity
                  </h4>
                  <p className="text-xs text-[#7C736A]">
                    Controls image scrim darkness and background depth for editorial typography.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Overlay Opacity Slider */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-[#1E1B18] mb-1.5">
                      <span>Hero Darkening Overlay Opacity</span>
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
                    <div className="flex justify-between text-[10px] text-[#7C736A] font-mono mt-1">
                      <span>0% (Clear / Transparent)</span>
                      <span>50% (Balanced)</span>
                      <span>90% (Deep Contrast)</span>
                    </div>
                  </div>

                  {/* Banner Image Blur */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-[#1E1B18] mb-1.5">
                      <span>Hero Image Background Blur</span>
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
                    <div className="flex justify-between text-[10px] text-[#7C736A] font-mono mt-1">
                      <span>0px (Crisp Sharp)</span>
                      <span>4px (Subtle Depth)</span>
                      <span>20px (Dreamy Soft)</span>
                    </div>
                  </div>

                  {/* Backdrop Glass Blur */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-[#1E1B18] mb-1.5">
                      <span>Hero Overlay Frosted Backdrop Blur</span>
                      <span className="font-mono text-[#6E5043]">{settings.heroBackdropBlur ?? 0}px</span>
                    </div>
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

              {/* 2. Top Header Glassmorphism & Opacity */}
              <div className="bg-white border border-[#ECE6DD] p-6 space-y-5">
                <div className="border-b border-[#ECE6DD] pb-3">
                  <h4 className="font-serif text-lg text-[#1E1B18]">
                    2. Top Header Glassmorphism &amp; Opacity
                  </h4>
                  <p className="text-xs text-[#7C736A]">
                    Controls how frosted or solid the sticky top navigation bar looks while patrons scroll.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Header Opacity */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-[#1E1B18] mb-1.5">
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
                    <div className="flex justify-between text-[10px] text-[#7C736A] font-mono mt-1">
                      <span>50% (Semi-transparent)</span>
                      <span>85% (Glass Frost)</span>
                      <span>100% (Solid Ivory)</span>
                    </div>
                  </div>

                  {/* Header Blur */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-[#1E1B18] mb-1.5">
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
                    <div className="flex justify-between text-[10px] text-[#7C736A] font-mono mt-1">
                      <span>0px (None)</span>
                      <span>8px (Atelier Subtle)</span>
                      <span>24px (Heavy Frosted)</span>
                    </div>
                  </div>

                  {/* Glass Blur Intensity Preset */}
                  <div>
                    <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1.5">
                      Storefront Glassmorphism Profile
                    </label>
                    <select
                      value={settings.glassBlurIntensity || 'subtle'}
                      onChange={(e) => setSettings({ ...settings, glassBlurIntensity: e.target.value as any })}
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#D5CCC0] text-xs text-[#1E1B18]"
                    >
                      <option value="none">Crisp Solid (No Blur)</option>
                      <option value="subtle">Subtle Atelier (Optimized for Mobile)</option>
                      <option value="rich">Rich Frosted Glass (High-End Editorial)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Live Simulation Preview Card */}
              <div className="bg-white border border-[#ECE6DD] p-6 space-y-4 md:col-span-2">
                <h4 className="font-serif text-lg text-[#1E1B18]">
                  Live Blur &amp; Opacity Preview Simulation
                </h4>
                <div
                  className="relative h-64 rounded-xs overflow-hidden flex items-center justify-center p-6 text-center"
                  style={{
                    backgroundImage: 'url(/images/brand_story_editorial_1791119191742.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {/* Simulated Image Filter Layer */}
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: 'url(/images/brand_story_editorial_1791119191742.jpg)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: (settings.heroBannerBlur ?? 0) > 0 ? `blur(${settings.heroBannerBlur}px)` : undefined,
                      transform: (settings.heroBannerBlur ?? 0) > 0 ? 'scale(1.05)' : undefined,
                    }}
                  />

                  {/* Simulated Scrim Darkening Overlay Layer */}
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundColor: `rgba(0, 0, 0, ${(settings.heroOverlayOpacity ?? 25) / 100})`,
                      backdropFilter: (settings.heroBackdropBlur ?? 0) > 0 ? `blur(${settings.heroBackdropBlur}px)` : undefined,
                      WebkitBackdropFilter: (settings.heroBackdropBlur ?? 0) > 0 ? `blur(${settings.heroBackdropBlur}px)` : undefined,
                    }}
                  />

                  {/* Simulated Content Box */}
                  <div
                    className="relative z-10 max-w-md p-6 border text-[#FAF8F5] space-y-2"
                    style={{
                      backgroundColor: `rgba(26, 23, 21, 0.45)`,
                      backdropFilter: `blur(${settings.headerBlur ?? 8}px)`,
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]">
                      AABHA ATELIER SIMULATION
                    </span>
                    <h5 className="font-serif text-2xl font-light">
                      Fluid Silhouettes, Handcrafted Luxury
                    </h5>
                    <p className="text-xs text-[#EDE7DF] font-light">
                      Overlay Opacity: {settings.heroOverlayOpacity ?? 25}% · Image Blur: {settings.heroBannerBlur ?? 0}px · Glass Blur: {settings.headerBlur ?? 8}px
                    </p>
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
                    <span>Save Blur &amp; Opacity Configuration</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* CREATE / EDIT CUSTOM PAGE MODAL */}
      {/* ========================================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-white border border-[#2C2723] shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-[#ECE6DD] pb-3">
              <div>
                <h3 className="font-serif text-xl text-[#1E1B18]">
                  {editingPageId ? 'Edit Custom Page' : 'Create New Custom Page'}
                </h3>
                <span className="text-xs text-[#7C736A]">
                  Will be accessible on your storefront at /pages/{pageForm.slug || 'your-slug'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-[#7C736A] hover:text-[#1E1B18] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title & Slug */}
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

              {/* Subtitle */}
              <div>
                <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1">
                  Subtitle / Tagline (Optional)
                </label>
                <input
                  type="text"
                  value={pageForm.subtitle || ''}
                  onChange={(e) => setPageForm({ ...pageForm, subtitle: e.target.value })}
                  placeholder="e.g. The centuries-old handloom techniques that give every AABHA garment its soul."
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#D5CCC0] text-xs text-[#1E1B18]"
                />
              </div>

              {/* Hero Banner Image */}
              <div>
                <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1">
                  Hero Cover Image URL
                </label>
                <input
                  type="text"
                  value={pageForm.heroImage || ''}
                  onChange={(e) => setPageForm({ ...pageForm, heroImage: e.target.value })}
                  placeholder="e.g. /images/brand_story_editorial_1791119191742.jpg"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#D5CCC0] text-xs font-mono text-[#1E1B18]"
                />
              </div>

              {/* Page Content Body */}
              <div>
                <label className="block text-xs uppercase font-semibold text-[#7C736A] mb-1">
                  Page Content / Story Narrative *
                </label>
                <textarea
                  rows={8}
                  value={pageForm.content}
                  onChange={(e) => setPageForm({ ...pageForm, content: e.target.value })}
                  placeholder="Write your editorial story, styling guidelines, or artisan lookbook here... (Separate paragraphs with blank lines)"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#D5CCC0] text-xs text-[#1E1B18] font-sans leading-relaxed"
                />
              </div>

              {/* Status & Options */}
              <div className="pt-2 border-t border-[#ECE6DD] flex items-center justify-between">
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
                onClick={() => setModalOpen(false)}
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
