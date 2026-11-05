import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HiBuildingStorefront,
  HiUser,
  HiEnvelope,
  HiPhone,
  HiLockClosed,
  HiMapPin,
  HiClock,
  HiCreditCard,
  HiPhoto,
  HiCheckCircle,
  HiExclamationCircle,
  HiArrowRight,
  HiArrowLeft,
  HiBuildingOffice2
} from 'react-icons/hi2';
import { useAuth } from '../../hooks/useAuth';
import PoweredByLogo from '../../components/common/PoweredByLogo';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function VendorRegister() {
  const { registerVendor } = useAuth();
  const navigate = useNavigate();

  const [associations, setAssociations] = useState([]);
  const [loadingAssocs, setLoadingAssocs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-fetch association by code
  const [assocCodeInput, setAssocCodeInput] = useState('');
  const [fetchedAssoc, setFetchedAssoc] = useState(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const codeTimerRef = useRef(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    shop_name: '',
    shop_category: 'Grocery & Supermarket',
    shop_address: '',
    shop_phone: '',
    business_hours: '8:00 AM - 9:00 PM',
    upi_id: '',
    shop_description: '',
    association_id: '',
  });

  const [shopLogo, setShopLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const logoInputRef = useRef(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const categories = [
    'Grocery & Supermarket',
    'Dairy & Milk Products',
    'Fruits & Vegetables',
    'Food, Snacks & Bakery',
    'Electrical & Plumbing Services',
    'Home Cleaning & Maintenance',
    'Pharmacy & Healthcare',
    'Laundry & Dry Cleaning',
    'Water Purifier & RO Services',
    'Pest Control',
    'Hardware & Paints',
    'Security & CCTV',
    'Other Local Services'
  ];

  // Fetch associations for layout selection
  useEffect(() => {
    const fetchAssociations = async () => {
      try {
        setLoadingAssocs(true);
        const res = await api.get('/associations');
        setAssociations(res.data?.data || []);
      } catch (err) {
        console.warn('Could not load associations list:', err.message);
      } finally {
        setLoadingAssocs(false);
      }
    };
    fetchAssociations();
  }, []);

  const handleAssocCodeChange = (val) => {
    const code = val.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setAssocCodeInput(code);

    if (codeTimerRef.current) clearTimeout(codeTimerRef.current);
    if (!code.trim()) {
      setFetchedAssoc(null);
      setCodeLoading(false);
      return;
    }

    setCodeLoading(true);
    codeTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/associations/code/${encodeURIComponent(code.trim())}`);
        if (res.data?.data) {
          setFetchedAssoc(res.data.data);
          setForm(prev => ({ ...prev, association_id: String(res.data.data.id) }));
        } else {
          setFetchedAssoc(null);
        }
      } catch {
        setFetchedAssoc(null);
      } finally {
        setCodeLoading(false);
      }
    }, 350);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Shop logo/image size must be less than 5MB');
        return;
      }
      setShopLogo(file);
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!form.shop_name.trim()) {
      setErrorMessage('Please enter your Shop or Business Name.');
      return;
    }
    if (!form.name.trim()) {
      setErrorMessage('Please enter Merchant / Owner Name.');
      return;
    }
    if (!form.phone.trim() || form.phone.trim().length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (form.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (form.password !== form.confirm_password) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }
    if (!agreedToTerms) {
      setErrorMessage('Please agree to the platform Terms & Community Guidelines.');
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('name', form.name.trim());
      formData.append('email', form.email.trim());
      formData.append('phone', form.phone.trim());
      formData.append('password', form.password);
      formData.append('shop_name', form.shop_name.trim());
      formData.append('shop_category', form.shop_category);
      if (form.shop_address) formData.append('shop_address', form.shop_address.trim());
      if (form.shop_phone) formData.append('shop_phone', form.shop_phone.trim());
      if (form.business_hours) formData.append('business_hours', form.business_hours.trim());
      if (form.upi_id) formData.append('upi_id', form.upi_id.trim());
      if (form.shop_description) formData.append('shop_description', form.shop_description.trim());
      if (form.association_id) formData.append('association_id', form.association_id);
      if (assocCodeInput.trim()) formData.append('association_code', assocCodeInput.trim());

      if (shopLogo) {
        formData.append('shop_logo', shopLogo);
      }

      const res = await registerVendor(formData);
      setSuccessData(res.data || { shop_name: form.shop_name, name: form.name });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Vendor registration failed';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Bar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between py-2">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800"
        >
          <HiArrowLeft className="w-4 h-4" />
          <span>Back to Sign In</span>
        </Link>
        <PoweredByLogo />
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto w-full my-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-sm">
          {successData ? (
            /* SUCCESS CONFIRMATION SCREEN */
            <div className="text-center py-8 space-y-6 max-w-lg mx-auto">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <HiCheckCircle className="w-12 h-12" />
              </div>
              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Pending Administrator Approval
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-3">
                  Vendor Registration Submitted!
                </h2>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                  Your shop <strong className="text-white">"{successData.shop_name || form.shop_name}"</strong> has been registered.
                  The Administrator will review and approve your merchant registration.
                </p>
              </div>

              <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 text-left text-xs space-y-2 text-slate-300">
                <p className="font-bold text-amber-400">✅ What happens next:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 font-medium">
                  <li><strong>Admin Approval:</strong> Administrator reviews and approves your shop account in the Admin Panel.</li>
                  <li><strong>Vendor Sign In:</strong> Log in to the <strong>Vendor Portal</strong> using your registered email/phone and password.</li>
                  <li><strong>Proceed with Payment:</strong> Complete your one-time onboarding payment to activate store catalog features.</li>
                  <li><strong>Add Items & Start Selling:</strong> Add your products, set pricing, and start receiving direct orders from layout residents!</li>
                </ol>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => navigate('/login', { state: { role: 'vendor', identifier: form.email } })}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-sm shadow-lg transition"
                >
                  Go to Vendor Login
                </button>
              </div>
            </div>
          ) : (
            /* REGISTRATION FORM */
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <HiBuildingStorefront className="w-4 h-4" />
                  <span>Merchant & Vendor Onboarding</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Register Your Shop / Business
                </h1>
                <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto">
                  Showcase your products and services directly to residential layout members. Register today to join the community directory.
                </p>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm font-semibold flex items-center gap-3">
                  <HiExclamationCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* SECTION 1: SHOP & BUSINESS DETAILS */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <span>🏪</span>
                  <span>1. Shop & Business Details</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Shop / Business Name <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <HiBuildingStorefront className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={form.shop_name}
                        onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
                        placeholder="e.g. KCC Fresh Dairy & Mart"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Business Category <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={form.shop_category}
                      onChange={(e) => setForm({ ...form, shop_category: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 transition"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat} className="bg-slate-900 text-white">
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Shop WhatsApp / Phone <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <HiPhone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        value={form.shop_phone}
                        onChange={(e) => setForm({ ...form, shop_phone: e.target.value })}
                        placeholder="Order WhatsApp Number"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">Residents can click to order via WhatsApp</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Operating Hours
                    </label>
                    <div className="relative">
                      <HiClock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={form.business_hours}
                        onChange={(e) => setForm({ ...form, business_hours: e.target.value })}
                        placeholder="e.g. 7:00 AM - 9:30 PM"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      UPI ID (For Direct Resident Payments)
                    </label>
                    <div className="relative">
                      <HiCreditCard className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={form.upi_id}
                        onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
                        placeholder="e.g. yourshop@okaxis"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Shop Address / Location
                    </label>
                    <div className="relative">
                      <HiMapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={form.shop_address}
                        onChange={(e) => setForm({ ...form, shop_address: e.target.value })}
                        placeholder="e.g. Main Road, Near Layout Gate #1"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Shop Description / Specialities
                    </label>
                    <input
                      type="text"
                      value={form.shop_description}
                      onChange={(e) => setForm({ ...form, shop_description: e.target.value })}
                      placeholder="e.g. 100% pure organic dairy, fresh milk daily delivery"
                      className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                </div>

                {/* Shop Logo / Storefront Photo */}
                <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/60">
                  <label className="block text-xs font-bold text-slate-300 mb-2">
                    Shop Logo or Storefront Photo
                  </label>
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Shop Logo Preview"
                        className="w-16 h-16 rounded-xl object-cover border-2 border-amber-500/50"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500">
                        <HiPhoto className="w-8 h-8" />
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        ref={logoInputRef}
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-600 transition"
                      >
                        {logoPreview ? 'Change Shop Image' : 'Upload Storefront Image'}
                      </button>
                      <p className="text-[11px] text-slate-400 mt-1">PNG, JPG or WebP (max 5MB)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: TARGET LAYOUT ASSOCIATION */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <span>📍</span>
                  <span>2. Target Layout Association (Optional)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  If your shop serves a specific layout association, enter their code or select below so residents will see you under their layout directory.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Association Registration Code
                    </label>
                    <div className="relative">
                      <HiBuildingOffice2 className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={assocCodeInput}
                        onChange={(e) => handleAssocCodeChange(e.target.value)}
                        placeholder="e.g. KCC"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 uppercase tracking-wider focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                    {codeLoading && <span className="text-[11px] text-amber-400">Checking code...</span>}
                    {fetchedAssoc && (
                      <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                        <HiCheckCircle className="w-4 h-4" />
                        <span>Connected to: {fetchedAssoc.name}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Or Select from Association Directory
                    </label>
                    <select
                      value={form.association_id}
                      onChange={(e) => setForm({ ...form, association_id: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 transition"
                    >
                      <option value="" className="bg-slate-900 text-white">
                        All Layout Associations (General Vendor)
                      </option>
                      {associations.map((assoc) => (
                        <option key={assoc.id} value={assoc.id} className="bg-slate-900 text-white">
                          {assoc.name} {assoc.code ? `(${assoc.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3: MERCHANT OWNER ACCOUNT */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <span>👤</span>
                  <span>3. Merchant / Owner Account Details</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Owner / Contact Person <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <HiUser className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Your Full Name"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Merchant Email <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <HiEnvelope className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="merchant@example.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Mobile Number <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <HiPhone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        required
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="10-digit mobile"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Create Password <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <HiLockClosed className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="At least 6 characters"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Confirm Password <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <HiLockClosed className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={form.confirm_password}
                        onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                        placeholder="Re-enter password"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: TERMS & SUBMIT */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-amber-500 bg-slate-800 border-slate-700 focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-xs text-slate-300">
                    I confirm that the business details provided are accurate and agree to adhere to community layout service guidelines and fair pricing policies.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-sm shadow-xl hover:shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Submitting Shop Registration...</span>
                  ) : (
                    <>
                      <span>Submit Vendor Registration for Super Admin Approval</span>
                      <HiArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-2 text-xs text-slate-500">
        &copy; {new Date().getFullYear()} EGATES - Community & Layout Association Management.
      </footer>
    </div>
  );
}
