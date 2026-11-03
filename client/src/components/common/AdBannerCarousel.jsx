import React, { useState, useEffect, useRef } from 'react';
import {
  HiSparkles,
  HiChevronLeft,
  HiChevronRight,
  HiArrowTopRightOnSquare,
  HiPhone,
  HiBuildingStorefront,
} from 'react-icons/hi2';
import api, { getFileUrl } from '../../services/api';

export default function AdBannerCarousel({ panel = 'member', associationId = null, className = '' }) {
  const [ads, setAds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const fetchAds = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (panel) params.append('panel', panel);
        if (associationId) params.append('association_id', associationId);

        const res = await api.get(`/ads/active?${params.toString()}`);
        if (isMounted) {
          setAds(res.data?.data || []);
        }
      } catch (err) {
        console.warn('Failed to load advertisements:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAds();

    return () => {
      isMounted = false;
    };
  }, [panel, associationId]);

  // Auto-slide carousel
  useEffect(() => {
    if (ads.length <= 1 || isHovered) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 5500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [ads.length, isHovered]);

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % ads.length);
  };

  const handleAdClick = (ad) => {
    if (!ad) return;

    // Track click asynchronously
    api.patch(`/ads/${ad.id}/click`).catch(() => {});

    // Open target action
    if (ad.action_type === 'whatsapp') {
      const cleanPhone = (ad.action_url || '').replace(/[^0-9]/g, '');
      const waNumber = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
      const msg = encodeURIComponent(`Hello, I saw your advertisement "${ad.title}" on EGATES Community Portal!`);
      window.open(`https://wa.me/${waNumber}?text=${msg}`, '_blank', 'noopener,noreferrer');
    } else if (ad.action_type === 'call') {
      const cleanPhone = (ad.action_url || '').replace(/[^0-9+]/g, '');
      window.location.href = `tel:${cleanPhone}`;
    } else if (ad.action_type === 'link' && ad.action_url) {
      let targetUrl = ad.action_url.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = `https://${targetUrl}`;
      }
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading || ads.length === 0) {
    return null;
  }

  const currentAd = ads[currentIndex];
  const bannerUrl = currentAd?.banner_image ? getFileUrl(currentAd.banner_image) : null;

  return (
    <div
      className={`relative rounded-2xl overflow-hidden shadow-sm border border-amber-200/60 dark:border-amber-800/40 bg-slate-900 group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Banner Background Container */}
      <div
        className="relative w-full h-44 sm:h-52 md:h-60 cursor-pointer overflow-hidden"
        onClick={() => handleAdClick(currentAd)}
      >
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt={currentAd.title}
            className="w-full h-full object-cover transform scale-100 group-hover:scale-[1.02] transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 flex items-center justify-center">
            <HiSparkles className="w-12 h-12 text-white/50" />
          </div>
        )}

        {/* Ambient Dark Gradient Overlays for High Contrast Text */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/30 to-transparent sm:max-w-xl" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-2 z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-400 text-slate-950 shadow-md">
            <HiSparkles className="w-3 h-3 text-slate-950" />
            Sponsored
          </span>
          {currentAd.shop_name && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-900/80 text-white backdrop-blur-md border border-white/20 shadow-sm">
              <HiBuildingStorefront className="w-3.5 h-3.5 text-amber-400" />
              {currentAd.shop_name}
            </span>
          )}
          {currentAd.association_name && (
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
              📍 {currentAd.association_name}
            </span>
          )}
        </div>

        {/* Bottom Banner Content */}
        <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3 z-10">
          <div className="max-w-xl text-left">
            <h3 className="text-base sm:text-xl md:text-2xl font-black text-white leading-tight drop-shadow-md">
              {currentAd.title}
            </h3>
            {currentAd.tagline && (
              <p className="text-xs sm:text-sm font-medium text-amber-200/90 mt-1 line-clamp-1 sm:line-clamp-2 drop-shadow">
                {currentAd.tagline}
              </p>
            )}
          </div>

          {/* Call-To-Action Button */}
          {currentAd.action_url && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAdClick(currentAd);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex-shrink-0 cursor-pointer"
            >
              {currentAd.action_type === 'whatsapp' ? (
                <>
                  <span className="text-sm">💬</span>
                  <span>{currentAd.action_text || 'Chat on WhatsApp'}</span>
                </>
              ) : currentAd.action_type === 'call' ? (
                <>
                  <HiPhone className="w-4 h-4 text-slate-950" />
                  <span>{currentAd.action_text || 'Call Now'}</span>
                </>
              ) : (
                <>
                  <span>{currentAd.action_text || 'Explore Offer'}</span>
                  <HiArrowTopRightOnSquare className="w-4 h-4 text-slate-950" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Carousel Navigation Arrows (Only when > 1 ad) */}
      {ads.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous advertisement"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer shadow-md"
          >
            <HiChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next advertisement"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer shadow-md"
          >
            <HiChevronRight className="w-5 h-5" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
            {ads.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  currentIndex === idx ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
