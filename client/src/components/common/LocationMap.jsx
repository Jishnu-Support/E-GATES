import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HiArrowTopRightOnSquare, HiMapPin, HiSparkles } from 'react-icons/hi2';

export default function LocationMap({
  latitude,
  longitude,
  address = '',
  title = 'Original Map Location',
  height = 'h-52',
  zoom = 16,
  className = '',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const numLat = latitude ? parseFloat(latitude) : null;
  const numLng = longitude ? parseFloat(longitude) : null;
  const hasValidCoords = Number.isFinite(numLat) && Number.isFinite(numLng) && (numLat !== 0 || numLng !== 0);

  // Fallback to Tamil Nadu / South India coordinates if GPS coordinates not yet obtained
  const effectiveLat = hasValidCoords ? numLat : 13.0827;
  const effectiveLng = hasValidCoords ? numLng : 80.2707;
  const effectiveZoom = hasValidCoords ? zoom : 12;

  const googleMapsUrl = hasValidCoords
    ? `https://maps.google.com/?q=${numLat},${numLng}`
    : `https://maps.google.com/?q=${encodeURIComponent(address || 'Tamil Nadu')}`;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Leaflet map instance if not already initialized
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [effectiveLat, effectiveLng],
        zoom: effectiveZoom,
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false, // Don't trap page scroll
      });

      // Add high-resolution OpenStreetMap standard tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      mapInstanceRef.current = map;
      setMapLoaded(true);
    } else {
      mapInstanceRef.current.setView([effectiveLat, effectiveLng], effectiveZoom);
    }

    const map = mapInstanceRef.current;

    // Create custom pulsing emergency map pin
    const sosMarkerHtml = `
      <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
        <span style="position: absolute; width: 40px; height: 40px; border-radius: 9999px; background: rgba(220, 38, 38, 0.45); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <div style="position: relative; width: 28px; height: 28px; border-radius: 9999px; background: #dc2626; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35); display: flex; align-items: center; justify-content: center; color: white;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px;">
            <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.063-4.17 3.063-6.195A7.5 7.5 0 0012 5.625a7.5 7.5 0 00-7.25 7.5c0 2.025 1.119 4.205 3.063 6.195a19.58 19.58 0 002.683 2.282 16.975 16.975 0 001.144.742zM12 15.375a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>
    `;

    const sosIcon = L.divIcon({
      className: 'leaflet-sos-pulse-marker',
      html: sosMarkerHtml,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([effectiveLat, effectiveLng]);
    } else {
      markerRef.current = L.marker([effectiveLat, effectiveLng], { icon: sosIcon }).addTo(map);
    }

    if (address || hasValidCoords) {
      const popupText = `
        <div style="font-family: system-ui, sans-serif; font-size: 12px; line-height: 1.4; max-width: 200px;">
          <b style="color: #dc2626; display: block; margin-bottom: 2px;">🚨 SOS Emergency Location</b>
          <span>${address || 'Resident Location'}</span>
          ${hasValidCoords ? `<div style="font-size: 10px; color: #64748b; margin-top: 4px; font-family: monospace;">GPS: ${numLat.toFixed(5)}, ${numLng.toFixed(5)}</div>` : ''}
        </div>
      `;
      markerRef.current.bindPopup(popupText);
    }

    // Force tile recalculation when component mounts or modal transitions
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
    };
  }, [effectiveLat, effectiveLng, effectiveZoom, address, hasValidCoords]);

  // Teardown map on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-gray-50/90 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white">
          <HiMapPin className="w-4 h-4 text-red-600 animate-bounce" />
          <span>{title}</span>
          <span className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <HiSparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Live Map
          </span>
        </div>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
          title="Open in Google Maps for live driving directions"
        >
          <span>Open in Google Maps</span>
          <HiArrowTopRightOnSquare className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Interactive Map Canvas */}
      <div className="relative">
        <div
          ref={mapContainerRef}
          className={`w-full ${height} z-0 bg-slate-100 dark:bg-slate-950`}
        />

        {/* Map controls helper badge */}
        <div className="absolute bottom-2 left-2 z-[400] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] text-gray-600 dark:text-gray-300 shadow-xs border border-gray-200 dark:border-slate-700 pointer-events-none">
          {hasValidCoords ? '📍 Exact GPS Location Pin' : '📍 Layout Residence Location'}
        </div>
      </div>

      {/* Address and GPS details footer */}
      <div className="px-3.5 py-2 bg-gray-50/70 dark:bg-slate-900/70 border-t border-gray-100 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-gray-600 dark:text-gray-400">
        <div className="truncate max-w-full">
          <span className="font-semibold text-gray-800 dark:text-gray-200">Address:</span>{' '}
          <span className="truncate">{address || 'Registered Association Residence'}</span>
        </div>
        {hasValidCoords && (
          <div className="font-mono text-[10px] text-gray-500 dark:text-gray-400 shrink-0">
            GPS: {numLat.toFixed(5)}, {numLng.toFixed(5)}
          </div>
        )}
      </div>
    </div>
  );
}
