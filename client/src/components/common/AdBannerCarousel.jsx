import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiSparkles,
  HiChevronLeft,
  HiChevronRight,
  HiArrowTopRightOnSquare,
  HiPhone,
  HiBuildingStorefront,
  HiShieldCheck,
  HiCheckBadge,
  HiTag,
  HiMegaphone,
} from 'react-icons/hi2';
import api, { getFileUrl } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

// Fallback showcase ads if database is empty
const DEFAULT_SHOWCASE_ADS = [
  {
    id: 'showcase-1',
    title: 'D-MART Supermarket • Daily Essentials & Fresh Groceries',
    tagline: 'Flat 15% OFF on monthly grocery bundles & farm fresh dairy with free 30-min doorstep delivery!',
    description: 'Exclusive layout community partnership with verified resident discounts on over 500+ items.',
    banner_image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
    shop_name: 'D-MART Supermarket',
    badge: 'FLAT 15% OFF • 30-MIN DELIVERY',
    action_type: 'whatsapp',
    action_url: '9876543210',
    action_text: 'Order on WhatsApp',
    gradient: 'from-emerald-950/90 via-slate-950/80 to-slate-950/95',
    accentColor: 'emerald',
  },
  {
    id: 'showcase-2',
    title: 'Smart RFID Boom Barriers & Automated Layout Gates',
    tagline: 'Automated resident vehicle entry, visitor QR passes, and 24/7 security maintenance by Jishnu Infotech.',
    description: 'Upgraded contactless gate automation for gated communities and layout residents.',
    banner_image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=1200&q=80',
    shop_name: 'Jishnu Infotech Official Partner',
    badge: 'SECURITY & AUTOMATION',
    action_type: 'call',
    action_url: '9566823219',
    action_text: 'Call Specialist',
    gradient: 'from-blue-950/90 via-slate-950/80 to-slate-950/95',
    accentColor: 'blue',
  },
  {
    id: 'showcase-3',
    title: 'Verified Home Maintenance • Electrician, Plumbing & AC',
    tagline: 'Certified layout technicians ready at your doorstep within 45 minutes. Transparent pricing & warranty.',
    description: 'Emergency electrical repairs, plumbing leaks, water purifier RO service, and deep home sanitization.',
    banner_image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80',
    shop_name: 'Sri Krishna Home Care',
    badge: 'DOORSTEP IN 45 MINS',
    action_type: 'call',
    action_url: '9876543210',
    action_text: 'Book Technician',
    gradient: 'from-amber-950/90 via-slate-950/80 to-slate-950/95',
    accentColor: 'amber',
  },
];

