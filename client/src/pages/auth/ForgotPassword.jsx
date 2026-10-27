import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HiEnvelope,
  HiPhone,
  HiIdentification,
  HiArrowLeft,
  HiExclamationCircle,
  HiCheckCircle,
  HiLockClosed,
  HiEye,
  HiEyeSlash,
  HiShieldCheck,
  HiKey,
  HiArrowPath,
  HiUserCircle,
  HiBuildingOffice2
} from 'react-icons/hi2';
import { useLanguage } from '../../context/LanguageContext';
import PoweredByLogo from '../../components/common/PoweredByLogo';
import api from '../../services/api';

export default function ForgotPassword() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Wizard Steps: 1 = Find Account, 2 = Verify OTP & Set New Password, 3 = Success
  const [step, setStep] = useState(1);

  // Step 1 state
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Step 2 state
  const [accountData, setAccountData] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');

  // Step 3 state
  const [countdown, setCountdown] = useState(3);

  // Auto countdown redirect on step 3
  useEffect(() => {
    let timer;
    if (step === 3 && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (step === 3 && countdown === 0) {
      navigate('/login', {
        state: {
          identifier: identifier || accountData?.user?.masked_email || accountData?.user?.masked_phone,
          role: accountData?.user?.role || 'member'
        }
      });
    }
    return () => clearTimeout(timer);
  }, [step, countdown, navigate, identifier, accountData]);

  // Password strength calculation
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-gray-200' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 25, label: 'Weak', color: 'bg-red-500', text: 'text-red-500' };
    if (score === 2) return { score: 50, label: 'Fair', color: 'bg-amber-500', text: 'text-amber-500' };
    if (score === 3) return { score: 75, label: 'Good', color: 'bg-blue-500', text: 'text-blue-500' };
    return { score: 100, label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-500' };
  };

  const strength = getPasswordStrength(newPassword);

  // Step 1: Submit identifier to find account and generate OTP
  const handleFindAccount = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Please enter your registered Email, Mobile Phone, or Member Code.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.post('/auth/forgot-password', {
        identifier: identifier.trim()
      });

      if (res.data?.success && res.data?.data) {
        setAccountData(res.data.data);
        setResetToken(res.data.data.token || '');
        setOtpCode(res.data.data.otp || '');
        setStep(2);
      } else {
        setErrorMessage(res.data?.message || 'Unable to locate account. Please try again.');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Unable to locate account. Please check your details and try again.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Submit OTP and New Password to reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!otpCode.trim()) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    if (!newPassword) {
      setErrorMessage('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter identical passwords.');
      return;
    }

    try {
      setIsLoading(true);
      const payload = {
        token: resetToken,
        otp: otpCode.trim(),
        user_id: accountData?.user?.id,
        password: newPassword
      };

      const res = await api.post('/auth/reset-password', payload);

      if (res.data?.success) {
        setStep(3);
      } else {
        setErrorMessage(res.data?.message || 'Password reset failed. Please try again.');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to reset password. The verification code may have expired.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between p-4 sm:p-6 antialiased">
      {/* Top Bar with Top Centre Powered by Logo */}
      <div className="relative w-full max-w-7xl mx-auto flex items-center justify-between py-2">
        <Link to="/" className="flex items-center gap-2 text-white">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center font-black text-lg shadow-lg">
            LA
          </div>
          <span className="font-bold text-base tracking-tight hidden sm:inline">
            Association Portal
          </span>
        </Link>

        {/* Top Centre with Logo */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
          <PoweredByLogo size="lg" />
        </div>

        <div className="md:hidden">
          <PoweredByLogo size="md" />
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md mx-auto my-6">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-8">
          
          {/* Progress Indicators */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              step >= 1 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-400'
            }`}>
              <span className="w-4 h-4 rounded-full bg-primary-600 text-white flex items-center justify-center text-[10px]">1</span>
              <span>Account</span>
            </div>
            <div className="w-4 h-0.5 bg-gray-200" />
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              step >= 2 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-400'
            }`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>2</span>
              <span>Verify & Reset</span>
            </div>
            <div className="w-4 h-0.5 bg-gray-200" />
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              step >= 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
            }`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                step >= 3 ? 'bg-emerald-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>3</span>
              <span>Done</span>
            </div>
          </div>

          {/* STEP 1: FIND ACCOUNT */}
          {step === 1 && (
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-primary-600 shadow-sm border border-primary-100">
                  <HiKey className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                  Self-Service Password Reset
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-gray-500 leading-relaxed">
                  Reset your password selfly. Enter your registered <strong className="text-gray-700">Email</strong>, <strong className="text-gray-700">Mobile Phone</strong>, or <strong className="text-gray-700">Member Code</strong>.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs sm:text-sm">
                  <HiExclamationCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleFindAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                    Email, Mobile Phone, or Member ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <HiIdentification className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. 9876543210, user@mail.com, or MEM-001"
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-400">
                    Works for all Resident Members, Association Admins, and Super Administrators.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-primary-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <HiArrowPath className="w-4 h-4 animate-spin" />
                      <span>Checking Account...</span>
                    </>
                  ) : (
                    <span>Find Account & Continue</span>
                  )}
                </button>

                <div className="text-center pt-3 border-t border-gray-100">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-primary-600 transition"
                  >
                    <HiArrowLeft className="w-4 h-4" />
                    <span>Back to Login</span>
                  </Link>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: VERIFY OTP & ENTER NEW PASSWORD */}
          {step === 2 && accountData && (
            <div>
              <div className="text-center mb-5">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-2 text-emerald-600 shadow-sm border border-emerald-100">
                  <HiShieldCheck className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
                  Verify & Set Password
                </h2>
                <p className="text-xs text-gray-500">
                  Account located! Set your new password below.
                </p>
              </div>

              {/* Verified Account Badge */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl mb-4 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                    <HiUserCircle className="w-4 h-4 text-primary-600" />
                    {accountData.user?.name}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary-100 text-primary-800">
                    {accountData.user?.designation || accountData.user?.role}
                  </span>
                </div>
                {accountData.user?.association_name && (
                  <div className="text-slate-600 flex items-center gap-1 text-[11px]">
                    <HiBuildingOffice2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{accountData.user.association_name}</span>
                    {accountData.user?.member_code && (
                      <span className="ml-2 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">
                        Code: {accountData.user.member_code}
                      </span>
                    )}
                  </div>
                )}
                <div className="text-[11px] text-slate-500 pt-0.5 border-t border-slate-200/60 flex justify-between">
                  <span>Phone: <strong className="text-slate-700">{accountData.user?.masked_phone}</strong></span>
                  <span>Email: <strong className="text-slate-700">{accountData.user?.masked_email}</strong></span>
                </div>
              </div>

              {/* Instant Verification Code Card */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Self-Service Verification Code:
                  </p>
                  <p className="font-mono text-lg font-black tracking-widest text-emerald-700">
                    {accountData.otp}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOtpCode(accountData.otp)}
                  className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm transition"
                >
                  Auto Fill
                </button>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs">
                  <HiExclamationCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-3.5">
                {/* 6-Digit Verification Code */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                    6-Digit Verification Code
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      className="w-full text-center font-mono text-lg tracking-widest font-bold py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                    />
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <HiLockClosed className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <HiEyeSlash className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {newPassword && (
                    <div className="mt-1.5 space-y-1">
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${strength.color} transition-all duration-300`}
                          style={{ width: `${strength.score}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-gray-400">Strength:</span>
                        <span className={`font-semibold ${strength.text}`}>{strength.label}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <HiLockClosed className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                    />
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="mt-1 text-[11px] text-red-500 font-medium">
                      Passwords do not match
                    </p>
                  )}
                  {confirmPassword && confirmPassword === newPassword && (
                    <p className="mt-1 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <HiCheckCircle className="w-3.5 h-3.5" /> Passwords match
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                >
                  {isLoading ? (
                    <>
                      <HiArrowPath className="w-4 h-4 animate-spin" />
                      <span>Saving New Password...</span>
                    </>
                  ) : (
                    <span>Set New Password & Finish</span>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setErrorMessage('');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-primary-600 transition"
                  >
                    <HiArrowLeft className="w-3.5 h-3.5" />
                    <span>Change Account or Search Again</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: SUCCESS */}
          {step === 3 && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-100 shadow-sm animate-bounce">
                <HiCheckCircle className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">
                  Password Updated Successfully!
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Your new password is now active. You can immediately log in to your account.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                Redirecting you to the login screen in <strong className="text-primary-600 font-bold">{countdown}</strong> seconds...
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate('/login', {
                    state: {
                      identifier: identifier || accountData?.user?.masked_email || accountData?.user?.masked_phone,
                      role: accountData?.user?.role || 'member'
                    }
                  })
                }
                className="w-full py-3.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-primary-600/30 transition flex items-center justify-center gap-2"
              >
                <span>Proceed to Login Now</span>
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-2 text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} Layout Association Management System. Powered by Jishnu Infotech.</p>
      </footer>
    </div>
  );
}
