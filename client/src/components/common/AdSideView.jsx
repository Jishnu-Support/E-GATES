import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiSparkles,
  HiArrowTopRightOnSquare,
  HiPhone,
  HiBuildingStorefront,
  HiCheckBadge,
  HiTag,
  HiMegaphone,
  HiMapPin,
  HiEye,
  HiChatBubbleOvalLeftEllipsis,
  HiPlay,
  HiPause,
  HiSpeakerWave,
} from 'react-icons/hi2';
import api, { getFileUrl } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

// Fallback showcase ads featuring both Picture and Video formats
export const DEFAULT_PICTURE_ADS = [
  {
    id: 'showcase-pic-1',
    media_type: 'image',
    shop_name: 'AMMAN MOTORS MARUTI',
    distance: '3.4 km',
    location_name: 'Perandapalli',
    title: 'Express 30-Min Two Wheeler & Car Service',
    tagline: 'Authorized multi-brand automobile care: express engine oil service, computerized diagnostics, battery boost & 24/7 doorstep breakdown support.',
    banner_image: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=1200&q=80',
    badge: 'EXPRESS SERVICE',
    action_type: 'whatsapp',
    action_url: '9566823219',
    action_text: 'WhatsApp',
    call_phone: '9566823219',
    store_url: '/member/marketplace',
    impression_count: 1851,
  },
  {
    id: 'showcase-pic-2',
    media_type: 'image',
    shop_name: 'D-MART Supermarket',
    distance: '1.2 km',
    location_name: 'Hosur Town',
    title: 'Monthly Groceries, Farm Dairy & Fresh Produce',
    tagline: 'Flat 15% OFF on monthly grocery bundles & farm fresh dairy with free 30-min doorstep delivery to all community residents!',
    banner_image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
    badge: '15% OFF • 30-MIN DELIVERY',
    action_type: 'whatsapp',
    action_url: '9876543210',
    action_text: 'Order on WhatsApp',
    call_phone: '9876543210',
    store_url: '/member/marketplace',
    impression_count: 2430,
  },
];

export const DEFAULT_VIDEO_ADS = [
  {
    id: 'showcase-vid-1',
    media_type: 'video',
    shop_name: 'Green Bloom Agro & Landscaping',
    distance: '2.1 km',
    location_name: 'Perandapalli',
    title: 'Organic Home Garden Plants & Exotic Flora',
    tagline: 'Fresh flowering plants, organic vermicompost, bonsai trees and automated drip irrigation systems delivered directly to your doorstep.',
    video_url: '/ads/sample-ad-video.mp4',
    banner_image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80',
    badge: 'ORGANIC NURSERY',
    action_type: 'link',
    action_url: '/member/marketplace',
    action_text: 'Visit Sponsor',
    call_phone: '9566823219',
    store_url: '/member/marketplace',
    impression_count: 1851,
  },
];

// Helper to format view impressions
const formatViews = (count) => {
  const num = parseInt(count, 10);
  if (isNaN(num) || num <= 0) return '1,851';
  return num.toLocaleString('en-IN');
};

// Helper for image URLs
const resolveImageUrl = (img) => {
  if (!img) return '';
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  return getFileUrl(img);
};

// Helper for video URLs
const resolveVideoUrl = (video) => {
  if (!video) return '/ads/sample-ad-video.mp4';
  if (video.startsWith('http://') || video.startsWith('https://') || video.startsWith('/ads/')) return video;
  return getFileUrl(video);
};

