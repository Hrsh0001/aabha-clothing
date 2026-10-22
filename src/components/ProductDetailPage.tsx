'use client';
import React, { useState } from 'react';
import {
  MessageCircle,
  ArrowLeft,
  Heart,
  Ruler,
  Check,
  ChevronDown,
  Star,
  MapPin,
  X,
} from 'lucide-react';
import {
  Product,
  ProductCategory,
  GarmentSize,
  ProductReview,
  SIZE_CHART,
  formatINR,
} from '../data/products';
import { EditorialImage } from './EditorialImage';
import { ProductCard } from './ProductCard';

interface ProductDetailPageProps {
  product: Product;
  allProducts: Product[];
  wishlistIds: string[];
  onBackToShop: () => void;
  onSelectCategory: (category: ProductCategory) => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, size: GarmentSize, quantity: number, color?: string) => void;
  onBuyNow: (product: Product, size: GarmentSize, quantity: number, color?: string) => void;
  onToggleWishlist: (productId: string, e: React.MouseEvent) => void;
  onQuickAdd: (product: Product, size: GarmentSize, e: React.MouseEvent) => void;
  onAddReview: (productId: string, review: Omit<ProductReview, 'id' | 'date'>) => void;
  siteSettings?: any;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  allProducts,
  wishlistIds,
  onBackToShop,
  onSelectCategory,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
  onQuickAdd,
  onAddReview,
  siteSettings,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<GarmentSize>('S');
  const [selectedColor, setSelectedColor] = useState<string>(
    product.colors && product.colors.length > 0 ? product.colors[0].name : product.colorName
  );
  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [sizeUnit, setSizeUnit] = useState<'in' | 'cm'>('in');
  const [openAccordion, setOpenAccordion] = useState<string>('description');

  // PIN code delivery checker state
  const [pinCode, setPinCode] = useState('');
  const [pinStatus, setPinStatus] = useState<string | null>(null);

  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewSize, setReviewSize] = useState<GarmentSize>('M');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');

  React.useEffect(() => {
    setActiveImageIndex(0);
    setQuantity(1);
    setPinStatus(null);
    if (product.colors && product.colors.length > 0) {
      setSelectedColor(product.colors[0].name);
    } else {
      setSelectedColor(product.colorName);
    }
    if (product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
      if (!product.sizes.includes(selectedSize)) {
        setSelectedSize(product.sizes[0] as GarmentSize);
      }
    }
  }, [product.id, product.sizes, product.colors, product.colorName]);

  React.useEffect(() => {
    if (!sizeGuideOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSizeGuideOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sizeGuideOpen]);

  const isWishlisted = wishlistIds.includes(product.id);
  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  const normalizedGallery = React.useMemo(() => {
    let items: { url: string; label: string; focalClass: string }[] = [];
    if (!product.gallery || !Array.isArray(product.gallery) || product.gallery.length === 0) {
      items = [
        {
          url: product.primaryImage || '',
          label: 'Full Studio View',
          focalClass: 'object-center',
        },
      ];
    } else {
      items = product.gallery.map((item: any, idx: number) => {
        if (typeof item === 'string') {
          return {
            url: item,
            label: `Studio View ${idx + 1}`,
            focalClass: 'object-center',
          };
        }
        return {
          url: item.url || product.primaryImage || '',
          label: item.label || `Studio View ${idx + 1}`,
          focalClass: item.focalClass || 'object-center',
        };
      });
    }

    // Ensure any color variant images exist in the gallery so clicking switches cleanly
    if (product.colors && Array.isArray(product.colors)) {
      const existingUrls = new Set(items.map((i) => i.url));
      product.colors.forEach((c) => {
        if (c.imageUrl && !existingUrls.has(c.imageUrl)) {
          items.push({
            url: c.imageUrl,
            label: `${c.name} Shade`,
            focalClass: 'object-center',
          });
          existingUrls.add(c.imageUrl);
        }
      });
    }

    return items;
  }, [product.gallery, product.primaryImage, product.colors]);

  const handleColorClick = (color: { name: string; hex: string; imageUrl?: string }) => {
    setSelectedColor(color.name);
    if (color.imageUrl) {
      const idx = normalizedGallery.findIndex((g) => g.url === color.imageUrl);
      if (idx !== -1) {
        setActiveImageIndex(idx);
      }
    }
  };

  const currentGalleryItem = normalizedGallery[activeImageIndex] || normalizedGallery[0];
  const availableSizes =
    product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0
      ? product.sizes
      : (['XS', 'S', 'M', 'L', 'XL', 'XXL'] as GarmentSize[]);
  const reviews = Array.isArray(product.reviews) ? product.reviews : [];
  const highlights =
    Array.isArray(product.highlights) && product.highlights.length > 0
      ? product.highlights
      : ['16-panel hand-joined kalidar construction', 'Concealed side-seam pockets'];
  const fabricAndCare =
    Array.isArray(product.fabricAndCare) && product.fabricAndCare.length > 0
      ? product.fabricAndCare
      : ['Dry clean only', 'Store in breathable cotton muslin bag'];
  const sizeAndFit =
    Array.isArray(product.sizeAndFit) && product.sizeAndFit.length > 0
      ? product.sizeAndFit
      : ['Relaxed tailored silhouette', 'True to size standard Indian fit'];

  const relatedProducts = allProducts
    .filter((p) => p.id !== product.id && (p.category === product.category || p.isCurated))
    .slice(0, 4);

  const handleAddClick = () => {
    if (!product.inStock) return;
    onAddToCart(product, selectedSize, quantity, selectedColor);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1600);
  };

  const handleCheckPin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = pinCode.trim();
    if (/^[1-9][0-9]{5}$/.test(cleaned)) {
      setPinStatus(
        `Complimentary insured delivery available to PIN ${cleaned} · Estimated arrival in 3–4 business days.`
      );
    } else {
      setPinStatus('Please enter a valid 6-digit Indian postal PIN code.');
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewAuthor.trim() || !reviewComment.trim()) return;
    onAddReview(product.id, {
      author: reviewAuthor.trim(),
      sizePurchased: reviewSize,
      rating: reviewRating,
      title: reviewTitle.trim() || 'Refined craftsmanship',
      comment: reviewComment.trim(),
    });
    setReviewAuthor('');
    setReviewTitle('');
    setReviewComment('');
    setShowReviewForm(false);
  };

  const toggleSection = (key: string) => {
    setOpenAccordion((prev) => (prev === key ? '' : key));
  };

  return (
    <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-6 sm:py-12 lg:py-16">
      {/* Minimal Breadcrumb & Back Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-8 sm:pb-10">
        <div className="flex items-center gap-2.5 text-xs text-[#7C736A]">
          <button
            type="button"
            onClick={onBackToShop}
            className="inline-flex items-center gap-1.5 text-[#1E1B18] hover:text-[#6E5043] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[1.4]" />
            <span>Collection</span>
          </button>
          <span aria-hidden="true">/</span>
          <button
            type="button"
            onClick={() => onSelectCategory(product.category)}
            className="hover:text-[#1E1B18] transition-colors cursor-pointer"
          >
            {product.category}
          </button>
          <span aria-hidden="true">/</span>
          <span className="text-[#1E1B18] truncate max-w-[190px] sm:max-w-none">
            {product.name}
          </span>
        </div>

        <span className="text-[11px] tracking-[0.14em] uppercase text-[#7C736A]">
          AABHA · {product.sku}
        </span>
      </div>

      {/* Main Contiguous Purchase Module */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
        {/* Left Column: Sticky Editorial Image Gallery */}
        <div className="lg:col-span-7 lg:sticky lg:top-24">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 sm:gap-4">
            {/* Thumbnails Strip */}
            <div className="order-2 sm:order-1 sm:col-span-2 flex sm:flex-col gap-3 overflow-x-auto no-scrollbar sm:overflow-visible">
              {normalizedGallery.map((item, idx) => {
                const isSelected = idx === activeImageIndex;
                return (
                  <button
                    key={`${item.label}-${idx}`}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative aspect-[3/4] w-18 sm:w-full shrink-0 overflow-hidden bg-[#F3EFEA] transition-opacity cursor-pointer ${
                      isSelected
                        ? 'opacity-100 ring-1 ring-[#1E1B18]'
                        : 'opacity-55 hover:opacity-90'
                    }`}
                  >
                    <EditorialImage
                      src={item.url}
                      alt={`${product.name} — ${item.label}`}
                      priority={idx < 4}
                      containerClassName="w-full h-full"
                      className={`w-full h-full object-cover ${item.focalClass || 'object-center'}`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Large Primary Gallery Frame */}
            <div className="order-1 sm:order-2 sm:col-span-10">
              <div
                key={`${product.id}-${activeImageIndex}`}
                className="relative aspect-[3/4] w-full bg-[#F3EFEA] overflow-hidden animate-page-fade"
              >
                <EditorialImage
                  src={currentGalleryItem.url}
                  alt={`${product.name} — ${currentGalleryItem.label}`}
                  fallbackLabel={product.name}
                  priority={true}
                  containerClassName="w-full h-full"
                  className={`w-full h-full object-cover transition-transform duration-500 ${
                    currentGalleryItem.focalClass || 'object-center'
                  }`}
                />
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#7C736A]">
                <span>{currentGalleryItem.label}</span>
                <span>{product.fabric}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Contiguous Purchase & Specification Module */}
        <div className="lg:col-span-5 space-y-8">
          {/* Unboxed Metadata Line */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs tracking-wide text-[#7C736A]">
              <span>{product.category}</span>
              <span aria-hidden="true">·</span>
              <span>{product.colorName}</span>
              <span aria-hidden="true">·</span>
              {product.inStock ? (
                <span className="text-[#6E5043]">Ready to Ship</span>
              ) : (
                <span className="text-[#C62828] font-medium">Out of Stock</span>
              )}
            </div>

            {/* Product Name */}
            <h1 className="font-serif text-3xl sm:text-[40px] text-[#1E1B18] font-normal leading-[1.15]">
              {product.name}
            </h1>

            {/* Price & Discount Row */}
            <div className="pt-2 flex flex-wrap items-baseline gap-3 tabular-nums">
              <span className="text-xl sm:text-2xl font-normal text-[#1E1B18]">
                {formatINR(product.price)}
              </span>
              {product.originalPrice && (
                <>
                  <span className="text-sm text-[#948A80] line-through">
                    {formatINR(product.originalPrice)}
                  </span>
                  {discountPercent && (
                    <span className="text-xs text-[#6E5043]">
                      · {discountPercent}% off
                    </span>
                  )}
                </>
              )}
            </div>
            <p className="text-xs text-[#7C736A] font-light">
              Inclusive of all taxes · Complimentary insured express delivery
            </p>
          </div>

          {/* Shade & Textile Provenance / Interactive Color Swatches */}
          <div className="py-5 border-y border-[#ECE6DD] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] tracking-[0.14em] uppercase text-[#7C736A] block mb-0.5">
                  Color / Shade
                </span>
                <span className="text-sm font-medium text-[#1E1B18]">
                  {selectedColor} <span className="font-light text-[#7C736A]">· {product.fabric}</span>
                </span>
              </div>
              {(!product.colors || product.colors.length === 0) && (
                <span
                  className="w-7 h-7 rounded-full border border-[#1E1B18]/15 shrink-0 shadow-xs"
                  style={{ backgroundColor: product.colorHex }}
                  title={product.colorName}
                />
              )}
            </div>

            {product.colors && product.colors.length > 0 && (
              <div className="flex items-center gap-3 pt-1">
                {product.colors.map((c) => {
                  const isSelected = selectedColor === c.name;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => handleColorClick(c)}
                      title={`${c.name}${isSelected ? ' (Selected)' : ''}`}
                      className={`relative p-0.5 rounded-full transition-all cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-[#1E1B18] ring-offset-2 ring-offset-[#FAF8F5]'
                          : 'hover:opacity-80'
                      }`}
                    >
                      <span
                        className="w-7 h-7 rounded-full border border-[#1E1B18]/20 block shadow-xs"
                        style={{ backgroundColor: c.hex }}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Size Selector & Size Guide Trigger */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs tracking-[0.12em] uppercase text-[#1E1B18]">
                Size: <span className="text-[#7C736A] font-normal">{selectedSize}</span>
              </span>
              <button
                type="button"
                onClick={() => setSizeGuideOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs text-[#6E5043] hover:text-[#1E1B18] border-b border-[#6E5043]/40 pb-0.5 cursor-pointer"
              >
                <Ruler className="w-3.5 h-3.5 stroke-[1.35]" />
                <span>Size Guide</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {availableSizes.map((size) => {
                const active = selectedSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-[52px] px-3.5 py-2.5 text-xs font-normal border transition-colors whitespace-nowrap cursor-pointer text-center ${
                      active
                        ? 'bg-[#231F1D] text-[#FAF8F5] border-[#231F1D]'
                        : 'bg-transparent text-[#1E1B18] border-[#E0D8CE] hover:border-[#1E1B18]'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Refined Minimal Purchase Controls */}
          <div className="space-y-3 pt-1">
            <div className="flex items-stretch gap-2.5">
              {/* Quantity Stepper */}
              <div className="flex items-center border border-[#E0D8CE] bg-transparent">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="px-3.5 py-3.5 text-sm text-[#1E1B18] hover:bg-[#F3EFEA] transition-colors cursor-pointer"
                >
                  −
                </button>
                <span className="px-2.5 py-3.5 text-xs font-mono tabular-nums text-[#1E1B18] min-w-[2rem] text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  aria-label="Increase quantity"
                  className="px-3.5 py-3.5 text-sm text-[#1E1B18] hover:bg-[#F3EFEA] transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
                type="button"
                disabled={!product.inStock}
                onClick={handleAddClick}
                className="flex-1 flex items-center justify-center gap-2 py-4 px-6 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium tracking-[0.18em] uppercase hover:bg-[#14110E] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {!product.inStock ? (
                  <span>Sold Out</span>
                ) : addedFeedback ? (
                  <>
                    <Check className="w-4 h-4 stroke-[1.5]" />
                    <span>Added to Bag</span>
                  </>
                ) : (
                  <span>Add to Cart</span>
                )}
              </button>

              {/* Minimal Wishlist Button */}
              <button
                type="button"
                onClick={(e) => onToggleWishlist(product.id, e)}
                aria-label="Save to Wishlist"
                className={`px-4 border transition-colors flex items-center justify-center cursor-pointer ${
                  isWishlisted
                    ? 'border-[#6E5043] bg-[#F3EFEA] text-[#6E5043]'
                    : 'border-[#E0D8CE] bg-transparent text-[#1E1B18] hover:border-[#1E1B18]'
                }`}
              >
                <Heart
                  className={`w-[18px] h-[18px] stroke-[1.35] ${
                    isWishlisted ? 'fill-[#6E5043]' : ''
                  }`}
                />
              </button>
            </div>

            {/* Buy Now Direct Checkout CTA */}
            <button
              type="button"
              disabled={!product.inStock}
              onClick={() => {
                if (!product.inStock) return;
                onBuyNow(product, selectedSize, quantity, selectedColor);
              }}
              className="w-full py-4 px-6 border border-[#231F1D] bg-transparent text-[#1E1B18] text-xs font-medium tracking-[0.18em] uppercase hover:bg-[#231F1D] hover:text-[#FAF8F5] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {product.inStock ? 'Buy Now' : 'Currently Unavailable'}
            </button>

            {/* Direct WhatsApp Stylist Inquiry */}
            <a
              href={`https://wa.me/${(siteSettings?.whatsappNumber || '919876543210').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                `Namaste AABHA, I have a styling and sizing inquiry about "${product.name}" (SKU: ${product.sku}, Size: ${selectedSize}, Price: ₹${product.price.toLocaleString('en-IN')}). Could you assist me?`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3.5 px-4 border border-[#E0D8CE] bg-[#FAF8F5] text-[#2E7D32] hover:bg-[#E8F5E9] hover:border-[#C8E6C9] text-xs font-medium tracking-[0.14em] uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              <span>Inquire With Stylist on WhatsApp</span>
            </a>
          </div>

          {/* Subtle PIN Code Delivery Estimator */}
          {siteSettings?.showPinCodeChecker !== false && (
            <div className="p-4 bg-[#F3EFEA] space-y-2">
              <form onSubmit={handleCheckPin} className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-[#6E5043] stroke-[1.35] shrink-0" />
                <input
                  type="text"
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="Enter 6-digit PIN code for delivery estimate"
                  className="flex-1 bg-transparent border-b border-[#D5CCC0] py-1.5 text-xs text-[#1E1B18] placeholder:text-[#948A80] focus:outline-none focus:border-[#1E1B18]"
                />
                <button
                  type="submit"
                  className="px-3 py-1 text-xs tracking-[0.12em] uppercase text-[#1E1B18] hover:text-[#6E5043] transition-colors whitespace-nowrap cursor-pointer"
                >
                  Check
                </button>
              </form>
              {pinStatus && <p className="text-xs text-[#5C544D] font-light">{pinStatus}</p>}
            </div>
          )}

          {/* 5 Structured Specification Accordions */}
          <div className="border-t border-[#ECE6DD] divide-y divide-[#ECE6DD]">
            {/* 1. Description */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection('description')}
                className="w-full py-4.5 flex items-center justify-between text-left text-xs tracking-[0.14em] uppercase text-[#1E1B18] cursor-pointer"
              >
                <span>Description</span>
                <ChevronDown
                  className={`w-4 h-4 stroke-[1.35] transition-transform ${
                    openAccordion === 'description' ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openAccordion === 'description' && (
                <div className="pb-6 space-y-3 text-sm text-[#4A433D] font-light leading-[1.75]">
                  <p>{product.description}</p>
                  <ul className="space-y-1.5 pt-1">
                    {highlights.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm">
                        <span className="text-[#6E5043]">·</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 2. Fabric & Care */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection('fabric')}
                className="w-full py-4.5 flex items-center justify-between text-left text-xs tracking-[0.14em] uppercase text-[#1E1B18] cursor-pointer"
              >
                <span>Fabric & Care</span>
                <ChevronDown
                  className={`w-4 h-4 stroke-[1.35] transition-transform ${
                    openAccordion === 'fabric' ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openAccordion === 'fabric' && (
                <ul className="pb-6 space-y-2 text-xs sm:text-sm text-[#4A433D] font-light leading-relaxed">
                  {fabricAndCare.map((line, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="text-[#6E5043]">·</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 3. Size & Fit */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection('fit')}
                className="w-full py-4.5 flex items-center justify-between text-left text-xs tracking-[0.14em] uppercase text-[#1E1B18] cursor-pointer"
              >
                <span>Size & Fit</span>
                <ChevronDown
                  className={`w-4 h-4 stroke-[1.35] transition-transform ${
                    openAccordion === 'fit' ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openAccordion === 'fit' && (
                <ul className="pb-6 space-y-2 text-xs sm:text-sm text-[#4A433D] font-light leading-relaxed">
                  {sizeAndFit.map((line, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="text-[#6E5043]">·</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 4. Delivery */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection('delivery')}
                className="w-full py-4.5 flex items-center justify-between text-left text-xs tracking-[0.14em] uppercase text-[#1E1B18] cursor-pointer"
              >
                <span>Delivery</span>
                <ChevronDown
                  className={`w-4 h-4 stroke-[1.35] transition-transform ${
                    openAccordion === 'delivery' ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openAccordion === 'delivery' && (
                <p className="pb-6 text-xs sm:text-sm text-[#4A433D] font-light leading-relaxed">
                  {product.deliveryInfo || 'Complimentary insured express shipping across India. Dispatched within 24–48 hours.'}
                </p>
              )}
            </div>

            {/* 5. Returns & Exchange */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection('returns')}
                className="w-full py-4.5 flex items-center justify-between text-left text-xs tracking-[0.14em] uppercase text-[#1E1B18] cursor-pointer"
              >
                <span>Returns & Exchange</span>
                <ChevronDown
                  className={`w-4 h-4 stroke-[1.35] transition-transform ${
                    openAccordion === 'returns' ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openAccordion === 'returns' && (
                <p className="pb-6 text-xs sm:text-sm text-[#4A433D] font-light leading-relaxed">
                  {product.returnsInfo || '14-day doorstep size exchange and complimentary returns.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      {siteSettings?.showProductReviews !== false && (
      <section className="mt-24 sm:mt-32 pt-16 sm:pt-20 border-t border-[#ECE6DD]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 sm:mb-12 gap-4">
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase text-[#7C736A] mb-2">
              Client Impressions
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#1E1B18] font-normal">
              Reviews ({reviews.length})
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setShowReviewForm((prev) => !prev)}
            className="px-6 py-3 border border-[#1E1B18] text-xs tracking-[0.14em] uppercase text-[#1E1B18] hover:bg-[#231F1D] hover:text-[#FAF8F5] transition-colors whitespace-nowrap cursor-pointer self-start sm:self-auto"
          >
            {showReviewForm ? 'Close Form' : 'Write a Review'}
          </button>
        </div>

        {showReviewForm && (
          <form
            onSubmit={handleReviewSubmit}
            className="mb-12 p-6 sm:p-8 bg-[#F3EFEA] space-y-5 max-w-2xl"
          >
            <h3 className="font-serif text-2xl text-[#1E1B18]">Share Your Experience</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#7C736A] mb-1.5">Your Name *</label>
                <input
                  type="text"
                  required
                  value={reviewAuthor}
                  onChange={(e) => setReviewAuthor(e.target.value)}
                  placeholder="Full Name"
                  className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1E1B18]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#7C736A] mb-1.5">Size Purchased</label>
                <select
                  value={reviewSize}
                  onChange={(e) => setReviewSize(e.target.value as GarmentSize)}
                  className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1E1B18]"
                >
                  {product.sizes.map((s) => (
                    <option key={s} value={s}>
                      Size {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#7C736A] mb-1.5">Headline</label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="Sum up the fit and fabric"
                  className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1E1B18]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#7C736A] mb-1.5">Rating</label>
                <div className="flex items-center gap-2 py-2.5">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setReviewRating(num)}
                      className="cursor-pointer"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          num <= reviewRating
                            ? 'fill-[#6E5043] text-[#6E5043]'
                            : 'text-[#C8BFAF]'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#7C736A] mb-1.5">Your Review *</label>
              <textarea
                rows={3}
                required
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="How did the garment feel, drape, and fit?"
                className="w-full bg-[#FAF8F5] border border-[#E0D8CE] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1E1B18]"
              />
            </div>

            <button
              type="submit"
              className="px-7 py-3 bg-[#231F1D] text-[#FAF8F5] text-xs tracking-[0.16em] uppercase hover:bg-[#14110E] transition-colors cursor-pointer"
            >
              Publish Review
            </button>
          </form>
        )}

        {reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="p-7 sm:p-8 bg-[#F3EFEA] flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: rev.rating }).map((_, idx) => (
                        <Star
                          key={idx}
                          className="w-3.5 h-3.5 fill-[#6E5043] text-[#6E5043]"
                        />
                      ))}
                    </div>
                    <span className="text-xs text-[#7C736A]">{rev.date}</span>
                  </div>
                  <h3 className="font-serif text-xl text-[#1E1B18] font-normal">{rev.title}</h3>
                  <p className="text-sm text-[#4A433D] font-light leading-relaxed">
                    "{rev.comment}"
                  </p>
                </div>

                <div className="pt-4 border-t border-[#E5DDD3] flex items-center gap-2 text-xs text-[#7C736A]">
                  <span className="font-medium text-[#1E1B18]">{rev.author}</span>
                  <span aria-hidden="true">·</span>
                  <span>Size {rev.sizePurchased}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 px-6 bg-[#F3EFEA] text-center">
            <p className="font-serif text-2xl text-[#1E1B18]">
              Be the first to review {product.name}
            </p>
            <p className="text-xs text-[#7C736A] font-light mt-1.5">
              Crafted in small handloom batches for our inaugural release.
            </p>
          </div>
        )}
      </section>
      )}

      {/* Related Products Section — Clean 2-Column Mobile Grid */}
      {siteSettings?.showRelatedProducts !== false && relatedProducts.length > 0 && (
        <section className="mt-24 sm:mt-32 pt-16 sm:pt-20 border-t border-[#ECE6DD]">
          <div className="mb-10 sm:mb-14">
            <p className="text-[11px] tracking-[0.2em] uppercase text-[#7C736A] mb-2">
              Complete The Wardrobe
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#1E1B18] font-normal">
              Related Products
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3.5 sm:gap-x-6 lg:gap-x-8 gap-y-8 sm:gap-y-12 lg:gap-y-14">
            {relatedProducts.map((rel) => (
              <ProductCard
                key={rel.id}
                product={rel}
                isWishlisted={wishlistIds.includes(rel.id)}
                onSelectProduct={onSelectProduct}
                onToggleWishlist={onToggleWishlist}
                onQuickAdd={onQuickAdd}
              />
            ))}
          </div>
        </section>
      )}

      {/* Interactive Size Guide Modal */}
      {sizeGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/55 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={() => setSizeGuideOpen(false)}
            aria-hidden="true"
          />
          <div className="relative bg-[#FAF8F5] max-w-2xl w-full p-6 sm:p-10 space-y-6 max-h-[90vh] overflow-y-auto z-10 shadow-2xl">
            <div className="flex items-start justify-between pb-5 border-b border-[#ECE6DD]">
              <div>
                <p className="text-[11px] tracking-[0.18em] uppercase text-[#7C736A] mb-1">
                  AABHA CLOTHING
                </p>
                <h3 className="font-serif text-2xl sm:text-3xl text-[#1E1B18]">
                  Size & Measurement Guide
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSizeGuideOpen(false)}
                aria-label="Close Size Guide"
                className="p-1.5 text-[#7C736A] hover:text-[#1E1B18] cursor-pointer"
              >
                <X className="w-5 h-5 stroke-[1.35]" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-[#7C736A] font-light">
                Every AABHA garment includes 1.5 inches of internal seam allowance for custom adjustments.
              </p>
              <div className="flex items-center border border-[#E0D8CE] shrink-0">
                <button
                  type="button"
                  onClick={() => setSizeUnit('in')}
                  className={`px-3.5 py-1.5 text-xs cursor-pointer ${
                    sizeUnit === 'in'
                      ? 'bg-[#231F1D] text-[#FAF8F5]'
                      : 'bg-transparent text-[#7C736A]'
                  }`}
                >
                  Inches
                </button>
                <button
                  type="button"
                  onClick={() => setSizeUnit('cm')}
                  className={`px-3.5 py-1.5 text-xs cursor-pointer ${
                    sizeUnit === 'cm'
                      ? 'bg-[#231F1D] text-[#FAF8F5]'
                      : 'bg-transparent text-[#7C736A]'
                  }`}
                >
                  cm
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-[#ECE6DD] bg-[#F3EFEA] text-[#1E1B18]">
                    <th className="py-3.5 px-4 font-medium">Size</th>
                    <th className="py-3.5 px-4 font-medium">Equivalent</th>
                    <th className="py-3.5 px-4 font-medium">Bust</th>
                    <th className="py-3.5 px-4 font-medium">Waist</th>
                    <th className="py-3.5 px-4 font-medium">Hip</th>
                    <th className="py-3.5 px-4 font-medium">Shoulder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECE6DD]">
                  {SIZE_CHART.map((row) => (
                    <tr key={row.size} className="hover:bg-[#F3EFEA]/50">
                      <td className="py-3.5 px-4 font-medium text-[#1E1B18]">{row.size}</td>
                      <td className="py-3.5 px-4 text-[#7C736A]">{row.ukSize}</td>
                      <td className="py-3.5 px-4">
                        {sizeUnit === 'in' ? row.bustIn : row.bustCm}
                      </td>
                      <td className="py-3.5 px-4">
                        {sizeUnit === 'in' ? row.waistIn : row.waistCm}
                      </td>
                      <td className="py-3.5 px-4">{sizeUnit === 'in' ? row.hipIn : row.hipCm}</td>
                      <td className="py-3.5 px-4">
                        {sizeUnit === 'in' ? row.shoulderIn : row.shoulderCm}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
