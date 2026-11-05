import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HiBuildingOffice2,
  HiUser,
  HiEnvelope,
  HiPhone,
  HiLockClosed,
  HiMapPin,
  HiCheckCircle,
  HiArrowRight,
  HiGlobeAlt,
  HiDocumentCheck,
  HiExclamationCircle,
} from 'react-icons/hi2';
import api from '../../services/api';
import PoweredByLogo from '../../components/common/PoweredByLogo';

export default function AdvertiserRegister() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    company_name: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    gst_number: '',
    company_website: '',
    district: 'Krishnagiri',
    taluk: 'Hosur',
    state: 'Tamil Nadu',
    address: '',
  });

  const [companyLogo, setCompanyLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCompanyLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key !== 'confirmPassword') {
          data.append(key, formData[key]);
        }
      });
      if (companyLogo) {
        data.append('company_logo', companyLogo);
      }

      await api.post('/auth/register-advertiser', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSubmitted(true);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-between p-4 antialiased text-white">
        <div className="w-full max-w-lg mx-auto my-auto p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-5 border border-emerald-500/40">
            <HiCheckCircle className="w-12 h-12" />
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
            Ad Company Registration
          </span>
          <h2 className="text-2xl font-black mt-3 mb-2">Registration Submitted!</h2>
          <p className="text-slate-300 text-sm mb-6 leading-relaxed">
            Thank you for registering <strong>{formData.company_name}</strong> on EGATES. Your account is sent for Super Admin review.
          </p>
          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 text-left text-xs space-y-2 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Company Name:</span>
              <span className="font-bold text-white">{formData.company_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Contact Person:</span>
              <span className="font-bold text-white">{formData.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Phone:</span>
              <span className="font-mono font-bold text-white">{formData.phone}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Location:</span>
              <span className="font-bold text-white">{formData.taluk}, {formData.district}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Account Status:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Pending Super Admin Approval
              </span>
            </div>
          </div>
          <p className="text-slate-400 text-xs mb-6">
            After Super Admin approval, you will be able to log in, create ads targeted by city/district, and pay per ad slot to go live on the user portals!
          </p>
          <Link
            to="/login?role=advertiser"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-bold text-sm shadow-lg transition"
          >
            <span>Proceed to Login</span>
            <HiArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <footer className="text-center py-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} EGATES Platform. All rights reserved.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between p-4 sm:p-6 antialiased text-white">
      {/* Top Bar */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between py-2">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/egates-logo.png"
            alt="EGATES"
            className="h-10 w-auto rounded-xl bg-white/95 p-1"
          />
        </Link>
        <PoweredByLogo />
      </div>

      {/* Main Card */}
      <div className="w-full max-w-2xl mx-auto my-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 mb-2">
            <span>📢</span>
            <span>Promote Your Brand</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Ad Company Registration
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Reach thousands of gated community and layout residents. Post targeted image & video advertisements city-by-city with pay-per-ad slots.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
            <HiExclamationCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Company / Agency Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <HiBuildingOffice2 className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  name="company_name"
                  required
                  value={formData.company_name}
                  onChange={handleChange}
                  placeholder="e.g. Apex Media Marketing"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Contact Person Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <HiUser className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Suresh Kumar"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Company Email Address <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <HiEnvelope className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. ads@apexmedia.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Phone Number (WhatsApp Active) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <HiPhone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. 9876543210"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                GST Number (Optional)
              </label>
              <div className="relative">
                <HiDocumentCheck className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  name="gst_number"
                  value={formData.gst_number}
                  onChange={handleChange}
                  placeholder="33AAAAA0000A1Z5"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Company Website (Optional)
              </label>
              <div className="relative">
                <HiGlobeAlt className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="url"
                  name="company_website"
                  value={formData.company_website}
                  onChange={handleChange}
                  placeholder="https://company.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                City / Taluk <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                name="taluk"
                required
                value={formData.taluk}
                onChange={handleChange}
                placeholder="e.g. Hosur"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                District <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                name="district"
                required
                value={formData.district}
                onChange={handleChange}
                placeholder="e.g. Krishnagiri"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                State <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                name="state"
                required
                value={formData.state}
                onChange={handleChange}
                placeholder="Tamil Nadu"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Office Address
            </label>
            <textarea
              name="address"
              rows={2}
              value={formData.address}
              onChange={handleChange}
              placeholder="e.g. Suite 201, Commercial Complex, Hosur"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Company Logo Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Company Logo (Optional)
            </label>
            <div className="flex items-center gap-4">
              {logoPreview && (
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="w-12 h-12 rounded-xl object-contain bg-white/10 p-1 border border-rose-500"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-rose-600/30 file:text-rose-300 hover:file:bg-rose-600/50 cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <HiLockClosed className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Confirm Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <HiLockClosed className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat password"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white shadow-xl shadow-rose-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Submitting Registration...' : 'Register as Ad Company'}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Already registered as an Advertiser?{' '}
            <Link to="/login?role=advertiser" className="font-bold text-rose-400 hover:underline">
              Sign In Here
            </Link>
          </p>
        </div>
      </div>

      <footer className="text-center py-2 text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} EGATES Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}