// Hook to load active ads
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

  // Separate picture ads and video ads
  const pictureAds = ads.filter(
    (a) => a.media_type !== 'video' && !a.video_url
  );
  const videoAds = ads.filter(
    (a) => a.media_type === 'video' || Boolean(a.video_url)
  );

  return {
    pictureAds: pictureAds.length > 0 ? pictureAds : DEFAULT_PICTURE_ADS,
    videoAds: videoAds.length > 0 ? videoAds : DEFAULT_VIDEO_ADS,
    loading,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PICTURE ADVERTISEMENT COMPONENT (Matches Screenshots 1 & 2)
// ─────────────────────────────────────────────────────────────────────────────
export function AdPictureCard({ ads, isMobile = false }) {
  const navigate = useNavigate();
  const list = Array.isArray(ads) && ads.length > 0 ? ads : DEFAULT_PICTURE_ADS;
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-cycle picture ads if more than one
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
    e.stopPropagation();
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

  const handleWhatsApp = (e) => {
    e.stopPropagation();
    handleAdClick();
    const phone = ad.action_url || ad.shop_phone || '9566823219';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const waNumber = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    const msg = encodeURIComponent(
      `Hello ${ad.shop_name || 'Store'}, I saw your advertisement "${ad.title}" on EGATES Community Portal! I would like to inquire about your services/products.`
    );
    window.open(`https://wa.me/${waNumber}?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  const handleCall = (e) => {
    e.stopPropagation();
    handleAdClick();
    const phone = ad.call_phone || ad.action_url || ad.shop_phone || '9566823219';
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    window.location.href = `tel:${cleanPhone}`;
  };

  const imageUrl = resolveImageUrl(ad.banner_image);

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-gray-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden select-none group ${
        isMobile ? 'w-full mb-4' : 'w-full'
      }`}
    >
      {/* Top Header Bar: ADVERTISEMENT badge + View Count */}
      <div className="px-3 py-2 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800/80 dark:to-slate-900 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs">
        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md bg-gray-200/70 dark:bg-slate-800">
          ADVERTISEMENT
        </span>
        <span className="flex items-center gap-1 text-[11px] font-extrabold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-slate-800/90 px-2 py-0.5 rounded-full border border-gray-200 dark:border-slate-700">
          <HiEye className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          <span>{formatViews(ad.impression_count)} views</span>
        </span>
      </div>

      {/* Picture Creative Image */}
      <div
        className="relative w-full h-40 sm:h-48 overflow-hidden bg-slate-950 cursor-pointer"
        onClick={handleViewStore}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={ad.title}
            className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-900 text-amber-400 text-3xl font-black">
            🛍️
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />

        {ad.badge && (
          <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-md">
            {ad.badge}
          </span>
        )}
      </div>

      {/* Content Section */}
      <div className="p-3 sm:p-4 space-y-2.5">
        {/* Store Name & Distance Row */}
        <div className="flex items-center justify-between gap-1">
          <h4 className="font-black text-xs sm:text-sm text-gray-900 dark:text-white uppercase tracking-wide truncate flex items-center gap-1.5">
            <HiBuildingStorefront className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="truncate">{ad.shop_name || 'Verified Merchant'}</span>
            <HiCheckBadge className="w-4 h-4 text-cyan-500 flex-shrink-0" title="Verified Community Partner" />
          </h4>
          {ad.distance && (
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-md flex-shrink-0">
              {ad.distance}
            </span>
          )}
        </div>

        {/* Location Row */}
        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
          <HiMapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
          <span>{ad.location_name || 'Perandapalli'}</span>
        </div>

        {/* Ad Title */}
        <h3
          className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white leading-snug line-clamp-2 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition"
          onClick={handleViewStore}
        >
          {ad.title}
        </h3>

        {/* Tagline / Description */}
        {ad.tagline && (
          <p className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
            {ad.tagline}
          </p>
        )}

        {/* Action Buttons Row: View Store | WhatsApp | Call */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <button
            type="button"
            onClick={handleViewStore}
            className="py-2 px-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-xl font-black text-[11px] sm:text-xs flex items-center justify-center gap-1 shadow-xs transition cursor-pointer touch-manipulation whitespace-nowrap"
            title="View Store / Order Catalog"
          >
            <HiBuildingStorefront className="w-3.5 h-3.5" />
            <span>View Store</span>
          </button>

          <button
            type="button"
            onClick={handleWhatsApp}
            className="py-2 px-1.5 bg-green-500 hover:bg-green-600 active:scale-95 text-white rounded-xl font-black text-[11px] sm:text-xs flex items-center justify-center gap-1 shadow-xs transition cursor-pointer touch-manipulation whitespace-nowrap"
            title="Chat or Order on WhatsApp"
          >
            <HiChatBubbleOvalLeftEllipsis className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleCall}
            className="py-2 px-1.5 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-95 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded-xl font-black text-[11px] sm:text-xs flex items-center justify-center gap-1 shadow-xs transition cursor-pointer touch-manipulation whitespace-nowrap"
            title="Call Store Directly"
          >
            <HiPhone className="w-3.5 h-3.5 text-rose-500" />
            <span>Call</span>
          </button>
        </div>

        {/* Carousel Dots (when multiple picture ads are present) */}
        {list.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-1.5">
            {list.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  currentIndex === idx
                    ? 'w-4 h-1.5 bg-emerald-600 dark:bg-emerald-400'
                    : 'w-1.5 h-1.5 bg-gray-300 dark:bg-slate-700 hover:bg-gray-400'
                }`}
                aria-label={`Go to picture ad ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. VIDEO ADVERTISEMENT COMPONENT (Matches Screenshots 1 & 2)
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
    if (ad.action_type === 'whatsapp' || ad.shop_phone) {
      const phone = ad.action_url || ad.shop_phone || '9566823219';
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const waNumber = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
      const msg = encodeURIComponent(
        `Hello ${ad.shop_name || 'Sponsor'}, I watched your Video Advertisement "${ad.title}" on EGATES Community Portal! Please share more details.`
      );
      window.open(`https://wa.me/${waNumber}?text=${msg}`, '_blank', 'noopener,noreferrer');
    } else if (ad.store_url || ad.action_url) {
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
      className={`bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-gray-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden select-none ${
        isMobile ? 'w-full mt-6 mb-8' : 'w-full'
      }`}
    >
      {/* Top Header Bar: VIDEO ADVERTISEMENT + Location + View Count */}
      <div className="px-3 py-2 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800/80 dark:to-slate-900 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs gap-1.5 flex-wrap">
        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md bg-gray-200/70 dark:bg-slate-800">
          VIDEO ADVERTISEMENT
        </span>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-white bg-emerald-700 dark:bg-emerald-800 px-2 py-0.5 rounded-md shadow-xs">
            <HiMapPin className="w-3 h-3 text-rose-300" />
            <span>{ad.location_name || 'Perandapalli'}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-slate-800/90 px-2 py-0.5 rounded-full border border-gray-200 dark:border-slate-700">
            <HiEye className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            <span>{formatViews(ad.impression_count)} views</span>
          </span>
        </div>
      </div>

      {/* Video Player Box (Android / Desktop friendly) */}
      <div className="relative w-full aspect-video bg-black overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          src={videoUrl}
          poster={posterUrl}
          controls
          playsInline
          preload="metadata"
          className="w-full h-full object-contain bg-black"
          onPlay={handleAdClick}
        >
          Your browser does not support HTML5 video streaming.
        </video>
      </div>

      {/* Content Section */}
      <div className="p-3 sm:p-4 space-y-2.5">
        <div>
          <h4 className="font-black text-xs sm:text-sm text-gray-900 dark:text-white uppercase tracking-wide truncate">
            {ad.shop_name || 'Featured Community Sponsor'}
          </h4>
          <h3 className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 leading-snug line-clamp-2 mt-0.5">
            {ad.title}
          </h3>
          {ad.tagline && (
            <p className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed mt-1">
              {ad.tagline}
            </p>
          )}
        </div>

        {/* Visit Sponsor Button */}
        <button
          type="button"
          onClick={handleVisitSponsor}
          className="w-full py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer touch-manipulation"
        >
          <HiArrowTopRightOnSquare className="w-4 h-4 text-emerald-200" />
          <span>{ad.action_text || 'Visit Sponsor'}</span>
        </button>

        {/* Carousel Dots (when multiple video ads are present) */}
        {list.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {list.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  currentIndex === idx
                    ? 'w-4 h-1.5 bg-emerald-600 dark:bg-emerald-400'
                    : 'w-1.5 h-1.5 bg-gray-300 dark:bg-slate-700 hover:bg-gray-400'
                }`}
                aria-label={`Go to video ad ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DESKTOP RIGHT-SIDE STICKY AD RAIL (Default Export)
// Shows Picture Ad at TOP, and Video Ad BELOW it!
// ─────────────────────────────────────────────────────────────────────────────
export default function AdSideView({ panel = 'member', associationId = null, className = '' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pictureAds, videoAds } = useActiveAds(panel, associationId);

  return (
    <aside
      className={`hidden xl:flex xl:flex-col xl:w-80 2xl:w-84 xl:flex-shrink-0 sticky top-20 self-start gap-4 select-none ${className}`}
      aria-label="Community Sponsored Advertisements"
    >
      {/* 1. TOP ITEM: PICTURE ADVERTISEMENT (Matches Screenshot 1) */}
      <AdPictureCard ads={pictureAds} />

      {/* 2. BOTTOM ITEM: VIDEO ADVERTISEMENT (Matches Screenshot 1) */}
      <AdVideoCard ads={videoAds} />

      {/* Promote Your Shop footer */}
      <div className="p-3 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-slate-800/60 dark:to-slate-900 rounded-2xl border border-dashed border-amber-300 dark:border-amber-800 text-center space-y-1.5">
        <p className="text-xs font-black text-amber-950 dark:text-amber-200 flex items-center justify-center gap-1">
          <HiMegaphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>Promote Your Shop Here</span>
        </p>
        <p className="text-[10px] text-gray-600 dark:text-gray-400">
          Reach 500+ verified layout resident households daily.
        </p>
        {user?.role === 'vendor' ? (
          <button
            type="button"
            onClick={() => navigate('/vendor/ads')}
            className="mt-1 w-full py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 text-xs font-bold rounded-lg transition shadow-sm cursor-pointer"
          >
            + Post Your Ad Now
          </button>
        ) : (
          <span className="inline-block text-[10px] font-bold text-amber-700 dark:text-amber-300">
            Contact Super Admin for Ad Space
          </span>
        )}
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. MOBILE BANNER EXPORTS (Matches Screenshot 2)
// Rendered in phone: First Picture Ad at top, Last Video Ad at bottom!
// ─────────────────────────────────────────────────────────────────────────────
export function MobileTopPictureAd({ panel = 'member', associationId = null }) {
  const { pictureAds } = useActiveAds(panel, associationId);

  return (
    <div className="block xl:hidden w-full mb-4">
      <AdPictureCard ads={pictureAds} isMobile={true} />
    </div>
  );
}

export function MobileBottomVideoAd({ panel = 'member', associationId = null }) {
  const { videoAds } = useActiveAds(panel, associationId);

  return (
    <div className="block xl:hidden w-full mt-6 mb-8">
      <AdVideoCard ads={videoAds} isMobile={true} />
    </div>
  );
}
