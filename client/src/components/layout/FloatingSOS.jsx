import React, { useState, useEffect } from 'react';
import {
  HiExclamationTriangle,
  HiPhone,
  HiShieldCheck,
  HiHeart,
  HiShieldExclamation,
  HiMapPin,
  HiHome,
  HiUser,
  HiCheckCircle,
  HiClock,
  HiArrowTopRightOnSquare,
  HiChatBubbleOvalLeftEllipsis,
  HiUserGroup,
  HiBuildingOffice2,
  HiPlus,
  HiSparkles,
  HiFire,
} from 'react-icons/hi2';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { useSOS } from '../../hooks/useSOS';
import Modal from '../common/Modal';
import api from '../../services/api';

export default function FloatingSOS() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const {
    showTypeSelector,
    setShowTypeSelector,
    isSending,
    isTriggered,
    lastAlert,
    triggerSOS,
    resetSOS,
    getCoordinates,
  } = useSOS();

  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [familyContacts, setFamilyContacts] = useState([]);
  const [otherServicesList, setOtherServicesList] = useState([]);
  const [disabledEmergencies, setDisabledEmergencies] = useState(() => {
    try {
      const saved = localStorage.getItem('disabled_emergencies');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherDetails, setOtherDetails] = useState('');
  const [showFamilyChoice, setShowFamilyChoice] = useState(false);
  const [showOtherServicesChoice, setShowOtherServicesChoice] = useState(false);

  // Fetch configured SOS contacts on mount or when alert triggers
  useEffect(() => {
    if (user?.role === 'member') {
      api.get('/sos/contacts')
        .then((res) => {
          const list = res.data?.data || res.data?.defaultContacts || [];
          if (Array.isArray(list)) setEmergencyContacts(list);

          const fams = res.data?.familyContacts || (res.data?.familyContact ? [res.data.familyContact] : []);
          setFamilyContacts(Array.isArray(fams) ? fams : []);

          const oths = res.data?.otherContacts || list.filter((c) => c.contact_type === 'other' || c.contact_type === 'fire');
          setOtherServicesList(Array.isArray(oths) ? oths : []);

          if (res.data?.disabled_emergencies && Array.isArray(res.data.disabled_emergencies)) {
            setDisabledEmergencies(res.data.disabled_emergencies);
            try {
              localStorage.setItem('disabled_emergencies', JSON.stringify(res.data.disabled_emergencies));
            } catch (e) {}
          }
        })
        .catch((err) => console.warn('Could not load SOS contacts for floating widget:', err));
    }
  }, [user?.role, isTriggered]);

  // Floating SOS button is only displayed for resident members
  if (user?.role !== 'member') {
    return null;
  }

  // Compile full resident address
  const compileAddress = () => {
    if (lastAlert?.resident_address) return lastAlert.resident_address;
    const parts = [];
    if (user?.door_no) parts.push(`Door/Flat #${user.door_no}`);
    if (user?.street) parts.push(`Street: ${user.street}`);
    if (user?.layout_name) parts.push(`Layout: ${user.layout_name}`);
    if (user?.taluk) parts.push(`Taluk: ${user.taluk}`);
    if (user?.district) parts.push(`District: ${user.district}`);
    if (user?.state) parts.push(`State: ${user.state || 'Tamil Nadu'}`);
    return parts.length > 0 ? parts.join(', ') : 'Registered Association Residence';
  };

  const residentAddress = compileAddress();

  // Helper to normalize phone numbers for WhatsApp (strip +/-, add India 91 if 10-digit)
  const formatWaPhone = (phoneStr) => {
    if (!phoneStr) return '';
    const digits = String(phoneStr).replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    return digits;
  };

  // Immediate Action: Call, WhatsApp with Address & Live GPS Location, and Backend Dispatch
  const handleTriggerWithAction = async (emergencyType, customText = '', specificContact = null) => {
    if (isSending) return;

    // Check if resident user has disabled this emergency
    const categoryKey = emergencyType.toLowerCase().includes('medical') ? 'medical'
      : emergencyType.toLowerCase().includes('police') ? 'police'
      : emergencyType.toLowerCase().includes('resident') ? 'resident'
      : emergencyType.toLowerCase().includes('family') ? null
      : 'other';

    if (categoryKey && disabledEmergencies.includes(categoryKey)) {
      if (!window.confirm(`"${emergencyType}" is currently marked as disabled in your portal. Do you want to enable it and proceed with dispatching SOS?`)) {
        return;
      }
      const updated = disabledEmergencies.filter((t) => t !== categoryKey);
      setDisabledEmergencies(updated);
      try {
        localStorage.setItem('disabled_emergencies', JSON.stringify(updated));
        api.put('/sos/preferences', { disabled_emergencies: updated }).catch(() => {});
      } catch (e) {}
    }

    // 1. Resolve target responders
    const medicalContact = emergencyContacts.find(
      (c) =>
        c.contact_type === 'medical' ||
        c.contact_type === 'ambulance' ||
        c.designation?.toLowerCase().includes('doctor') ||
        c.designation?.toLowerCase().includes('hospital') ||
        c.designation?.toLowerCase().includes('medical') ||
        c.designation?.toLowerCase().includes('ambulance')
    );
    const policeContact = emergencyContacts.find(
      (c) => c.contact_type === 'police' || c.designation?.toLowerCase().includes('police')
    );
    const residentResponder = emergencyContacts.find(
      (c) => c.contact_type === 'member' || c.contact_type === 'resident' || c.designation?.toLowerCase().includes('president') || c.designation?.toLowerCase().includes('admin')
    );
    const otherContact = otherServicesList[0] || emergencyContacts.find(
      (c) => c.contact_type === 'other' || c.contact_type === 'fire'
    );
    const fam = specificContact || familyContacts[0] || emergencyContacts.find((c) => c.contact_type === 'family');

    // 2. Select specific call & WhatsApp phone numbers based on Emergency Type or Specific Contact
    let targetCallPhone = '112'; // Default National Emergency Helpline
    let targetWaPhone = '';

    if (specificContact?.phone) {
      targetCallPhone = specificContact.phone;
      targetWaPhone = specificContact.phone;
    } else if (emergencyType === 'Medical Emergency') {
      targetCallPhone = medicalContact?.phone || '108'; // 108 Ambulance
      targetWaPhone = medicalContact?.phone || fam?.phone || residentResponder?.phone || '';
    } else if (emergencyType === 'Police Emergency') {
      targetCallPhone = policeContact?.phone || '100'; // 100 Police
      targetWaPhone = policeContact?.phone || fam?.phone || residentResponder?.phone || '';
    } else if (emergencyType === 'Family Emergency') {
      targetCallPhone = fam?.phone || residentResponder?.phone || '112';
      targetWaPhone = fam?.phone || residentResponder?.phone || '';
    } else if (emergencyType === 'Resident Emergency') {
      targetCallPhone = residentResponder?.phone || user?.association_phone || fam?.phone || '112';
      targetWaPhone = residentResponder?.phone || fam?.phone || '';
    } else {
      // Other Emergency
      targetCallPhone = otherContact?.phone || residentResponder?.phone || fam?.phone || '112';
      targetWaPhone = otherContact?.phone || residentResponder?.phone || fam?.phone || '';
    }

    // 3. Obtain Coordinates with short timeout so it never hangs
    let coords = { latitude: null, longitude: null };
    try {
      coords = await getCoordinates();
    } catch (e) {
      console.warn('Geolocation fast lookup fallback:', e);
    }

    const mapsLink = (coords.latitude && coords.longitude)
      ? `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`
      : 'Location Coordinates Pending GPS Sensor';

    // 4. Formulate pre-filled WhatsApp message with Problem, Address, and Live GPS Location
    const waTextLines = [
      `🚨 *EMERGENCY SOS ALERT!*`,
      `*PROBLEM:* ${emergencyType}${customText ? ` - ${customText}` : ''}`,
      `*RESIDENT:* ${user?.name || 'Resident'} (${user?.phone || 'N/A'}${user?.member_code ? `, Member Code: ${user.member_code}` : ''})`,
      `*HOME ADDRESS:* ${residentAddress}`,
      `*ASSOCIATION:* ${user?.association_name || 'Community Layout'}`,
      `*LIVE LOCATION:* ${mapsLink}`,
      `*TIME:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
      `Please respond and send emergency assistance immediately!`,
    ];
    const waEncoded = encodeURIComponent(waTextLines.join('\n'));

    // 5. Instantly trigger Phone Call
    if (targetCallPhone) {
      const cleanCallPhone = targetCallPhone.replace(/\D/g, '');
      const callUrl = `tel:${cleanCallPhone || targetCallPhone}`;
      window.location.href = callUrl;
    }

    // 6. Instantly open WhatsApp with Pre-filled message and location
    const formattedWa = formatWaPhone(targetWaPhone);
    const waUrl = formattedWa
      ? `https://wa.me/${formattedWa}?text=${waEncoded}`
      : `https://wa.me/?text=${waEncoded}`;

    setTimeout(() => {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }, 450);

    // 7. Dispatch Alert in Backend (Broadcast to sockets, push notifications, DB storage)
    const alertNote = [
      customText ? `Note: ${customText}` : '',
      specificContact ? `Target Responder: ${specificContact.name} (${specificContact.designation || 'Family / Service'})` : '',
      `Call: ${targetCallPhone || '112'}`,
      `WhatsApp: ${targetWaPhone || 'Sent'}`,
      `Address: ${residentAddress}`,
      `Maps: ${mapsLink}`,
    ].filter(Boolean).join(' | ');

    await triggerSOS(emergencyType, alertNote);
  };

  const residentRespondersList = emergencyContacts.filter(
    (c) => c.contact_type === 'member' || c.contact_type === 'resident'
  );

  return (
    <>
      {/* Floating SOS Trigger Button (Fixed Bottom-Right) */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        <button
          onClick={() => setShowTypeSelector(true)}
          className="relative group p-4 sm:p-5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-2xl shadow-red-600/50 hover:shadow-red-600/70 hover:scale-105 active:scale-95 transition duration-200 cursor-pointer flex items-center justify-center border-4 border-white dark:border-gray-800"
          title="Instant Emergency SOS (Call & WhatsApp)"
          aria-label="Instant Emergency SOS"
        >
          {/* Pulsing ring animation */}
          <span className="absolute -inset-1 rounded-full bg-red-600/40 animate-ping opacity-75 pointer-events-none" />

          <div className="relative flex items-center gap-2">
            <HiShieldExclamation className="w-8 h-8 sm:w-9 sm:h-9 animate-pulse" />
            <span className="hidden sm:inline-block font-extrabold text-sm tracking-wider uppercase pr-1">
              SOS
            </span>
          </div>
        </button>
      </div>

      {/* MODAL 1: Emergency Situation Selector */}
      <Modal
        isOpen={showTypeSelector && !isTriggered}
        onClose={() => {
          setShowTypeSelector(false);
          setShowOtherInput(false);
          setShowFamilyChoice(false);
          setShowOtherServicesChoice(false);
        }}
        title="🚨 Select Emergency Situation"
        size="md"
      >
        <div className="space-y-3.5 py-1">
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-2xl">
            <p className="text-xs font-semibold text-red-900 dark:text-red-200 leading-snug">
              ⚡ <strong>Instant Emergency Reaction:</strong> Touching any emergency below immediately dials the emergency call and opens WhatsApp with your <strong>Home Address</strong> and <strong>Live GPS Location</strong>!
            </p>
          </div>

          {/* 5 Distinct Emergency Categories */}
          <div className="space-y-2.5">
            {/* 1. Medical Emergency */}
            <button
              type="button"
              onClick={() => handleTriggerWithAction('Medical Emergency')}
              disabled={isSending}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl border-2 transition transform active:scale-[0.98] cursor-pointer shadow-xs text-left ${
                disabledEmergencies.includes('medical')
                  ? 'border-gray-300 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-900/80 opacity-70'
                  : 'border-rose-200 dark:border-rose-900/60 bg-gradient-to-r from-rose-50 to-white dark:from-rose-950/40 dark:to-slate-900 hover:from-rose-100 hover:to-rose-50 dark:hover:from-rose-900/50 dark:hover:to-slate-850 hover:border-rose-400'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xl shadow-sm flex-shrink-0 ${
                  disabledEmergencies.includes('medical') ? 'bg-gray-400 text-white' : 'bg-rose-600 text-white'
                }`}>
                  🏥
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-extrabold text-rose-950 dark:text-rose-200 truncate">
                      Medical Emergency
                    </h4>
                    {disabledEmergencies.includes('medical') && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400">
                        Disabled by You
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 font-medium truncate">
                    Ambulance (108), Hospital, Emergency Doctor
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-950/80 px-2.5 py-1 rounded-xl">
                <span>Call & WhatsApp</span>
                <span className="text-xs">⚡</span>
              </div>
            </button>

            {/* 2. Police Emergency */}
            <button
              type="button"
              onClick={() => handleTriggerWithAction('Police Emergency')}
              disabled={isSending}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl border-2 transition transform active:scale-[0.98] cursor-pointer shadow-xs text-left ${
                disabledEmergencies.includes('police')
                  ? 'border-gray-300 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-900/80 opacity-70'
                  : 'border-blue-200 dark:border-blue-900/60 bg-gradient-to-r from-blue-50 to-white dark:from-blue-950/40 dark:to-slate-900 hover:from-blue-100 hover:to-blue-50 dark:hover:from-blue-900/50 dark:hover:to-slate-850 hover:border-blue-400'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xl shadow-sm flex-shrink-0 ${
                  disabledEmergencies.includes('police') ? 'bg-gray-400 text-white' : 'bg-blue-600 text-white'
                }`}>
                  🚓
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-extrabold text-blue-950 dark:text-blue-200 truncate">
                      Police Emergency
                    </h4>
                    {disabledEmergencies.includes('police') && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400">
                        Disabled by You
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 font-medium truncate">
                    Police Station (100), Intruder, Layout Security
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-950/80 px-2.5 py-1 rounded-xl">
                <span>Call & WhatsApp</span>
                <span className="text-xs">⚡</span>
              </div>
            </button>

            {/* 3. Family Emergency (2 Contacts with User Choice) */}
            <div className="rounded-2xl border-2 border-purple-200 dark:border-purple-900/60 bg-gradient-to-r from-purple-50/80 to-white dark:from-purple-950/40 dark:to-slate-900 p-3.5 space-y-2.5 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xl shadow-sm flex-shrink-0">
                    👨‍👩‍👧‍👦
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-extrabold text-purple-950 dark:text-purple-200 truncate">
                      Family Emergency
                    </h4>
                    <p className="text-[11px] text-purple-700 dark:text-purple-300 font-medium truncate">
                      {familyContacts.length > 1
                        ? `2 Family Contacts (${familyContacts[0].name} & ${familyContacts[1].name})`
                        : familyContacts.length === 1
                        ? `${familyContacts[0].name} (${familyContacts[0].designation || 'Family'})`
                        : 'Immediate Family Contact, Relatives & Guardian'}
                    </p>
                  </div>
                </div>

                {familyContacts.length > 1 && (
                  <span className="text-[10px] font-bold text-purple-800 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/80 px-2 py-0.5 rounded-full">
                    Choose Contact
                  </span>
                )}
              </div>

              {/* If 2 family contacts exist: show choice buttons for each */}
              {familyContacts.length > 1 ? (
                <div className="pt-1 space-y-2 border-t border-purple-100">
                  <p className="text-[11px] font-bold text-purple-900">
                    Choose which family member to call & alert:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {familyContacts.map((f, idx) => (
                      <button
                        key={f.id || idx}
                        type="button"
                        onClick={() => handleTriggerWithAction('Family Emergency', '', f)}
                        disabled={isSending}
                        className="p-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-left transition flex items-center justify-between gap-2 cursor-pointer active:scale-98 shadow-xs"
                      >
                        <div className="min-w-0">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-purple-600 block">
                            Contact #{idx + 1}
                          </span>
                          <p className="text-xs font-bold text-purple-950 truncate">{f.name}</p>
                          <p className="text-[10px] text-purple-700 truncate">{f.designation || 'Family'}</p>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-extrabold text-white bg-purple-600 px-2.5 py-1.5 rounded-lg flex-shrink-0 shadow-xs">
                          <span>Alert</span>
                          <span>⚡</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : familyContacts.length === 1 ? (
                <button
                  type="button"
                  onClick={() => handleTriggerWithAction('Family Emergency', '', familyContacts[0])}
                  disabled={isSending}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <span>Alert {familyContacts[0].name} (Call & WhatsApp ⚡)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleTriggerWithAction('Family Emergency')}
                  disabled={isSending}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <span>Alert Family Emergency (Call & WhatsApp ⚡)</span>
                </button>
              )}
            </div>

            {/* 4. Resident Emergency */}
            <button
              type="button"
              onClick={() => handleTriggerWithAction('Resident Emergency')}
              disabled={isSending}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl border-2 transition transform active:scale-[0.98] cursor-pointer shadow-xs text-left ${
                disabledEmergencies.includes('resident')
                  ? 'border-gray-300 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-900/80 opacity-70'
                  : 'border-amber-200 dark:border-amber-900/60 bg-gradient-to-r from-amber-50 to-white dark:from-amber-950/40 dark:to-slate-900 hover:from-amber-100 hover:to-amber-50 dark:hover:from-amber-900/50 dark:hover:to-slate-850 hover:border-amber-400'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xl shadow-sm flex-shrink-0 ${
                  disabledEmergencies.includes('resident') ? 'bg-gray-400 text-white' : 'bg-amber-600 text-white'
                }`}>
                  🏘️
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-extrabold text-amber-950 dark:text-amber-200 truncate">
                      Resident Emergency
                    </h4>
                    {disabledEmergencies.includes('resident') && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400">
                        Disabled by You
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium truncate">
                    Association President, Secretary & Responders ({residentRespondersList.length} Active)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/80 px-2.5 py-1 rounded-xl">
                <span>Call & WhatsApp</span>
                <span className="text-xs">⚡</span>
              </div>
            </button>

            {/* 5. Other Emergency (Fire, Security Gate, EB, Multi-Service Choice) */}
            <div className={`rounded-2xl border-2 p-3.5 space-y-2.5 transition ${
              disabledEmergencies.includes('other')
                ? 'border-gray-300 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-900/80 opacity-70'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/80'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xl shadow-sm flex-shrink-0 ${
                    disabledEmergencies.includes('other') ? 'bg-gray-400 text-white' : 'bg-slate-700 text-white'
                  }`}>
                    🔥
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        Other Emergency & Fire
                      </h4>
                      {disabledEmergencies.includes('other') && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400">
                          Disabled by You
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                      Fire (101), Security Gate, EB, Snake, or Custom issue
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowOtherInput(!showOtherInput)}
                  className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 underline cursor-pointer"
                >
                  {showOtherInput ? 'Hide Box' : '+ Add Details'}
                </button>
              </div>

              {/* If multiple other emergency services exist (e.g. Fire, Security Gate, EB), show quick buttons */}
              {otherServicesList.length > 0 && (
                <div className="pt-1 space-y-1.5 border-t border-slate-200">
                  <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Available Helplines:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {otherServicesList.map((o, idx) => (
                      <button
                        key={o.id || idx}
                        type="button"
                        onClick={() => handleTriggerWithAction(o.name || 'Other Emergency', otherDetails, o)}
                        disabled={isSending}
                        className="p-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-left transition flex items-center justify-between gap-2 cursor-pointer active:scale-98 shadow-xs"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {idx === 0 ? '🔥 ' : '⚠️ '}
                            {o.name}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">{o.phone}</p>
                        </div>
                        <span className="text-[10px] font-bold text-white bg-slate-800 px-2 py-1 rounded-md flex-shrink-0">
                          Call ⚡
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showOtherInput && (
                <div className="space-y-2 pt-1 border-t border-slate-200 animate-fade-in">
                  <input
                    type="text"
                    value={otherDetails}
                    onChange={(e) => setOtherDetails(e.target.value)}
                    placeholder="Describe emergency (e.g. Snake spotted, Gas cylinder leak, Lift stuck)..."
                    className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 bg-white"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => handleTriggerWithAction('Other Emergency', otherDetails)}
                disabled={isSending}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <span>🚨 Trigger Other Emergency (Call & WhatsApp)</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Dispatched Confirmation Modal with Problem, Address, and Contacts */}
      {isTriggered && (
        <Modal
          isOpen={isTriggered}
          onClose={resetSOS}
          title="🚨 Emergency SOS Distress Dispatched"
          size="lg"
        >
          <div className="py-2 space-y-4">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl p-4 text-white shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <HiShieldExclamation className="w-6 h-6 text-white animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold">EMERGENCY ASSISTANCE INITIATED</h3>
                  <p className="text-xs text-rose-100">
                    Dialer opened & WhatsApp message pre-composed with live location coordinates.
                  </p>
                </div>
              </div>
            </div>

            {/* Problem & Resident Address Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                <span className="font-bold text-amber-900 uppercase tracking-wider text-[10px]">
                  Emergency Situation
                </span>
                <span className="font-extrabold text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full text-xs">
                  {lastAlert?.emergency_type || lastAlert?.problem || 'SOS Emergency Alert'}
                </span>
              </div>

              <div className="flex items-start gap-2 pt-1 text-gray-800">
                <HiHome className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-gray-900">Resident Address Dispatched:</p>
                  <p className="text-gray-700 leading-relaxed font-mono text-[11px] mt-0.5">
                    {residentAddress}
                  </p>
                </div>
              </div>

              {(lastAlert?.latitude && lastAlert?.longitude) && (
                <div className="flex items-center gap-2 pt-1 text-gray-800">
                  <HiMapPin className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <div className="flex-1 flex items-center justify-between gap-2">
                    <span className="font-medium text-[11px]">
                      GPS: {Number(lastAlert.latitude).toFixed(5)}, {Number(lastAlert.longitude).toFixed(5)}
                    </span>
                    <a
                      href={`https://maps.google.com/?q=${lastAlert.latitude},${lastAlert.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-700 font-bold hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <span>View Map</span>
                      <HiArrowTopRightOnSquare className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Resend / Redial Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const num = user?.association_phone || '112';
                  window.location.href = `tel:${num}`;
                }}
                className="py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <HiPhone className="w-4 h-4" />
                <span>Redial Association Admin</span>
              </button>

              <button
                type="button"
                onClick={resetSOS}
                className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <span>Dismiss / Close</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
