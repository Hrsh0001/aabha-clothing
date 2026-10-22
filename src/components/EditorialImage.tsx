'use client';
import React, { useState, useEffect } from 'react';
import { ImageOff } from 'lucide-react';

interface EditorialImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  fallbackLabel?: string;
  priority?: boolean;
  onLoad?: () => void;
}

export const EditorialImage: React.FC<EditorialImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  containerClassName = 'w-full h-full bg-[#EFECE6]',
  fallbackLabel,
  priority = false,
  onLoad,
}) => {
  const imgRef = React.useRef<HTMLImageElement>(null);
  const cleanSrc = typeof src === 'string' ? src.trim() : '';
  const [hasError, setHasError] = useState(() => !cleanSrc);
  const [isLoaded, setIsLoaded] = useState(() => Boolean(cleanSrc && cleanSrc.startsWith('data:')));

  useEffect(() => {
    const trimmed = typeof src === 'string' ? src.trim() : '';
    if (!trimmed) {
      setHasError(true);
      setIsLoaded(false);
      return;
    }
    setHasError(false);
    if (trimmed.startsWith('data:')) {
      setIsLoaded(true);
    } else if (imgRef.current?.complete) {
      if (imgRef.current.naturalWidth > 0) {
        setIsLoaded(true);
      } else {
        setHasError(true);
        setIsLoaded(false);
      }
    } else {
      setIsLoaded(false);
    }
  }, [src]);

  const handleError = () => {
    setHasError(true);
  };

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      {!hasError && cleanSrc ? (
        <>
          {/* Fast, warm subtle shimmer while downloading */}
          {!isLoaded && (
            <div className="absolute inset-0 bg-gradient-to-tr from-[#EAE4DC] via-[#F3EFEA] to-[#E5DDD3] animate-pulse pointer-events-none" />
          )}
          <img
            ref={imgRef}
            src={cleanSrc}
            alt={alt}
            loading={priority || cleanSrc.startsWith('data:') ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding={priority ? 'sync' : 'async'}
            onLoad={() => {
              setIsLoaded(true);
              onLoad?.();
            }}
            onError={handleError}
            className={`${className} transition-opacity duration-300 ease-out ${
              isLoaded || cleanSrc.startsWith('data:') ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </>
      ) : (
        <div
          role="img"
          aria-label={`Image Not Found: ${fallbackLabel || alt}`}
          className="w-full h-full flex flex-col items-center justify-center p-2.5 sm:p-4 bg-gradient-to-br from-[#F3EFEA] via-[#EAE3DA] to-[#DFD5C8] text-[#5C5349] text-center select-none overflow-hidden"
        >
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-[#FAF8F5]/80 border border-[#D5CCC0] flex items-center justify-center mb-1.5 sm:mb-2.5 shadow-2xs shrink-0">
            <ImageOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#6E5043] stroke-[1.4]" />
          </div>
          <span className="text-[9px] sm:text-[10px] md:text-[11px] font-medium uppercase tracking-[0.14em] text-[#1E1B18] line-clamp-1 px-1">
            Image Not Found
          </span>
          {(fallbackLabel || alt) && (
            <span className="font-serif text-[10px] sm:text-xs text-[#6E655C] mt-0.5 sm:mt-1 line-clamp-1 max-w-[160px] sm:max-w-[200px] px-1">
              {fallbackLabel || alt}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
