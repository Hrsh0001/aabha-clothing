'use client';
import React, { useState, useEffect } from 'react';

interface EditorialImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  fallbackLabel?: string;
  priority?: boolean;
}

export const EditorialImage: React.FC<EditorialImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  containerClassName = 'relative overflow-hidden bg-[#EFECE6]',
  fallbackLabel,
  priority = false,
}) => {
  const imgRef = React.useRef<HTMLImageElement>(null);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const [attemptedFallback, setAttemptedFallback] = useState(false);
  const [isLoaded, setIsLoaded] = useState(() => Boolean(src && src.startsWith('data:')));

  useEffect(() => {
    setCurrentSrc(src);
    setHasError(false);
    setAttemptedFallback(false);
    if (
      (src && src.startsWith('data:')) ||
      (imgRef.current?.complete && imgRef.current?.naturalWidth > 0)
    ) {
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
    }
  }, [src]);

  const handleError = () => {
    if (!attemptedFallback) {
      setAttemptedFallback(true);
      if (currentSrc.startsWith('/api/images/')) {
        setCurrentSrc('/images/hero_editorial_banner_1791119088652.jpg');
        return;
      } else if (currentSrc.startsWith('/images/')) {
        setCurrentSrc(currentSrc.replace('/images/', '/src/assets/images/'));
        return;
      } else if (currentSrc.startsWith('/src/assets/images/')) {
        setCurrentSrc(currentSrc.replace('/src/assets/images/', '/images/'));
        return;
      }
    }
    setHasError(true);
  };

  return (
    <div className={containerClassName}>
      {!hasError ? (
        <>
          {/* Subtle loading shimmer placeholder while downloading */}
          {!isLoaded && !priority && (
            <div className="absolute inset-0 bg-[#E8E2D9] animate-pulse" />
          )}
          <img
            ref={imgRef}
            src={currentSrc}
            alt={alt}
            loading={priority || currentSrc?.startsWith('data:') ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setIsLoaded(true)}
            onError={handleError}
            className={`${className} transition-opacity duration-500 ease-out ${
              isLoaded || priority || currentSrc?.startsWith('data:') ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </>
      ) : (
        <div className="w-full h-full min-h-[260px] flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#F3EFEA] via-[#EAE3DA] to-[#DFD5C8] text-[#5C5349] text-center">
          <svg
            className="w-8 h-8 mb-3 opacity-60"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          >
            <path d="M4 6h16M4 12h16M4 18h16M8 3v18M16 3v18" strokeLinecap="round" />
          </svg>
          <span className="font-serif text-lg tracking-wide text-[#1C1917]">
            {fallbackLabel || alt}
          </span>
          <span className="text-xs text-[#6E655C] mt-1">
            AABHA CLOTHING
          </span>
        </div>
      )}
    </div>
  );
};
