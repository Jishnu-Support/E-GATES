import React, { useState, useEffect, useRef } from 'react';
import {
  HiSparkles,
  HiPlus,
  HiEye,
  HiTrash,
  HiCheckCircle,
  HiXCircle,
  HiPause,
  HiPlay,
  HiArrowPath,
  HiMagnifyingGlass,
  HiCursorArrowRays,
  HiBuildingStorefront,
  HiArrowTopRightOnSquare,
  HiPhoto,
  HiXMark,
} from 'react-icons/hi2';
import api, { getFileUrl } from '../../services/api';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';

export default function AdManager() {
  const [ads, setAds] = useState([]);
  const [associations, setAssociations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Create Ad Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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
    action_type: 'link',
    action_url: '',
    action_text: 'Learn More',
    association_id: '',
    start_date: '',
    end_date: '',
    priority: '0',
  });

  // Action Modals
  const [rejectModalAd, setRejectModalAd] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const [deleteModalAd, setDeleteModalAd] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [previewAd, setPreviewAd] = useState(null);

  const fetchAds = async () => {
    try {
      setLoading(true);
      const res = await api.get('/ads');
      setAds(res.data?.data || []);
    } catch (err) {
      console.warn('Failed to load advertisements:', err);
      toast.error('Failed to load advertisements');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssociations = async () => {
    try {
      const res = await api.get('/associations');
      setAssociations(res.data?.data || []);
    } catch (err) {
      console.warn('Failed to load associations:', err);
    }
  };

  useEffect(() => {
    fetchAds();
    fetchAssociations();
  }, []);

  const handleBannerChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (JPG, PNG, WEBP, GIF)');
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

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Please enter a campaign title');
      return;
    }

    if (!bannerFile && form.media_type === 'image') {
      toast.error('Please upload a banner creative image for picture ads');
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
      if (form.association_id) fd.append('association_id', form.association_id);
      if (form.start_date) fd.append('start_date', form.start_date);
      if (form.end_date) fd.append('end_date', form.end_date);
      fd.append('priority', form.priority || '0');
      if (bannerFile) fd.append('banner_image', bannerFile);

      const res = await api.post('/ads', fd);
      toast.success(res.data?.message || 'Advertisement posted live!');
      setIsCreateOpen(false);
      resetForm();
      fetchAds();
    } catch (err) {
      console.error('Create ad error:', err);
      toast.error(err.response?.data?.message || 'Failed to post advertisement');
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
      action_type: 'link',
      action_url: '',
      action_text: 'Learn More',
      association_id: '',
      start_date: '',
      end_date: '',
      priority: '0',
    });
    setBannerFile(null);
    setBannerPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleApprove = async (adId) => {
    try {
      const res = await api.patch(`/ads/${adId}/approve`);
      toast.success(res.data?.message || 'Ad approved and published live!');
      fetchAds();
    } catch (err) {
      console.error('Approve ad error:', err);
      toast.error(err.response?.data?.message || 'Failed to approve ad');
    }
  };

  const handleReject = async () => {
    if (!rejectModalAd) return;
    try {
      setIsRejecting(true);
      const res = await api.patch(`/ads/${rejectModalAd.id}/reject`, {
        reason: rejectReason.trim() || 'Ad creative does not meet community guidelines.',
      });
      toast.success(res.data?.message || 'Ad marked as rejected');
      setRejectModalAd(null);
      setRejectReason('');
      fetchAds();
    } catch (err) {
      console.error('Reject ad error:', err);
      toast.error(err.response?.data?.message || 'Failed to reject ad');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleToggleStatus = async (adId) => {
    try {
      const res = await api.patch(`/ads/${adId}/toggle-status`);
      toast.success(res.data?.message || 'Status updated');
      fetchAds();
    } catch (err) {
      console.error('Toggle status error:', err);
      toast.error(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async () => {
    if (!deleteModalAd) return;
    try {
      setIsDeleting(true);
      const res = await api.delete(`/ads/${deleteModalAd.id}`);
      toast.success(res.data?.message || 'Ad deleted successfully');
      setDeleteModalAd(null);
      fetchAds();
    } catch (err) {
      console.error('Delete ad error:', err);
      toast.error(err.response?.data?.message || 'Failed to delete ad');
    } finally {
      setIsDeleting(false);
    }
  };

  // Metrics calculation
  const totalAds = ads.length;
  const activeCount = ads.filter((a) => a.status === 'active').length;
  const pendingCount = ads.filter((a) => a.status === 'pending').length;
  const totalClicks = ads.reduce((acc, a) => acc + (parseInt(a.click_count, 10) || 0), 0);
  const totalImpressions = ads.reduce((acc, a) => acc + (parseInt(a.impression_count, 10) || 0), 0);

  // Filter ads
  const filteredAds = ads.filter((ad) => {
    if (statusFilter !== 'all' && ad.status !== statusFilter) return false;
    if (search.trim()) {
      const term = search.toLowerCase();
      const matchTitle = (ad.title || '').toLowerCase().includes(term);
      const matchTagline = (ad.tagline || '').toLowerCase().includes(term);
      const matchShop = (ad.shop_name || '').toLowerCase().includes(term);
      const matchCreator = (ad.creator_name || '').toLowerCase().includes(term);
      if (!matchTitle && !matchTagline && !matchShop && !matchCreator) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 rounded-3xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider mb-2">
            <HiSparkles className="w-4 h-4 text-amber-200" />
            <span>Platform Sponsorship & Ads Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Advertisements & Banner Manager
          </h1>
          <p className="text-sm text-white/90 mt-1 max-w-xl">
            Create platform-wide promotions and review ad campaign requests submitted by local layout vendors.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchAds}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition cursor-pointer"
            title="Refresh ads"
          >
            <HiArrowPath className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 font-extrabold text-sm hover:bg-amber-100 transition shadow-md cursor-pointer"
          >
            <HiPlus className="w-5 h-5 text-amber-600" />
            <span>Post New Advertisement</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Total Campaigns</span>
          <span className="text-2xl font-black text-gray-900 dark:text-white mt-1 block">{totalAds}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block">Pending Requests</span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">{pendingCount}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block">Active Live</span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">{activeCount}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider block">Total Impressions</span>
          <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 block">{totalImpressions}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-purple-500 uppercase tracking-wider block">Total Clicks</span>
          <span className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 block">{totalClicks}</span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: `All Ads (${totalAds})` },
            { id: 'pending', label: `Pending Requests (${pendingCount})` },
            { id: 'active', label: `Active (${activeCount})` },
            { id: 'paused', label: 'Paused' },
            { id: 'rejected', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <HiMagnifyingGlass className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns, shop, advertiser..."
            className="w-full pl-9 pr-4 py-1.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 transition"
          />
        </div>
      </div>

      {/* Ads List */}
      {loading ? (
        <div className="p-12 text-center text-gray-400 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
          <HiArrowPath className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-500" />
          <p className="text-xs font-semibold">Loading advertisement campaigns...</p>
        </div>
      ) : filteredAds.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
          <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-500 mx-auto flex items-center justify-center text-2xl mb-3">
            📢
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">No advertisements found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {statusFilter === 'pending'
              ? 'There are currently no vendor ad requests awaiting approval.'
              : 'Post a new advertisement or wait for local vendors to submit campaigns.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAds.map((ad) => {
            const bannerUrl = ad.banner_image ? getFileUrl(ad.banner_image) : null;
            const isVendor = ad.creator_role === 'vendor';
            const ctr =
              ad.impression_count > 0
                ? ((ad.click_count / ad.impression_count) * 100).toFixed(1)
                : '0.0';

            return (
              <div
                key={ad.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  {/* Banner Image Preview */}
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
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          ad.status === 'active'
                            ? 'bg-emerald-500 text-white'
                            : ad.status === 'pending'
                            ? 'bg-amber-500 text-slate-950 animate-pulse'
                            : ad.status === 'paused'
                            ? 'bg-gray-500 text-white'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        ● {ad.status}
                      </span>

                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-black/60 text-white backdrop-blur-md">
                        {ad.target_panel === 'both' ? 'Admin & Member' : `${ad.target_panel.toUpperCase()} ONLY`}
                      </span>
                    </div>

                    {/* Creator Tag */}
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-[11px]">
                      <span className="font-bold truncate max-w-[200px]">
                        {isVendor ? `🏪 ${ad.shop_name || ad.creator_name}` : '👑 Platform Super Admin'}
                      </span>
                      {ad.association_name && (
                        <span className="text-[10px] opacity-80 truncate">📍 {ad.association_name}</span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2">
                    <h3 className="text-sm font-extrabold text-gray-900 dark:text-white line-clamp-1">
                      {ad.title}
                    </h3>

                    {ad.tagline && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold line-clamp-1">
                        {ad.tagline}
                      </p>
                    )}

                    {ad.rejection_reason && ad.status === 'rejected' && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-[11px] text-rose-700 dark:text-rose-300">
                        <strong>Rejection Reason:</strong> {ad.rejection_reason}
                      </div>
                    )}

                    {/* Performance Stats */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 dark:border-slate-800 text-center">
                      <div>
                        <span className="text-[10px] text-gray-400 block font-bold uppercase">Views</span>
                        <span className="text-xs font-black text-gray-800 dark:text-gray-200">
                          {ad.impression_count || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block font-bold uppercase">Clicks</span>
                        <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                          {ad.click_count || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block font-bold uppercase">CTR</span>
                        <span className="text-xs font-black text-purple-600 dark:text-purple-400">{ctr}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="p-3 bg-gray-50 dark:bg-slate-850 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {ad.status === 'pending' ? (
                    <div className="flex items-center gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => handleApprove(ad.id)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                      >
                        <HiCheckCircle className="w-4 h-4" />
                        <span>Approve & Publish</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRejectModalAd(ad);
                          setRejectReason('');
                        }}
                        className="py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-bold transition cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <>
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
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <HiPlay className="w-3.5 h-3.5" />
                            <span>Resume</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteModalAd(ad)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                        title="Delete Advertisement"
                      >
                        <HiTrash className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE NEW AD MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Post New Platform Advertisement"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs sm:text-sm">
          {/* Media Format Selector: Picture Ad vs Video Ad */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Advertisement Format *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, media_type: 'image' })}
                className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 border transition cursor-pointer ${
                  form.media_type === 'image'
                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-200'
                }`}
              >
                <span>🖼️ Picture Ad</span>
                <span className="text-[10px] font-semibold opacity-75">(Creative Image)</span>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, media_type: 'video' })}
                className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 border transition cursor-pointer ${
                  form.media_type === 'video'
                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-200'
                }`}
              >
                <span>🎥 Video Ad</span>
                <span className="text-[10px] font-semibold opacity-75">(Video Player)</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Campaign Title *
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={form.media_type === 'video' ? 'e.g. Organic Home Garden Plants & Exotic Flora' : 'e.g. Express 30-Min Two Wheeler & Car Service'}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-amber-500"
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
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-amber-500"
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
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Offer Subtitle / Tagline
            </label>
            <input
              type="text"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              placeholder="e.g. Authorized multi-brand service, computerized diagnostics & free delivery!"
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Video URL (if Video Ad) */}
          {form.media_type === 'video' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Video URL / Stream Path (MP4, WebM) *
                </label>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, video_url: '/ads/sample-ad-video.mp4' })}
                  className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  Use Sample Nature Video
                </button>
              </div>
              <input
                type="text"
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                placeholder="e.g. /ads/sample-ad-video.mp4 or https://domain.com/video.mp4"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-amber-500 font-mono text-xs"
              />
            </div>
          )}

          {/* Banner Creative / Video Poster Uploader */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              {form.media_type === 'video'
                ? 'Video Poster / Thumbnail Image (Optional)'
                : 'Creative Banner Image * (1200x500 recommended, max 15MB)'}
            </label>
            <div className="mt-1 flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerChange}
                className="hidden"
                id="banner_image_input"
              />
              <label
                htmlFor="banner_image_input"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 font-bold text-xs cursor-pointer hover:bg-amber-100/50 transition"
              >
                <HiPhoto className="w-5 h-5" />
                <span>{bannerFile ? 'Change Banner' : form.media_type === 'video' ? 'Upload Poster Image' : 'Upload Banner Creative'}</span>
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
                Target Portal Display *
              </label>
              <select
                value={form.target_panel}
                onChange={(e) => setForm({ ...form, target_panel: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-amber-500"
              >
                <option value="both">Both Member & Admin Portals</option>
                <option value="member">Member Portal Only</option>
                <option value="admin">Admin Portal Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Target Association / Layout
              </label>
              <select
                value={form.association_id}
                onChange={(e) => setForm({ ...form, association_id: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">All Associations (Platform-Wide Broadcast)</option>
                {associations.map((assoc) => (
                  <option key={assoc.id} value={assoc.id}>
                    {assoc.name} ({assoc.code || assoc.city})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Call-To-Action Type
              </label>
              <select
                value={form.action_type}
                onChange={(e) => setForm({ ...form, action_type: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-amber-500"
              >
                <option value="link">Website / Web Link</option>
                <option value="whatsapp">Direct WhatsApp Chat</option>
                <option value="call">Direct Phone Call</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Button Label
              </label>
              <input
                type="text"
                value={form.action_text}
                onChange={(e) => setForm({ ...form, action_text: e.target.value })}
                placeholder="e.g. Order on WhatsApp, Call Store"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Destination (URL / Phone)
              </label>
              <input
                type="text"
                value={form.action_url}
                onChange={(e) => setForm({ ...form, action_url: e.target.value })}
                placeholder={
                  form.action_type === 'whatsapp'
                    ? 'e.g. 9876543210'
                    : form.action_type === 'call'
                    ? 'e.g. 9876543210'
                    : 'e.g. https://store.com'
                }
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Publishing...' : 'Publish Advertisement Live'}
            </button>
          </div>
        </form>
      </Modal>

      {/* REJECT MODAL */}
      <Modal
        isOpen={Boolean(rejectModalAd)}
        onClose={() => setRejectModalAd(null)}
        title="Reject Ad Campaign Request"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Please provide a reason for rejecting the campaign{' '}
            <strong className="text-gray-900 dark:text-white">"{rejectModalAd?.title}"</strong> submitted by{' '}
            <strong className="text-gray-900 dark:text-white">{rejectModalAd?.shop_name || rejectModalAd?.creator_name}</strong>.
            This will be sent to the vendor.
          </p>
          <textarea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Low image resolution / Creative banner does not align with community standards..."
            className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-rose-500"
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setRejectModalAd(null)}
              className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isRejecting}
              onClick={handleReject}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
            >
              {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>

      {/* PREVIEW MODAL */}
      <Modal
        isOpen={Boolean(previewAd)}
        onClose={() => setPreviewAd(null)}
        title={previewAd?.title || 'Advertisement Creative Preview'}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 max-h-[420px] flex items-center justify-center">
            {previewAd?.media_type === 'video' || previewAd?.video_url ? (
              <video
                controls
                playsInline
                className="w-full max-h-[420px] object-contain bg-black"
                src={previewAd.video_url?.startsWith('http') || previewAd.video_url?.startsWith('/ads/') ? previewAd.video_url : getFileUrl(previewAd.video_url)}
                poster={previewAd.banner_image ? getFileUrl(previewAd.banner_image) : undefined}
              />
            ) : previewAd?.banner_image ? (
              <img
                src={getFileUrl(previewAd.banner_image)}
                alt={previewAd.title}
                className="w-full h-auto object-contain max-h-[420px]"
              />
            ) : (
              <div className="p-8 text-gray-500 font-bold">No creative media uploaded</div>
            )}
          </div>

          <div className="p-4 bg-gray-50 dark:bg-slate-800/80 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-amber-500">
                {previewAd?.target_panel === 'both' ? 'Admin & Member Portals' : `${previewAd?.target_panel} Portal`}
              </span>
              <span className="text-xs text-gray-400 font-mono">ID #{previewAd?.id}</span>
            </div>
            <h3 className="text-base font-extrabold text-gray-900 dark:text-white">{previewAd?.title}</h3>
            {previewAd?.tagline && (
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">{previewAd.tagline}</p>
            )}
            {previewAd?.description && (
              <p className="text-xs text-gray-600 dark:text-gray-300">{previewAd.description}</p>
            )}
          </div>
        </div>
      </Modal>

      {/* DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deleteModalAd)}
        onClose={() => setDeleteModalAd(null)}
        onConfirm={handleDelete}
        title="Delete Advertisement"
        message={`Are you sure you want to permanently delete "${deleteModalAd?.title}"? This cannot be undone.`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete Campaign'}
        isDestructive
      />
    </div>
  );
}
