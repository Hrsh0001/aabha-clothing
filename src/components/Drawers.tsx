import React, { useState, useMemo } from 'react';
import { X, Trash2, ShoppingBag, Heart, Search, ArrowRight } from 'lucide-react';
import { Product, GarmentSize, formatINR } from '../data/products';
import { EditorialImage } from './EditorialImage';

export interface CartItem {
  product: Product;
  size: GarmentSize;
  quantity: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (productId: string, size: GarmentSize, delta: number) => void;
  onRemoveItem: (productId: string, size: GarmentSize) => void;
  onProceedToCheckout: () => void;
  onSelectProduct: (product: Product) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  items,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  onSelectProduct,
}) => {
  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalSavings = items.reduce((sum, item) => {
    if (item.product.originalPrice && item.product.originalPrice > item.product.price) {
      return sum + (item.product.originalPrice - item.product.price) * item.quantity;
    }
    return sum;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs">
      <div className="w-full max-w-md bg-[#FAF8F5] h-full flex flex-col border-l border-[#ECE6DD]">
        {/* Drawer Header */}
        <div className="px-6 py-6 border-b border-[#ECE6DD] flex items-center justify-between">
          <h2 className="font-serif text-2xl text-[#1E1B18] font-normal">
            Shopping Bag ({items.reduce((acc, i) => acc + i.quantity, 0)})
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shopping bag"
            className="p-1.5 text-[#7C736A] hover:text-[#1E1B18] cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[1.35]" />
          </button>
        </div>

        {/* Complimentary Shipping Notice */}
        <div className="px-6 py-3 bg-[#F3EFEA] text-xs text-[#5C544D] font-light">
          Complimentary insured express delivery & handloom muslin garment bag included.
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-[#ECE6DD]">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16">
              <ShoppingBag className="w-7 h-7 text-[#948A80] mb-4 stroke-[1.2]" />
              <p className="font-serif text-2xl text-[#1E1B18] mb-1.5">Your bag is empty</p>
              <p className="text-xs text-[#7C736A] font-light max-w-xs mb-7 leading-relaxed">
                Explore our 17-piece launch collection of Anarkalis, 3-Piece Dresses, Co-ord Sets, and Chikankari Suits.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-7 py-3.5 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium tracking-[0.18em] uppercase hover:bg-[#14110E] transition-colors cursor-pointer"
              >
                Explore Collection
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={`${item.product.id}-${item.size}`}
                className="py-5 flex gap-4 items-start"
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectProduct(item.product);
                    onClose();
                  }}
                  className="w-20 aspect-[3/4] shrink-0 bg-[#F3EFEA] overflow-hidden cursor-pointer"
                >
                  <EditorialImage
                    src={item.product.primaryImage}
                    alt={item.product.name}
                    containerClassName="w-full h-full"
                    className="w-full h-full object-cover"
                  />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectProduct(item.product);
                        onClose();
                      }}
                      className="text-left font-sans text-sm font-normal text-[#1E1B18] hover:text-[#6E5043] line-clamp-1 cursor-pointer"
                    >
                      {item.product.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.product.id, item.size)}
                      aria-label="Remove item"
                      className="text-[#948A80] hover:text-[#1E1B18] p-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[1.35]" />
                    </button>
                  </div>

                  <p className="text-xs text-[#7C736A] mt-1">
                    Size {item.size} · {item.product.colorName}
                  </p>

                  <div className="mt-3.5 flex items-center justify-between">
                    <div className="flex items-center border border-[#E0D8CE]">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.product.id, item.size, -1)}
                        className="px-2.5 py-1 text-xs text-[#1E1B18] hover:bg-[#F3EFEA] cursor-pointer"
                      >
                        −
                      </button>
                      <span className="px-2.5 py-1 text-xs font-mono tabular-nums text-[#1E1B18]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.product.id, item.size, 1)}
                        className="px-2.5 py-1 text-xs text-[#1E1B18] hover:bg-[#F3EFEA] cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right tabular-nums">
                      <span className="text-sm font-medium text-[#1E1B18]">
                        {formatINR(item.product.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Footer */}
        {items.length > 0 && (
          <div className="p-6 bg-[#F3EFEA] border-t border-[#ECE6DD] space-y-5">
            <div className="space-y-2 text-sm">
              {totalSavings > 0 && (
                <div className="flex items-center justify-between text-xs text-[#6E5043] tabular-nums">
                  <span>Collection Privilege</span>
                  <span>−{formatINR(totalSavings)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-[#7C736A]">
                <span>Shipping</span>
                <span>Complimentary</span>
              </div>
              <div className="flex items-center justify-between text-base font-medium text-[#1E1B18] pt-3 border-t border-[#E0D8CE] tabular-nums">
                <span>Subtotal</span>
                <span>{formatINR(subtotal)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onProceedToCheckout}
              className="w-full py-4 px-6 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium tracking-[0.18em] uppercase hover:bg-[#14110E] transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[1.4]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface WishlistDrawerProps {
  isOpen: boolean;
  products: Product[];
  wishlistIds: string[];
  onClose: () => void;
  onRemoveWishlist: (productId: string, e: React.MouseEvent) => void;
  onMoveToCart: (product: Product, size: GarmentSize) => void;
  onSelectProduct: (product: Product) => void;
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({
  isOpen,
  products,
  wishlistIds,
  onClose,
  onRemoveWishlist,
  onMoveToCart,
  onSelectProduct,
}) => {
  if (!isOpen) return null;

  const wishlistedProducts = products.filter((p) => wishlistIds.includes(p.id));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs">
      <div className="w-full max-w-md bg-[#FAF8F5] h-full flex flex-col border-l border-[#ECE6DD]">
        <div className="px-6 py-6 border-b border-[#ECE6DD] flex items-center justify-between">
          <h2 className="font-serif text-2xl text-[#1E1B18] font-normal">
            Saved Wishlist ({wishlistedProducts.length})
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close wishlist"
            className="p-1.5 text-[#7C736A] hover:text-[#1E1B18] cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[1.35]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-[#ECE6DD]">
          {wishlistedProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16">
              <Heart className="w-7 h-7 text-[#948A80] mb-4 stroke-[1.2]" />
              <p className="font-serif text-2xl text-[#1E1B18] mb-1.5">Your wishlist is empty</p>
              <p className="text-xs text-[#7C736A] font-light max-w-xs mb-7 leading-relaxed">
                Save your favourite silhouettes to revisit later.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-7 py-3.5 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium tracking-[0.18em] uppercase hover:bg-[#14110E] transition-colors cursor-pointer"
              >
                Discover Collection
              </button>
            </div>
          ) : (
            wishlistedProducts.map((product) => (
              <div key={product.id} className="py-5 flex gap-4 items-start">
                <button
                  type="button"
                  onClick={() => {
                    onSelectProduct(product);
                    onClose();
                  }}
                  className="w-20 aspect-[3/4] shrink-0 bg-[#F3EFEA] overflow-hidden cursor-pointer"
                >
                  <EditorialImage
                    src={product.primaryImage}
                    alt={product.name}
                    containerClassName="w-full h-full"
                    className="w-full h-full object-cover"
                  />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectProduct(product);
                        onClose();
                      }}
                      className="text-left font-sans text-sm font-normal text-[#1E1B18] hover:text-[#6E5043] line-clamp-1 cursor-pointer"
                    >
                      {product.name}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => onRemoveWishlist(product.id, e)}
                      aria-label="Remove from wishlist"
                      className="text-[#948A80] hover:text-[#1E1B18] p-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[1.35]" />
                    </button>
                  </div>

                  <p className="text-xs text-[#7C736A] mt-1">
                    {product.category} · {product.colorName}
                  </p>
                  <p className="text-sm font-medium text-[#1E1B18] mt-1.5 tabular-nums">
                    {formatINR(product.price)}
                  </p>

                  <div className="mt-3.5 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => onMoveToCart(product, 'S')}
                      className="px-4 py-2 bg-[#231F1D] text-[#FAF8F5] text-[11px] tracking-[0.14em] uppercase hover:bg-[#14110E] transition-colors cursor-pointer"
                    >
                      Add to Bag
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectProduct(product);
                        onClose();
                      }}
                      className="px-3.5 py-2 border border-[#E0D8CE] text-[11px] tracking-[0.12em] uppercase text-[#1E1B18] hover:border-[#1E1B18] transition-colors cursor-pointer"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

interface SearchModalProps {
  isOpen: boolean;
  products: Product[];
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  products,
  onClose,
  onSelectProduct,
}) => {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 6);
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.colorName.toLowerCase().includes(q) ||
        p.fabric.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
    );
  }, [query, products]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center pt-12 sm:pt-24 px-4">
      <div className="bg-[#FAF8F5] w-full max-w-3xl overflow-hidden border border-[#ECE6DD]">
        <div className="p-5 sm:p-6 border-b border-[#ECE6DD] flex items-center gap-3.5">
          <Search className="w-4 h-4 text-[#7C736A] stroke-[1.4]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by silhouette, Chanderi, Linen, Khadi, or shade..."
            className="flex-1 bg-transparent text-sm sm:text-base text-[#1E1B18] placeholder:text-[#948A80] font-light focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-xs text-[#7C736A] hover:text-[#1E1B18] cursor-pointer"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="p-1 text-[#7C736A] hover:text-[#1E1B18] cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[1.35]" />
          </button>
        </div>

        {/* Minimal Search Suggestions */}
        <div className="px-6 py-3.5 bg-[#F3EFEA] flex flex-wrap items-center gap-3 text-xs">
          <span className="text-[#7C736A] tracking-wide">Suggestions:</span>
          {['Anarkali', '3-Piece Dress', 'Co-ord Set', 'Chikankari Suit', 'Chanderi', 'Linen'].map(
            (term) => (
              <button
                key={term}
                type="button"
                onClick={() => setQuery(term)}
                className="text-[#4A433D] hover:text-[#1E1B18] underline underline-offset-4 cursor-pointer"
              >
                {term}
              </button>
            )
          )}
        </div>

        {/* Results Grid */}
        <div className="p-6 max-h-[65vh] overflow-y-auto">
          <p className="text-[11px] tracking-[0.16em] uppercase text-[#7C736A] mb-4">
            {query.trim()
              ? `${results.length} Matching Silhouettes`
              : 'Featured Silhouettes'}
          </p>

          {results.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {results.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => {
                    onSelectProduct(product);
                    onClose();
                  }}
                  className="flex items-center gap-4 p-2.5 hover:bg-[#F3EFEA] transition-colors text-left cursor-pointer"
                >
                  <div className="w-16 aspect-[3/4] bg-[#F3EFEA] shrink-0 overflow-hidden">
                    <EditorialImage
                      src={product.primaryImage}
                      alt={product.name}
                      containerClassName="w-full h-full"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-[#7C736A]">
                      {product.category} · {product.colorName}
                    </p>
                    <p className="text-sm font-normal text-[#1E1B18] truncate mt-0.5">
                      {product.name}
                    </p>
                    <p className="text-sm font-medium text-[#1E1B18] mt-1 tabular-nums">
                      {formatINR(product.price)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#7C736A] font-light py-10 text-center">
              No silhouettes matched "{query}". Try searching for Anarkali, 3-Piece Dress, Co-ord Set, or Chikankari.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
