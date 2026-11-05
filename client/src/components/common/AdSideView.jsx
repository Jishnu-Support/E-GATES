import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiBuildingStorefront,
  HiPhone,
  HiArrowTopRightOnSquare,
  HiEye,
} from 'react-icons/hi2';
import api, { getFileUrl } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

// Fallback showcase ads without clutter
export const DEFAULT_PICTURE_ADS = [
  {
    id: 'showcase-pic-1',
    media_type: 'image',
    shop_name: 'AMMAN MOTORS MARUTI',
    title: 'Express 30-Min Two Wheeler & Car Service',
    banner_image: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80',
    badge: '15% OFF',
    call_phone: '9566823219',
    store_url: '/member/marketplace',
    impression_count: 1851,
  },
  {
    id: 'showcase-pic-2',
    media_type: 'image',
    shop_name: 'D-MART Supermarket',
    title: 'Daily Essentials & Fresh Groceries Delivery',
    banner_image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    badge: 'SUPER SAVER',
    call_phone: '9876543210',
    store_url: '/member/marketplace',
    impression_count: 2430,
  },
];

export const DEFAULT_VIDEO_ADS = [
  {
    id: 'showcase-vid-1',
    media_type: 'video',
    shop_name: 'Green Bloom Agro Nursery',
    title: 'Organic Home Garden Plants & Flora',
    video_url: '/ads/sample-ad-video.mp4',
    banner_image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80',
    action_text: 'Visit Sponsor',
    call_phone: '9566823219',
    store_url: '/member/marketplace',
    impression_count: 1851,
  },
];

const formatViews = (count) => {
  const num = parseInt(count, 10);
  if (isNaN(num) || num <= 0) return '1.8k';
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return String(num);
};

const resolveImageUrl = (img) => {
  if (!img) return '';
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  if (img.startsWith('/uploads/')) return img;
  if (img.startsWith('uploads/')) return '/' + img;
  return getFileUrl(img);
};

const resolveVideoUrl = (video) => {
  if (!video) return '/ads/sample-ad-video.mp4';
  if (video.startsWith('http://') || video.startsWith('https://') || video.startsWith('/ads/')) return video;
  if (video.startsWith('/uploads/')) return video;
  if (video.startsWith('uploads/')) return '/' + video;
  return getFileUrl(video);
};

