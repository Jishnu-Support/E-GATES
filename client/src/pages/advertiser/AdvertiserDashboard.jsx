import React, { useState, useEffect } from 'react';
import {
  HiBuildingOffice2,
  HiSparkles,
  HiPlus,
  HiCreditCard,
  HiEye,
  HiCursorArrowRays,
  HiMapPin,
  HiPhone,
  HiChatBubbleLeftRight,
  HiGlobeAlt,
  HiCheckCircle,
  HiClock,
  HiExclamationCircle,
  HiArrowPath,
  HiFilm,
  HiPhoto,
  HiXMark,
  HiQrCode,
} from 'react-icons/hi2';
import api, { getFileUrl } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';


const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/ads/')) return url;
  if (url.startsWith('/uploads/')) return url;
  if (url.startsWith('uploads/')) return '/' + url;
  return getFileUrl(url);
};

export default function AdvertiserDashboard() {
  const { user } = useAuth();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pricingPlans, setPricingPlans] = useState([]);

  // Post Ad Modal
  const [showPostModal, setShowPostModal] = useState(false);
  const [posting, setPosting] = useState(false);
  const [adForm, setAdForm] = useState({
    title: '',
    placement: 'both',
    ad_type: 'image', // 'image' | 'video'
    duration_type: 'day', // 'day' | 'month'
    duration_days: 7,
    payment_amount: 299,
    target_city: user?.taluk || 'Hosur',
    target_district: user?.district || 'Krishnagiri',
    target_state: 'Tamil Nadu',
    cta_type: 'whatsapp',
    cta_phone: user?.phone || '',
    cta_link: user?.company_website || '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);

  // Payment Modal
  const [payModalAd, setPayModalAd] = useState(null);
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentProof, setPaymentProof] = useState(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const fetchAds = async () => {
    try {
      setLoading(true);
      const [adsRes, pricingRes] = await Promise.all([
        api.get('/ads/my-ads'),
        api.get('/pricing'),
      ]);
      setAds(adsRes.data?.data || []);
      setPricingPlans(pricingRes.data?.data || []);
    } catch (err) {
      console.warn('Error fetching advertiser data:', err);
      toast.error('Failed to load ad campaigns and pricing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  // Create Ad Form Submit
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!bannerFile && !videoFile) {
      toast.error('Please upload at least a banner image or video ad');
      return;
    }

    try {
      setPosting(true);
      const formData = new FormData();
      Object.keys(adForm).forEach((k) => formData.append(k, adForm[k]));

      // Standardize field names for server
      formData.append('media_type', adForm.ad_type);
      formData.append('target_panel', adForm.placement);
      formData.append('action_type', adForm.cta_type);
      formData.append('action_url', adForm.cta_type === 'link' ? (adForm.cta_link || '') : (adForm.cta_phone || ''));
      formData.append('pricing_plan', `ad_${adForm.ad_type}_${adForm.duration_type}`);

      if (bannerFile) formData.append('banner_image', bannerFile);
      if (videoFile) formData.append('video_file', videoFile);
      if (adForm.ad_type === 'video' && !videoFile) {
        formData.append('video_url', adForm.video_url || '/ads/sample-ad-video.mp4');
      }

      const res = await api.post('/ads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const createdAd = res.data?.data;
      toast.success('Ad created! Please complete payment to activate this ad slot.');
      setShowPostModal(false);
      resetPostForm();
      fetchAds();

      // Open pay modal immediately for convenience
      if (createdAd) {
        setPayModalAd(createdAd);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit ad campaign');
    } finally {
      setPosting(false);
    }
  };

  const resetPostForm = () => {
    setAdForm({
      title: '',
      placement: 'both',
      ad_type: 'image',
      duration_type: 'day',
      duration_days: 7,
      payment_amount: 299,
      target_city: user?.taluk || 'Hosur',
      target_district: user?.district || 'Krishnagiri',
      target_state: 'Tamil Nadu',
      cta_type: 'whatsapp',
      cta_phone: user?.phone || '',
      cta_link: user?.company_website || '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    setBannerFile(null);
    setBannerPreview(null);
    setVideoFile(null);
    setVideoPreview(null);
  };

  // Pay Submit (Dummy Payment Mode supported)
  const handlePaySubmit = async (isDemo = true) => {
    if (!payModalAd) return;
    try {
      setSubmittingPayment(true);
      const formData = new FormData();
      const ref = isDemo || !paymentRef.trim()
        ? `DEMO-AD-${Date.now().toString().slice(-6)}`
        : paymentRef.trim();

      formData.append('payment_reference', ref);
      formData.append('payment_amount', String(payModalAd.payment_amount || 299));
      formData.append('auto_activate', 'true'); // Immediate dummy activation
      if (paymentProof && !isDemo) {
        formData.append('payment_proof', paymentProof);
      }

      await api.post(`/ads/${payModalAd.id}/pay`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('🎉 Dummy payment processed successfully! Your advertisement is now active and live.');
      setPayModalAd(null);
      setPaymentRef('');
      setPaymentProof(null);
      fetchAds();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process ad payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // 1-Click Convert or Upgrade Ad to Video Ad
  const handleQuickSetVideo = async (adId) => {
    try {
      await api.put(`/ads/${adId}`, {
        media_type: 'video',
        video_url: '/ads/sample-ad-video.mp4',
      });
      toast.success('Ad upgraded to Video Ad with live streaming playback!');
      fetchAds();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update ad media');
    }
  };

  // Toggle status
  const handleToggleStatus = async (adId) => {
    try {
      await api.patch(`/ads/${adId}/toggle-status`);
      toast.success('Ad status updated');
      fetchAds();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  // Metrics
  const totalViews = ads.reduce((sum, a) => sum + (parseInt(a.views_count, 10) || 0), 0);
  const totalClicks = ads.reduce((sum, a) => sum + (parseInt(a.clicks_count, 10) || 0), 0);
  const activeCount = ads.filter((a) => a.status === 'active' && a.payment_status === 'paid').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-4">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-900 via-pink-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-rose-500/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 mb-2">
              <span>📢 Ad Company / Advertiser</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {user?.company_name || user?.name}
            </h1>
            <p className="text-sm text-rose-200/80 mt-1 max-w-xl leading-relaxed">
              Target residents city-by-city across layouts. Pay ₹999 per single ad slot to activate live high-visibility banner & video displays.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setShowPostModal(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-black text-sm shadow-lg shadow-rose-600/30 transition cursor-pointer"
            >
              <HiPlus className="w-5 h-5" />
              <span>Post Single Ad</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pay-Per-Ad Policy Alert */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <HiCreditCard className="w-6 h-6 flex-shrink-0 text-amber-500" />
          <span>
            <strong>Pay-Per-Ad Slot Policy:</strong> Each ad requires a single payment slot of <strong>₹999</strong> before it goes live to residents in your selected target city and district.
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Total Ads Created</span>
          <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-1">
            {ads.length}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Active & Live Ads</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {activeCount}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Resident Views</span>
          <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {totalViews}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Total Interactions (Clicks)</span>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {totalClicks}
          </div>
        </div>
      </div>

      {/* Ads List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            My Advertisement Slots ({ads.length})
          </h2>
          <button
            type="button"
            onClick={fetchAds}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
          >
            <HiArrowPath className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm text-gray-500">Loading your ad campaigns...</div>
        ) : ads.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
            <HiSparkles className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No advertisements posted yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Click "Post Single Ad" to reach residents in your target district and city!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {ads.map((ad) => (
              <div
                key={ad.id}
                className="rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col justify-between"
              >
                <div>
                  {/* Media Banner or Video */}
                  <div className="relative bg-slate-950 h-44 flex items-center justify-center overflow-hidden">
                    {(ad.media_type === 'video' || ad.video_url || ad.ad_type === 'video' || (ad.pricing_plan && ad.pricing_plan.includes('video'))) ? (
                      <div className="relative w-full h-full flex items-center justify-center bg-black">
                        <video
                          src={resolveMediaUrl(ad.video_url || '/ads/sample-ad-video.mp4')}
                          poster={resolveMediaUrl(ad.banner_image)}
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 bg-gradient-to-r from-rose-600 to-orange-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md pointer-events-none z-10 shadow">
                          🎬 Video Ad
                        </div>
                      </div>
                    ) : ad.banner_image ? (
                      <img
                        src={resolveMediaUrl(ad.banner_image)}
                        alt={ad.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                    ) : (
                      <span className="text-xs text-slate-500 font-bold">No Media Preview</span>
                    )}

                    {/* Location Badge */}
                    <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-bold text-white flex items-center gap-1">
                      <HiMapPin className="w-3 h-3 text-rose-400" />
                      <span>{ad.target_city || 'All'}, {ad.target_district || 'All'}</span>
                    </div>

                    {/* Payment Badge */}
                    <div className="absolute top-3 right-3">
                      {ad.payment_status === 'paid' ? (
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-500 text-white shadow">
                          ✓ Paid & Live
                        </span>
                      ) : ad.payment_status === 'pending_verification' ? (
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-amber-500 text-white shadow">
                          Verifying Payment
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-rose-600 text-white shadow">
                          Unpaid
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-base text-gray-900 dark:text-white line-clamp-1">
                      {ad.title}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Placement: <strong className="capitalize">{ad.target_panel || ad.placement || 'all'}</strong> • Type:{' '}
                      <span className={`font-black uppercase px-1.5 py-0.5 rounded text-[10px] ${
                        (ad.media_type === 'video' || ad.video_url || (ad.pricing_plan && ad.pricing_plan.includes('video')))
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                      }`}>
                        {(ad.media_type === 'video' || ad.video_url || (ad.pricing_plan && ad.pricing_plan.includes('video'))) ? 'video' : 'image'}
                      </span>
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
                      <span className="flex items-center gap-1">
                        <HiEye className="w-4 h-4 text-purple-500" />
                        <span>{ad.views_count || 0} views</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <HiCursorArrowRays className="w-4 h-4 text-blue-500" />
                        <span>{ad.clicks_count || 0} clicks</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {ad.payment_status !== 'paid' ? (
                    <button
                      type="button"
                      onClick={() => setPayModalAd(ad)}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-bold text-xs shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <HiCreditCard className="w-4 h-4" />
                      <span>Pay ₹999 for Slot</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(ad.id)}
                        className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer ${
                          ad.status === 'active'
                            ? 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                            : 'bg-emerald-600 text-white hover:bg-emerald-500'
                        }`}
                      >
                        {ad.status === 'active' ? 'Pause Ad' : 'Resume Ad'}
                      </button>

                      {ad.media_type !== 'video' && !ad.video_url && (
                        <button
                          type="button"
                          onClick={() => handleQuickSetVideo(ad.id)}
                          className="py-2 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs border border-amber-500/20 transition cursor-pointer whitespace-nowrap"
                          title="Convert this ad to Video Ad playback"
                        >
                          🎬 Make Video
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL 1: POST SINGLE AD */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-slate-800 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <HiSparkles className="w-5 h-5 text-rose-600" />
                <span>Post Single Advertisement Slot</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPostModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Ad Title / Headline *
                </label>
                <input
                  type="text"
                  required
                  value={adForm.title}
                  onChange={(e) => setAdForm({ ...adForm, title: e.target.value })}
                  placeholder="e.g. 30-Min Express Two-Wheeler & Car Service"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
                />
              </div>

              {/* 1. AD FORMAT: Picture Ad vs Video Ad */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Ad Format Type *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const newType = 'image';
                      const relevantPlans = pricingPlans.filter((p) => p.plan_type === 'ad_image' && p.billing_cycle === adForm.duration_type);
                      const defaultP = relevantPlans[0] || (adForm.duration_type === 'day' ? { price: 299, duration_days: 7 } : { price: 899, duration_days: 30 });
                      const endD = new Date(Date.now() + defaultP.duration_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                      setAdForm({ ...adForm, ad_type: newType, payment_amount: defaultP.price, duration_days: defaultP.duration_days, end_date: endD });
                    }}
                    className={`py-2.5 px-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 border transition cursor-pointer ${
                      adForm.ad_type === 'image'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                        : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    <HiPhoto className="w-4 h-4" />
                    <span>🖼️ Picture / Banner Ad</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const newType = 'video';
                      const relevantPlans = pricingPlans.filter((p) => p.plan_type === 'ad_video' && p.billing_cycle === adForm.duration_type);
                      const defaultP = relevantPlans[0] || (adForm.duration_type === 'day' ? { price: 499, duration_days: 7 } : { price: 1499, duration_days: 30 });
                      const endD = new Date(Date.now() + defaultP.duration_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                      setAdForm({ ...adForm, ad_type: newType, payment_amount: defaultP.price, duration_days: defaultP.duration_days, end_date: endD });
                    }}
                    className={`py-2.5 px-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 border transition cursor-pointer ${
                      adForm.ad_type === 'video'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                        : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    <HiFilm className="w-4 h-4" />
                    <span>🎬 Video Ad</span>
                  </button>
                </div>
              </div>

              {/* 2. DURATION BASIS: Day Basis vs Monthly Basis */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    Duration Basis & Campaign Plans *
                  </label>
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-0.5 rounded-xl border border-gray-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        const newBasis = 'day';
                        const relevantPlans = pricingPlans.filter((p) => p.plan_type === `ad_${adForm.ad_type}` && p.billing_cycle === 'day');
                        const defaultP = relevantPlans[0] || (adForm.ad_type === 'video' ? { price: 499, duration_days: 7 } : { price: 299, duration_days: 7 });
                        const endD = new Date(Date.now() + defaultP.duration_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                        setAdForm({ ...adForm, duration_type: newBasis, payment_amount: defaultP.price, duration_days: defaultP.duration_days, end_date: endD });
                      }}
                      className={`px-3 py-1 rounded-lg text-[11px] font-black transition cursor-pointer ${
                        adForm.duration_type === 'day'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                      }`}
                    >
                      📅 Day Basis
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newBasis = 'month';
                        const relevantPlans = pricingPlans.filter((p) => p.plan_type === `ad_${adForm.ad_type}` && p.billing_cycle !== 'day');
                        const defaultP = relevantPlans[0] || (adForm.ad_type === 'video' ? { price: 1499, duration_days: 30 } : { price: 899, duration_days: 30 });
                        const endD = new Date(Date.now() + defaultP.duration_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                        setAdForm({ ...adForm, duration_type: newBasis, payment_amount: defaultP.price, duration_days: defaultP.duration_days, end_date: endD });
                      }}
                      className={`px-3 py-1 rounded-lg text-[11px] font-black transition cursor-pointer ${
                        adForm.duration_type === 'month'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                      }`}
                    >
                      🗓️ Monthly Basis
                    </button>
                  </div>
                </div>

                {/* Duration options list */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    pricingPlans.filter((p) => {
                      const matchType = p.plan_type === `ad_${adForm.ad_type}`;
                      const matchCycle = adForm.duration_type === 'day' ? p.billing_cycle === 'day' : p.billing_cycle !== 'day';
                      return matchType && matchCycle;
                    }).length > 0
                      ? pricingPlans.filter((p) => {
                          const matchType = p.plan_type === `ad_${adForm.ad_type}`;
                          const matchCycle = adForm.duration_type === 'day' ? p.billing_cycle === 'day' : p.billing_cycle !== 'day';
                          return matchType && matchCycle;
                        })
                      : adForm.duration_type === 'day'
                      ? adForm.ad_type === 'video'
                        ? [
                            { id: 16, name: '1 Day', price: 99, duration_days: 1 },
                            { id: 17, name: '7 Days', price: 499, duration_days: 7, is_popular: true },
                            { id: 18, name: '15 Days', price: 899, duration_days: 15 },
                          ]
                        : [
                            { id: 9, name: '1 Day', price: 49, duration_days: 1 },
                            { id: 10, name: '7 Days', price: 299, duration_days: 7, is_popular: true },
                            { id: 11, name: '15 Days', price: 549, duration_days: 15 },
                          ]
                      : adForm.ad_type === 'video'
                      ? [
                          { id: 19, name: '1 Month', price: 1499, duration_days: 30 },
                          { id: 20, name: '3 Months', price: 3999, duration_days: 90, is_popular: true },
                          { id: 21, name: '6 Months', price: 7499, duration_days: 180 },
                          { id: 22, name: '1 Year', price: 12999, duration_days: 365 },
                        ]
                      : [
                          { id: 12, name: '1 Month', price: 899, duration_days: 30 },
                          { id: 13, name: '3 Months', price: 2399, duration_days: 90, is_popular: true },
                          { id: 14, name: '6 Months', price: 4499, duration_days: 180 },
                          { id: 15, name: '1 Year', price: 7999, duration_days: 365 },
                        ]
                  ).map((plan) => {
                    const isSelected = adForm.duration_days === plan.duration_days && adForm.payment_amount === plan.price;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => {
                          const endD = new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                          setAdForm({ ...adForm, duration_days: plan.duration_days, payment_amount: plan.price, end_date: endD });
                        }}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 ring-2 ring-rose-400'
                            : 'border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/60'
                        }`}
                      >
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate">
                          {plan.name}
                        </span>
                        <span className="text-sm font-black text-gray-900 dark:text-white mt-0.5">
                          ₹{plan.price}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* City & District Targeting (Crucial requirement) */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/40">
                <div>
                  <label className="block text-[11px] font-bold text-rose-900 dark:text-rose-300 mb-1">
                    Target District *
                  </label>
                  <select
                    value={adForm.target_district}
                    onChange={(e) => setAdForm({ ...adForm, target_district: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-rose-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white font-medium"
                  >
                    <option value="all">All Districts (State-wide)</option>
                    <option value="Krishnagiri">Krishnagiri</option>
                    <option value="Bangalore Urban">Bangalore Urban</option>
                    <option value="Bangalore Rural">Bangalore Rural</option>
                    <option value="Dharmapuri">Dharmapuri</option>
                    <option value="Salem">Salem</option>
                    <option value="Chennai">Chennai</option>
                    <option value="Coimbatore">Coimbatore</option>
                    <option value="Tirupathur">Tirupathur</option>
                    <option value="Vellore">Vellore</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-rose-900 dark:text-rose-300 mb-1">
                    Target City / Town *
                  </label>
                  <input
                    type="text"
                    required
                    value={adForm.target_city}
                    onChange={(e) => setAdForm({ ...adForm, target_city: e.target.value })}
                    placeholder="e.g. Hosur or all"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-rose-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Media Uploads */}
              {adForm.ad_type === 'image' ? (
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Banner Creative Image * (JPG / PNG, max 15MB)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerChange}
                    className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-rose-50 dark:file:bg-slate-800 file:text-rose-700 dark:file:text-rose-300 cursor-pointer"
                  />
                  {bannerPreview && (
                    <img src={bannerPreview} alt="Preview" className="w-full h-24 object-cover rounded-xl mt-2 border" />
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                      Video Media * (MP4 / WebM, max 100MB)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAdForm({ ...adForm, video_url: '/ads/sample-ad-video.mp4' });
                        setVideoPreview('/ads/sample-ad-video.mp4');
                      }}
                      className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      + Use Demo Video
                    </button>
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoChange}
                    className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-rose-50 dark:file:bg-slate-800 file:text-rose-700 dark:file:text-rose-300 cursor-pointer w-full"
                  />
                  {(videoPreview || adForm.video_url) && (
                    <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-black">
                      <video
                        src={videoPreview || resolveMediaUrl(adForm.video_url)}
                        className="w-full h-32 object-cover"
                        controls
                        playsInline
                      />
                      <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        ✓ Video Preview Ready
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Call-to-action */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Call To Action Button
                  </label>
                  <select
                    value={adForm.cta_type}
                    onChange={(e) => setAdForm({ ...adForm, cta_type: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
                  >
                    <option value="whatsapp">WhatsApp Order / Chat</option>
                    <option value="call">Direct Phone Call</option>
                    <option value="link">Visit Website Link</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Phone or Website URL
                  </label>
                  <input
                    type="text"
                    value={adForm.cta_type === 'link' ? adForm.cta_link : adForm.cta_phone}
                    onChange={(e) => {
                      if (adForm.cta_type === 'link') {
                        setAdForm({ ...adForm, cta_link: e.target.value });
                      } else {
                        setAdForm({ ...adForm, cta_phone: e.target.value });
                      }
                    }}
                    placeholder={adForm.cta_type === 'link' ? 'https://company.com' : '9876543210'}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Placement */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Portal Display Placement
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {['both', 'member', 'admin'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAdForm({ ...adForm, placement: p })}
                      className={`py-2 px-3 rounded-xl font-bold capitalize transition border ${
                        adForm.placement === p
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700'
                      }`}
                    >
                      {p === 'both' ? 'All Portals' : `${p} Portal`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fee notice */}
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                <div>
                  <span className="font-bold">Total Ad Slot Campaign Fee:</span>
                  <p className="text-[10px] text-gray-400 capitalize">
                    {adForm.duration_days} Days ({adForm.duration_type} basis) • {adForm.ad_type} ad
                  </p>
                </div>
                <span className="text-xl font-black text-rose-600">₹{adForm.payment_amount || 299}</span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={posting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-black text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {posting ? 'Creating Slot...' : 'Create & Proceed to Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PAY-PER-AD CHECKOUT */}
      {payModalAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <HiCreditCard className="w-5 h-5 text-rose-600" />
                <span>Pay For Single Ad Slot</span>
              </h3>
              <button
                type="button"
                onClick={() => setPayModalAd(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 mb-4">
              <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                Campaign: {payModalAd.title}
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                Targeting: {payModalAd.target_city || 'All Cities'}, {payModalAd.target_district || 'All Districts'}
              </p>
              <div className="mt-2 flex items-center justify-between pt-2 border-t border-rose-200/60 dark:border-rose-900/40">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Total Campaign Fee:</span>
                <span className="text-xl font-black text-rose-600">₹{payModalAd.payment_amount || 299}</span>
              </div>
            </div>

            {/* INSTANT DUMMY PAYMENT CALLOUT */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-center mb-4">
              <p className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                ⚡ Process Dummy Payment (Immediate Activation)
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                Click below to process a dummy test payment successfully and immediately activate this advertisement!
              </p>
              <button
                type="button"
                disabled={submittingPayment}
                onClick={() => handlePaySubmit(true)}
                className="mt-2.5 w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition cursor-pointer"
              >
                {submittingPayment ? 'Processing...' : 'Process Dummy Payment Successfully'}
              </button>
            </div>

            {/* UPI QR & ID */}
            <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-2xl border border-gray-200 dark:border-slate-700 text-center mb-4">
              <div className="w-28 h-28 bg-white rounded-xl mx-auto flex items-center justify-center p-2 shadow-inner border">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                    `upi://pay?pa=egates.ads@upi&pn=EGATES%20Platform&am=${payModalAd.payment_amount || 299}&cu=INR`
                  )}`}
                  alt="UPI QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="font-mono font-bold text-[11px] text-gray-800 dark:text-gray-200 mt-1">
                UPI ID: egates.ads@upi
              </p>
            </div>

            {/* UTR Reference Input */}
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  12-Digit UTR / Transaction Reference Number
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. 431289102938"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={submittingPayment}
                onClick={() => handlePaySubmit(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {submittingPayment ? 'Submitting...' : 'Submit & Activate Ad (Dummy Payment)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
