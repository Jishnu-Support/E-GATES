import React from 'react';
import {
  HiExclamationTriangle,
  HiPhone,
  HiShieldCheck,
  HiFire,
  HiHeart,
  HiShieldExclamation,
  HiMapPin,
  HiHome,
  HiClock,
} from 'react-icons/hi2';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { useSOS } from '../../hooks/useSOS';
import Modal from '../common/Modal';

export default function FloatingSOS() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const {
    showTypeSelector,
    setShowTypeSelector,
    showCancel,
    cancelCountdown,
    isSending,
    isTriggered,
    lastAlert,
    selectTypeAndStartCountdown,
    triggerSOS,
    cancelSOS,
    resetSOS,
  } = useSOS();

  // Floating SOS button is only displayed for resident members
  if (user?.role !== 'member') {
    return null;
  }

  const emergencyTypes = [
    {
      key: 'Medical Emergency',
      label: t('sos_type_medical') || 'Medical Emergency',
      icon: HiHeart,
      color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border-rose-200 dark:border-rose-800',
    },
    {
      key: 'Fire Incident',
      label: t('sos_type_fire') || 'Fire Incident',
      icon: HiFire,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border-amber-200 dark:border-amber-800',
    },
    {
      key: 'Theft / Intruder',
      label: t('sos_type_theft') || 'Theft / Intruder',
      icon: HiShieldExclamation,
      color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 border-red-200 dark:border-red-800',
    },
    {
      key: 'Women Safety',
      label: t('sos_type_women') || 'Women Safety',
      icon: HiShieldCheck,
      color: 'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/40 hover:bg-pink-100 dark:hover:bg-pink-900/50 border-pink-200 dark:border-pink-800',
    },
    {
      key: 'Other Emergency',
      label: t('sos_type_other') || 'General Emergency',
      icon: HiExclamationTriangle,
      color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 border-purple-200 dark:border-purple-800',
    },
  ];

  // Helper to compile resident address string
  const compileAddress = () => {
    if (lastAlert?.resident_address) return lastAlert.resident_address;
    const parts = [];
    if (user?.door_no) parts.push(`Door: ${user.door_no}`);
    if (user?.street) parts.push(user.street);
    if (user?.layout_name) parts.push(user.layout_name);
    return parts.length > 0 ? parts.join(', ') : 'Registered Layout Residence';
  };

  const residentAddress = compileAddress();

  return (
    <>
      {/* Floating SOS Action Button (Immediate Reaction on Click) */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-center">
        <div className="relative group">
          <button
            type="button"
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate([150, 50, 150]);
              setShowTypeSelector(true);
            }}
            disabled={isSending}
            className={`w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex flex-col items-center justify-center font-black text-white shadow-2xl select-none focus:outline-none cursor-pointer transform hover:scale-105 active:scale-95 transition ${
              isTriggered
                ? 'animate-siren bg-red-600 ring-4 sm:ring-8 ring-red-400'
                : 'bg-red-600 hover:bg-red-700 animate-sos-pulse ring-2 sm:ring-4 ring-white/40'
            }`}
            aria-label="Emergency SOS (Click to trigger)"
            title="Click for Emergency SOS"
          >
            <span className="text-sm sm:text-base md:text-xl tracking-wider leading-none">SOS</span>
            <span className="text-[7px] sm:text-[8px] md:text-[9px] font-bold tracking-normal mt-0.5 bg-white/20 px-1.5 py-0.2 rounded-full">
              {isSending ? '...' : 'CLICK'}
            </span>
          </button>
        </div>

        {/* Small hint label */}
        <span className="mt-1 sm:mt-2 text-[10px] sm:text-[11px] font-bold text-gray-700 dark:text-gray-300 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-2 py-0.5 rounded-full shadow-sm border border-gray-200 dark:border-slate-800 hidden md:block pointer-events-none">
          {t('sos_button_title') || 'Emergency SOS (Click)'}
        </span>
      </div>

      {/* Emergency Type Selector Modal (Instant Dispatch on Click) */}
      <Modal
        isOpen={showTypeSelector}
        onClose={() => setShowTypeSelector(false)}
        title={t('sos_select_type') || '🚨 Emergency SOS Dispatch'}
        size="md"
      >
        <div className="space-y-3.5 py-2">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            Click any situation below to immediately dispatch emergency distress to association administrators and neighbors:
          </p>

          {/* Primary Top Immediate SOS Button */}
          <button
            type="button"
            onClick={() => triggerSOS('Immediate Distress')}
            disabled={isSending}
            className="w-full p-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <HiShieldExclamation className="w-5 h-5 text-white animate-pulse" />
            <span>🚨 SEND IMMEDIATE SOS (DISPATCH NOW)</span>
          </button>

          {/* 5 Specific Emergency Category Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {emergencyTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.key}
                  type="button"
                  onClick={() => selectTypeAndStartCountdown(type.key)}
                  disabled={isSending}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border text-left font-semibold text-xs sm:text-sm transition hover:scale-[1.02] shadow-sm cursor-pointer active:scale-95 disabled:opacity-50 ${type.color}`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>

          {/* Immediate Phone Calls Section */}
          <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400 font-medium">Immediate phone call:</span>
            <div className="flex gap-2">
              <a
                href="tel:100"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
              >
                <HiPhone className="w-3.5 h-3.5" />
                <span>100 (Police)</span>
              </a>
              <a
                href="tel:112"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-bold rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition"
              >
                <HiPhone className="w-3.5 h-3.5" />
                <span>112 (Helpline)</span>
              </a>
              <a
                href="tel:108"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition"
              >
                <HiPhone className="w-3.5 h-3.5" />
                <span>108 (Ambulance)</span>
              </a>
            </div>
          </div>
        </div>
      </Modal>

      {/* 5-Second Cancel Countdown Overlay */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-900/80 backdrop-blur-md">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 text-center shadow-2xl border-4 border-red-500">
            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <HiExclamationTriangle className="w-10 h-10" />
            </div>

            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-wide">
              Emergency Distress Alert
            </h3>

            <p className="text-base text-gray-700 dark:text-gray-300 font-medium mb-6">
              {t('sos_countdown_text', { seconds: cancelCountdown }) || `Dispatching SOS alert in ${cancelCountdown} seconds...`}
            </p>

            <div className="w-24 h-24 rounded-full border-4 border-red-600 flex items-center justify-center mx-auto mb-6 text-4xl font-extrabold text-red-600 dark:text-red-400 font-mono">
              {cancelCountdown}
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={cancelSOS}
                className="w-full py-3.5 px-6 bg-gray-900 hover:bg-black text-white font-bold text-base rounded-xl transition shadow-lg cursor-pointer"
              >
                {t('sos_cancel_button') || 'Cancel (False Alarm)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispatched Confirmation Modal */}
      {isTriggered && (
        <Modal
          isOpen={isTriggered}
          onClose={resetSOS}
          title="🚨 SOS Distress Signal Active"
          size="md"
        >
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-3xl font-bold">
              ✓
            </div>

            <h4 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('sos_alert_sent') || 'SOS Alert Sent Successfully!'}
            </h4>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-sm mx-auto">
              Association emergency responders, neighbors, and security have received your emergency alert with live GPS coordinates.
            </p>

            {lastAlert && (
              <div className="bg-gray-50 dark:bg-slate-800 p-3.5 rounded-2xl text-xs text-gray-600 dark:text-gray-300 font-mono text-left border border-gray-200 dark:border-slate-700 space-y-1">
                <p><strong>Alert ID:</strong> #{lastAlert.id || 'N/A'}</p>
                <p><strong>Emergency:</strong> {lastAlert.emergency_type || 'General Distress'}</p>
                <p><strong>Resident:</strong> {user?.name || 'Resident'} (Door: {user?.door_no || 'N/A'})</p>
                {residentAddress && <p><strong>Address:</strong> {residentAddress}</p>}
                {lastAlert.latitude && (
                  <p><strong>GPS:</strong> {lastAlert.latitude.toFixed(5)}, {lastAlert.longitude.toFixed(5)}</p>
                )}
                {lastAlert.location_link && (
                  <a
                    href={lastAlert.location_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary-600 dark:text-cyan-400 font-bold hover:underline pt-1"
                  >
                    <HiMapPin className="w-4 h-4" />
                    <span>View Live Map Location ↗</span>
                  </a>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <a
                href="tel:100"
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
              >
                <HiPhone className="w-4 h-4" />
                <span>Call Police (100)</span>
              </a>
              <a
                href="tel:112"
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
              >
                <HiPhone className="w-4 h-4" />
                <span>Helpline (112)</span>
              </a>
              <a
                href="tel:108"
                className="flex-1 py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
              >
                <HiPhone className="w-4 h-4" />
                <span>Ambulance (108)</span>
              </a>
            </div>

            <button
              type="button"
              onClick={resetSOS}
              className="mt-2 text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white underline font-semibold cursor-pointer"
            >
              Dismiss alert view
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
