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
  HiXMark,
  HiChatBubbleOvalLeftEllipsis,
} from 'react-icons/hi2';
import api, { getFileUrl } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

// Fallback showcase ads
const DEFAULT_SHOWCASE_ADS = [
  {
    id: 'showcase-1',
    title: 'D-MART Supermarket • Fresh Groceries',
    tagline: 'Flat 15% OFF on monthly groceries & farm dairy with 30-min doorstep delivery!',
    description: 'Verified community partner with exclusive discounts on over 500+ items.',
    banner_image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    shop_name: 'D-MART Supermarket',
    badge: '15% OFF • 30-MIN DELIVERY',
    action_type: 'whatsapp',
    action_url: '9876543210',
    action_text: 'Order on WhatsApp',
    accentColor: 'emerald',
  },
  {
    id: 'showcase-2',
    title: 'Smart RFID Boom Barriers & Gates',
    tagline: 'Automated resident vehicle entry, visitor QR passes & 24/7 maintenance.',
    description: 'Contactless layout gate automation by Jishnu Infotech.',
    banner_image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80',
    shop_name: 'Jishnu Infotech Automation',
    badge: 'SECURITY AUTOMATION',
    action_type: 'call',
    action_url: '9566823219',
    action_text: 'Call Specialist',
    accentColor: 'blue',
  },
  {
    id: 'showcase-3',
    title: 'Verified Home Maintenance Services',
    tagline: 'Certified technicians: Electrician, Plumbing, RO service & AC repair.',
    description: 'Doorstep service within 45 mins with transparent pricing.',
    banner_image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
    shop_name: 'Sri Krishna Home Care',
    badge: 'DOORSTEP IN 45 MINS',
    action_type: 'call',
    action_url: '9876543210',
    action_text: 'Book Technician',
    accentColor: 'amber',
  },
];

