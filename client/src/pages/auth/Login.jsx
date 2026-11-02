import React, { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  HiEye,
  HiEyeSlash,
  HiLockClosed,
  HiUser,
  HiExclamationCircle,
  HiShieldCheck,
  HiBuildingOffice2,
  HiUserGroup,
  HiArrowRight,
  HiCheckCircle,
} from 'react-icons/hi2';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import PoweredByLogo from '../../components/common/PoweredByLogo';
import BrandingModal from '../../components/common/BrandingModal';
import api from '../../services/api';

export default function Login() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // 2 Distinct Tabs for Top Slides: 'admin' | 'member'
  // Super admin login is accessed via the word/link below the sign in button.
  const [activeTab, setActiveTab] = useState(
    location.state?.role && ['super_admin', 'admin', 'member'].includes(location.state.role)
      ? location.state.role
      : 'admin'
  );
  const [brandingModalType, setBrandingModalType] = useState(null); // 'egates' | 'jishnu' | null

  const [identifier, setIdentifier] = useState(location.state?.identifier || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [roleMismatch, setRoleMismatch] = useState(null);

  // Member Registration Code state
  const [memberAssocCode, setMemberAssocCode] = useState('');
  const [memberAssocInfo, setMemberAssocInfo] = useState(null);
  const [loadingAssocCode, setLoadingAssocCode] = useState(false);
  const [assocCodeError, setAssocCodeError] = useState('');
  const assocCodeTimerRef = useRef(null);

  const handleMemberAssocCodeChange = (val) => {
    const uppercaseVal = val.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setMemberAssocCode(uppercaseVal);
    setAssocCodeError('');

    if (assocCodeTimerRef.current) {
      clearTimeout(assocCodeTimerRef.current);
    }

    if (!uppercaseVal.trim()) {
      setMemberAssocInfo(null);
      setLoadingAssocCode(false);
      return;
    }

    setLoadingAssocCode(true);
    assocCodeTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/associations/code/${encodeURIComponent(uppercaseVal.trim())}`);
        if (res.data?.data) {
          setMemberAssocInfo(res.data.data);
          setAssocCodeError('');
        } else {
          setMemberAssocInfo(null);
          setAssocCodeError(`No layout association found for code "${uppercaseVal}"`);
        }
      } catch (err) {
        setMemberAssocInfo(null);
        setAssocCodeError(
          err.response?.data?.message || `No association found for registration code "${uppercaseVal}"`
        );
      } finally {
        setLoadingAssocCode(false);
      }
    }, 350);
  };

  // Tab metadata for top slides: ONLY Admin and User / Member
  const tabs = [
    {
      id: 'admin',
      label: 'Admin',
      badge: 'Association Office',
      icon: HiBuildingOffice2,
      color: 'from-blue-600 to-indigo-700',
      activeBorder: 'border-blue-600 text-blue-600',
      activeBg: 'bg-blue-600 text-white',
      accentColor: 'text-blue-600',
      description: 'Manage residents, complaints, news, and polls for assigned layout',
    },
    {
      id: 'member',
      label: 'User / Member',
      badge: 'Resident Portal',
      icon: HiUserGroup,
      color: 'from-emerald-600 to-teal-700',
      activeBorder: 'border-emerald-600 text-emerald-600',
      activeBg: 'bg-emerald-600 text-white',
      accentColor: 'text-emerald-600',
      description: 'House owners & residents portal with emergency SOS and voting',
    },
  ];

  const superAdminTabInfo = {
    id: 'super_admin',
    label: 'Super Admin',
    badge: 'Platform Control',
    icon: HiShieldCheck,
    color: 'from-amber-500 to-orange-600',
    activeBorder: 'border-amber-500 text-amber-600',
    activeBg: 'bg-amber-500 text-white',
    accentColor: 'text-amber-500',
    description: 'System-wide oversight across all layout associations',
  };

  const currentTabInfo =
    activeTab === 'super_admin'
      ? superAdminTabInfo
      : tabs.find((t) => t.id === activeTab) || tabs[0];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setIdentifier('');
    setPassword('');
    setErrorMessage('');
    setRoleMismatch(null);
    setMemberAssocCode('');
    setMemberAssocInfo(null);
    setAssocCodeError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setRoleMismatch(null);

    if (activeTab === 'member') {
      if (!memberAssocCode.trim()) {
        setErrorMessage('Please enter your Association Registration Code.');
        return;
      }
      if (!memberAssocInfo) {
        setErrorMessage('Please enter a valid Association Registration Code to continue.');
        return;
      }
    }

    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter your email or phone and password.');
      return;
    }

    try {
      setIsLoading(true);
      const isEmail = identifier.includes('@');
      const credentials = {
        [isEmail ? 'email' : 'phone']: identifier.trim(),
        password,
        ...(activeTab === 'member' ? { association_code: memberAssocCode.trim() } : {}),
      };

      const result = await login(credentials);
      const user = result.user;

      // Handle pending or rejected accounts gracefully
      if (user.status === 'pending') {
        setErrorMessage('Your account registration is pending administrator approval.');
        setIsLoading(false);
        return;
      }

      if (user.status === 'rejected') {
        setErrorMessage(
          `Your registration was rejected${
            user.rejection_reason ? `: "${user.rejection_reason}"` : '.'
          }`
        );
        setIsLoading(false);
        return;
      }

      // Check for Role Tab Mismatch (e.g. resident trying to login on Super Admin tab)
      if (user.role !== activeTab) {
        const correctTab = [...tabs, superAdminTabInfo].find((t) => t.id === user.role);
        setRoleMismatch({
          userRole: user.role,
          correctTabLabel: correctTab ? correctTab.label : user.role,
          correctTabId: user.role,
          user,
        });
        setIsLoading(false);
        return;
      }

      // Check if there was an original redirect location
      const origin = location.state?.from?.pathname;
      if (origin && !origin.includes('/login')) {
        navigate(origin, { replace: true });
        return;
      }

      // Role-based dashboard redirect
      if (user.role === 'super_admin') {
        navigate('/super-admin/dashboard', { replace: true });
      } else if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/member/dashboard', { replace: true });
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Invalid login credentials. Please verify your details.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Direct switch to correct tab after mismatch
  const handleProceedWithRole = (targetRole) => {
    if (targetRole === 'super_admin') {
      navigate('/super-admin/dashboard', { replace: true });
    } else if (targetRole === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    } else {
      navigate('/member/dashboard', { replace: true });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 flex flex-col justify-between p-4 sm:p-6 antialiased">
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-96 w-96 rounded-full bg-indigo-500/15 blur-3xl" />
      {/* Top Bar with Top Centre Powered by Logo */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex items-center justify-between py-2">
        <button
          type="button"
          onClick={() => setBrandingModalType('egates')}
          className="flex items-center hover:opacity-95 transition transform hover:scale-105 focus:outline-none cursor-pointer"
          title="Click to view EGATES logo"
        >
          <img
            src="/egates-logo.png"
            alt="EGATES"
            className="h-11 sm:h-14 w-auto max-w-[190px] sm:max-w-[220px] object-contain rounded-2xl bg-white/95 p-1.5 shadow-xl shadow-blue-500/10"
          />
        </button>

        {/* Top Centre Powered By Logo */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
          <button
            type="button"
            onClick={() => setBrandingModalType('jishnu')}
            className="cursor-pointer focus:outline-none hover:opacity-95 transition transform hover:scale-105"
            title="Click to view Jishnu Infotech logo"
          >
            <PoweredByLogo size="lg" />
          </button>
        </div>

        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setBrandingModalType('jishnu')}
            className="cursor-pointer focus:outline-none hover:opacity-95 transition transform hover:scale-105"
            title="Click to view Jishnu Infotech logo"
          >
            <PoweredByLogo size="md" />
          </button>
        </div>
      </div>

      {/* Main Login Experience */}
      <div className="relative z-10 w-full max-w-6xl mx-auto my-6 grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center">
        <div className="hidden lg:block px-4 xl:px-12 text-white">
          <h1 className="max-w-xl text-5xl font-black leading-[1.15] tracking-tight">
            Your smart gateway to modern community living.
          </h1>
          <div className="mt-8 grid max-w-lg grid-cols-2 gap-3">
            {[
              'Resident communication',
              'Secure role-based access',
              'Emergency SOS support',
              'Simple community voting',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <HiCheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
          {/* Header Banner */}
          <div className="px-8 pt-8 pb-4 text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              Sign In to Your Account
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Select your role below to access your dedicated management portal.
            </p>
          </div>

          {/* 2 DISTINCT ROLE TABS (Super Admin moved below submit button) */}
          <div className="px-6 sm:px-8 pt-2">
            <div className="grid grid-cols-2 gap-2 bg-gray-100/80 dark:bg-slate-800 p-1.5 rounded-2xl border border-gray-200 dark:border-slate-700">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 py-3 px-2 sm:px-4 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                      isActive
                        ? `${tab.activeBg} shadow-md shadow-gray-400/20 scale-[1.02]`
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-center">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Tab Subtitle Info Banner */}
            <div className={`mt-3 py-2 px-3.5 rounded-xl border text-xs transition-colors ${
              activeTab === 'super_admin'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                : 'bg-gray-50 dark:bg-slate-800/80 border-gray-100 dark:border-slate-700 text-gray-600 dark:text-gray-300'
            }`}>
              <span className="truncate">
                {activeTab === 'super_admin' ? '🛡️' : '📌'}{' '}
                <span className="font-semibold">{currentTabInfo.label}:</span>{' '}
                {currentTabInfo.description}
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-8 pt-4">
            {/* Error Message Alert */}
            {errorMessage && (
              <div className="mb-5 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-xs sm:text-sm">
                <HiExclamationCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Role Mismatch Warning Alert */}
            {roleMismatch && (
              <div className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <HiExclamationCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <span>Role Mismatch Detected</span>
                </div>
                <p className="text-amber-800 leading-relaxed">
                  Your credentials belong to a <strong>{roleMismatch.correctTabLabel}</strong>{' '}
                  account, but you are currently on the{' '}
                  <strong>{currentTabInfo.label}</strong> tab.
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab(roleMismatch.correctTabId);
                      setRoleMismatch(null);
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition"
                  >
                    Switch to {roleMismatch.correctTabLabel} Tab
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProceedWithRole(roleMismatch.userRole)}
                    className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-lg transition flex items-center gap-1"
                  >
                    <span>Proceed to Dashboard</span>
                    <HiArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
              {/* Member Association Registration Code Input */}
              {activeTab === 'member' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Association Registration Code *
                    </label>
                    {loadingAssocCode && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="w-2.5 h-2.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        Fetching association...
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <HiBuildingOffice2 className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      required
                      value={memberAssocCode}
                      onChange={(e) => handleMemberAssocCodeChange(e.target.value)}
                      placeholder="Enter registration code (e.g. KCC)"
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold uppercase tracking-wider focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                  </div>

                  {/* Auto-fetched Association Display */}
                  {memberAssocInfo && (
                    <div className="mt-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                      <HiCheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold">
                          {memberAssocInfo.name}
                        </span>
                        {memberAssocInfo.city && (
                          <span className="text-emerald-600 dark:text-emerald-400 ml-1">
                            ({memberAssocInfo.city})
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {assocCodeError && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                      <HiExclamationCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{assocCodeError}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Identifier Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                  {activeTab === 'member'
                    ? 'Resident Email Address or Contact Number'
                    : `${currentTabInfo.label} Email or Phone`}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <HiUser className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your registered email or phone"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                    {t('auth_password')}
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline"
                  >
                    {t('auth_forgot_password')}
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <HiLockClosed className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    aria-label={showPassword ? t('auth_hide_password') : t('auth_show_password')}
                  >
                    {showPassword ? (
                      <HiEyeSlash className="w-5 h-5" />
                    ) : (
                      <HiEye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full mt-2 py-3.5 px-4 text-white font-bold text-sm rounded-xl shadow-lg transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                  activeTab === 'super_admin'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                    : activeTab === 'admin'
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing in as {currentTabInfo.label}...</span>
                  </span>
                ) : (
                  `Sign In as ${currentTabInfo.label}`
                )}
              </button>

              {/* Super Admin Login as just a word below sign in button */}
              <div className="pt-2.5 text-center">
                {activeTab === 'super_admin' ? (
                  <button
                    type="button"
                    onClick={() => handleTabChange('admin')}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:underline transition cursor-pointer"
                  >
                    ← Back to Admin / Member Sign In
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleTabChange('super_admin')}
                    className="text-xs font-semibold text-gray-500 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-400 hover:underline transition cursor-pointer"
                  >
                    Super Admin Login
                  </button>
                )}
              </div>
            </form>

            {/* Separate Registration Forms Gateway */}
            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-slate-800">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center mb-3">
                Need to register? Select a Registration Form:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  to="/register?type=assoc-admin"
                  className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/70 dark:bg-purple-950/40 hover:bg-purple-100/90 dark:hover:bg-purple-900/50 hover:border-purple-300 transition text-center group shadow-sm"
                >
                  <span className="text-xs font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                    🏛️ Association Registration Form
                  </span>
                  <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium mt-0.5">
                    Main Admin & Layout
                  </span>
                </Link>

                <Link
                  to="/register?type=member"
                  className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100/90 dark:hover:bg-emerald-900/50 hover:border-emerald-300 transition text-center group shadow-sm"
                >
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    👥 Member Registration Form
                  </span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                    Resident Registration
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Copyright */}
      <footer className="text-center py-2 text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} EGATES - Community & Layout Association Management. All rights reserved.</p>
      </footer>

      {/* CENTER BRANDING MODAL: EGATES OR JISHNU INFOTECH (SEPARATE CENTER DISPLAY) */}
      <BrandingModal
        isOpen={Boolean(brandingModalType)}
        onClose={() => setBrandingModalType(null)}
        type={brandingModalType || 'egates'}
      />
    </div>
  );
}
