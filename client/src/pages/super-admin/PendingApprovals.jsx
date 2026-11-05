import React, { useState, useEffect } from 'react';
import {
  HiShieldCheck,
  HiCheckCircle,
  HiXCircle,
  HiTrash,
  HiEye,
  HiArrowPath,
  HiDocumentText,
} from 'react-icons/hi2';
import api, { getFileUrl } from '../../services/api';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export default function PendingApprovals() {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper to resolve static file paths to backend URL
  const resolveFileUrl = (filePath) => getFileUrl(filePath);

  // Proof Preview Modal
  const [previewProof, setPreviewProof] = useState(null); // { url, title, type }

  // Reject Modal
  const [rejectUser, setRejectUser] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Delete User Confirm
  const [deleteUser, setDeleteUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Section: 'registrations' | 'properties' | 'ads'
  const [activeSection, setActiveSection] = useState('registrations');
  const [pendingProperties, setPendingProperties] = useState([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [rejectProperty, setRejectProperty] = useState(null);
  const [propRejectReason, setPropRejectReason] = useState('');
  const [isRejectingProp, setIsRejectingProp] = useState(false);
  const [previewProperty, setPreviewProperty] = useState(null);

  // Advertisements state
  const [pendingAds, setPendingAds] = useState([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [rejectAdModal, setRejectAdModal] = useState(null);
  const [adRejectReason, setAdRejectReason] = useState('');
  const [isRejectingAd, setIsRejectingAd] = useState(false);
  const [previewAd, setPreviewAd] = useState(null);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users/pending');
      setData(res.data?.data || []);
    } catch (err) {
      console.warn('Error fetching pending users:', err);
      toast.error(err.response?.data?.message || 'Failed to load pending registrations');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingProperties = async () => {
    if (currentUser?.role !== 'super_admin') return;
    try {
      setLoadingProps(true);
      const res = await api.get('/properties/pending');
      setPendingProperties(res.data?.data || []);
    } catch (err) {
      console.warn('Error fetching pending properties:', err);
    } finally {
      setLoadingProps(false);
    }
  };

  const fetchPendingAds = async () => {
    if (currentUser?.role !== 'super_admin') return;
    try {
      setLoadingAds(true);
      const res = await api.get('/ads/pending');
      setPendingAds(res.data?.data || []);
    } catch (err) {
      console.warn('Error fetching pending ads:', err);
    } finally {
      setLoadingAds(false);
    }
  };

  useEffect(() => {
    fetchPending();
    if (currentUser?.role === 'super_admin') {
      fetchPendingProperties();
      fetchPendingAds();
    }
  }, [currentUser]);

  const handleApproveAd = async (id, title) => {
    try {
      await api.patch(`/ads/${id}/approve`);
      toast.success(`Ad campaign "${title}" approved! It is now live in member and admin portals.`);
      fetchPendingAds();
      if (previewAd?.id === id) setPreviewAd(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve ad campaign');
    }
  };

  const handleRejectAdSubmit = async (e) => {
    e.preventDefault();
    if (!rejectAdModal) return;
    try {
      setIsRejectingAd(true);
      await api.patch(`/ads/${rejectAdModal.id}/reject`, { reason: adRejectReason });
      toast.success(`Ad campaign "${rejectAdModal.title}" rejected`);
      setRejectAdModal(null);
      setAdRejectReason('');
      fetchPendingAds();
      if (previewAd?.id === rejectAdModal.id) setPreviewAd(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject ad');
    } finally {
      setIsRejectingAd(false);
    }
  };

  const handleApproveProperty = async (id, title) => {
    try {
      await api.put(`/properties/${id}/approve`);
      toast.success(`Property "${title}" approved! It is now live across all layout associations.`);
      fetchPendingProperties();
      if (previewProperty?.id === id) setPreviewProperty(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve property listing');
    }
  };

  const handleRejectPropertySubmit = async (e) => {
    e.preventDefault();
    if (!rejectProperty) return;
    try {
      setIsRejectingProp(true);
      await api.put(`/properties/${rejectProperty.id}/reject`, { reason: propRejectReason });
      toast.success(`Property listing "${rejectProperty.title}" rejected`);
      setRejectProperty(null);
      setPropRejectReason('');
      fetchPendingProperties();
      if (previewProperty?.id === rejectProperty.id) setPreviewProperty(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject property');
    } finally {
      setIsRejectingProp(false);
    }
  };

  const handleApprove = async (id, name, userObj) => {
    try {
      await api.put(`/users/${id}/approve`);
      const isMain = userObj?.is_main_admin || userObj?.display_role === 'Main Association Admin';
      const roleLabel = userObj?.role === 'vendor'
        ? 'Shop Vendor'
        : userObj?.role === 'agent'
        ? 'Growth Agent'
        : userObj?.role === 'advertiser'
        ? 'Ad Company'
        : isMain
        ? 'Main Association Admin'
        : userObj?.role === 'admin'
        ? 'Layout Admin'
        : 'Resident Member';
      const displayName = userObj?.company_name || userObj?.shop_name || name;
      toast.success(`${roleLabel} "${displayName}" approved successfully! They can now log in.`);
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve user');
    }
  };

  const handleVerifyPayment = async (id, name) => {
    try {
      await api.put(`/users/${id}/verify-payment`, { payment_status: 'paid' });
      toast.success(`Payment verified and approved for "${name}"! Store product creation is now unlocked.`);
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to verify vendor payment');
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectUser) return;
    try {
      setIsRejecting(true);
      await api.put(`/users/${rejectUser.id}/reject`, { rejection_reason: rejectReason });
      toast.success(`Registration request for "${rejectUser.name}" rejected.`);
      setRejectUser(null);
      setRejectReason('');
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject registration');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteUser) return;
    try {
      setIsDeleting(true);
      await api.delete(`/users/${deleteUser.id}`);
      toast.success(`User registration "${deleteUser.name}" deleted`);
      setDeleteUser(null);
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete registration');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <HiShieldCheck className="w-6 h-6" />
            </span>
            <span>
              {currentUser?.role === 'super_admin'
                ? 'Pending Association, Main Admin & Vendor Registrations'
                : 'Pending Resident & Admin Registrations'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            {currentUser?.role === 'super_admin'
              ? 'Approve or reject new Association registrations, Main Association Admins, and local Vendor merchant shop registrations.'
              : currentUser?.is_main_admin
              ? 'Review resident membership and layout administrator applications awaiting your approval as Main Association Admin.'
              : 'Review uploaded EB bills, property tax receipts, and verify registration legitimacy.'}
          </p>
        </div>
      </div>

      {currentUser?.role === 'super_admin' && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl text-blue-900 dark:text-blue-200 text-xs font-medium flex items-center gap-2.5">
          <HiShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <span>
            <strong>Super Admin Scope:</strong> Super Admin approves new layout Associations, Main Association Admins, and local <strong>Vendor Shop registrations</strong>. Resident member approvals are handled by each layout's Main Association Admin.
          </span>
        </div>
      )}

      {currentUser?.role === 'admin' && !currentUser?.is_main_admin && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-2">
          <HiShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span>
            Approval authority is exclusively granted to the <strong>Main Association Admin</strong> for this layout. Regular administrators do not have approval permissions.
          </span>
        </div>
      )}

      {/* Super Admin Section Switcher Tabs */}
      {currentUser?.role === 'super_admin' && (
        <div className="flex items-center gap-2 p-1.5 bg-gray-100 dark:bg-slate-800 rounded-2xl w-fit border border-gray-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveSection('registrations')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeSection === 'registrations'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span>👥 Registrations (Admins & Vendors)</span>
            {data.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
                {data.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('properties')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeSection === 'properties'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span>🏠 House / Property Listings (Sale & Rent)</span>
            {pendingProperties.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                {pendingProperties.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('ads')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeSection === 'ads'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span>📢 Vendor Ad Campaigns</span>
            {pendingAds.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                {pendingAds.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* SECTION 1: USER / VENDOR / ADMIN REGISTRATIONS TABLE */}
      {activeSection === 'registrations' && (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          {data.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500 dark:text-gray-400">
              {loading
                ? 'Checking for pending approvals...'
                : currentUser?.role === 'super_admin'
                ? 'No pending Association & Main Association Admin registrations.'
                : 'All resident member and layout admin registration requests have been reviewed.'}
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50/80 dark:bg-slate-800/60 text-gray-600 dark:text-gray-300 uppercase tracking-wider text-[11px] font-bold border-b border-gray-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Applicant Name</th>
                  <th className="py-3 px-4">Association / Layout</th>
                  <th className="py-3 px-4">Contact Phone & Email</th>
                  <th className="py-3 px-4">Door No & Street</th>
                  <th className="py-3 px-4 text-center">Proofs Uploaded</th>
                  <th className="py-3 px-4 text-center">Role Requested</th>
                  <th className="py-3 px-4 text-right">Verification Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {data.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-amber-50/30 dark:hover:bg-slate-800/40 transition group"
                  >
                    <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                      {user.role === 'vendor' ? (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">🏪</span>
                            <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                              {user.shop_name || 'Vendor Shop'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-700 dark:text-gray-300 font-semibold mt-0.5">
                            Owner: {user.name}
                          </p>
                          {user.shop_category && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              {user.shop_category}
                            </span>
                          )}
                        </div>
                      ) : user.role === 'agent' ? (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">🚀</span>
                            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                              {user.name}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">
                            Agent Code: <strong className="text-indigo-600 dark:text-indigo-400">{user.agent_code || 'Pending'}</strong>
                          </p>
                        </div>
                      ) : user.role === 'advertiser' ? (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">📢</span>
                            <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                              {user.company_name || user.name}
                            </span>
                          </div>
                          <p className="text-xs text-gray-700 dark:text-gray-300 font-semibold mt-0.5">
                            Contact: {user.name}
                          </p>
                          {user.gst_number && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              GST: {user.gst_number}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p>{user.name}</p>
                      )}
                      <span className="text-[10px] text-gray-400 font-normal block mt-0.5">
                        Registered: {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-700 dark:text-gray-300">
                      📍 {user.association_name || 'General / All Layouts'}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300 font-mono">
                      <p>{user.shop_phone || user.phone || 'N/A'}</p>
                      <p className="text-[10px] text-gray-400 font-sans">{user.email}</p>
                    </td>
                    <td className="py-3.5 px-4 text-gray-700 dark:text-gray-300">
                      {user.role === 'vendor' ? (
                        <div>
                          <p className="text-xs">{user.shop_address || 'Shop Location'}</p>
                          {user.business_hours && (
                            <p className="text-[10px] text-gray-400 font-sans mt-0.5">⏰ {user.business_hours}</p>
                          )}
                        </div>
                      ) : (
                        `Door #${user.door_no || 'N/A'}, ${user.street || ''}`
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {user.shop_logo ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewProof({
                                url: resolveFileUrl(user.shop_logo),
                                title: `${user.shop_name || user.name} - Shop Logo`,
                              })
                            }
                            className="px-2 py-1 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 rounded-lg text-[10px] font-bold flex items-center gap-1"
                          >
                            <HiEye className="w-3 h-3" />
                            <span>Shop Logo</span>
                          </button>
                        ) : null}
                        {user.eb_bill_proof ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewProof({
                                url: resolveFileUrl(user.eb_bill_proof),
                                title: `${user.name} - EB Bill Proof`,
                              })
                            }
                            className="px-2 py-1 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 rounded-lg text-[10px] font-bold flex items-center gap-1"
                          >
                            <HiEye className="w-3 h-3" />
                            <span>EB Bill</span>
                          </button>
                        ) : (
                          <span className="text-gray-400 text-[10px] italic">No EB</span>
                        )}

                        {user.property_tax_receipt ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewProof({
                                url: resolveFileUrl(user.property_tax_receipt),
                                title: `${user.name} - Property Tax Receipt`,
                              })
                            }
                            className="px-2 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 rounded-lg text-[10px] font-bold flex items-center gap-1"
                          >
                            <HiEye className="w-3 h-3" />
                            <span>Tax Bill</span>
                          </button>
                        ) : (
                          <span className="text-gray-400 text-[10px] italic">No Tax</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {user.role === 'vendor' ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center justify-center gap-1 shadow-xs">
                            <span>🏪</span>
                            <span>Shop Vendor</span>
                          </span>
                          {user.payment_status === 'paid' ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              ✓ Paid (₹{user.payment_amount || 499})
                            </span>
                          ) : user.payment_status === 'pending_verification' ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300">
                              ⏳ UTR: {user.payment_reference || 'Submitted'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-gray-100 dark:bg-slate-800 text-gray-500 border border-gray-200 dark:border-slate-700">
                              Payment: Unpaid
                            </span>
                          )}
                        </div>
                      ) : user.role === 'agent' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 flex items-center justify-center gap-1 shadow-xs">
                          <span>🚀</span>
                          <span>Growth Agent</span>
                        </span>
                      ) : user.role === 'advertiser' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center justify-center gap-1 shadow-xs">
                          <span>📢</span>
                          <span>Ad Company</span>
                        </span>
                      ) : user.is_main_admin || user.display_role === 'Main Association Admin' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 flex items-center justify-center gap-1 shadow-xs">
                          <span>🛡️</span>
                          <span>Main Association Admin</span>
                        </span>
                      ) : user.role === 'admin' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center gap-1">
                          <span>🛡️</span>
                          <span>Layout Admin</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-1">
                          <span>👥</span>
                          <span>Resident Member</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Approve */}
                        <button
                          type="button"
                          onClick={() => handleApprove(user.id, user.name, user)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                        >
                          <HiCheckCircle className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>

                        {/* Reject */}
                        <button
                          type="button"
                          onClick={() => {
                            setRejectUser(user);
                            setRejectReason('');
                          }}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          <HiXCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>

                        {/* Delete Application */}
                        <button
                          type="button"
                          onClick={() => setDeleteUser(user)}
                          className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                          title="Delete Registration"
                        >
                          <HiTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      )}

      {/* SECTION 2: PENDING HOUSE / PROPERTY LISTINGS (FOR SALE & RENT) */}
      {activeSection === 'properties' && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-300">
            <div className="flex items-center gap-2.5">
              <HiShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>
                <strong>Super Admin Property Oversight:</strong> Review house sale and rental listings submitted by homeowners. Once you click <strong>Approve</strong>, the property is broadcasted live to all layout associations across the entire platform.
              </span>
            </div>
            <button
              type="button"
              onClick={fetchPendingProperties}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-slate-700 transition flex items-center gap-1 cursor-pointer flex-shrink-0"
            >
              <HiArrowPath className={`w-3.5 h-3.5 ${loadingProps ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
            <div className="overflow-x-auto">
              {pendingProperties.length === 0 ? (
                <div className="p-12 text-center text-sm text-gray-500 dark:text-gray-400">
                  {loadingProps
                    ? 'Loading pending property listings...'
                    : 'No pending property listings awaiting approval. All house sale/rent posts have been reviewed.'}
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50/80 dark:bg-slate-800/60 text-gray-600 dark:text-gray-300 uppercase tracking-wider text-[11px] font-bold border-b border-gray-100 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Property & Type</th>
                      <th className="py-3 px-4">Layout Association</th>
                      <th className="py-3 px-4">Expected Price / Rent</th>
                      <th className="py-3 px-4">Specifications</th>
                      <th className="py-3 px-4">Owner Contact</th>
                      <th className="py-3 px-4 text-center">Photos</th>
                      <th className="py-3 px-4 text-right">Verification Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {pendingProperties.map((prop) => {
                      const photos = Array.isArray(prop.images) ? prop.images : [];
                      const firstPhoto = photos[0] ? getFileUrl(photos[0]) : null;

                      return (
                        <tr
                          key={prop.id}
                          className="hover:bg-amber-50/30 dark:hover:bg-slate-800/40 transition group"
                        >
                          <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden flex-shrink-0 border border-gray-200 dark:border-slate-700">
                                {firstPhoto ? (
                                  <img src={firstPhoto} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    🏠
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase mb-0.5 ${
                                    prop.listing_type === 'sale'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  }`}
                                >
                                  {prop.listing_type === 'sale' ? '🏠 For Sale' : '🔑 For Rent'}
                                </span>
                                <h4 className="text-xs font-black truncate max-w-[200px] text-gray-900 dark:text-white">
                                  {prop.title}
                                </h4>
                                <span className="text-[10px] text-gray-400 block">
                                  {prop.property_type || 'Independent House'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-medium text-gray-700 dark:text-gray-300">
                            <p className="font-bold text-gray-900 dark:text-white">
                              📍 {prop.association_name || 'General Community'}
                            </p>
                            {prop.city && <p className="text-[10px] text-gray-400">{prop.city}</p>}
                            {prop.door_number && (
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                Door: {prop.door_number}
                              </p>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            ₹{parseFloat(prop.price).toLocaleString('en-IN')}
                            {prop.listing_type === 'rent' && (
                              <span className="text-[10px] font-normal text-gray-400 ml-1">/ month</span>
                            )}
                            {prop.price_negotiable && (
                              <span className="block text-[10px] font-bold text-amber-500 uppercase">
                                Negotiable
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">
                            <p className="font-bold text-xs">{prop.bhk || 'N/A'}</p>
                            {prop.built_up_sqft && (
                              <p className="text-[10px] text-gray-400">📐 {prop.built_up_sqft} sqft</p>
                            )}
                            {prop.facing && (
                              <p className="text-[10px] text-gray-400">🧭 {prop.facing} Facing</p>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300 font-mono">
                            <p className="font-bold text-gray-900 dark:text-white font-sans text-xs">
                              {prop.contact_person || prop.owner_name}
                            </p>
                            <p className="text-xs">{prop.contact_phone || 'N/A'}</p>
                            {prop.contact_email && (
                              <p className="text-[10px] text-gray-400 font-sans">{prop.contact_email}</p>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {photos.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => setPreviewProperty(prop)}
                                className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 text-xs font-bold text-gray-700 dark:text-gray-300 transition cursor-pointer"
                              >
                                📷 {photos.length} Photos
                              </button>
                            ) : (
                              <span className="text-gray-400 text-[10px]">None</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick View */}
                              <button
                                type="button"
                                onClick={() => setPreviewProperty(prop)}
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                                title="View Details"
                              >
                                <HiEye className="w-4 h-4" />
                              </button>

                              {/* Approve Button */}
                              <button
                                type="button"
                                onClick={() => handleApproveProperty(prop.id, prop.title)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1 cursor-pointer"
                              >
                                <HiCheckCircle className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>

                              {/* Reject Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectProperty(prop);
                                  setPropRejectReason('');
                                }}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              >
                                <HiXCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: VENDOR ADVERTISEMENT CAMPAIGN REQUESTS */}
      {activeSection === 'ads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Review and approve promotional banner ads submitted by local shops and registered vendors. Approved ads are displayed on Admin and Member dashboards.
            </p>
            <button
              type="button"
              onClick={fetchPendingAds}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition"
            >
              <HiArrowPath className={`w-3.5 h-3.5 ${loadingAds ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {pendingAds.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-500 dark:text-gray-400 space-y-2">
                <span className="text-3xl block">📢</span>
                <p className="font-bold text-gray-700 dark:text-gray-300">
                  No pending vendor advertisement requests.
                </p>
                <p className="text-xs">
                  All submitted vendor campaigns have been reviewed.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50/80 dark:bg-slate-800/60 text-gray-600 dark:text-gray-300 uppercase tracking-wider text-[11px] font-bold border-b border-gray-100 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Banner Creative</th>
                      <th className="py-3 px-4">Campaign Title & Offer</th>
                      <th className="py-3 px-4">Vendor Shop & Contact</th>
                      <th className="py-3 px-4 text-center">Placement</th>
                      <th className="py-3 px-4 text-center">Target Layout</th>
                      <th className="py-3 px-4 text-center">Call-To-Action</th>
                      <th className="py-3 px-4 text-right">Approval Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {pendingAds.map((ad) => {
                      const bannerUrl = ad.banner_image ? getFileUrl(ad.banner_image) : null;
                      return (
                        <tr
                          key={ad.id}
                          className="hover:bg-amber-50/20 dark:hover:bg-slate-800/40 transition group"
                        >
                          <td className="py-3 px-4">
                            <div
                              onClick={() => setPreviewAd(ad)}
                              className="w-24 h-14 rounded-xl overflow-hidden bg-slate-950 border border-gray-200 dark:border-slate-700 cursor-pointer relative group/img flex-shrink-0"
                            >
                              {bannerUrl ? (
                                <img
                                  src={bannerUrl}
                                  alt={ad.title}
                                  className="w-full h-full object-cover group-hover/img:scale-105 transition"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500">
                                  📢
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition">
                                <HiEye className="w-5 h-5 text-white" />
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-bold text-gray-900 dark:text-white max-w-xs">
                            <p className="truncate text-sm">{ad.title}</p>
                            {ad.tagline && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold truncate mt-0.5">
                                {ad.tagline}
                              </p>
                            )}
                            <span className="text-[10px] text-gray-400 font-normal block mt-1">
                              Submitted: {new Date(ad.created_at).toLocaleDateString()}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                            <div className="flex items-center gap-1.5 font-bold">
                              <span>🏪</span>
                              <span className="text-gray-900 dark:text-white">
                                {ad.shop_name || ad.vendor_name}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                              📞 {ad.shop_phone || ad.vendor_phone || 'N/A'}
                            </p>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              {ad.target_panel === 'both' ? 'Admin + Member' : `${ad.target_panel} Only`}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center text-gray-700 dark:text-gray-300 font-medium">
                            {ad.association_name ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                                📍 {ad.association_name}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold">
                                🌐 All Layouts
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200">
                              {ad.action_type === 'whatsapp' ? '💬 WhatsApp' : ad.action_type === 'call' ? '📞 Phone' : '🔗 Link'}
                            </span>
                            {ad.action_text && (
                              <p className="text-[10px] text-gray-400 mt-0.5">"{ad.action_text}"</p>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreviewAd(ad)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition"
                                title="Preview Creative Banner"
                              >
                                <HiEye className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleApproveAd(ad.id, ad.title)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1 cursor-pointer"
                              >
                                <HiCheckCircle className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setRejectAdModal(ad);
                                  setAdRejectReason('');
                                }}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              >
                                <HiXCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PROOF PREVIEW MODAL */}
      <Modal
        isOpen={Boolean(previewProof)}
        onClose={() => setPreviewProof(null)}
        title={previewProof?.title || 'Proof Document Preview'}
        size="lg"
      >
        {previewProof && (
          <div className="space-y-4">
            <div className="max-h-[70vh] overflow-auto rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 p-2 flex items-center justify-center">
              {previewProof.url.endsWith('.pdf') ? (
                <iframe
                  src={previewProof.url}
                  className="w-full h-96 rounded-lg"
                  title="Document Preview"
                />
              ) : (
                <img
                  src={previewProof.url}
                  alt="Proof Document"
                  className="max-h-96 w-auto object-contain rounded-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )}
            </div>

            <div className="flex justify-end gap-2">
              <a
                href={previewProof.url}
                target="_blank"
                rel="noreferrer"
                download
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Download File
              </a>
              <button
                type="button"
                onClick={() => setPreviewProof(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* REJECT MODAL */}
      <Modal
        isOpen={Boolean(rejectUser)}
        onClose={() => setRejectUser(null)}
        title={`Reject Registration: ${rejectUser?.name}`}
        size="md"
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Reason for Rejection *
            </label>
            <textarea
              required
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. EB bill address does not match door number. Please re-upload valid proof."
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRejectUser(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRejecting}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
            >
              {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deleteUser)}
        onClose={() => setDeleteUser(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Registration Request"
        message={`Are you sure you want to permanently delete registration request for "${deleteUser?.name}"?`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete Permanently'}
        variant="danger"
      />

      {/* REJECT PROPERTY MODAL */}
      <Modal
        isOpen={Boolean(rejectProperty)}
        onClose={() => setRejectProperty(null)}
        title={`Reject Property Listing: ${rejectProperty?.title}`}
        size="md"
      >
        <form onSubmit={handleRejectPropertySubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Reason for Rejection *
            </label>
            <textarea
              required
              rows={4}
              value={propRejectReason}
              onChange={(e) => setPropRejectReason(e.target.value)}
              placeholder="e.g. Please upload actual photos of the house and specify door number clearly."
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRejectProperty(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRejectingProp}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
            >
              {isRejectingProp ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </Modal>

      {/* PREVIEW PROPERTY MODAL */}
      {previewProperty && (
        <Modal
          isOpen={Boolean(previewProperty)}
          onClose={() => setPreviewProperty(null)}
          title={`Property: ${previewProperty.title}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Photos */}
            {(() => {
              const photos = Array.isArray(previewProperty.images) ? previewProperty.images : [];
              if (photos.length === 0) return null;
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1 bg-gray-50 dark:bg-slate-800 rounded-xl">
                  {photos.map((p, i) => (
                    <img
                      key={i}
                      src={getFileUrl(p)}
                      alt={`Photo ${i + 1}`}
                      className="w-full h-28 object-cover rounded-lg border border-gray-200 dark:border-slate-700"
                    />
                  ))}
                </div>
              );
            })()}

            <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                  ₹{parseFloat(previewProperty.price).toLocaleString('en-IN')}{' '}
                  {previewProperty.listing_type === 'rent' ? '/ month' : ''}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700">
                  {previewProperty.listing_type === 'sale' ? 'FOR SALE' : 'FOR RENT'} • {previewProperty.bhk}
                </span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 font-medium">
                📍 {previewProperty.association_name} ({previewProperty.city})
                {previewProperty.door_number ? ` • Door: ${previewProperty.door_number}` : ''}
              </p>
              {previewProperty.description && (
                <p className="text-gray-600 dark:text-gray-400 pt-1 text-[11px] whitespace-pre-line">
                  {previewProperty.description}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handleApproveProperty(previewProperty.id, previewProperty.title)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Approve & Broadcast to All Associations
              </button>
              <button
                type="button"
                onClick={() => {
                  setRejectProperty(previewProperty);
                  setPreviewProperty(null);
                }}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold text-xs rounded-xl transition"
              >
                Reject
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* REJECT AD MODAL */}
      <Modal
        isOpen={Boolean(rejectAdModal)}
        onClose={() => setRejectAdModal(null)}
        title="Reject Ad Campaign Request"
      >
        <form onSubmit={handleRejectAdSubmit} className="space-y-4">
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Please provide feedback or a reason for rejecting the campaign{' '}
            <strong className="text-gray-900 dark:text-white">"{rejectAdModal?.title}"</strong> submitted by{' '}
            <strong className="text-gray-900 dark:text-white">{rejectAdModal?.shop_name || rejectAdModal?.vendor_name}</strong>.
          </p>
          <textarea
            required
            rows={3}
            value={adRejectReason}
            onChange={(e) => setAdRejectReason(e.target.value)}
            placeholder="e.g. Inappropriate banner text / please upload higher resolution creative banner..."
            className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-rose-500"
          />
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setRejectAdModal(null)}
              className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRejectingAd}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
            >
              {isRejectingAd ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </Modal>

      {/* PREVIEW AD MODAL */}
      <Modal
        isOpen={Boolean(previewAd)}
        onClose={() => setPreviewAd(null)}
        title={previewAd?.title || 'Advertisement Creative Preview'}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 max-h-[380px] flex items-center justify-center">
            {previewAd?.banner_image && (
              <img
                src={getFileUrl(previewAd.banner_image)}
                alt={previewAd.title}
                className="w-full h-auto object-contain max-h-[380px]"
              />
            )}
          </div>
          <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl space-y-1 text-xs">
            <span className="font-bold text-amber-500 uppercase">
              {previewAd?.target_panel === 'both' ? 'Admin & Member Portals' : `${previewAd?.target_panel} Portal`}
            </span>
            <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">{previewAd?.title}</h4>
            {previewAd?.tagline && (
              <p className="text-amber-600 dark:text-amber-400 font-semibold">{previewAd.tagline}</p>
            )}
            <p className="text-gray-500 dark:text-gray-400">
              Submitted by <strong>{previewAd?.shop_name || previewAd?.vendor_name}</strong> • Phone: {previewAd?.shop_phone || previewAd?.vendor_phone}
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => handleApproveAd(previewAd.id, previewAd.title)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              Approve & Publish Live
            </button>
            <button
              type="button"
              onClick={() => {
                setRejectAdModal(previewAd);
                setPreviewAd(null);
              }}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold text-xs rounded-xl transition"
            >
              Reject
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
