import React, { useEffect } from 'react';
import { HiXMark, HiCheckBadge, HiGlobeAlt, HiIdentification } from 'react-icons/hi2';

export default function BrandingModal({ isOpen, onClose, onOpenIdCard }) {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden transform transition-all duration-200 scale-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏛️</span>
            <h3 className="text-sm font-bold tracking-tight text-gray-900 dark:text-white">
              About EGATES Community Platform
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition"
            aria-label="Close"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Center Logos Presentation */}
        <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-6">
          {/* 1. EGATES Logo */}
          <div className="w-full flex flex-col items-center">
            <div className="p-4 sm:p-5 bg-gradient-to-b from-white to-slate-50 rounded-3xl border border-gray-200/80 shadow-md flex items-center justify-center max-w-xs sm:max-w-sm w-full">
              <img
                src="/egates-logo.png"
                alt="EGATES Official Logo"
                className="h-16 sm:h-20 w-auto max-w-[240px] sm:max-w-[280px] object-contain drop-shadow-sm"
              />
            </div>
            <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white mt-3 tracking-tight">
              EGATES
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-300 font-medium max-w-sm mt-0.5 leading-snug">
              Smart Community & Layout Association Management System
            </p>
          </div>

          {/* Connection Divider */}
          <div className="w-full flex items-center justify-center gap-3">
            <div className="h-px bg-gray-200 dark:bg-slate-700 flex-1" />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40 shadow-2xs">
              <span>⚡</span>
              <span>Powered & Engineered By</span>
            </div>
            <div className="h-px bg-gray-200 dark:bg-slate-700 flex-1" />
          </div>

          {/* 2. Jishnu Infotech Logo */}
          <div className="w-full flex flex-col items-center">
            <div className="p-3.5 sm:p-4 bg-gradient-to-b from-white to-slate-50 rounded-3xl border border-gray-200/80 shadow-md flex items-center justify-center max-w-xs sm:max-w-sm w-full">
              <img
                src="/images/jishnu-logo.png"
                alt="Jishnu Infotech Official Logo"
                className="h-14 sm:h-18 w-auto max-w-[240px] sm:max-w-[280px] object-contain drop-shadow-sm"
              />
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white mt-3 tracking-tight">
              Jishnu Infotech Pvt. Ltd.
            </h3>
            <p className="text-[11px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider mt-0.5">
              Innovate • Integrate • Inspire
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mt-1 leading-relaxed">
              Delivering innovative cloud infrastructure, digital automation, and residential community solutions.
            </p>
          </div>

          {/* Feature Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-900/40">
              <HiCheckBadge className="w-3.5 h-3.5 text-emerald-600" />
              Verified Official Platform
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[11px] font-semibold border border-purple-200 dark:border-purple-900/40">
              Enterprise Cloud v2.0
            </span>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          {onOpenIdCard ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenIdCard();
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <HiIdentification className="w-4 h-4" />
              <span>View My Digital ID Card</span>
            </button>
          ) : (
            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium hidden sm:inline">
              &copy; {new Date().getFullYear()} EGATES & Jishnu Infotech
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