export function useActiveAds(panel = 'member', associationId = null) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

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
          setAds(fetched);
        }
      } catch (err) {
        console.warn('Could not load advertisements:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAds();
    return () => { isMounted = false; };
  }, [panel, associationId]);

  const isVideoAd = (a) =>
    a.media_type === 'video' ||
    Boolean(a.video_url) ||
    a.ad_type === 'video' ||
    (typeof a.pricing_plan === 'string' && a.pricing_plan.includes('video'));

  const pictureAds = ads.filter((a) => !isVideoAd(a));
  const videoAds = ads.filter((a) => isVideoAd(a));

  return {
    pictureAds: pictureAds.length > 0 ? pictureAds : DEFAULT_PICTURE_ADS,
    videoAds: videoAds.length > 0 ? videoAds : DEFAULT_VIDEO_ADS,
    loading,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. COMPACT PICTURE ADVERTISEMENT (Reduced size, no unwanted clutter)
// ─────────────────────────────────────────────────────────────────────────────
export function AdPictureCard({ ads, isMobile = false }) {
  const navigate = useNavigate();
  const list = Array.isArray(ads) && ads.length > 0 ? ads : DEFAULT_PICTURE_ADS;
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (list.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % list.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [list.length]);

  const ad = list[currentIndex] || list[0];

  const handleAdClick = () => {
    if (ad.id && !String(ad.id).startsWith('showcase-')) {
      api.patch(`/ads/${ad.id}/click`).catch(() => {});
    }
  };

  const handleViewStore = (e) => {
    e?.stopPropagation();
    handleAdClick();
    if (ad.store_url) {
      if (ad.store_url.startsWith('http://') || ad.store_url.startsWith('https://')) {
        window.open(ad.store_url, '_blank', 'noopener,noreferrer');
      } else {
        navigate(ad.store_url);
      }
    } else {
      navigate('/member/marketplace');
    }
  };

  const handleCall = (e) => {
    e?.stopPropagation();
    handleAdClick();
    const phone = ad.call_phone || ad.action_url || ad.shop_phone || '9566823219';
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    window.location.href = `tel:${cleanPhone}`;
  };

  const imageUrl = resolveImageUrl(ad.banner_image);

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all overflow-hidden select-none ${
        isMobile ? 'w-full max-w-lg mx-auto mb-2.5' : 'w-full'
      }`}
    >
      {/* Sleek Header Bar */}
      <div className="px-2.5 py-1 bg-gray-50/90 dark:bg-slate-800/80 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
        <span className="font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Ad
        </span>
        <span className="flex items-center gap-1 font-bold text-gray-500 dark:text-gray-400">
          <HiEye className="w-3 h-3 opacity-70" />
          <span>{formatViews(ad.impression_count)} views</span>
        </span>
      </div>

      {/* Compact Image Banner */}
      <div
        className="relative w-full h-24 sm:h-28 overflow-hidden bg-slate-950 cursor-pointer"
        onClick={handleViewStore}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={ad.title}
            className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-900 text-amber-400 text-xl font-bold">
            🛍️
          </div>
        )}
        {ad.badge && (
          <span className="absolute top-1.5 left-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-600 text-white shadow-xs">
            {ad.badge}
          </span>
        )}
      </div>

      {/* Concise Content Bar */}
      <div className="p-2 sm:p-2.5 space-y-1.5">
        <div className="flex items-center justify-between gap-1">
          <span className="font-extrabold text-[11px] text-gray-900 dark:text-white truncate">
            {ad.shop_name || 'Community Store'}
          </span>
        </div>

        <h3
          className="text-xs font-bold text-gray-800 dark:text-gray-200 line-clamp-1 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition"
          onClick={handleViewStore}
        >
          {ad.title}
        </h3>

        {/* Compact Action Buttons (Only View Store & Call - WhatsApp removed) */}
        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={handleViewStore}
            className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
          >
            <HiBuildingStorefront className="w-3.5 h-3.5" />
            <span>View Store</span>
          </button>

          <button
            type="button"
            onClick={handleCall}
            className="py-1.5 px-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-95 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-slate-700 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
          >
            <HiPhone className="w-3.5 h-3.5 text-rose-500" />
            <span>Call</span>
          </button>
        </div>

        {/* Dots */}
        {list.length > 1 && (
          <div className="flex items-center justify-center gap-1 pt-0.5">
            {list.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  currentIndex === idx
                    ? 'w-3 h-1 bg-emerald-600 dark:bg-emerald-400'
                    : 'w-1 h-1 bg-gray-300 dark:bg-slate-700 hover:bg-gray-400'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. COMPACT VIDEO ADVERTISEMENT (Reduced size, no unwanted clutter)
// ─────────────────────────────────────────────────────────────────────────────
export function AdVideoCard({ ads, isMobile = false }) {
  const navigate = useNavigate();
  const list = Array.isArray(ads) && ads.length > 0 ? ads : DEFAULT_VIDEO_ADS;
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRef = useRef(null);

  const ad = list[currentIndex] || list[0];

  const handleAdClick = () => {
    if (ad.id && !String(ad.id).startsWith('showcase-')) {
      api.patch(`/ads/${ad.id}/click`).catch(() => {});
    }
  };

  const handleVisitSponsor = (e) => {
    e?.stopPropagation();
    handleAdClick();
    if (ad.store_url || ad.action_url) {
      const target = ad.store_url || ad.action_url;
      if (target.startsWith('http://') || target.startsWith('https://')) {
        window.open(target, '_blank', 'noopener,noreferrer');
      } else {
        navigate(target);
      }
    } else {
      navigate('/member/marketplace');
    }
  };

  const videoUrl = resolveVideoUrl(ad.video_url);
  const posterUrl = resolveImageUrl(ad.banner_image);

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all overflow-hidden select-none ${
        isMobile ? 'w-full max-w-lg mx-auto mt-4 mb-4' : 'w-full'
      }`}
    >
      {/* Sleek Header Bar (location tag removed) */}
      <div className="px-2.5 py-1 bg-gray-50/90 dark:bg-slate-800/80 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
        <span className="font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Video Ad
        </span>
        <span className="flex items-center gap-1 font-bold text-gray-500 dark:text-gray-400">
          <HiEye className="w-3 h-3 opacity-70" />
          <span>{formatViews(ad.impression_count)} views</span>
        </span>
      </div>

      {/* Reduced-Height Video Player */}
      <div className="relative w-full h-32 sm:h-36 bg-black overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          src={videoUrl}
          poster={posterUrl}
          controls
          playsInline
          preload="metadata"
          className="w-full h-full object-cover bg-black"
          onPlay={handleAdClick}
        >
          Your browser does not support HTML5 video.
        </video>
      </div>

      {/* Concise Content Bar */}
      <div className="p-2 sm:p-2.5 space-y-1.5">
        <div className="flex items-center justify-between gap-1">
          <span className="font-extrabold text-[11px] text-gray-900 dark:text-white truncate">
            {ad.shop_name || 'Featured Sponsor'}
          </span>
        </div>

        <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 line-clamp-1">
          {ad.title}
        </h3>

        {/* Compact CTA */}
        <button
          type="button"
          onClick={handleVisitSponsor}
          className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
        >
          <HiArrowTopRightOnSquare className="w-3.5 h-3.5" />
          <span>{ad.action_text || 'Visit Sponsor'}</span>
        </button>

        {/* Dots */}
        {list.length > 1 && (
          <div className="flex items-center justify-center gap-1 pt-0.5">
            {list.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  currentIndex === idx
                    ? 'w-3 h-1 bg-emerald-600 dark:bg-emerald-400'
                    : 'w-1 h-1 bg-gray-300 dark:bg-slate-700 hover:bg-gray-400'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. COMPACT DESKTOP RIGHT-SIDE AD RAIL (Default Export)
// Reduced width and concise spacing
// ─────────────────────────────────────────────────────────────────────────────
export default function AdSideView({ panel = 'member', associationId = null, className = '' }) {
  const { pictureAds, videoAds } = useActiveAds(panel, associationId);

  return (
    <aside
      className={`hidden xl:flex xl:flex-col xl:w-72 xl:flex-shrink-0 sticky top-20 self-start gap-3 select-none ${className}`}
      aria-label="Advertisements"
    >
      {/* 1. TOP ITEM: COMPACT PICTURE AD */}
      <AdPictureCard ads={pictureAds} />

      {/* 2. BOTTOM ITEM: COMPACT VIDEO AD */}
      <AdVideoCard ads={videoAds} />
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. COMPACT MOBILE BANNER EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
export function MobileTopPictureAd({ panel = 'member', associationId = null }) {
  const { pictureAds } = useActiveAds(panel, associationId);

  return (
    <div className="block xl:hidden w-full">
      <AdPictureCard ads={pictureAds} isMobile={true} />
    </div>
  );
}

export function MobileBottomVideoAd({ panel = 'member', associationId = null }) {
  const { videoAds } = useActiveAds(panel, associationId);

  return (
    <div className="block xl:hidden w-full">
      <AdVideoCard ads={videoAds} isMobile={true} />
    </div>
  );
}
