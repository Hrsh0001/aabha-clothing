'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Crosshair,
  Search,
  Check,
  Building2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Truck,
  Sparkles,
} from 'lucide-react';
import { InteractiveMap } from '@/src/components/InteractiveMap';
import { BrandLogo } from '@/src/components/BrandLogo';

const DEFAULT_LAT = 19.076;
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

export default function SelectLocationPage() {
  const router = useRouter();
  const [lat, setLat] = useState<number>(DEFAULT_LAT);
  const [lng, setLng] = useState<number>(DEFAULT_LNG);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  // Address fields
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [stateName, setStateName] = useState('Maharashtra');
  const [pincode, setPincode] = useState('');
  const [rawDisplayName, setRawDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Check saved location from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aabha_delivery_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.latitude && parsed.longitude) {
          setLat(parsed.latitude);
          setLng(parsed.longitude);
          if (parsed.address) setStreetAddress(parsed.address);
          if (parsed.city) setCity(parsed.city);
          if (parsed.state) setStateName(parsed.state);
          if (parsed.pincode) setPincode(parsed.pincode);
          return;
        }
      }
    } catch (e) {}

    // Auto reverse geocode default location
    reverseGeocode(DEFAULT_LAT, DEFAULT_LNG);
  }, []);

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
          headers: { 'Accept-Language': 'en' },
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
      console.warn('Nominatim error:', err);
    } finally {
      setGeocoding(false);
    }
  };

  const handleMapLocationChange = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    triggerReverseGeocode(newLat, newLng);
  };

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
          setErrorMsg('Location permission denied. Please allow access in browser or search your area.');
        } else {
          setErrorMsg('Unable to retrieve current location. Please search your area.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

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
        setErrorMsg(`Could not locate "${query}". Try searching with your city.`);
      }
    } catch (err) {
      setErrorMsg('Search service busy. Please drag the pin directly on the map.');
    } finally {
      setSearching(false);
    }
  };

  const handleApplyLocation = () => {
    const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    const fullLoc = {
      latitude: lat,
      longitude: lng,
      address: streetAddress,
      city: city || 'Mumbai',
      state: stateName || 'Maharashtra',
      pincode,
      mapUrl: googleMapsUrl,
    };

    try {
      localStorage.setItem('aabha_delivery_location', JSON.stringify(fullLoc));
      localStorage.setItem('aabha_location_updated', Date.now().toString());
    } catch (e) {}

    setSavedSuccess(true);
    setTimeout(() => {
      // Redirect back to root storefront checkout
      router.push('/?checkout=1');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1E1B18] flex flex-col font-sans">
      {/* Editorial Luxury Top Bar */}
      <header className="bg-[#F3EFEA] border-b border-[#ECE6DD] px-4 sm:px-8 py-3.5 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 text-[#1E1B18] hover:text-[#6E5043] transition-colors inline-flex items-center gap-1 text-xs uppercase tracking-wider font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Return to Storefront</span>
          </Link>
          <div className="h-4 w-px bg-[#D5CCC0] hidden sm:block"></div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#6E5043]" />
            <h1 className="font-serif text-lg sm:text-xl font-normal text-[#1E1B18]">
              Doorstep Map Selection
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 bg-[#FAF8F5] border border-[#ECE6DD] text-[#2E7D32] font-semibold">
            100% FREE GPS
          </span>
          <span className="text-xs text-[#7C736A] font-light hidden md:inline">
            AABHA CLOTHING Couture Dispatch
          </span>
        </div>
      </header>

      {/* Main Viewport: Full Responsive Split Screen (Map on Left, Form on Right) */}
      <main className="flex-1 flex flex-col lg:grid lg:grid-cols-12 min-h-0">
        {/* Map Column: Occupies 7 columns on desktop, upper screen on mobile */}
        <section className="w-full h-[55vh] lg:h-[calc(100vh-61px)] lg:col-span-7 relative bg-[#EAE4DC] border-b lg:border-b-0 lg:border-r border-[#ECE6DD]">
          <InteractiveMap
            latitude={lat}
            longitude={lng}
            zoom={16}
            onLocationChange={handleMapLocationChange}
            height="100%"
            className="w-full h-full"
            interactive={true}
          />
        </section>

        {/* Address & Controls Column: 5 columns on desktop, lower screen on mobile */}
        <section className="flex-1 lg:col-span-5 p-4 sm:p-8 bg-[#FAF8F5] overflow-y-auto flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[#7C736A] mb-1 font-medium">
                Step: Exact Doorstep Pinpoint
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl text-[#1E1B18] font-normal leading-tight">
                Where should we deliver your garments?
              </h2>
              <p className="text-xs text-[#5C544D] font-light mt-1.5 leading-relaxed">
                Click or drag the red pin marker on the map to pinpoint your exact gate or apartment entrance.
                Courier riders receive turn-by-turn navigation directly to this pin.
              </p>
            </div>

            {/* Search and GPS controls */}
            <div className="space-y-2.5">
              <form onSubmit={handleSearchArea} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#7C736A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search locality, building, street, or city..."
                    className="w-full bg-[#FAF8F5] border border-[#D5CCC0] pl-9 pr-3 py-2.5 text-sm text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching || !searchQuery.trim()}
                  className="px-5 py-2.5 bg-[#231F1D] text-[#FAF8F5] text-xs uppercase tracking-wider font-medium hover:bg-[#14110E] transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {searching ? '...' : 'Search'}
                </button>
              </form>

              {/* Quick Indian City Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                <span className="text-[10px] uppercase tracking-wider text-[#7C736A] shrink-0 font-medium">
                  Cities:
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
                    className="px-2.5 py-1 bg-[#F3EFEA] hover:bg-[#231F1D] hover:text-[#FAF8F5] border border-[#ECE6DD] text-[#5C544D] text-[11px] whitespace-nowrap transition-colors cursor-pointer shrink-0"
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              {/* 1-Click GPS Button */}
              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={detectingGps}
                className="w-full py-3 px-4 bg-[#FAF8F5] border border-[#D5CCC0] hover:bg-[#F3EFEA] text-xs uppercase tracking-wider font-semibold text-[#1E1B18] flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-60"
              >
                <Crosshair className={`w-4 h-4 text-[#6E5043] ${detectingGps ? 'animate-spin' : ''}`} />
                <span>{detectingGps ? 'Acquiring GPS Satellite Signal...' : 'Auto-Detect My Current GPS Location'}</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-[#FFEBEE] border border-[#FFCDD2] text-[#C62828] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Auto-Extracted Doorstep Details Card */}
            <div className="p-4 sm:p-5 bg-[#F3EFEA] border border-[#ECE6DD] space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6E5043] flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  <span>Doorstep Destination Details</span>
                </span>
                {geocoding ? (
                  <span className="text-[11px] text-[#7C736A] flex items-center gap-1 font-mono">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Resolving...
                  </span>
                ) : (
                  <span className="text-[11px] text-[#2E7D32] font-mono font-semibold">
                    ✓ GPS Pinned
                  </span>
                )}
              </div>

              {rawDisplayName && (
                <p className="text-xs text-[#5C544D] font-light leading-relaxed line-clamp-2">
                  {rawDisplayName}
                </p>
              )}

              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#7C736A] mb-1 font-medium">
                    House / Flat No., Apartment, Street Address *
                  </label>
                  <input
                    type="text"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="e.g. 402, Lotus Enclave, Linking Road"
                    className="w-full bg-[#FAF8F5] border border-[#D5CCC0] px-3.5 py-2 text-sm text-[#1E1B18] focus:outline-none focus:border-[#1E1B18]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#7C736A] mb-1 font-medium">
                      City *
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-[#D5CCC0] px-3 py-2 text-sm text-[#1E1B18] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#7C736A] mb-1 font-medium">
                      State *
                    </label>
                    <input
                      type="text"
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-[#D5CCC0] px-3 py-2 text-sm text-[#1E1B18] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#7C736A] mb-1 font-medium">
                      PIN Code *
                    </label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="e.g. 400050"
                      className="w-full bg-[#FAF8F5] border border-[#D5CCC0] px-3 py-2 text-sm font-mono text-[#1E1B18] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Confirm Button & Google Maps External Preview */}
          <div className="pt-4 border-t border-[#ECE6DD] space-y-3">
            <div className="flex items-center justify-between text-xs text-[#7C736A]">
              <a
                href={`https://www.google.com/maps?q=${lat},${lng}`}
                target="_blank"
                rel="noreferrer"
                className="hover:underline flex items-center gap-1 text-[#6E5043] font-medium"
              >
                <span>Preview Coordinates in Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="font-mono text-[11px] text-[#2E7D32]">
                📍 {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
              </span>
            </div>

            {savedSuccess ? (
              <div className="py-3.5 bg-[#2E7D32] text-white text-xs uppercase tracking-wider font-semibold text-center flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                <span>Doorstep Location Applied! Returning to Checkout...</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleApplyLocation}
                className="w-full py-4 bg-[#231F1D] text-[#FAF8F5] text-xs uppercase tracking-[0.16em] font-semibold hover:bg-[#14110E] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Apply Doorstep Location to Order</span>
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
