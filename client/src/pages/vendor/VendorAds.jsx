import React, { useState, useEffect, useRef } from 'react';
import {
  HiSparkles,
  HiPlus,
  HiEye,
  HiTrash,
  HiClock,
  HiCheckCircle,
  HiXCircle,
  HiArrowPath,
  HiBuildingStorefront,
  HiPhoto,
  HiPause,
  HiPlay,
} from 'react-icons/hi2';
import api, { getFileUrl } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';

export default function VendorAds() {
  const { user } = useAuth();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Request Ad Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title: '',
    tagline: '',
    description: '',
    media_type: 'image',
    video_url: '',
    distance: '',
    location_name: '',
    store_url: '',
    target_panel: 'both',
    action_type: 'whatsapp',
    action_url: user?.shop_phone || user?.phone || '',
    action_text: 'Order on WhatsApp',
  });

  const [previewAd, setPreviewAd] = useState(null);
  const [deleteAd, setDeleteAd] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMyAds = async () => {
    try {
      setLoading(true);
      const res = await api.get('/ads/my-ads');
      setAds(res.data?.data || []);
    } catch (err) {
      console.warn('Failed to load my ads:', err);
      toast.error('Failed to load your ad campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyAds();
  }, []);

  const handleBannerChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, WEBP, GIF)');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('Image size must be under 15MB');
      return;
    }

    setBannerFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setBannerPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Please provide a campaign title');
      return;
    }

    if (!bannerFile && form.media_type === 'image') {
      toast.error('Please upload your banner creative image for picture ads');
      return;
    }

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append('title', form.title.trim());
      if (form.tagline) fd.append('tagline', form.tagline.trim());
      if (form.description) fd.append('description', form.description.trim());
      fd.append('media_type', form.media_type);
      if (form.video_url) fd.append('video_url', form.video_url.trim());
      if (form.distance) fd.append('distance', form.distance.trim());
      if (form.location_name) fd.append('location_name', form.location_name.trim());
      if (form.store_url) fd.append('store_url', form.store_url.trim());
      fd.append('target_panel', form.target_panel);
      fd.append('action_type', form.action_type);
      if (form.action_url) fd.append('action_url', form.action_url.trim());
      if (form.action_text) fd.append('action_text', form.action_text.trim());
      if (bannerFile) fd.append('banner_image', bannerFile);

      const res = await api.post('/ads', fd);
      toast.success(res.data?.message || 'Ad request submitted for Super Admin review!');
      setIsModalOpen(false);
      resetForm();
      fetchMyAds();
    } catch (err) {
      console.error('Submit ad error:', err);
      toast.error(err.response?.data?.message || 'Failed to submit ad campaign request');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      tagline: '',
      description: '',
      media_type: 'image',
      video_url: '',
      distance: '',
      location_name: '',
      store_url: '',
      target_panel: 'both',
      action_type: 'whatsapp',
      action_url: user?.shop_phone || user?.phone || '',
      action_text: 'Order on WhatsApp',
    });
    setBannerFile(null);
    setBannerPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleToggleStatus = async (adId) => {
    try {
      const res = await api.patch(`/ads/${adId}/toggle-status`);
      toast.success(res.data?.message || 'Status updated');
      fetchMyAds();
    } catch (err) {
      console.error('Toggle status error:', err);
      toast.error(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async () => {
    if (!deleteAd) return;
    try {
      setIsDeleting(true);
      const res = await api.delete(`/ads/${deleteAd.id}`);
      toast.success(res.data?.message || 'Ad campaign removed');
      setDeleteAd(null);
      fetchMyAds();
    } catch (err) {
      console.error('Delete ad error:', err);
      toast.error(err.response?.data?.message || 'Failed to delete ad');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider mb-2">
            <HiSparkles className="w-4 h-4 text-emerald-200" />
            <span>Vendor Sponsorships & Banners</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            My Advertisement Campaigns
          </h1>
          <p className="text-sm text-white/90 mt-1 max-w-xl">
            Promote your shop products, services, and special deals with high-visibility banner ads across layout member and admin dashboards.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 font-extrabold text-sm hover:bg-emerald-50 transition shadow-md cursor-pointer self-start sm:self-center"
        >
          <HiPlus className="w-5 h-5 text-emerald-600" />
          <span>Request New Ad Campaign</span>
        </button>
      </div>

      {/* Campaigns Grid */}
      {loading ? (
        <div className="p-12 text-center text-gray-400 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
          <HiArrowPath className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-500" />
          <p className="text-xs font-semibold">Loading your campaigns...</p>
        </div>
      ) : ads.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 mx-auto flex items-center justify-center text-2xl">
            📢
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            You haven't posted any advertisements yet
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Submit a banner ad with your shop's special discounts or service offerings. Once approved by the Super Admin, your ad will be shown to residents!
          </p>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <HiPlus className="w-4 h-4" />
            <span>Create Your First Campaign</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ads.map((ad) => {
            const bannerUrl = ad.banner_image ? getFileUrl(ad.banner_image) : null;
            return (
              <div
                key={ad.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  {/* Banner Creative */}
                  <div
                    className="relative h-40 bg-slate-950 overflow-hidden cursor-pointer group"
                    onClick={() => setPreviewAd(ad)}
                  >
                    {bannerUrl ? (
                      <img
                        src={bannerUrl}
                        alt={ad.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <HiPhoto className="w-10 h-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Status Badge */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          ad.status === 'active'
                            ? 'bg-emerald-500 text-white'
                            : ad.status === 'pending'
                            ? 'bg-amber-500 text-slate-950 animate-pulse'
                            : ad.status === 'paused'
                            ? 'bg-gray-500 text-white'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {ad.status === 'pending' ? '⏳ Under Review' : `● ${ad.status}`}
                      </span>

                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-black/60 text-white backdrop-blur-md">
                        {ad.target_panel === 'both' ? 'Admin & Member' : `${ad.target_panel.toUpperCase()}`}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4 space-y-2">
                    <h3 className="text-sm font-extrabold text-gray-900 dark:text-white line-clamp-1">
                      {ad.title}
                    </h3>

                    {ad.tagline && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold line-clamp-1">
                        {ad.tagline}
                      </p>
                    )}

                    {ad.status === 'pending' && (
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-200">
                        Submitted for Super Admin review. Once approved, it will go live across layout portals.
                      </div>
                    )}

                    {ad.status === 'rejected' && ad.rejection_reason && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-[11px] text-rose-800 dark:text-rose-200">
                        <strong>Reason:</strong> {ad.rejection_reason}
                      </div>
                    )}

                    {/* Stats */}
                    {ad.status === 'active' && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-slate-800 text-center">
                        <div>
                          <span className="text-[10px] text-gray-400 block font-bold uppercase">Impressions</span>
                          <span className="text-xs font-black text-gray-800 dark:text-gray-200">
                            {ad.impression_count || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block font-bold uppercase">Resident Clicks</span>
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            {ad.click_count || 0}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-3 bg-gray-50 dark:bg-slate-850 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                  {ad.status === 'active' || ad.status === 'paused' ? (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(ad.id)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        ad.status === 'active'
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      }`}
                    >
                      {ad.status === 'active' ? (
                        <>
                          <HiPause className="w-3.5 h-3.5" />
                          <span>Pause Campaign</span>
                        </>
                      ) : (
                        <>
                          <HiPlay className="w-3.5 h-3.5" />
                          <span>Resume Campaign</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-[11px] text-gray-400 italic">Awaiting Action</span>
                  )}

                  <button
                    type="button"
                    onClick={() => setDeleteAd(ad)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                    title="Delete Ad"
                  >
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REQUEST CAMPAIGN MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Submit Advertisement Campaign Request"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {/* Media Format Selector: Picture Ad vs Video Ad */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Advertisement Format *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, media_type: 'image' })}
                className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                  form.media_type === 'image'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-200'
                }`}
              >
                <span>🖼️ Picture Ad</span>
                <span className="text-[10px] opacity-80">(Banner Image)</span>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, media_type: 'video' })}
                className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                  form.media_type === 'video'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-200'
                }`}
              >
                <span>🎥 Video Ad</span>
                <span className="text-[10px] opacity-80">(Video Player)</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Campaign Offer Title *
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={form.media_type === 'video' ? 'e.g. Organic Home Garden Plants & Landscaping' : 'e.g. Fresh Farm Milk & Paneer - 10% OFF this month'}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Store Location / Area
              </label>
              <input
                type="text"
                value={form.location_name}
                onChange={(e) => setForm({ ...form, location_name: e.target.value })}
                placeholder="e.g. Perandapalli, Hosur"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Distance Badge (Optional)
              </label>
              <input
                type="text"
                value={form.distance}
                onChange={(e) => setForm({ ...form, distance: e.target.value })}
                placeholder="e.g. 3.4 km"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Offer Subtitle / Catchphrase
            </label>
            <input
              type="text"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              placeholder="e.g. Pure organic milk delivered to your door before 6:00 AM"
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Video URL (if Video Ad) */}
          {form.media_type === 'video' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Video URL / Stream Link (MP4, WebM) *
                </label>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, video_url: '/ads/sample-ad-video.mp4' })}
                  className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Use Sample Nature Video
                </button>
              </div>
              <input
                type="text"
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                placeholder="e.g. /ads/sample-ad-video.mp4 or https://domain.com/video.mp4"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
              />
            </div>
          )}

          {/* Banner Creative Upload */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              {form.media_type === 'video' ? 'Video Poster / Cover Photo (Optional)' : 'Banner Creative Photo * (Landscape 1200x500 recommended, max 15MB)'}
            </label>
            <div className="mt-1 flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerChange}
                className="hidden"
                id="vendor_ad_banner_input"
              />
              <label
                htmlFor="vendor_ad_banner_input"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs cursor-pointer hover:bg-emerald-100/50 transition"
              >
                <HiPhoto className="w-5 h-5" />
                <span>{bannerFile ? 'Change Banner' : form.media_type === 'video' ? 'Upload Poster Photo' : 'Upload Banner Creative'}</span>
              </label>

              {bannerFile && (
                <span className="text-xs text-gray-500 font-medium truncate max-w-xs">
                  {bannerFile.name}
                </span>
              )}
            </div>

            {bannerPreview && (
              <div className="mt-3 relative rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 h-36 bg-slate-950">
                <img src={bannerPreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Where to Show Ad *
              </label>
              <select
                value={form.target_panel}
                onChange={(e) => setForm({ ...form, target_panel: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="both">Both Member & Admin Dashboards</option>
                <option value="member">Resident Member Dashboard Only</option>
                <option value="admin">Admin Dashboard Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Call-To-Action Type *
              </label>
              <select
                value={form.action_type}
                onChange={(e) => {
                  const type = e.target.value;
                  setForm({
                    ...form,
                    action_type: type,
                    action_text:
                      type === 'whatsapp'
                        ? 'Order on WhatsApp'
                        : type === 'call'
                        ? 'Call Store'
                        : 'Explore Products',
                  });
                }}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="whatsapp">Direct WhatsApp Chat</option>
                <option value="call">Direct Phone Call</option>
                <option value="link">Website / Online Catalog Link</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Button Text Label
              </label>
              <input
                type="text"
                value={form.action_text}
                onChange={(e) => setForm({ ...form, action_text: e.target.value })}
                placeholder="e.g. Order on WhatsApp"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                WhatsApp Phone / Number / URL *
              </label>
              <input
                type="text"
                required
                value={form.action_url}
                onChange={(e) => setForm({ ...form, action_url: e.target.value })}
                placeholder={
                  form.action_type === 'whatsapp'
                    ? 'e.g. 9876543210'
                    : form.action_type === 'call'
                    ? 'e.g. 9876543210'
                    : 'https://myshop.com'
                }
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Submitting Request...' : 'Submit for Super Admin Approval'}
            </button>
          </div>
        </form>
      </Modal>

      {/* PREVIEW MODAL */}
      <Modal
        isOpen={Boolean(previewAd)}
        onClose={() => setPreviewAd(null)}
        title={previewAd?.title || 'Advertisement Banner Preview'}
      >
        <div className="space-y-3">
          <div className="rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center">
            {previewAd?.media_type === 'video' || previewAd?.video_url ? (
              <video
                controls
                playsInline
                className="w-full max-h-[380px] object-contain bg-black"
                src={previewAd.video_url?.startsWith('http') || previewAd.video_url?.startsWith('/ads/') ? previewAd.video_url : getFileUrl(previewAd.video_url)}
                poster={previewAd.banner_image ? getFileUrl(previewAd.banner_image) : undefined}
              />
            ) : previewAd?.banner_image ? (
              <img
                src={getFileUrl(previewAd.banner_image)}
                alt={previewAd.title}
                className="w-full h-auto object-contain max-h-[380px]"
              />
            ) : (
              <div className="p-8 text-gray-500 font-bold">No creative media uploaded</div>
            )}
          </div>
          <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl space-y-1">
            <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">{previewAd?.title}</h4>
            {previewAd?.tagline && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{previewAd.tagline}</p>
            )}
          </div>
        </div>
      </Modal>

      {/* DELETE CONFIRM */}
      <ConfirmDialog
        isOpen={Boolean(deleteAd)}
        onClose={() => setDeleteAd(null)}
        onConfirm={handleDelete}
        title="Delete Ad Campaign"
        message={`Are you sure you want to remove "${deleteAd?.title}"?`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        isDestructive
      />
    </div>
  );
}
