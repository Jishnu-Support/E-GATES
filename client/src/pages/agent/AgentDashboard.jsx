import React, { useState, useEffect } from 'react';
import {
  HiBuildingStorefront,
  HiBuildingOffice2,
  HiSparkles,
  HiCreditCard,
  HiUsers,
  HiPlus,
  HiClipboardDocumentCheck,
  HiPhone,
  HiChatBubbleLeftRight,
  HiArrowPath,
  HiCheckCircle,
  HiClock,
  HiXMark,
  HiMapPin,
  HiMagnifyingGlass,
  HiCurrencyRupee,
  HiShare,
} from 'react-icons/hi2';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export default function AgentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('businesses'); // 'businesses' | 'associations' | 'ads' | 'renewals'

  // Tab Data Lists
  const [businesses, setBusinesses] = useState([]);
  const [associations, setAssociations] = useState([]);
  const [ads, setAds] = useState([]);
  const [renewals, setRenewals] = useState({ vendors: [], associations: [], ads: [] });
  const [tabLoading, setTabLoading] = useState(false);

  // Modals
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [businessForm, setBusinessForm] = useState({
    name: '',
    business_name: '',
    phone: '',
    email: '',
    business_category: 'Retail & Grocery',
    district: user?.district || 'Krishnagiri',
    taluk: user?.taluk || 'Hosur',
    address: '',
  });
  const [submittingBusiness, setSubmittingBusiness] = useState(false);

  const [showAssocModal, setShowAssocModal] = useState(false);
  const [assocForm, setAssocForm] = useState({
    name: '',
    city: user?.taluk || 'Hosur',
    address: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
  });
  const [submittingAssoc, setSubmittingAssoc] = useState(false);

  // Fetch Stats
  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/agent/stats');
      setStats(res.data?.data || null);
    } catch (err) {
      console.warn('Error fetching agent stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Active Tab Data
  const fetchTabData = async (tab) => {
    try {
      setTabLoading(true);
      if (tab === 'businesses') {
        const res = await api.get('/agent/businesses');
        setBusinesses(res.data?.data || []);
      } else if (tab === 'associations') {
        const res = await api.get('/agent/associations');
        setAssociations(res.data?.data || []);
      } else if (tab === 'ads') {
        const res = await api.get('/agent/ads');
        setAds(res.data?.data || []);
      } else if (tab === 'renewals') {
        const res = await api.get('/agent/renewals');
        setRenewals(res.data?.data || { vendors: [], associations: [], ads: [] });
      }
    } catch (err) {
      console.warn(`Error loading ${tab}:`, err);
    } finally {
      setTabLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchTabData(activeTab);
  }, [activeTab]);

  // Handle Business Submit
  const handleBusinessSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingBusiness(true);
      await api.post('/agent/businesses', businessForm);
      toast.success('Vendor business registered successfully under your Agent ID!');
      setShowBusinessModal(false);
      setBusinessForm({
        name: '',
        business_name: '',
        phone: '',
        email: '',
        business_category: 'Retail & Grocery',
        district: user?.district || 'Krishnagiri',
        taluk: user?.taluk || 'Hosur',
        address: '',
      });
      fetchStats();
      fetchTabData('businesses');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to onboard vendor business');
    } finally {
      setSubmittingBusiness(false);
    }
  };

  // Handle Association Submit
  const handleAssocSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingAssoc(true);
      await api.post('/agent/associations', assocForm);
      toast.success('Layout Association introduced successfully!');
      setShowAssocModal(false);
      setAssocForm({
        name: '',
        city: user?.taluk || 'Hosur',
        address: '',
        contact_person: '',
        contact_phone: '',
        contact_email: '',
      });
      fetchStats();
      fetchTabData('associations');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register association');
    } finally {
      setSubmittingAssoc(false);
    }
  };

  const copyCode = () => {
    const code = stats?.agent_code || user?.agent_code || 'AGT-CODE';
    navigator.clipboard.writeText(code);
    toast.success(`Agent code ${code} copied to clipboard!`);
  };

  const shareAgentInvite = () => {
    const code = stats?.agent_code || user?.agent_code || '';
    const shareText = `Partner with EGATES Community Platform! Register your Vendor Shop or Layout Association using Growth Agent Code: ${code}. Visit: ${window.location.origin}/register`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-4">
      {/* Top Banner / Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-purple-500/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-2">
              <span>🚀 Growth & Business Agent</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome, {user?.name}
            </h1>
            <p className="text-sm text-purple-200/80 mt-1 max-w-xl leading-relaxed">
              Link local shops, introduce residential associations, drive advertisement sales, and track subscription renewals.
            </p>
          </div>

          {/* Referral Card */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 flex flex-col items-start sm:items-end gap-2">
            <span className="text-[11px] font-bold text-purple-200 uppercase tracking-wider">
              Your Referral Agent Code
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black font-mono tracking-widest text-amber-300 bg-black/30 px-3 py-1 rounded-xl border border-amber-400/30">
                {stats?.agent_code || user?.agent_code || 'PENDING'}
              </span>
              <button
                type="button"
                onClick={copyCode}
                className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow transition cursor-pointer"
                title="Copy Agent Code"
              >
                <HiClipboardDocumentCheck className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={shareAgentInvite}
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow transition cursor-pointer"
                title="Share on WhatsApp"
              >
                <HiShare className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Linked Businesses */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Linked Businesses</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <HiBuildingStorefront className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              {stats?.businesses?.total || 0}
            </div>
            <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1.5">
              <span className="text-emerald-500 font-bold">{stats?.businesses?.paid || 0} Paid</span>
              <span>•</span>
              <span className="text-amber-500 font-bold">{stats?.businesses?.pending || 0} Pending</span>
            </p>
          </div>
        </div>

        {/* Associations */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Associations</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <HiBuildingOffice2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              {stats?.associations?.total || 0}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              {stats?.associations?.active || 0} Active Communities
            </p>
          </div>
        </div>

        {/* Ads Sold */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Ads Sold</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <HiSparkles className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              {stats?.ads?.total || 0}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              ₹{stats?.ads?.paid_volume || 0} Total Ad Sales
            </p>
          </div>
        </div>

        {/* Est. Commission */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 dark:bg-slate-900 border border-emerald-500/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Est. Commission</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
              <HiCurrencyRupee className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              ₹{stats?.estimated_commission || 0}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Direct Referral & Ad Share
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 dark:border-slate-800 overflow-x-auto gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('businesses')}
          className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'businesses'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
          }`}
        >
          <HiBuildingStorefront className="w-4 h-4" />
          <span>Linked Businesses ({businesses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('associations')}
          className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'associations'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
          }`}
        >
          <HiBuildingOffice2 className="w-4 h-4" />
          <span>Association Registrations ({associations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ads')}
          className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'ads'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
          }`}
        >
          <HiSparkles className="w-4 h-4" />
          <span>Ads Sales ({ads.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('renewals')}
          className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'renewals'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
          }`}
        >
          <HiCreditCard className="w-4 h-4" />
          <span>Subscription Renewals Tracker</span>
        </button>
      </div>

      {/* TAB 1: BUSINESSES */}
      {activeTab === 'businesses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Linked Local Businesses & Shops
              </h2>
              <p className="text-xs text-gray-500">
                Merchants registered using your Agent Code or onboarded directly by you.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowBusinessModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              <HiPlus className="w-4 h-4" />
              <span>Onboard New Vendor Shop</span>
            </button>
          </div>

          {tabLoading ? (
            <div className="text-center py-12 text-sm text-gray-500">Loading businesses...</div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
              <HiBuildingStorefront className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No linked businesses yet</p>
              <p className="text-xs text-gray-500 mt-1">
                Start linking local shops or share your Agent Code to earn commissions!
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-800 text-gray-500 font-bold">
                      <th className="py-3 px-4">Business & Owner</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Phone / Contact</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {businesses.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4">
                          <p className="font-bold text-gray-900 dark:text-white">{b.business_name || b.name}</p>
                          <p className="text-[11px] text-gray-500">Owner: {b.name}</p>
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                          {b.business_category || 'Retail Shop'}
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                          {b.taluk}, {b.district}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-mono text-gray-900 dark:text-white">{b.phone}</p>
                          <p className="text-[10px] text-gray-400">{b.email}</p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              b.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              b.vendor_payment_status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {b.vendor_payment_status || 'unpaid'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ASSOCIATIONS */}
      {activeTab === 'associations' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Introduced Layout Associations
              </h2>
              <p className="text-xs text-gray-500">
                Residential gated communities and colonies onboarded by you.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAssocModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              <HiPlus className="w-4 h-4" />
              <span>Introduce New Layout Association</span>
            </button>
          </div>

          {tabLoading ? (
            <div className="text-center py-12 text-sm text-gray-500">Loading associations...</div>
          ) : associations.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
              <HiBuildingOffice2 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No layout associations introduced yet</p>
              <p className="text-xs text-gray-500 mt-1">
                Meet with layout resident welfare associations and register them to expand your territory!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {associations.map((a) => (
                <div
                  key={a.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {a.code}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          a.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {a.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-gray-900 dark:text-white mt-1">
                      {a.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <HiMapPin className="w-3.5 h-3.5" />
                      <span>{a.city || 'Hosur'}</span>
                    </p>
                    {a.address && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{a.address}</p>}
                  </div>
                  <div className="pt-4 mt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500">
                    <span>Registered Members:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{a.member_count || 0} residents</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ADS SALES */}
      {activeTab === 'ads' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Advertisements Sold & Managed
              </h2>
              <p className="text-xs text-gray-500">
                Ad campaigns booked through your agent profile across city and district layouts.
              </p>
            </div>
          </div>

          {tabLoading ? (
            <div className="text-center py-12 text-sm text-gray-500">Loading ads...</div>
          ) : ads.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
              <HiSparkles className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No ad sales recorded yet</p>
              <p className="text-xs text-gray-500 mt-1">
                Pitch promotional ad slots to local brands, shops, and real estate developers!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ads.map((ad) => (
                <div
                  key={ad.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col justify-between"
                >
                  {ad.banner_image && (
                    <img src={ad.banner_image} alt={ad.title} className="w-full h-36 object-cover" />
                  )}
                  <div className="p-4 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                        {ad.target_district || 'All Districts'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ad.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ad.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">
                      {ad.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Advertiser: <strong>{ad.company_name || ad.advertiser_name || 'Direct'}</strong>
                    </p>
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>Slot Fee: <strong>₹{ad.payment_amount || 999}</strong></span>
                      <span className={`font-bold ${ad.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {ad.payment_status === 'paid' ? '✓ Paid' : 'Unpaid'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RENEWALS TRACKER */}
      {activeTab === 'renewals' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Subscription & Campaign Renewals Tracker
            </h2>
            <p className="text-xs text-gray-500">
              Send 1-click renewal reminders via WhatsApp to vendors, layout associations, and advertisers.
            </p>
          </div>

          {/* Vendors Renewals */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <HiBuildingStorefront className="w-4 h-4 text-amber-500" />
              <span>Vendor Shop Activation & Renewals ({renewals.vendors?.length || 0})</span>
            </h3>
            {renewals.vendors?.length === 0 ? (
              <p className="text-xs text-gray-500">No vendor renewals pending.</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {renewals.vendors.map((v) => (
                  <div key={v.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-xs text-gray-900 dark:text-white">
                        {v.business_name || v.name}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Contact: {v.name} • {v.phone} • Status: <strong className="uppercase">{v.vendor_payment_status || 'unpaid'}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {v.whatsapp_url && (
                        <a
                          href={v.whatsapp_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition"
                        >
                          <HiChatBubbleLeftRight className="w-3.5 h-3.5" />
                          <span>WhatsApp Reminder</span>
                        </a>
                      )}
                      {v.phone && (
                        <a
                          href={`tel:${v.phone}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 font-bold text-xs transition"
                        >
                          <HiPhone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ad Campaign Slot Renewals */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <HiSparkles className="w-4 h-4 text-purple-500" />
              <span>Ad Campaign Slot Renewals ({renewals.ads?.length || 0})</span>
            </h3>
            {renewals.ads?.length === 0 ? (
              <p className="text-xs text-gray-500">No ad campaigns up for renewal.</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {renewals.ads.map((ad) => (
                  <div key={ad.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-xs text-gray-900 dark:text-white">
                        {ad.title}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Advertiser: {ad.company_name || ad.advertiser_name} • Slot Fee: ₹{ad.payment_amount || 999}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {ad.whatsapp_url && (
                        <a
                          href={ad.whatsapp_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow transition"
                        >
                          <HiChatBubbleLeftRight className="w-3.5 h-3.5" />
                          <span>Pitch Renewal</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ONBOARD VENDOR SHOP */}
      {showBusinessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <HiBuildingStorefront className="w-5 h-5 text-purple-600" />
                <span>Onboard New Vendor Shop</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowBusinessModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBusinessSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Business / Shop Name *
                </label>
                <input
                  type="text"
                  required
                  value={businessForm.business_name}
                  onChange={(e) => setBusinessForm({ ...businessForm, business_name: e.target.value })}
                  placeholder="e.g. Sri Lakshmi Supermarket"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Owner Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={businessForm.name}
                    onChange={(e) => setBusinessForm({ ...businessForm, name: e.target.value })}
                    placeholder="e.g. Ramesh"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Phone (WhatsApp) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={businessForm.phone}
                    onChange={(e) => setBusinessForm({ ...businessForm, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={businessForm.business_category}
                  onChange={(e) => setBusinessForm({ ...businessForm, business_category: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
                >
                  <option value="Retail & Grocery">Retail & Grocery</option>
                  <option value="Electronics & Electricals">Electronics & Electricals</option>
                  <option value="Plumbing & Hardware">Plumbing & Hardware</option>
                  <option value="Automobile & Bike Service">Automobile & Bike Service</option>
                  <option value="Medical & Healthcare">Medical & Healthcare</option>
                  <option value="Home & Construction">Home & Construction</option>
                  <option value="Other">Other Services</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Town / Taluk
                  </label>
                  <input
                    type="text"
                    value={businessForm.taluk}
                    onChange={(e) => setBusinessForm({ ...businessForm, taluk: e.target.value })}
                    placeholder="Hosur"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    value={businessForm.district}
                    onChange={(e) => setBusinessForm({ ...businessForm, district: e.target.value })}
                    placeholder="Krishnagiri"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBusinessModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBusiness}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {submittingBusiness ? 'Onboarding...' : 'Onboard Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INTRODUCE LAYOUT ASSOCIATION */}
      {showAssocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <HiBuildingOffice2 className="w-5 h-5 text-purple-600" />
                <span>Introduce Layout Association</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAssocModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssocSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Association / Layout Name *
                </label>
                <input
                  type="text"
                  required
                  value={assocForm.name}
                  onChange={(e) => setAssocForm({ ...assocForm, name: e.target.value })}
                  placeholder="e.g. Green Valley Residents Welfare Association"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    City / Town *
                  </label>
                  <input
                    type="text"
                    required
                    value={assocForm.city}
                    onChange={(e) => setAssocForm({ ...assocForm, city: e.target.value })}
                    placeholder="Hosur"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Contact Person (President/Secretary)
                  </label>
                  <input
                    type="text"
                    value={assocForm.contact_person}
                    onChange={(e) => setAssocForm({ ...assocForm, contact_person: e.target.value })}
                    placeholder="e.g. K. Narayanan"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={assocForm.contact_phone}
                  onChange={(e) => setAssocForm({ ...assocForm, contact_phone: e.target.value })}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Layout Address / Landmark
                </label>
                <textarea
                  rows={2}
                  value={assocForm.address}
                  onChange={(e) => setAssocForm({ ...assocForm, address: e.target.value })}
                  placeholder="e.g. Near Ring Road, Hosur"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssocModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAssoc}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {submittingAssoc ? 'Registering...' : 'Register Association'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
