import React, { useState, useEffect } from 'react';
import {
  HiCreditCard,
  HiBuildingStorefront,
  HiBuildingOffice2,
  HiSparkles,
  HiFilm,
  HiCalendarDays,
  HiClock,
  HiPlus,
  HiPencilSquare,
  HiTrash,
  HiCheckCircle,
  HiArrowPath,
  HiTag,
  HiXMark,
} from 'react-icons/hi2';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ManagePricing() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vendor'); // 'vendor' | 'association' | 'ad_image' | 'ad_video'

  // Edit Modal State
  const [editingPlan, setEditingPlan] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    price: '',
    original_price: '',
    duration_days: 30,
    billing_cycle: 'month',
    is_popular: false,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  // New Plan Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlanForm, setNewPlanForm] = useState({
    plan_type: 'vendor_subscription',
    billing_cycle: 'month',
    duration_days: 30,
    name: '',
    price: '',
    original_price: '',
    is_popular: false,
  });
  const [creating, setCreating] = useState(false);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/pricing');
      setPlans(res.data?.data || []);
    } catch (err) {
      console.warn('Error fetching pricing plans:', err);
      toast.error('Failed to load pricing plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    setEditForm({
      name: plan.name,
      price: plan.price,
      original_price: plan.original_price || '',
      duration_days: plan.duration_days,
      billing_cycle: plan.billing_cycle,
      is_popular: Boolean(plan.is_popular),
      is_active: Boolean(plan.is_active),
    });
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editingPlan) return;
    try {
      setSaving(true);
      await api.put(`/pricing/${editingPlan.id}`, editForm);
      toast.success(`Plan "${editForm.name}" updated successfully!`);
      setEditingPlan(null);
      fetchPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update plan');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      await api.post('/pricing', newPlanForm);
      toast.success('New plan added successfully!');
      setShowAddModal(false);
      setNewPlanForm({
        plan_type: 'vendor_subscription',
        billing_cycle: 'month',
        duration_days: 30,
        name: '',
        price: '',
        original_price: '',
        is_popular: false,
      });
      fetchPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create plan');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePlan = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the plan "${name}"?`)) return;
    try {
      await api.delete(`/pricing/${id}`);
      toast.success('Plan deleted successfully');
      fetchPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete plan');
    }
  };

  // Filter plans by active category
  const getFilteredPlans = () => {
    if (activeTab === 'vendor') {
      return plans.filter((p) => p.plan_type === 'vendor_subscription');
    } else if (activeTab === 'association') {
      return plans.filter((p) => p.plan_type === 'association_subscription');
    } else if (activeTab === 'ad_image') {
      return plans.filter((p) => p.plan_type === 'ad_image');
    } else if (activeTab === 'ad_video') {
      return plans.filter((p) => p.plan_type === 'ad_video');
    }
    return [];
  };

  const filtered = getFilteredPlans();

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
            <HiCreditCard className="w-8 h-8 text-amber-500" />
            <span>Payment & Subscription Plans Manager</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure subscription rates for Vendors, Layout Associations, and Day/Monthly Ad placements (Image & Video).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchPlans}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 transition cursor-pointer"
            title="Refresh Plans"
          >
            <HiArrowPath className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setNewPlanForm((prev) => ({
                ...prev,
                plan_type:
                  activeTab === 'vendor'
                    ? 'vendor_subscription'
                    : activeTab === 'association'
                    ? 'association_subscription'
                    : activeTab === 'ad_image'
                    ? 'ad_image'
                    : 'ad_video',
              }));
              setShowAddModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs sm:text-sm shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <HiPlus className="w-4 h-4" />
            <span>Add Custom Plan</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-800 overflow-x-auto gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('vendor')}
          className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'vendor'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
          }`}
        >
          <HiBuildingStorefront className="w-4 h-4" />
          <span>🏪 Vendor Shop Subscriptions</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('association')}
          className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'association'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
          }`}
        >
          <HiBuildingOffice2 className="w-4 h-4" />
          <span>🏛️ Layout Association License</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ad_image')}
          className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'ad_image'
              ? 'border-purple-500 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
          }`}
        >
          <HiSparkles className="w-4 h-4" />
          <span>🖼️ Image Ad (Day & Monthly)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ad_video')}
          className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'ad_video'
              ? 'border-rose-500 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
          }`}
        >
          <HiFilm className="w-4 h-4" />
          <span>🎬 Video Ad (Day & Monthly)</span>
        </button>
      </div>

      {/* Info Notice */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
        <span>
          <strong>Super Admin Control:</strong> Changes made here immediately update the vendor onboarding pricing, resident association licenses, and day/monthly advertisement checkout rates platform-wide.
        </span>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="text-center py-12 text-sm text-gray-500">Loading pricing plans...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No plans found in this category.</p>
          <p className="text-xs text-gray-500 mt-1">Click "Add Custom Plan" to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filtered.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-3xl p-5 border shadow-sm transition flex flex-col justify-between relative overflow-hidden bg-white dark:bg-slate-900 ${
                plan.is_popular
                  ? 'border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/20'
                  : 'border-gray-200 dark:border-slate-800'
              }`}
            >
              {plan.is_popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-slate-950 font-black text-[9px] uppercase px-3 py-1 rounded-bl-xl shadow-xs">
                  Popular Plan
                </div>
              )}

              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  <HiClock className="w-4 h-4 text-amber-500" />
                  <span>
                    {plan.duration_days >= 30
                      ? `${Math.round(plan.duration_days / 30)} Month${plan.duration_days > 30 ? 's' : ''}`
                      : `${plan.duration_days} Day${plan.duration_days > 1 ? 's' : ''}`}
                  </span>
                  <span className="text-[10px] lowercase text-gray-400">({plan.duration_days} days)</span>
                </div>

                <h3 className="text-base font-black text-gray-900 dark:text-white mt-1">
                  {plan.name}
                </h3>

                {/* Price Display */}
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-gray-900 dark:text-white">
                    ₹{plan.price}
                  </span>
                  {plan.original_price && plan.original_price > plan.price && (
                    <span className="text-sm font-semibold text-gray-400 line-through">
                      ₹{plan.original_price}
                    </span>
                  )}
                </div>

                {/* Features List */}
                {Array.isArray(plan.features) && plan.features.length > 0 && (
                  <ul className="mt-4 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <HiCheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="mt-5 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    plan.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {plan.is_active ? 'Active' : 'Disabled'}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(plan)}
                    className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-gray-700 dark:text-gray-300 hover:text-amber-700 transition cursor-pointer"
                    title="Edit Price & Details"
                  >
                    <HiPencilSquare className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeletePlan(plan.id, plan.name)}
                    className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-gray-700 dark:text-gray-300 hover:text-rose-600 transition cursor-pointer"
                    title="Delete Plan"
                  >
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: EDIT PLAN */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <HiPencilSquare className="w-5 h-5 text-amber-500" />
                <span>Edit Plan: {editingPlan.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Plan Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Original Strike Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.original_price}
                    onChange={(e) => setEditForm({ ...editForm, original_price: e.target.value })}
                    placeholder="e.g. 899"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Duration (in Days) *
                  </label>
                  <input
                    type="number"
                    required
                    value={editForm.duration_days}
                    onChange={(e) => setEditForm({ ...editForm, duration_days: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Billing Cycle
                  </label>
                  <select
                    value={editForm.billing_cycle}
                    onChange={(e) => setEditForm({ ...editForm, billing_cycle: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
                  >
                    <option value="day">Day Basis</option>
                    <option value="month">1 Month</option>
                    <option value="3_months">3 Months</option>
                    <option value="6_months">6 Months</option>
                    <option value="year">1 Year</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={editForm.is_popular}
                    onChange={(e) => setEditForm({ ...editForm, is_popular: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>Mark as Popular / Best Value</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                    className="rounded text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Active & Live</span>
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Plan Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD PLAN */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <HiPlus className="w-5 h-5 text-amber-500" />
                <span>Create New Pricing Plan</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Plan Category *
                </label>
                <select
                  value={newPlanForm.plan_type}
                  onChange={(e) => setNewPlanForm({ ...newPlanForm, plan_type: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
                >
                  <option value="vendor_subscription">🏪 Vendor Shop Subscription</option>
                  <option value="association_subscription">🏛️ Layout Association License</option>
                  <option value="ad_image">🖼️ Picture / Image Ad Campaign</option>
                  <option value="ad_video">🎬 Video Ad Campaign</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Plan Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={newPlanForm.name}
                  onChange={(e) => setNewPlanForm({ ...newPlanForm, name: e.target.value })}
                  placeholder="e.g. 6 Months Plan"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newPlanForm.price}
                    onChange={(e) => setNewPlanForm({ ...newPlanForm, price: e.target.value })}
                    placeholder="499"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Original Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPlanForm.original_price}
                    onChange={(e) => setNewPlanForm({ ...newPlanForm, original_price: e.target.value })}
                    placeholder="899"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Duration (Days) *
                  </label>
                  <input
                    type="number"
                    required
                    value={newPlanForm.duration_days}
                    onChange={(e) => setNewPlanForm({ ...newPlanForm, duration_days: e.target.value })}
                    placeholder="90"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Billing Cycle
                  </label>
                  <select
                    value={newPlanForm.billing_cycle}
                    onChange={(e) => setNewPlanForm({ ...newPlanForm, billing_cycle: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
                  >
                    <option value="day">Day Basis</option>
                    <option value="month">1 Month</option>
                    <option value="3_months">3 Months</option>
                    <option value="6_months">6 Months</option>
                    <option value="year">1 Year</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {creating ? 'Creating...' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
