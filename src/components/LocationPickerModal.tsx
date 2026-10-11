'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Crosshair,
  Search,
  Check,
  X,
  ExternalLink,
  RefreshCw,
  Building2,
  Maximize2,
  AlertCircle,
  Navigation,
} from 'lucide-react';
import { InteractiveMap } from './InteractiveMap';

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  pincode: string;
  mapUrl: string;
}

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (data: LocationData) => void;
  initialLat?: number;
  initialLng?: number;
}

const DEFAULT_LAT = 19.076; // Mumbai atelier
const DEFAULT_LNG = 72.8777;

const QUICK_CITIES = [
  { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { name: 'Delhi NCR', lat: 28.6139, lng: 77.209 },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
];

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  initialLat,
  initialLng,
}) => {
  const [lat, setLat] = useState<number>(initialLat || DEFAULT_LAT);
  const [lng, setLng] = useState<number>(initialLng || DEFAULT_LNG);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  // Address fields
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('Maharashtra');
  const [pincode, setPincode] = useState('');
  const [rawDisplayName, setRawDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync initial props
  useEffect(() => {
    if (initialLat && initialLng) {
      setLat(initialLat);
      setLng(initialLng);
    }
  }, [initialLat, initialLng]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reverse geocode when coordinates change
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerReverseGeocode = (targetLat: number, targetLng: number) => {
    if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
    geocodeTimeoutRef.current = setTimeout(() => {
      reverseGeocode(targetLat, targetLng);
    }, 350);
  };

  const reverseGeocode = async (targetLat: number, targetLng: number) => {
    setGeocoding(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${targetLat}&lon=${targetLng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const road = addr.road || addr.suburb || addr.neighbourhood || addr.residential || '';
        const house = addr.house_number ? `${addr.house_number}, ` : '';
        const detectedStreet = `${house}${road}`.trim() || data.name || '';
        const detectedCity =
          addr.city || addr.town || addr.city_district || addr.county || 'Mumbai';
        const detectedState = addr.state || 'Maharashtra';
        const detectedPin = addr.postcode ? addr.postcode.replace(/[^0-9]/g, '').slice(0, 6) : '';

        if (detectedStreet) setStreetAddress(detectedStreet);
        if (detectedCity) setCity(detectedCity);
        if (detectedState) setStateName(detectedState);
        if (detectedPin) setPincode(detectedPin);
        setRawDisplayName(data.display_name || '');
      }
    } catch (err) {
      console.warn('OSM reverse geocode notice:', err);
    } finally {
      setGeocoding(false);
    }
  };

  // Initial geocode when modal opens
  useEffect(() => {
    if (isOpen) {
      reverseGeocode(lat, lng);
    }
  }, [isOpen]);

  // Handle marker drag / map click from InteractiveMap
  const handleMapLocationChange = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    triggerReverseGeocode(newLat, newLng);
  };

  // 1-Click Browser GPS Auto-Detect
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setDetectingGps(true);
    setErrorMsg(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        setLat(userLat);
        setLng(userLng);
        setDetectingGps(false);
        triggerReverseGeocode(userLat, userLng);
      },
      (err) => {
        setDetectingGps(false);
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMsg('Location permission was denied. Please allow location access or search below.');
        } else {
          setErrorMsg('Unable to retrieve your location. Please search for your area.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Search Area or Landmark
  const handleSearchArea = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setSearching(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query + ', India'
        )}&limit=1&addressdetails=1`
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const first = data[0];
        const newLat = parseFloat(first.lat);
        const newLng = parseFloat(first.lon);
        setLat(newLat);
        setLng(newLng);
        setSearchQuery('');
        triggerReverseGeocode(newLat, newLng);
      } else {
        setErrorMsg(`Could not locate "${query}". Try searching with your city name.`);
      }
    } catch (err) {
      setErrorMsg('Search service busy. You can drag the pin on the map directly.');
    } finally {
      setSearching(false);
    }
  };

  // Confirm and apply location
  const handleConfirm = () => {
    const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    const fullLoc: LocationData = {
      latitude: lat,
      longitude: lng,
      address: streetAddress,
      city: city || 'Mumbai',
      state: stateName || 'Maharashtra',
      pincode,
      mapUrl: googleMapsUrl,
    };

    // Save to local storage for persistence across views
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('aabha_delivery_location', JSON.stringify(fullLoc));
      } catch (e) {}
    }

    onSelectLocation(fullLoc);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6">
      {/* Dim Backdrop */}
      <div
        className="fixed inset-0 bg-[#1E1B18]/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Responsive Modal Card: Full-screen on mobile, expansive on desktop */}
      <div className="relative bg-[#FAF8F5] border border-[#ECE6DD] w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-5xl overflow-hidden flex flex-col shadow-2xl z-10 font-sans text-[#1E1B18]">
        {/* Luxury Atelier Header */}
        <div className="p-3.5 sm:p-5 bg-[#F3EFEA] border-b border-[#ECE6DD] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#231F1D] text-[#FAF8F5] flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[1.4]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg sm:text-2xl text-[#1E1B18] font-normal truncate">
                  Pinpoint Exact Doorstep Delivery
                </h2>
                <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 bg-[#FAF8F5] border border-[#ECE6DD] text-[#2E7D32] font-semibold">
                  100% FREE
                </span>
              </div>
              <p className="text-[11px] text-[#7C736A] font-light truncate">
                Drag the marker or tap anywhere on the map to pin your building entrance or gate
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/select-location"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF8F5] border border-[#D5CCC0] text-xs text-[#1E1B18] hover:bg-[#EAE4DC] transition-colors"
              title="Open full dedicated page view"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full Page View</span>
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 text-[#7C736A] hover:text-[#1E1B18] transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Modal Body: Responsive Layout (Full-height split on desktop, stacked on mobile) */}
        <div className="flex-1 overflow-y-auto sm:overflow-hidden flex flex-col md:grid md:grid-cols-12 min-h-0">
          {/* Map Section: 7 Columns on Desktop, Full Width Upper Half on Mobile */}
          <div className="w-full h-[52vh] sm:h-[48vh] md:h-auto md:col-span-7 relative bg-[#EAE4DC] border-b md:border-b-0 md:border-r border-[#ECE6DD] flex flex-col">
            <InteractiveMap
              latitude={lat}
              longitude={lng}
              zoom={16}
              onLocationChange={handleMapLocationChange}
              height="100%"
              className="w-full h-full flex-1"
              interactive={true}
            />
          </div>

          {/* Form & Controls Section: 5 Columns on Desktop, Lower Half on Mobile */}
          <div className="flex-1 md:col-span-5 p-4 sm:p-6 bg-[#FAF8F5] overflow-y-auto flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Search Bar & GPS Locate Button */}
              <div className="space-y-2">
                <form onSubmit={handleSearchArea} className="flex gap-1.5">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[#7C736A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search city, area, or landmark..."
                      className="w-full bg-[#FAF8F5] border border-[#D5CCC0] pl-9 pr-3 py-2 text-xs sm:text-sm text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searching || !searchQuery.trim()}
                    className="px-4 py-2 bg-[#231F1D] text-[#FAF8F5] text-xs uppercase tracking-wider font-medium hover:bg-[#14110E] cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {searching ? '...' : 'Search'}
                  </button>
                </form>

                {/* Quick Indian City Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                  <span className="text-[10px] uppercase tracking-wider text-[#7C736A] shrink-0 font-medium">
                    Quick:
                  </span>
                  {QUICK_CITIES.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => {
                        setLat(c.lat);
                        setLng(c.lng);
                        triggerReverseGeocode(c.lat, c.lng);
                      }}
                      className="px-2 py-0.5 bg-[#F3EFEA] hover:bg-[#231F1D] hover:text-[#FAF8F5] border border-[#ECE6DD] text-[#5C544D] text-[10px] whitespace-nowrap transition-colors cursor-pointer shrink-0"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>

                {/* GPS Auto-Detect Button */}
                <button
                  type="button"
                  onClick={handleDetectGPS}
                  disabled={detectingGps}
                  className="w-full py-2.5 px-3 bg-[#FAF8F5] border border-[#D5CCC0] hover:bg-[#F3EFEA] text-xs uppercase tracking-wider font-semibold text-[#1E1B18] flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Crosshair className={`w-4 h-4 text-[#6E5043] ${detectingGps ? 'animate-spin' : ''}`} />
                  <span>{detectingGps ? 'Detecting GPS Device Location...' : 'Use My Current GPS Location'}</span>
                </button>
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-[#FFEBEE] border border-[#FFCDD2] text-[#C62828] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Verified Doorstep Address Card */}
              <div className="p-3.5 bg-[#F3EFEA] border border-[#ECE6DD] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E5043] flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Auto-Extracted Doorstep Info</span>
                  </span>
                  {geocoding ? (
                    <span className="text-[10px] text-[#7C736A] flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Reverse Geocoding...
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#2E7D32] font-mono font-medium">
                      ✓ Pin Attached
                    </span>
                  )}
                </div>

                {rawDisplayName && (
                  <p className="text-xs text-[#5C544D] font-light leading-relaxed line-clamp-2">
                    {rawDisplayName}
                  </p>
                )}

                {/* Editable Street / House Details */}
                <div className="space-y-2 pt-1">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-1">
                      Street / Building / Flat No.
                    </label>
                    <input
                      type="text"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="e.g. Flat 402, Lotus Enclave, Linking Road"
                      className="w-full bg-[#FAF8F5] border border-[#D5CCC0] px-3 py-1.5 text-xs text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#D5CCC0] px-2.5 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#D5CCC0] px-2.5 py-1.5 text-xs text-[#1E1B18] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#7C736A] mb-1">
                        PIN Code
                      </label>
                      <input
                        type="text"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="e.g. 400050"
                        className="w-full bg-[#FAF8F5] border border-[#D5CCC0] px-2.5 py-1.5 text-xs font-mono text-[#1E1B18] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-[#ECE6DD] space-y-2">
              <div className="flex items-center justify-between text-[11px] text-[#7C736A]">
                <a
                  href={`https://www.google.com/maps?q=${lat},${lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline flex items-center gap-1 text-[#6E5043]"
                >
                  <span>Preview in Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="font-mono text-[10px]">
                  {lat.toFixed(4)}°, {lng.toFixed(4)}°
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-3 border border-[#D5CCC0] bg-[#FAF8F5] text-xs uppercase tracking-wider font-medium text-[#7C736A] hover:bg-[#F3EFEA] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 px-5 py-3 bg-[#231F1D] text-[#FAF8F5] text-xs uppercase tracking-wider font-semibold hover:bg-[#14110E] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm & Apply Location</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
