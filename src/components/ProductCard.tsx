import React, { useState } from 'react';
import { Heart, Plus } from 'lucide-react';
import { Product, GarmentSize, formatINR } from '../data/products';
import { EditorialImage } from './EditorialImage';

interface ProductCardProps {
  product: Product;
  isWishlisted: boolean;
  onSelectProduct: (product: Product) => void;
  onToggleWishlist: (productId: string, e: React.MouseEvent) => void;
  onQuickAdd: (product: Product, size: GarmentSize, e: React.MouseEvent) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isWishlisted,
  onSelectProduct,
  onToggleWishlist,
  onQuickAdd,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mobileSizesOpen, setMobileSizesOpen] = useState(false);
  const [addedSize, setAddedSize] = useState<GarmentSize | null>(null);

  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  const handleQuickSizeClick = (size: GarmentSize, e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickAdd(product, size, e);
    setAddedSize(size);
    setTimeout(() => {
      setAddedSize(null);
      setMobileSizesOpen(false);
    }, 1100);
  };

  const showSizeOverlay = isHovered || mobileSizesOpen;

  return (
    <article
      onClick={() => onSelectProduct(product)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setMobileSizesOpen(false);
      }}
      className="group cursor-pointer flex flex-col"
    >
      {/* 3:4 Portrait Image Frame */}
      <div className="relative aspect-[3/4] w-full bg-[#F3EFEA] overflow-hidden">
        <EditorialImage
          src={product.primaryImage}
          alt={product.name}
          fallbackLabel={product.name}
          containerClassName="w-full h-full"
          className={`w-full h-full object-cover transition-transform duration-700 ease-out ${
            isHovered ? 'scale-[1.03]' : 'scale-100'
          }`}
        />

        {/* Refined Minimal Wishlist Toggle Button */}
        <button
          type="button"
          onClick={(e) => onToggleWishlist(product.id, e)}
          aria-label={
            isWishlisted
              ? `Remove ${product.name} from wishlist`
              : `Save ${product.name} to wishlist`
          }
          className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 rounded-full flex items-center justify-center bg-[#FAF8F5]/85 backdrop-blur-xs hover:bg-[#FAF8F5] text-[#1E1B18] transition-colors z-10 cursor-pointer"
        >
          <Heart
            className={`w-[17px] h-[17px] stroke-[1.35] transition-colors ${
              isWishlisted ? 'fill-[#6E5043] text-[#6E5043]' : 'text-[#1E1B18]'
            }`}
          />
        </button>

        {/* Mobile Quick Add Trigger Button */}
        {!mobileSizesOpen && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMobileSizesOpen(true);
            }}
            aria-label={`Quick add ${product.name}`}
            className="md:hidden absolute bottom-2.5 right-2.5 px-2.5 py-1.5 bg-[#FAF8F5]/90 backdrop-blur-xs text-[#1E1B18] text-[10px] tracking-[0.1em] uppercase flex items-center gap-1 z-10 cursor-pointer"
          >
            <Plus className="w-3 h-3 stroke-[1.5]" />
            <span>Quick Add</span>
          </button>
        )}

        {/* Quick-Add Size Bar (Desktop Hover or Mobile Toggle) */}
        <div
          className={`absolute inset-x-0 bottom-0 bg-[#FAF8F5]/95 backdrop-blur-xs px-3 sm:px-4 py-2.5 sm:py-3 transition-opacity duration-200 z-20 ${
            showSizeOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] tracking-wider uppercase text-[#7C736A]">
              {addedSize ? `Added Size ${addedSize}` : 'Quick Add Size'}
            </span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {product.sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={(e) => handleQuickSizeClick(size, e)}
                className={`py-1.5 text-[11px] font-normal transition-colors whitespace-nowrap cursor-pointer ${
                  addedSize === size
                    ? 'bg-[#231F1D] text-[#FAF8F5]'
                    : 'bg-[#F3EFEA] text-[#1E1B18] hover:bg-[#231F1D] hover:text-[#FAF8F5]'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Spacious Editorial Product Details */}
      <div className="pt-3.5 sm:pt-4 flex flex-col flex-1">
        {/* Quiet Unboxed Category & Shade */}
        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-[#7C736A] tracking-wide mb-1">
          <span>{product.category}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{product.colorName}</span>
        </div>

        {/* Product Title */}
        <h3 className="font-serif text-[17px] sm:text-xl font-normal text-[#1E1B18] group-hover:text-[#6E5043] transition-colors leading-snug">
          {product.name}
        </h3>

        {/* Price Row */}
        <div className="mt-1.5 sm:mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-[14px] sm:text-[15px] tabular-nums">
          <span className="font-medium text-[#1E1B18]">{formatINR(product.price)}</span>
          {product.originalPrice && (
            <span className="text-xs text-[#948A80] line-through">
              {formatINR(product.originalPrice)}
            </span>
          )}
          {discountPercent && (
            <span className="text-[11px] sm:text-xs text-[#6E5043]">
              · {discountPercent}% off
            </span>
          )}
        </div>
      </div>
    </article>
  );
};
