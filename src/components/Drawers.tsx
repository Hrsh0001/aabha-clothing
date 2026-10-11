'use client';
import React, { useState, useMemo } from 'react';
import {
  X,
  Trash2,
  ShoppingBag,
  Heart,
  Search,
  ArrowRight,
  User,
  Lock,
  Shield,
  Phone,
  Package,
  LogOut,
  ExternalLink,
  CheckCircle,
  FileText,
  Clock,
  Sparkles,
  Mail,
  KeyRound,
  AlertCircle,
} from 'lucide-react';
import { Product, GarmentSize, formatINR } from '../data/products';
import { EditorialImage } from './EditorialImage';
import { useAuth } from '../context/AuthContext';

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
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalSavings = items.reduce((sum, item) => {
    if (item.product.originalPrice && item.product.originalPrice > item.product.price) {
      return sum + (item.product.originalPrice - item.product.price) * item.quantity;
    }
    return sum;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md bg-[#FAF8F5] h-full flex flex-col border-l border-[#ECE6DD] z-10 shadow-2xl">
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
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const wishlistedProducts = products.filter((p) => wishlistIds.includes(p.id));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md bg-[#FAF8F5] h-full flex flex-col border-l border-[#ECE6DD] z-10 shadow-2xl">
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
                    {product.inStock ? (
                      <button
                        type="button"
                        onClick={() => onMoveToCart(product, 'S')}
                        className="px-4 py-2 bg-[#231F1D] text-[#FAF8F5] text-[11px] tracking-[0.14em] uppercase hover:bg-[#14110E] transition-colors cursor-pointer"
                      >
                        Add to Bag
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 bg-[#EAE4DC] text-[#7C736A] text-[10px] tracking-[0.12em] uppercase font-medium">
                        Sold Out
                      </span>
                    )}
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

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-24 px-4">
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-[#FAF8F5] w-full max-w-3xl overflow-hidden border border-[#ECE6DD] z-10 shadow-2xl">
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

export interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateOrders?: () => void;
  onNavigateShop?: () => void;
  onNavigateContact?: () => void;
}

type AuthMode = 'signin' | 'signup' | 'forgot' | 'reset';

export const AccountDrawer: React.FC<AccountDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateOrders,
  onNavigateShop,
  onNavigateContact,
}) => {
  const { user, loginCustomer, signupCustomer, forgotPassword, resetPassword, logout } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>('signin');

  // Sign In fields
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign Up fields
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');

  // Forgot / Reset fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // State feedback
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!signInEmail.trim() || !signInPassword) {
      showFeedback('error', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    const res = await loginCustomer(signInEmail, signInPassword);
    setLoading(false);

    if (res.success) {
      showFeedback('success', res.message || 'Signed in successfully.');
      setSignInEmail('');
      setSignInPassword('');
    } else {
      showFeedback('error', res.error || 'Failed to sign in.');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!signUpName.trim() || !signUpEmail.trim() || !signUpPassword) {
      showFeedback('error', 'Please fill in all required fields.');
      return;
    }

    if (signUpPassword.length < 6) {
      showFeedback('error', 'Password must be at least 6 characters long.');
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      showFeedback('error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    const res = await signupCustomer(signUpName, signUpEmail, signUpPhone, signUpPassword);
    setLoading(false);

    if (res.success) {
      showFeedback('success', res.message || 'Account created successfully!');
      setSignUpName('');
      setSignUpEmail('');
      setSignUpPhone('');
      setSignUpPassword('');
      setSignUpConfirmPassword('');
    } else {
      showFeedback('error', res.error || 'Failed to create account.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!forgotEmail.trim()) {
      showFeedback('error', 'Please enter your email address.');
      return;
    }

    setLoading(true);
    const res = await forgotPassword(forgotEmail);
    setLoading(false);

    if (res.success) {
      showFeedback(
        'success',
        res.demoCode
          ? `${res.message} (Test verification code: ${res.demoCode})`
          : res.message || 'Reset code sent to your email.'
      );
      if (res.demoCode) {
        setResetCode(res.demoCode);
      }
      setAuthMode('reset');
    } else {
      showFeedback('error', res.error || 'Failed to send reset code.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!forgotEmail.trim() || !resetCode.trim() || !newPassword) {
      showFeedback('error', 'Please provide email, 6-digit code, and new password.');
      return;
    }

    if (newPassword.length < 6) {
      showFeedback('error', 'New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showFeedback('error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    const res = await resetPassword(forgotEmail, resetCode, newPassword);
    setLoading(false);

    if (res.success) {
      showFeedback('success', res.message || 'Password reset successfully! Please sign in.');
      setNewPassword('');
      setConfirmNewPassword('');
      setResetCode('');
      setAuthMode('signin');
    } else {
      showFeedback('error', res.error || 'Failed to reset password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md bg-[#FAF8F5] h-full flex flex-col border-l border-[#ECE6DD] z-10 shadow-2xl">
        {/* Drawer Header */}
        <div className="px-6 py-6 border-b border-[#ECE6DD] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-[#6E5043]" />
            <h2 className="font-serif text-2xl text-[#1E1B18] font-normal">
              {user
                ? 'Client Account'
                : authMode === 'signup'
                ? 'Create Account'
                : authMode === 'forgot'
                ? 'Reset Password'
                : authMode === 'reset'
                ? 'New Password'
                : 'Customer Sign In'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account panel"
            className="p-1.5 text-[#7C736A] hover:text-[#1E1B18] cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[1.35]" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Feedback Toast / Banner */}
          {feedback && (
            <div
              className={`p-3.5 text-xs flex items-start gap-2.5 border ${
                feedback.type === 'success'
                  ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                  : 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#2E7D32]" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#C62828]" />
              )}
              <span className="leading-relaxed flex-1">{feedback.text}</span>
            </div>
          )}

          {user ? (
            /* Logged-in Customer Profile View */
            <div className="space-y-6">
              <div className="bg-[#F3EFEA] border border-[#ECE6DD] p-5 space-y-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full bg-[#231F1D] text-[#FAF8F5] flex items-center justify-center font-serif text-lg font-medium">
                    {(user.name || 'Member').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-base text-[#1E1B18] truncate">{user.name || 'AABHA Member'}</h3>
                    {user.email && (
                      <p className="text-xs text-[#7C736A] truncate mt-0.5">{user.email}</p>
                    )}
                    {user.phone && (
                      <p className="text-xs text-[#7C736A] font-mono mt-0.5">+91 {user.phone}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#6E5043] font-medium pt-2 border-t border-[#E0D8CE]">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>AABHA Verified Member</span>
                </div>
              </div>

              {/* Action Tiles */}
              <div className="space-y-2.5">
                <p className="text-[11px] tracking-[0.16em] uppercase text-[#7C736A]">
                  Account Actions
                </p>

                <a
                  href="/my-orders"
                  onClick={onClose}
                  className="w-full flex items-center justify-between p-4 bg-[#F3EFEA] hover:bg-[#EAE4DC] border border-[#ECE6DD] transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4 text-[#6E5043]" />
                    <div>
                      <p className="text-xs font-medium text-[#1E1B18]">Track Orders & GST Invoices</p>
                      <p className="text-[11px] text-[#7C736A]">View order status, courier AWB & bills</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#7C736A]" />
                </a>

                {onNavigateShop && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateShop();
                    }}
                    className="w-full flex items-center justify-between p-4 bg-[#F3EFEA] hover:bg-[#EAE4DC] border border-[#ECE6DD] transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-4 h-4 text-[#6E5043]" />
                      <div>
                        <p className="text-xs font-medium text-[#1E1B18]">Shop Inaugural Collection</p>
                        <p className="text-[11px] text-[#7C736A]">17 curated silhouettes in Chanderi & Linen</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#7C736A]" />
                  </button>
                )}

                {onNavigateContact && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateContact();
                    }}
                    className="w-full flex items-center justify-between p-4 bg-[#F3EFEA] hover:bg-[#EAE4DC] border border-[#ECE6DD] transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-[#6E5043]" />
                      <div>
                        <p className="text-xs font-medium text-[#1E1B18]">Client Care & Styling Help</p>
                        <p className="text-[11px] text-[#7C736A]">Mon–Sat 10:00 AM – 7:00 PM IST</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#7C736A]" />
                  </button>
                )}
              </div>

              {/* Sign Out Button */}
              <div className="pt-4 border-t border-[#ECE6DD]">
                <button
                  type="button"
                  onClick={logout}
                  className="w-full py-3 border border-[#E0D8CE] text-xs font-medium uppercase tracking-[0.16em] text-[#C62828] hover:bg-[#FFEBEE] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : authMode === 'signin' ? (
            /* Mode 1: Customer Sign In */
            <form onSubmit={handleSignIn} className="space-y-5">
              <div className="space-y-1">
                <h3 className="font-serif text-2xl text-[#1E1B18]">Namaste</h3>
                <p className="text-xs text-[#5C544D] leading-relaxed">
                  Sign in to your AABHA client account to access your orders and express checkout.
                </p>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[#1E1B18] font-medium mb-1.5">Email Address *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#7C736A] absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className="w-full bg-[#F3EFEA] border border-[#E0D8CE] pl-9 pr-3.5 py-2.5 text-sm text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[#1E1B18] font-medium">Password *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setFeedback(null);
                        setForgotEmail(signInEmail);
                        setAuthMode('forgot');
                      }}
                      className="text-[#6E5043] hover:underline text-[11px] cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#7C736A] absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#F3EFEA] border border-[#E0D8CE] pl-9 pr-3.5 py-2.5 text-sm text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-[0.18em] hover:bg-[#14110E] transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>

              {/* Default Patron Credentials Card for Quick Testing */}
              <div className="p-3 bg-[#FAF8F5] border border-[#E0D8CE] space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#6E5043] uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#6E5043]" />
                    Demo Customer Account
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSignInEmail('ananya@example.com');
                      setSignInPassword('password123');
                    }}
                    className="text-[11px] text-[#1E1B18] hover:text-[#6E5043] font-medium underline underline-offset-2 cursor-pointer"
                  >
                    ⚡ 1-Click Auto-Fill
                  </button>
                </div>
                <p className="text-[11px] text-[#7C736A] font-mono">
                  ananya@example.com · password123
                </p>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setFeedback(null);
                    setAuthMode('signup');
                  }}
                  className="text-xs text-[#6E5043] hover:underline underline-offset-4 cursor-pointer"
                >
                  Don't have an account? Create an Account →
                </button>
              </div>

              {/* Brand Perks */}
              <div className="pt-4 border-t border-[#ECE6DD] space-y-2 text-xs text-[#5C544D]">
                <p className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-[#6E5043]" />
                  <span>Complimentary insured shipping on all orders</span>
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-[#6E5043]" />
                  <span>14-day hassle-free doorstep size exchanges</span>
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-[#6E5043]" />
                  <span>Pan-India Cash on Delivery (COD)</span>
                </p>
              </div>

              <div className="pt-1 text-center">
                <a
                  href="/my-orders"
                  onClick={onClose}
                  className="text-xs text-[#7C736A] hover:text-[#1E1B18]"
                >
                  Track an existing order without signing in →
                </a>
              </div>
            </form>
          ) : authMode === 'signup' ? (
            /* Mode 2: Customer Sign Up */
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-serif text-2xl text-[#1E1B18]">Create Account</h3>
                <p className="text-xs text-[#5C544D] leading-relaxed">
                  Join the AABHA family for private previews, order tracking, and bespoke client care.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[#1E1B18] font-medium mb-1">Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#7C736A] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full bg-[#F3EFEA] border border-[#E0D8CE] pl-9 pr-3.5 py-2 text-sm text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#1E1B18] font-medium mb-1">Email Address *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#7C736A] absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className="w-full bg-[#F3EFEA] border border-[#E0D8CE] pl-9 pr-3.5 py-2 text-sm text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#1E1B18] font-medium mb-1">Mobile Number (Optional)</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#7C736A] absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      maxLength={10}
                      value={signUpPhone}
                      onChange={(e) => setSignUpPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="9876543210"
                      className="w-full bg-[#F3EFEA] border border-[#E0D8CE] pl-9 pr-3.5 py-2 text-sm font-mono text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#1E1B18] font-medium mb-1">Password * (min 6 characters)</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#7C736A] absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#F3EFEA] border border-[#E0D8CE] pl-9 pr-3.5 py-2 text-sm text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#1E1B18] font-medium mb-1">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#7C736A] absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={signUpConfirmPassword}
                      onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#F3EFEA] border border-[#E0D8CE] pl-9 pr-3.5 py-2 text-sm text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-[0.18em] hover:bg-[#14110E] transition-colors cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setFeedback(null);
                    setAuthMode('signin');
                  }}
                  className="text-xs text-[#6E5043] hover:underline underline-offset-4 cursor-pointer"
                >
                  Already have an account? Sign In →
                </button>
              </div>
            </form>
          ) : authMode === 'forgot' ? (
            /* Mode 3: Forgot Password */
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="space-y-1">
                <h3 className="font-serif text-2xl text-[#1E1B18]">Forgot Password</h3>
                <p className="text-xs text-[#5C544D] leading-relaxed">
                  Enter your registered email address. We will generate a 6-digit verification code to reset your password.
                </p>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[#1E1B18] font-medium mb-1.5">Registered Email *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#7C736A] absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className="w-full bg-[#F3EFEA] border border-[#E0D8CE] pl-9 pr-3.5 py-2.5 text-sm text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-[0.18em] hover:bg-[#14110E] transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Sending Code...' : 'Send Reset Code'}
              </button>

              <div className="flex flex-col gap-2 text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setFeedback(null);
                    setAuthMode('reset');
                  }}
                  className="text-xs text-[#6E5043] hover:underline cursor-pointer"
                >
                  Already have a reset code? Enter Code →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFeedback(null);
                    setAuthMode('signin');
                  }}
                  className="text-xs text-[#7C736A] hover:underline cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            /* Mode 4: Reset Password */
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-serif text-2xl text-[#1E1B18]">Set New Password</h3>
                <p className="text-xs text-[#5C544D] leading-relaxed">
                  Enter the 6-digit verification code and choose your new password.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[#1E1B18] font-medium mb-1">Email Address *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#7C736A] absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className="w-full bg-[#F3EFEA] border border-[#E0D8CE] pl-9 pr-3.5 py-2 text-sm text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#1E1B18] font-medium mb-1">6-Digit Reset Code *</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[#7C736A] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="123456"
                      className="w-full bg-[#F3EFEA] border border-[#E0D8CE] pl-9 pr-3.5 py-2 text-sm font-mono tracking-widest text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#1E1B18] font-medium mb-1">New Password * (min 6 characters)</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#7C736A] absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#F3EFEA] border border-[#E0D8CE] pl-9 pr-3.5 py-2 text-sm text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#1E1B18] font-medium mb-1">Confirm New Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#7C736A] absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#F3EFEA] border border-[#E0D8CE] pl-9 pr-3.5 py-2 text-sm text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#231F1D] text-[#FAF8F5] text-xs font-medium uppercase tracking-[0.18em] hover:bg-[#14110E] transition-colors cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? 'Updating Password...' : 'Update Password'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setFeedback(null);
                    setAuthMode('signin');
                  }}
                  className="text-xs text-[#7C736A] hover:underline cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