export default function AdSideView({ panel = 'member', associationId = null, className = '' }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ads, setAds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);

  // Mobile Right Side Drawer State
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const SLIDE_DURATION = 6000;
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

  // Auto rotation timer
  useEffect(() => {
    if (activeAds.length <= 1 || isHovered) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentIndex((idx) => (idx + 1) % activeAds.length);
          return 0;
        }
        return prev + (PROGRESS_INTERVAL / SLIDE_DURATION) * 100;
      });
    }, PROGRESS_INTERVAL);

    return () => clearInterval(timer);
  }, [activeAds.length, isHovered]);

  const nextSlide = () => {
    setProgress(0);
    setCurrentIndex((prev) => (prev + 1) % activeAds.length);
  };

  const prevSlide = () => {
    setProgress(0);
    setCurrentIndex((prev) => (prev - 1 + activeAds.length) % activeAds.length);
  };

  const handleAdClick = (ad) => {
    if (!ad) return;

    if (ad.id && !String(ad.id).startsWith('showcase-')) {
      api.post(`/ads/${ad.id}/click`).catch((err) => console.warn('Click track err:', err));
    }

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
    <>
      {/* ======================================================== */}
      {/* 1. RIGHT SIDEBAR DESKTOP VIEW & IN-FLOW RESPONSIVE CARD */}
      {/* ======================================================== */}
      <aside
        className={`w-full xl:w-80 2xl:w-84 xl:flex-shrink-0 sticky top-20 self-start space-y-3 select-none ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Main Side View Sponsored Container */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-gray-200/90 dark:border-slate-800 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
          {/* Header Row */}
          <div className="px-3.5 py-2.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-gray-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold shadow-xs">
                📢
              </span>
              <div>
                <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1">
                  <span>Sponsored</span>
                  <HiSparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                </span>
              </div>
            </div>

            {/* Slide Index Badge & Arrows */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-extrabold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {currentIndex + 1}/{activeAds.length}
              </span>

              {activeAds.length > 1 && (
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={prevSlide}
                    className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Previous advertisement"
                  >
                    <HiChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={nextSlide}
                    className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Next advertisement"
                  >
                    <HiChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Ad Creative Image (Vertical / 16:9 Right-Rail Aspect Ratio) */}
          <div
            className="relative w-full h-44 sm:h-48 cursor-pointer overflow-hidden group bg-slate-950"
            onClick={() => handleAdClick(currentAd)}
          >
            {bannerUrl ? (
              <img
                src={bannerUrl}
                alt={currentAd.title}
                className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 text-amber-400 text-3xl font-black">
                🛍️
              </div>
            )}

            {/* Gradient Overlay for Crisp Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

            {/* Top Badges */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 pointer-events-none">
              {currentAd.badge && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-md">
                  {currentAd.badge}
                </span>
              )}
              {currentAd.shop_name && (
                <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/60 text-white backdrop-blur-md border border-white/20">
                  <HiCheckBadge className="w-3 h-3 text-cyan-400" />
                  <span className="truncate max-w-[120px]">{currentAd.shop_name}</span>
                </span>
              )}
            </div>

            {/* Title Overlay in Image Bottom */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
              <h4 className="text-xs sm:text-sm font-black leading-tight line-clamp-2 drop-shadow-md">
                {currentAd.title}
              </h4>
            </div>
          </div>

          {/* Auto Rotation Progress Bar */}
          <div className="w-full h-1 bg-gray-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Ad Details & Direct Action Buttons */}
          <div className="p-3.5 space-y-3">
            {/* Tagline / Value Proposition */}
            {currentAd.tagline && (
              <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                {currentAd.tagline}
              </p>
            )}

            {/* Call to Action Button (Android & Mobile Friendly) */}
            <button
              type="button"
              onClick={() => handleAdClick(currentAd)}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 active:scale-98 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer touch-manipulation"
            >
              {currentAd.action_type === 'whatsapp' ? (
                <>
                  <HiChatBubbleOvalLeftEllipsis className="w-4 h-4 text-emerald-200" />
                  <span>{currentAd.action_text || 'Order on WhatsApp'}</span>
                </>
              ) : currentAd.action_type === 'call' ? (
                <>
                  <HiPhone className="w-4 h-4 text-white" />
                  <span>{currentAd.action_text || 'Call Merchant'}</span>
                </>
              ) : (
                <>
                  <HiArrowTopRightOnSquare className="w-4 h-4 text-white" />
                  <span>{currentAd.action_text || 'View Offer'}</span>
                </>
              )}
            </button>

            {/* Slide Dots Indicator */}
            {activeAds.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-1">
                {activeAds.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setProgress(0);
                      setCurrentIndex(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === currentIndex
                        ? 'w-6 bg-amber-500 dark:bg-amber-400'
                        : 'w-1.5 bg-gray-300 dark:bg-slate-700 hover:bg-gray-400'
                    }`}
                    title={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer: Merchant / Vendor Ad Posting Prompt */}
          <div className="px-3 py-2 bg-gray-50/80 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
            <span className="text-gray-500 dark:text-gray-400 truncate">
              Local Verified Shops • 500+ Residents
            </span>
            {user?.role === 'vendor' ? (
              <button
                type="button"
                onClick={() => navigate('/vendor/ads')}
                className="font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer flex-shrink-0"
              >
                + Post Ad
              </button>
            ) : (
              <span className="font-extrabold text-amber-600 dark:text-amber-400 flex-shrink-0">
                Official Ads
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. ANDROID & MOBILE FLOATING RIGHT-EDGE QUICK TAB */}
      {/* ======================================================== */}
      <div className="block xl:hidden fixed right-0 top-36 z-30">
        <button
          type="button"
          onClick={() => {
            if (navigator.vibrate) navigator.vibrate(60);
            setMobileDrawerOpen(true);
          }}
          className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs py-2 px-2.5 rounded-l-2xl shadow-xl border-y border-l border-amber-300 flex items-center gap-1.5 cursor-pointer touch-manipulation transition"
          title="Open Sponsored Deals & Ads"
        >
          <span className="text-sm">📢</span>
          <span className="writing-vertical sm:writing-horizontal text-[10px] tracking-wider uppercase font-black">
            Deals
          </span>
          <span className="w-4 h-4 rounded-full bg-slate-950 text-amber-300 text-[9px] flex items-center justify-center font-bold">
            {activeAds.length}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 3. ANDROID MOBILE RIGHT-SIDE SLIDE DRAWER (SIDE VIEW) */}
      {/* ======================================================== */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end xl:hidden bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          {/* Backdrop Tap to Close */}
          <div
            className="flex-1"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Right-Side Slide Panel */}
          <div className="w-full max-w-xs sm:max-w-sm h-full bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📢</span>
                <div>
                  <h3 className="font-black text-sm text-gray-900 dark:text-white uppercase">
                    Local Deals & Ads
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Sponsored Community Showcase
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 transition cursor-pointer"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content: Active Ads List */}
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              {activeAds.map((ad, idx) => {
                const img = ad.banner_image
                  ? ad.banner_image.startsWith('http')
                    ? ad.banner_image
                    : getFileUrl(ad.banner_image)
                  : null;

                return (
                  <div
                    key={ad.id || idx}
                    className="rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm bg-gray-50 dark:bg-slate-800/60 p-3 space-y-2.5"
                  >
                    {img && (
                      <div className="relative w-full h-32 rounded-xl overflow-hidden bg-slate-950">
                        <img src={img} alt={ad.title} className="w-full h-full object-cover" />
                        {ad.badge && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-600 text-white shadow-xs">
                            {ad.badge}
                          </span>
                        )}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                          {ad.shop_name || 'Verified Vendor'}
                        </span>
                        <span className="text-[9px] font-mono text-gray-400">
                          #{idx + 1}
                        </span>
                      </div>
                      <h4 className="font-black text-xs text-gray-900 dark:text-white mt-0.5">
                        {ad.title}
                      </h4>
                      {ad.tagline && (
                        <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                          {ad.tagline}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleAdClick(ad);
                        setMobileDrawerOpen(false);
                      }}
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      {ad.action_type === 'whatsapp' ? (
                        <>
                          <HiChatBubbleOvalLeftEllipsis className="w-4 h-4" />
                          <span>Order on WhatsApp</span>
                        </>
                      ) : ad.action_type === 'call' ? (
                        <>
                          <HiPhone className="w-4 h-4" />
                          <span>Call Vendor</span>
                        </>
                      ) : (
                        <>
                          <HiArrowTopRightOnSquare className="w-4 h-4" />
                          <span>View Offer</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 bg-gray-50 dark:bg-slate-800 border-t border-gray-100 dark:border-slate-800 text-center">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-full py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Deals
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