export default function AdBannerCarousel({ panel = 'member', associationId = null, className = '' }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ads, setAds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);

  const SLIDE_DURATION = 6000; // 6 seconds per slide
  const PROGRESS_INTERVAL = 50;

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
          const fetched = res.data?.data || [];
          setAds(fetched.length > 0 ? fetched : DEFAULT_SHOWCASE_ADS);
        }
      } catch (err) {
        console.warn('Failed to load advertisements:', err);
        if (isMounted) setAds(DEFAULT_SHOWCASE_ADS);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAds();

    return () => {
      isMounted = false;
    };
  }, [panel, associationId]);

  const activeAds = ads.length > 0 ? ads : DEFAULT_SHOWCASE_ADS;

  // Auto-slide carousel with smooth animated progress bar
  useEffect(() => {
    if (activeAds.length <= 1) return;

    if (isHovered) {
      return;
    }

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentIndex((curr) => (curr + 1) % activeAds.length);
          return 0;
        }
        return prev + (PROGRESS_INTERVAL / SLIDE_DURATION) * 100;
      });
    }, PROGRESS_INTERVAL);

    return () => {
      clearInterval(progressTimer);
    };
  }, [activeAds.length, isHovered, currentIndex]);

  const handlePrev = (e) => {
    e.stopPropagation();
    setProgress(0);
    setCurrentIndex((prev) => (prev - 1 + activeAds.length) % activeAds.length);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setProgress(0);
    setCurrentIndex((prev) => (prev + 1) % activeAds.length);
  };

  const handleAdClick = (ad) => {
    if (!ad) return;

    // Track click asynchronously if it is a real DB ad
    if (typeof ad.id === 'number' || (typeof ad.id === 'string' && !ad.id.startsWith('showcase-'))) {
      api.patch(`/ads/${ad.id}/click`).catch(() => {});
    }

    // Trigger target action
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

  const currentAd = activeAds[currentIndex] || activeAds[0];
  const bannerUrl = currentAd?.banner_image
    ? currentAd.banner_image.startsWith('http')
      ? currentAd.banner_image
      : getFileUrl(currentAd.banner_image)
    : null;

  return (
    <div
      className={`relative rounded-3xl overflow-hidden shadow-xl border border-gray-200/80 dark:border-slate-800 bg-slate-950 group select-none ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Media & Dynamic Gradient Overlays */}
      <div
        className="relative w-full min-h-[220px] sm:min-h-[250px] md:min-h-[270px] cursor-pointer overflow-hidden flex flex-col justify-between p-4 sm:p-6 md:p-7"
        onClick={() => handleAdClick(currentAd)}
      >
        {/* Creative Background Image */}
        {bannerUrl && (
          <img
            key={currentAd.id}
            src={bannerUrl}
            alt={currentAd.title}
            className="absolute inset-0 w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-1000 ease-out"
          />
        )}

        {/* Cinematic Multi-layered Contrast Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent sm:max-w-2xl" />

        {/* TOP ROW: SPONSOR BADGE, SHOP TAG, SLIDE COUNTER */}
        <div className="relative z-10 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md">
              <HiSparkles className="w-3.5 h-3.5 text-slate-950" />
              <span>Sponsored</span>
            </span>

            {currentAd.badge && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white shadow-sm">
                <HiTag className="w-3 h-3" />
                {currentAd.badge}
              </span>
            )}

            {currentAd.shop_name && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/10 text-white backdrop-blur-md border border-white/20 shadow-xs">
                <HiBuildingStorefront className="w-3.5 h-3.5 text-amber-300" />
                <span>{currentAd.shop_name}</span>
                <HiCheckBadge className="w-3.5 h-3.5 text-cyan-400 ml-0.5" title="Verified Merchant" />
              </span>
            )}

            {currentAd.association_name && (
              <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                📍 {currentAd.association_name}
              </span>
            )}
          </div>

          {/* Right Header: Slide Counter & Place Ad Action */}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-black/60 text-white/90 backdrop-blur-md border border-white/10">
              {currentIndex + 1} / {activeAds.length}
            </span>

            {user?.role === 'vendor' ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/vendor/ads');
                }}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 backdrop-blur-md transition cursor-pointer"
                title="Post your advertisement banner"
              >
                <HiMegaphone className="w-3.5 h-3.5" />
                <span>Post Your Ad</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* MIDDLE / BOTTOM CONTENT */}
        <div className="relative z-10 mt-4 sm:mt-6 max-w-2xl space-y-2 text-left">
          <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-white leading-tight tracking-tight drop-shadow-lg">
            {currentAd.title}
          </h2>

          {currentAd.tagline && (
            <p className="text-xs sm:text-sm font-medium text-amber-200/95 leading-relaxed line-clamp-2 drop-shadow">
              {currentAd.tagline}
            </p>
          )}

          {/* Value Props Strip */}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-semibold text-white/80">
            <span className="flex items-center gap-1 text-emerald-300">
              <HiShieldCheck className="w-4 h-4 text-emerald-400" />
              Verified Community Partner
            </span>
            <span className="hidden sm:inline text-white/40">•</span>
            <span className="hidden sm:inline text-amber-200">
              ⭐ 4.9 Rating from Layout Residents
            </span>
          </div>

          {/* ACTION BUTTON ROW */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAdClick(currentAd);
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              {currentAd.action_type === 'whatsapp' ? (
                <>
                  <span className="text-base">💬</span>
                  <span>{currentAd.action_text || 'Order on WhatsApp'}</span>
                </>
              ) : currentAd.action_type === 'call' ? (
                <>
                  <HiPhone className="w-4 h-4 text-slate-950" />
                  <span>{currentAd.action_text || 'Call Specialist'}</span>
                </>
              ) : (
                <>
                  <span>{currentAd.action_text || 'Explore Offer'}</span>
                  <HiArrowTopRightOnSquare className="w-4 h-4 text-slate-950" />
                </>
              )}
            </button>

            {/* Secondary Prompt for Visitors */}
            <span className="text-[11px] text-white/60 hidden md:inline">
              Tap banner to contact merchant directly
            </span>
          </div>
        </div>

        {/* Animated Progress Bar Running Along Bottom Edge */}
        {activeAds.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Carousel Navigation Arrows (Visible on Desktop / Hover) */}
      {activeAds.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous advertisement"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer shadow-lg border border-white/20"
          >
            <HiChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next advertisement"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer shadow-lg border border-white/20"
          >
            <HiChevronRight className="w-5 h-5" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
            {activeAds.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setProgress(0);
                  setCurrentIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  currentIndex === idx ? 'w-6 bg-amber-400' : 'w-1.5 bg-white/40 hover:bg-white/70'
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
