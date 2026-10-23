import React, { useEffect } from 'react';
import { HiXMark, HiCheckBadge, HiGlobeAlt, HiIdentification, HiSparkles } from 'react-icons/hi2';

export default function BrandingModal({ isOpen, onClose, type = 'egates', onOpenIdCard }) {
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

  const isEgates = type === 'egates';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden transform transition-all duration-200 scale-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="text-lg">{isEgates ? '🏛️' : '⚡'}</span>
            <h3 className="text-sm font-bold tracking-tight text-gray-900 dark:text-white">
              {isEgates ? 'EGATES Official Platform' : 'Jishnu Infotech Pvt. Ltd.'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer"
            aria-label="Close"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Center Logo Presentation */}
        <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-5">
          {isEgates ? (
            /* EGATES Standalone Centered View */
            <div className="w-full flex flex-col items-center">
              <div className="p-5 sm:p-6 bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-850 rounded-3xl border border-gray-200/90 dark:border-slate-700 shadow-lg flex items-center justify-center max-w-xs sm:max-w-sm w-full mx-auto">
                <img
                  src="/egates-logo.png"
                  alt="EGATES Official Logo"
                  className="h-20 sm:h-24 w-auto max-w-[240px] sm:max-w-[280px] object-contain drop-shadow-sm transition-transform duration-300 hover:scale-105"
                />
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-4 tracking-tight">
                EGATES
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-primary-600 dark:text-primary-400 mt-0.5">
                Smart Community & Layout Association Management System
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mt-2 leading-relaxed">
                Empowering modern gated communities, apartments, and layouts with digital member registration, verified resident access, smart maintenance, and community communication.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-900/40">
                  <HiCheckBadge className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Verified Official Platform
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-900/40">
                  <HiSparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Version 2.0
                </span>
              </div>
            </div>
          ) : (
            /* JISHNU INFOTECH Standalone Centered View */
            <div className="w-full flex flex-col items-center">
              <div className="p-5 sm:p-6 bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-850 rounded-3xl border border-gray-200/90 dark:border-slate-700 shadow-lg flex items-center justify-center max-w-xs sm:max-w-sm w-full mx-auto">
                <img
                  src="/images/jishnu-logo.png"
                  alt="Jishnu Infotech Official Logo"
                  className="h-16 sm:h-20 w-auto max-w-[240px] sm:max-w-[280px] object-contain drop-shadow-sm transition-transform duration-300 hover:scale-105"
                />
              </div>

              <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white mt-4 tracking-tight">
                Jishnu Infotech Pvt. Ltd.
              </h2>
              <p className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest mt-1">
                Innovate • Integrate • Inspire
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mt-2 leading-relaxed">
                Official technology and engineering partner behind EGATES. Delivering cutting-edge cloud infrastructure, enterprise software systems, and smart automation platforms.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-900/40">
                  <span>⚡</span>
                  Powered & Engineered
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-900/40">
                  <HiGlobeAlt className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Enterprise Cloud Partner
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          {onOpenIdCard && isEgates ? (
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
              &copy; {new Date().getFullYear()} {isEgates ? 'EGATES Platform' : 'Jishnu Infotech Pvt. Ltd.'}
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
