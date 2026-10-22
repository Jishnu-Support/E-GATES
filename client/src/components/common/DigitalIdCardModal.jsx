import React, { useState, useEffect } from 'react';
import {
  HiXMark,
  HiShieldCheck,
  HiMapPin,
  HiPhone,
  HiEnvelope,
  HiCalendar,
  HiHeart,
  HiIdentification,
} from 'react-icons/hi2';
import api from '../../services/api';

export default function DigitalIdCardModal({
  isOpen,
  onClose,
  user,
  associationName,
  canManageRoles = false,
  onChangeRole,
}) {
  const [fullUser, setFullUser] = useState(user || {});
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loadingExtra, setLoadingExtra] = useState(false);

  // Helper to resolve static file paths to backend URL
  const resolveFileUrl = (filePath) => {
    if (!filePath) return '';
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
    const base = (typeof window !== 'undefined' && window.location.origin)
      ? window.location.origin
      : (import.meta.env.VITE_API_URL || 'http://localhost:5002').replace(/\/api\/v1\/?$/, '');
    const normalized = filePath.replace(/\\/g, '/');
    const uploadIndex = normalized.indexOf('/uploads/');
    if (uploadIndex !== -1) {
      return `${base}${normalized.substring(uploadIndex)}`;
    }
    if (normalized.startsWith('uploads/')) {
      return `${base}/${normalized}`;
    }
    const subdirs = ['profiles', 'proofs', 'logos', 'documents', 'events', 'audio', 'voting', 'news'];
    for (const dir of subdirs) {
      const dirIdx = normalized.indexOf(`/${dir}/`);
      if (dirIdx !== -1) {
        return `${base}/uploads${normalized.substring(dirIdx)}`;
      }
    }
    return `${base}/uploads/${normalized.replace(/^\/?/, '')}`;
  };

  useEffect(() => {
    if (!user?.id || !isOpen) return;
    setFullUser(user);

    const fetchExtra = async () => {
      try {
        setLoadingExtra(true);
        const [userRes, familyRes] = await Promise.allSettled([
          api.get(`/users/${user.id}`),
          api.get(`/users/${user.id}/family-members?include_removed=false`),
        ]);

        if (userRes.status === 'fulfilled' && userRes.value?.data?.data) {
          setFullUser((prev) => ({ ...prev, ...userRes.value.data.data }));
        }
        if (familyRes.status === 'fulfilled' && familyRes.value?.data?.data) {
          const list = familyRes.value.data.data || [];
          setFamilyMembers(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.warn('Could not fetch extra user info:', err);
      } finally {
        setLoadingExtra(false);
      }
    };

    fetchExtra();
  }, [user?.id, isOpen]);

  // Handle escape key
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

  if (!isOpen || !user) return null;

  const currentAssocName =
    fullUser.association_name ||
    associationName ||
    (fullUser.role === 'super_admin' ? 'Residents Welfare Association' : 'Residents Welfare Association');

  const isSuperAdmin = fullUser.role === 'super_admin';
  const isMainAdmin = fullUser.is_main_admin || fullUser.display_role === 'Main Association Admin';
  const isLayoutAdmin = fullUser.role === 'admin' && !isMainAdmin;

  const roleTitle = isSuperAdmin
    ? 'Super Administrator'
    : isMainAdmin
    ? 'Main Association Admin'
    : isLayoutAdmin
    ? 'Layout Admin'
    : 'Resident Member';

  const roleTheme = isSuperAdmin
    ? {
        badgeBg: 'bg-purple-900 text-purple-100 border-purple-400/40',
        cardHeader: 'from-purple-900 via-indigo-900 to-slate-900',
        accent: 'text-purple-600',
        ring: 'ring-purple-400',
        glow: 'shadow-purple-500/20',
        emoji: '👑',
      }
    : isMainAdmin
    ? {
        badgeBg: 'bg-indigo-900 text-indigo-100 border-indigo-400/40',
        cardHeader: 'from-indigo-900 via-blue-900 to-slate-900',
        accent: 'text-indigo-600',
        ring: 'ring-indigo-400',
        glow: 'shadow-indigo-500/20',
        emoji: '🛡️',
      }
    : isLayoutAdmin
    ? {
        badgeBg: 'bg-blue-900 text-blue-100 border-blue-400/40',
        cardHeader: 'from-blue-900 via-sky-900 to-slate-900',
        accent: 'text-blue-600',
        ring: 'ring-blue-400',
        glow: 'shadow-blue-500/20',
        emoji: '🛡️',
      }
    : {
        badgeBg: 'bg-teal-900 text-teal-100 border-teal-400/40',
        cardHeader: 'from-teal-900 via-emerald-900 to-slate-900',
        accent: 'text-teal-600',
        ring: 'ring-teal-400',
        glow: 'shadow-teal-500/20',
        emoji: '👥',
      };

  const memberCode = fullUser.member_code || (isSuperAdmin ? '000001' : 'PENDING');

  // Trigger quick browser print of the card
  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in"
      aria-modal="true"
      role="dialog"
    >
      <div className="relative w-full max-w-[340px] sm:max-w-[350px] bg-gray-950/95 rounded-3xl shadow-2xl border border-gray-800/80 overflow-hidden my-auto flex flex-col max-h-[96vh]">
        {/* Top Floating Control Bar */}
        <div className="py-2.5 px-4 bg-gray-900/90 border-b border-gray-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="bg-white rounded-lg px-2 py-0.5 shadow-xs flex items-center justify-center">
              <img
                src="/egates-logo.png"
                alt="EGATES"
                className="h-6 w-auto object-contain"
              />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-200">
              Digital ID Pass
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrint}
              title="Print ID Card"
              className="p-1.5 text-gray-400 hover:text-white bg-gray-800/80 hover:bg-gray-700 rounded-lg border border-gray-700/60 transition text-xs"
            >
              🖨️
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close"
              className="p-1.5 text-gray-400 hover:text-white bg-gray-800/80 hover:bg-gray-700 rounded-lg border border-gray-700/60 transition"
            >
              <HiXMark className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Reduced Size & Modern Styling */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 flex flex-col items-center">
          {/* Lanyard Top Punch Hole & Clip Strap */}
          <div className="w-full flex flex-col items-center mb-1">
            <div className="w-12 h-2.5 bg-gray-900 rounded-full border border-gray-700 shadow-inner flex items-center justify-center">
              <div className="w-5 h-1 bg-black/80 rounded-full" />
            </div>
            <div className="w-7 h-2 bg-gradient-to-b from-gray-700 to-gray-800 border-x border-gray-600 shadow-sm" />
          </div>

          {/* COMPACT DIGITAL ID CARD CONTAINER */}
          <div className="w-full max-w-[315px] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/30 bg-white text-gray-900 transition-all duration-300 relative select-none">
            {/* Header Band */}
            <div
              className={`bg-gradient-to-r ${roleTheme.cardHeader} text-white p-3.5 pt-3 pb-3 relative overflow-hidden text-center`}
            >
              {/* Security Guilloche Pattern overlay */}
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:6px_6px] pointer-events-none" />

              {/* Prominent & Attractive EGATES Logo Badge */}
              <div className="relative z-10 flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/20">
                <div className="bg-white rounded-xl px-2.5 py-1 shadow-md border border-white/70 flex items-center gap-1.5 transition hover:shadow-lg">
                  <img
                    src="/egates-logo.png"
                    alt="EGATES"
                    className="h-8 sm:h-9 w-auto object-contain filter drop-shadow-xs"
                  />
                  <span className="text-[10px] tracking-wider uppercase font-black text-amber-600">
                    PASS
                  </span>
                </div>

                <div className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 text-[9px] font-black text-amber-300 flex items-center gap-1 shadow-xs">
                  <HiShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                  <span>VERIFIED</span>
                </div>
              </div>

              {/* Association Title & Subtitle */}
              <div className="relative z-10 px-1">
                <h2 className="text-xs sm:text-sm font-black tracking-tight line-clamp-1 drop-shadow-sm text-white uppercase">
                  {currentAssocName}
                </h2>
                <p className="text-[8.5px] uppercase tracking-wider text-gray-300 font-semibold mt-0.5">
                  OFFICIAL RESIDENT IDENTITY CARD
                </p>
              </div>
            </div>

            {/* Photo & Identity Section */}
            <div className="p-3.5 pt-3 flex flex-col items-center text-center bg-gradient-to-b from-slate-50 via-white to-slate-50/60">
              <div className="relative mb-2">
                <div
                  className={`w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden shadow-md border-2 border-white ring-3 ${roleTheme.ring} bg-gradient-to-tr from-gray-800 to-gray-700 flex items-center justify-center font-black text-2xl text-white`}
                >
                  {fullUser.profile_photo ? (
                    <img
                      src={resolveFileUrl(fullUser.profile_photo)}
                      alt={fullUser.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : fullUser.name ? (
                    fullUser.name.slice(0, 2).toUpperCase()
                  ) : (
                    'U'
                  )}
                </div>

                {/* Status Pill on Photo */}
                <span className="absolute -bottom-2 inset-x-0 mx-auto w-max px-2 py-0.2 bg-emerald-600 text-white font-extrabold text-[8.5px] uppercase tracking-wider rounded-full shadow-sm border border-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span>{fullUser.status === 'approved' ? 'Active' : fullUser.status || 'Active'}</span>
                </span>
              </div>

              {/* Member Name */}
              <h3 className="text-sm sm:text-base font-black text-gray-900 tracking-tight mt-1 line-clamp-1">
                {fullUser.name}
              </h3>

              {/* Role Designation Badge */}
              <div
                className={`mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border shadow-xs ${roleTheme.badgeBg}`}
              >
                <span>{roleTheme.emoji}</span>
                <span>{roleTitle}</span>
              </div>

              {/* Smart Card Chip & Member ID Bar */}
              <div className="w-full mt-2.5 px-1 py-1.5 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between">
                {/* Simulated Gold Smart Chip */}
                <div className="flex items-center gap-1.5 pl-1.5">
                  <div className="w-7 h-5 rounded bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-500 border border-amber-600/70 shadow-inner flex flex-col justify-between p-0.5 relative overflow-hidden">
                    <div className="w-full h-[1px] bg-amber-700/60" />
                    <div className="w-full h-[1px] bg-amber-700/60" />
                    <div className="absolute inset-y-0 left-1/2 w-[1px] bg-amber-700/60" />
                  </div>
                  <span className="text-[8.5px] font-mono font-bold text-gray-500 tracking-wider">
                    CHIP ID
                  </span>
                </div>

                <div className="flex items-center gap-1 pr-1.5">
                  <span className="text-[9px] uppercase font-bold text-gray-400">
                    ID:
                  </span>
                  <span className="font-mono text-xs font-black text-primary-700 bg-white px-2 py-0.5 rounded-md border border-primary-200 shadow-xs">
                    #{memberCode}
                  </span>
                </div>
              </div>

              {/* Compact Identity Details Grid */}
              <div className="w-full grid grid-cols-2 gap-1.5 mt-2 text-left text-xs">
                <div className="p-2 bg-white rounded-lg border border-gray-200/90 shadow-2xs">
                  <span className="text-[8.5px] font-bold uppercase text-gray-400 block leading-tight">
                    🏠 Door / Plot
                  </span>
                  <span className="font-extrabold text-[11px] text-gray-900 truncate block mt-0.5">
                    {fullUser.door_no ? `#${fullUser.door_no}` : '—'}
                  </span>
                </div>

                <div className="p-2 bg-white rounded-lg border border-gray-200/90 shadow-2xs">
                  <span className="text-[8.5px] font-bold uppercase text-gray-400 block leading-tight">
                    📍 Street
                  </span>
                  <span className="font-semibold text-[11px] text-gray-900 truncate block mt-0.5">
                    {fullUser.street || '—'}
                  </span>
                </div>

                <div className="p-2 bg-white rounded-lg border border-gray-200/90 shadow-2xs">
                  <span className="text-[8.5px] font-bold uppercase text-gray-400 block leading-tight">
                    📞 Contact
                  </span>
                  <span className="font-mono font-semibold text-[11px] text-gray-900 truncate block mt-0.5">
                    {fullUser.phone || '—'}
                  </span>
                </div>

                <div className="p-2 bg-white rounded-lg border border-gray-200/90 shadow-2xs">
                  <span className="text-[8.5px] font-bold uppercase text-gray-400 block leading-tight">
                    🩸 Blood Group
                  </span>
                  <span className="font-bold text-[11px] text-rose-600 truncate block mt-0.5">
                    {familyMembers.find((f) => f.relation?.toLowerCase() === 'self')?.blood_group ||
                      fullUser.blood_group || (
                        <span className="text-gray-400 font-normal italic text-[10px]">N/A</span>
                      )}
                  </span>
                </div>

                {(fullUser.layout_name || fullUser.district) && (
                  <div className="col-span-2 p-1.5 px-2 bg-slate-50 rounded-lg border border-gray-200/80 shadow-2xs">
                    <span className="text-[8px] font-bold uppercase text-gray-400 block">
                      Layout / Location
                    </span>
                    <span className="font-semibold text-[10px] text-gray-800 truncate block">
                      {[fullUser.layout_name, fullUser.taluk ? `${fullUser.taluk} Taluk` : null, fullUser.district]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Barcode Graphic Simulation & Bottom Branding */}
              <div className="w-full mt-2 pt-2 border-t border-gray-200 flex flex-col items-center gap-1">
                {/* Simulated Barcode */}
                <div className="flex items-center justify-center gap-[2px] h-3.5 opacity-60">
                  {[3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9, 3, 2, 3, 8, 4, 6].map((w, i) => (
                    <div
                      key={i}
                      className="bg-black h-full"
                      style={{ width: `${(w % 3) + 1}px` }}
                    />
                  ))}
                </div>

                <div className="w-full flex items-center justify-between text-[8.5px] text-gray-500 pt-0.5">
                  <div className="flex items-center gap-1">
                    <img
                      src="/egates-logo.png"
                      alt="EGATES"
                      className="h-3.5 w-auto object-contain"
                    />
                    <span className="font-bold text-gray-700">EGATES</span>
                  </div>
                  <span className="font-medium text-gray-400">Powered by Jishnu Infotech</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions Bar */}
        <div className="py-2.5 px-4 bg-gray-900 border-t border-gray-800 flex items-center justify-between gap-2">
          <div>
            {canManageRoles && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onChangeRole) onChangeRole(fullUser);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition shadow-xs"
              >
                <HiShieldCheck className="w-3.5 h-3.5" />
                <span>Change Role</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white text-xs font-bold rounded-xl transition border border-gray-700 shadow-xs ml-auto"
          >
            <HiXMark className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );
}
