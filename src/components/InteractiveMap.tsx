'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Crosshair, ZoomIn, ZoomOut, RefreshCw, AlertCircle } from 'lucide-react';

interface InteractiveMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  onLocationChange: (lat: number, lng: number) => void;
  height?: string;
  className?: string;
  interactive?: boolean;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  latitude,
  longitude,
  zoom = 16,
  onLocationChange,
  height = '100%',
  className = '',
  interactive = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Load Leaflet JS & CSS from reliable CDN
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if Leaflet is already loaded
    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    // Inject Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Inject Leaflet JS
    const script = document.createElement('script');
    script.id = 'leaflet-js';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      setLeafletLoaded(true);
    };
    script.onerror = () => {
      console.warn('Leaflet CDN load failed, using interactive fallback');
      setLoadError(true);
    };

    document.body.appendChild(script);

    return () => {
      // Keep script in DOM for caching
    };
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    // Clean up any existing map instance
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (e) {
        console.warn('Map cleanup notice:', e);
      }
      mapInstanceRef.current = null;
    }

    try {
      // Create map
      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: zoom,
        zoomControl: false, // We render our own luxury styled controls
        attributionControl: false,
      });

      // Add OpenStreetMap tile layer (100% Free)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
      }).addTo(map);

      // Create Custom Luxury Red Pin Icon
      const customPinHtml = `
        <div style="position: relative; width: 36px; height: 44px; display: flex; flex-direction: column; align-items: center; cursor: grab;">
          <div style="width: 32px; height: 32px; background: #231F1D; border: 2.5px solid #FAF8F5; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.35);">
            <div style="width: 10px; height: 10px; background: #E0A96D; border-radius: 50%; transform: rotate(45deg);"></div>
          </div>
          <div style="width: 8px; height: 4px; background: rgba(0,0,0,0.3); border-radius: 50%; margin-top: 1px; filter: blur(1px);"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'aabha-custom-pin',
        html: customPinHtml,
        iconSize: [36, 44],
        iconAnchor: [18, 42],
        popupAnchor: [0, -40],
      });

      // Add draggable Marker
      const marker = L.marker([latitude, longitude], {
        icon: customIcon,
        draggable: interactive,
        autoPan: true,
      }).addTo(map);

      // Marker drag event
      marker.on('dragstart', () => {
        setIsDragging(true);
      });

      marker.on('dragend', (e: any) => {
        setIsDragging(false);
        const position = e.target.getLatLng();
        onLocationChange(position.lat, position.lng);
      });

      // Map click event (Click anywhere to place pin)
      if (interactive) {
        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          onLocationChange(lat, lng);
        });
      }

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Force layout invalidation after render
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    } catch (err) {
      console.error('Leaflet initialization error:', err);
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
      }
    };
  }, [leafletLoaded]);

  // Sync external coordinate changes to Leaflet map & marker
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    const currentPos = markerRef.current.getLatLng();
    const dist = Math.abs(currentPos.lat - latitude) + Math.abs(currentPos.lng - longitude);
    if (dist > 0.00005) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapInstanceRef.current.panTo([latitude, longitude], { animate: true, duration: 0.8 });
    }
  }, [latitude, longitude]);

  // Zoom controls
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([latitude, longitude], 17, { animate: true });
    }
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        onLocationChange(userLat, userLng);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([userLat, userLng], 17, { duration: 1.2 });
        }
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#EAE4DC] select-none ${className}`}
      style={{ height }}
    >
      {/* Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0 cursor-crosshair" />

      {/* Loading state indicator */}
      {!leafletLoaded && !loadError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#F3EFEA]/90 backdrop-blur-xs text-[#1E1B18] space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-[#6E5043]" />
          <p className="text-xs font-serif tracking-wider">Loading Free Interactive OpenStreetMap...</p>
          <p className="text-[10px] text-[#7C736A]">Zero API keys · Drag or click to place your pin</p>
        </div>
      )}

      {/* Fallback Embed if Leaflet CDN fails */}
      {loadError && (
        <div className="absolute inset-0 z-10 flex flex-col">
          <iframe
            title="OpenStreetMap Fallback"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.005},${
              latitude - 0.004
            },${longitude + 0.005},${latitude + 0.004}&layer=mapnik&marker=${latitude},${longitude}`}
            className="w-full h-full border-0"
          />
        </div>
      )}

      {/* Top Banner: Drag / Click Instructions */}
      {interactive && leafletLoaded && (
        <div className="absolute top-3 left-3 right-3 sm:right-auto z-20 pointer-events-none">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FAF8F5]/95 backdrop-blur-sm border border-[#D5CCC0] shadow-md text-xs text-[#1E1B18] rounded-xs font-sans">
            <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse shrink-0"></span>
            <span className="font-medium text-[11px] sm:text-xs">
              {isDragging ? 'Releasing pin at doorstep...' : 'Click or Drag Pin to your exact doorstep / gate'}
            </span>
          </div>
        </div>
      )}

      {/* Floating Map Actions (Zoom In, Zoom Out, Recenter, GPS) */}
      <div className="absolute bottom-4 right-3 z-20 flex flex-col items-center gap-1.5 shadow-lg">
        <button
          type="button"
          onClick={handleDetectGPS}
          title="Detect My Current GPS Location"
          disabled={isLocating}
          className="w-9 h-9 sm:w-10 sm:h-10 bg-[#FAF8F5] hover:bg-[#231F1D] text-[#1E1B18] hover:text-[#FAF8F5] border border-[#D5CCC0] flex items-center justify-center transition-colors cursor-pointer rounded-xs"
        >
          <Crosshair className={`w-4 h-4 ${isLocating ? 'animate-spin text-[#6E5043]' : ''}`} />
        </button>

        <button
          type="button"
          onClick={handleRecenter}
          title="Recenter on Pin"
          className="w-9 h-9 sm:w-10 sm:h-10 bg-[#FAF8F5] hover:bg-[#231F1D] text-[#1E1B18] hover:text-[#FAF8F5] border border-[#D5CCC0] flex items-center justify-center transition-colors cursor-pointer rounded-xs"
        >
          <MapPin className="w-4 h-4" />
        </button>

        <div className="flex flex-col bg-[#FAF8F5] border border-[#D5CCC0] rounded-xs overflow-hidden">
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            className="w-9 h-8 sm:w-10 sm:h-9 hover:bg-[#231F1D] hover:text-[#FAF8F5] text-[#1E1B18] flex items-center justify-center transition-colors cursor-pointer border-b border-[#ECE6DD]"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            className="w-9 h-8 sm:w-10 sm:h-9 hover:bg-[#231F1D] hover:text-[#FAF8F5] text-[#1E1B18] flex items-center justify-center transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Coordinates Indicator */}
      <div className="absolute bottom-3 left-3 z-20 pointer-events-none hidden sm:block">
        <div className="px-2.5 py-1 bg-[#1E1B18]/85 text-[#FAF8F5] text-[10px] font-mono shadow-xs backdrop-blur-xs">
          GPS: {latitude.toFixed(5)}° N, {longitude.toFixed(5)}° E
        </div>
      </div>
    </div>
  );
};
