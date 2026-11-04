import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiSparkles,
  HiArrowTopRightOnSquare,
  HiPhone,
  HiBuildingStorefront,
  HiCheckBadge,
  HiTag,
  HiMegaphone,
  HiXMark,
  HiChatBubbleOvalLeftEllipsis,
} from 'react-icons/hi2';
import api, { getFileUrl } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

// Fallback showcase ads if database is empty
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
    title: 'Smart RFID Boom Barriers & Automated Gates',
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
  const [loading, setLoading] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

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
        console.warn('Failed to load advertisements for side rail:', err);
        if (isMounted) setAds(DEFAULT_SHOWCASE_ADS);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAds();
    return () => { isMounted = false; };
  }, [panel, associationId]);

  const activeAds = ads.length > 0 ? ads : DEFAULT_SHOWCASE_ADS;

  const handleAdClick = (ad) => {
    if (!ad) return;

    if (ad.id && !String(ad.id).startsWith('showcase-')) {
      api.post(`/ads/${ad.id}/click`).catch(() => {});
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

  // ── Reusable single ad card for mobile drawer ──────────────────────────────
  const MobileAdCard = ({ ad, idx }) => {
    const img = ad.banner_image
      ? ad.banner_image.startsWith('http') ? ad.banner_image : getFileUrl(ad.banner_image)
      : null;

    return (
      <div className="rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm bg-white dark:bg-slate-800">
        {img && (
          <div className="relative w-full h-36 bg-slate-900">
            <img src={img} alt={ad.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            {ad.badge && (
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-600 text-white shadow">
                {ad.badge}
              </span>
            )}
            <p className="absolute bottom-2 left-2.5 right-2.5 text-white text-xs font-black line-clamp-2 drop-shadow">
              {ad.title}
            </p>
          </div>
        )}

        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase truncate">
              {ad.shop_name || 'Verified Vendor'}
            </span>
            <span className="text-[9px] font-mono text-gray-400 flex-shrink-0">#{idx + 1}</span>
          </div>

          {!img && (
            <h4 className="font-black text-xs text-gray-900 dark:text-white">{ad.title}</h4>
          )}

          {ad.tagline && (
            <p className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
              {ad.tagline}
            </p>
          )}

          <button
            type="button"
            onClick={() => { handleAdClick(ad); setMobileDrawerOpen(false); }}
            className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer touch-manipulation"
          >
            {ad.action_type === 'whatsapp' ? (
              <><HiChatBubbleOvalLeftEllipsis className="w-4 h-4" /><span>{ad.action_text || 'Order on WhatsApp'}</span></>
            ) : ad.action_type === 'call' ? (
              <><HiPhone className="w-4 h-4" /><span>{ad.action_text || 'Call Vendor'}</span></>
            ) : (
              <><HiArrowTopRightOnSquare className="w-4 h-4" /><span>{ad.action_text || 'View Offer'}</span></>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ══════════════════════════════════════════════════════════
          1. DESKTOP RIGHT-SIDE STICKY AD RAIL (xl and above)
          Stacked vertically — all ads shown at once
          ══════════════════════════════════════════════════════════ */}
      <aside
        className={`hidden xl:flex xl:flex-col xl:w-80 2xl:w-84 xl:flex-shrink-0 sticky top-20 self-start gap-4 select-none ${className}`}
      >
        {/* Rail Header */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-3 shadow-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm font-bold">
              📢
            </span>
            <div>
              <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>Sponsored Offers</span>
                <HiSparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                Verified community layout partners
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/60 px-2 py-0.5 rounded-full">
            {activeAds.length} Ads
          </span>
        </div>

        {/* Stacked Ads Feed */}
        <div className="space-y-4 max-h-[calc(100vh-9rem)] overflow-y-auto pr-0.5 no-scrollbar">
          {activeAds.map((ad, idx) => {
            const bannerUrl = ad.banner_image
              ? ad.banner_image.startsWith('http') ? ad.banner_image : getFileUrl(ad.banner_image)
              : null;

            return (
              <div
                key={ad.id || idx}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/90 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group"
              >
                {/* Card Header */}
                <div className="px-3 py-2 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800/60 dark:to-slate-900 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1 font-bold text-gray-800 dark:text-gray-200 truncate">
                    <HiBuildingStorefront className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <span className="truncate">{ad.shop_name || 'Verified Partner'}</span>
                    <HiCheckBadge className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" title="Verified Merchant" />
                  </div>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400">
                    #{idx + 1}
                  </span>
                </div>

                {/* Banner Image */}
                <div
                  className="relative w-full h-40 cursor-pointer overflow-hidden bg-slate-950"
                  onClick={() => handleAdClick(ad)}
                >
                  {bannerUrl ? (
                    <img
                      src={bannerUrl}
                      alt={ad.title}
                      className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 text-amber-400 text-3xl font-black">
                      🛍️
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                  {ad.badge && (
                    <div className="absolute top-2 left-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-md">
                        <HiTag className="w-3 h-3" />
                        <span>{ad.badge}</span>
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-2 left-2.5 right-2.5 text-white">
                    <h4 className="text-xs sm:text-sm font-black leading-tight line-clamp-2 drop-shadow-md">
                      {ad.title}
                    </h4>
                  </div>
                </div>

                {/* CTA */}
                <div className="p-3 space-y-2.5">
                  {ad.tagline && (
                    <p className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                      {ad.tagline}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => handleAdClick(ad)}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 active:scale-[0.98] text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer touch-manipulation"
                  >
                    {ad.action_type === 'whatsapp' ? (
                      <><HiChatBubbleOvalLeftEllipsis className="w-4 h-4 text-emerald-200" /><span>{ad.action_text || 'Order on WhatsApp'}</span></>
                    ) : ad.action_type === 'call' ? (
                      <><HiPhone className="w-4 h-4 text-white" /><span>{ad.action_text || 'Call Vendor'}</span></>
                    ) : (
                      <><HiArrowTopRightOnSquare className="w-4 h-4 text-white" /><span>{ad.action_text || 'View Offer'}</span></>
                    )}
                  </button>
                </div>
              </div>
            );
          })}

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
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════
          2. MOBILE FLOATING TAB — safely positioned at lower right
          Positioned at bottom-28 sm:bottom-32 so it NEVER overlaps
          with the top-right profile dropdown or bottom SOS button
          ══════════════════════════════════════════════════════════ */}
      <div className="block xl:hidden fixed right-0 bottom-36 sm:bottom-40 z-30 select-none">
        <button
          type="button"
          onClick={() => {
            if (navigator.vibrate) navigator.vibrate(60);
            setMobileDrawerOpen(true);
          }}
          className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black py-2.5 px-2 rounded-l-2xl shadow-xl border-y border-l border-amber-400 flex flex-col items-center gap-1 cursor-pointer touch-manipulation transition focus:outline-none"
          aria-label="Open community ads and offers"
          title="Community Ads & Offers"
        >
          <span className="text-base leading-none">📢</span>
          <span
            className="text-[9px] font-black uppercase tracking-widest"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            Ads
          </span>
          <span className="w-4 h-4 rounded-full bg-slate-950 text-amber-300 text-[9px] flex items-center justify-center font-bold leading-none">
            {activeAds.length}
          </span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          3. MOBILE SLIDE-IN DRAWER — full-height right panel
          ══════════════════════════════════════════════════════════ */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Sponsored deals"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-xs sm:max-w-sm h-full bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex-shrink-0 p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <span className="text-xl">📢</span>
                <div>
                  <h3 className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-wide">
                    Local Ads & Offers
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {activeAds.length} Community Sponsored Ads
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition cursor-pointer flex-shrink-0"
                aria-label="Close ads drawer"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Ad Cards */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeAds.map((ad, idx) => (
                <MobileAdCard key={ad.id || idx} ad={ad} idx={idx} />
              ))}

              {/* Promote / Change Ad footer */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-dashed border-amber-300 dark:border-amber-800 text-center space-y-2">
                <p className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center justify-center gap-1">
                  <HiMegaphone className="w-4 h-4 text-amber-600" />
                  Post or Change Your Community Ad
                </p>
                {user?.role === 'vendor' ? (
                  <button
                    type="button"
                    onClick={() => { navigate('/vendor/ads'); setMobileDrawerOpen(false); }}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    Manage & Change Ads
                  </button>
                ) : user?.role === 'super_admin' ? (
                  <button
                    type="button"
                    onClick={() => { navigate('/super-admin/ads'); setMobileDrawerOpen(false); }}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    Manage All Layout Ads
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { navigate('/vendor/register'); setMobileDrawerOpen(false); }}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    + Register Shop to Post Ads
                  </button>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="flex-shrink-0 p-3 bg-gray-50 dark:bg-slate-800/80 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-full py-2.5 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
