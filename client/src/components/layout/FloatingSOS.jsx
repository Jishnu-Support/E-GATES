import React, { useState, useEffect, useMemo } from 'react';
import {
  HiPhone,
  HiShieldExclamation,
  HiMapPin,
  HiHome,
  HiArrowTopRightOnSquare,
  HiCheckCircle,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useSOS } from '../../hooks/useSOS';
import Modal from '../common/Modal';
import api from '../../services/api';

export default function FloatingSOS() {
  const { user } = useAuth();
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
  const [dispatchedContact, setDispatchedContact] = useState(null);
  const [dispatchedCoords, setDispatchedCoords] = useState({ latitude: null, longitude: null });

  // Preferred contacts chosen by the resident in their SOS Contacts page
  const [preferredContacts, setPreferredContacts] = useState(() => {
    try {
      const saved = localStorage.getItem('preferred_sos_contacts');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Clear any legacy disabled_emergencies cache from user's browser
  useEffect(() => {
    try {
      localStorage.removeItem('disabled_emergencies');
    } catch (e) {}
  }, []);

  // Sync latest preferred contacts from localStorage whenever modal opens
  useEffect(() => {
    if (showTypeSelector) {
      try {
        const saved = localStorage.getItem('preferred_sos_contacts');
        if (saved) setPreferredContacts(JSON.parse(saved));
      } catch (e) {}
    }
  }, [showTypeSelector]);

  // Fetch configured SOS contacts on mount or when alert triggers
  useEffect(() => {
    if (user?.role === 'member') {
      api.get('/sos/contacts')
        .then((res) => {
          const list = res.data?.data || res.data?.defaultContacts || [];
          if (Array.isArray(list)) setEmergencyContacts(list);

          const fams = res.data?.familyContacts || (res.data?.familyContact ? [res.data.familyContact] : []);
          setFamilyContacts(Array.isArray(fams) ? fams : []);
        })
        .catch((err) => console.warn('Could not load SOS contacts for floating widget:', err));
    }
  }, [user?.role, isTriggered]);

  // 1. Group contacts into the exact 5 requested categories
  const familyList = useMemo(() => {
    return Array.isArray(familyContacts) ? familyContacts : [];
  }, [familyContacts]);

  const medicalList = useMemo(() => {
    const list = emergencyContacts.filter(
      (c) =>
        c.contact_type === 'medical' ||
        c.contact_type === 'ambulance' ||
        c.designation?.toLowerCase().includes('hospital') ||
        c.designation?.toLowerCase().includes('doctor') ||
        c.designation?.toLowerCase().includes('ambulance') ||
        c.name?.toLowerCase().includes('hospital') ||
        c.name?.toLowerCase().includes('ambulance')
    );
    if (list.length === 0) {
      return [{ id: 'def-med-1', name: '108 Ambulance Service', phone: '108', designation: 'Emergency Ambulance / Hospital' }];
    }
    return list;
  }, [emergencyContacts]);

  const policeList = useMemo(() => {
    const list = emergencyContacts.filter(
      (c) =>
        c.contact_type === 'police' ||
        c.designation?.toLowerCase().includes('police') ||
        c.name?.toLowerCase().includes('police')
    );
    if (list.length === 0) {
      return [{ id: 'def-pol-1', name: '100 Police Control Room', phone: '100', designation: 'Law & Order Police Control' }];
    }
    return list;
  }, [emergencyContacts]);

  const residentList = useMemo(() => {
    const list = emergencyContacts.filter(
      (c) => c.contact_type === 'member' || c.contact_type === 'resident'
    );
    if (list.length === 0) {
      return [{
        id: 'def-res-1',
        name: user?.association_name ? `${user.association_name} Admin` : 'Association Responder',
        phone: user?.association_phone || '112',
        designation: 'Resident Committee Responder',
      }];
    }
    return list;
  }, [emergencyContacts, user?.association_name, user?.association_phone]);

  const fireList = useMemo(() => {
    const list = emergencyContacts.filter(
      (c) =>
        c.contact_type === 'fire' ||
        c.designation?.toLowerCase().includes('fire') ||
        c.name?.toLowerCase().includes('fire')
    );
    if (list.length === 0) {
      return [{ id: 'def-fire-1', name: '101 Fire & Rescue Service', phone: '101', designation: 'Emergency Fire Station' }];
    }
    return list;
  }, [emergencyContacts]);

  // Resolve the EXACT ONE preferred contact for each of the 5 emergencies
  const activeFamily = useMemo(() => {
    return familyList.find((f) => f.id === preferredContacts.family) || familyList[0] || null;
  }, [familyList, preferredContacts.family]);

  const activeMedical = useMemo(() => {
    return medicalList.find((m) => m.id === preferredContacts.medical) || medicalList[0] || null;
  }, [medicalList, preferredContacts.medical]);

  const activePolice = useMemo(() => {
    return policeList.find((p) => p.id === preferredContacts.police) || policeList[0] || null;
  }, [policeList, preferredContacts.police]);

  const activeResident = useMemo(() => {
    return residentList.find((r) => r.id === preferredContacts.resident) || residentList[0] || null;
  }, [residentList, preferredContacts.resident]);

  const activeFire = useMemo(() => {
    return fireList.find((f) => f.id === preferredContacts.fire) || fireList[0] || null;
  }, [fireList, preferredContacts.fire]);

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

  // Helper to normalize phone numbers for WhatsApp
  const formatWaPhone = (phoneStr) => {
    if (!phoneStr) return '';
    const digits = String(phoneStr).replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    return digits;
  };

  // Immediate Action: Call, open WhatsApp with Original Map Location, and broadcast
  const handleAlertEmergency = async (emergencyType, targetContact) => {
    if (isSending || !targetContact) return;

    setDispatchedContact(targetContact);

    // 1. Obtain Original Map Location Coordinates (GPS)
    let coords = { latitude: null, longitude: null };
    try {
      coords = await getCoordinates();
      setDispatchedCoords(coords);
    } catch (e) {
      console.warn('Geolocation fast lookup fallback:', e);
    }

    const mapsLink = (coords.latitude && coords.longitude)
      ? `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`
      : `https://maps.google.com/?q=${encodeURIComponent(residentAddress)}`;

    const targetPhone = targetContact.phone || '112';

    // 2. Clear user-facing notification toast
    toast.success(
      `🚨 Emergency SOS Dispatched to ${targetContact.name} (${targetPhone})! Initiating call & WhatsApp...`,
      { duration: 7000 }
    );

    // 3. Formulate pre-filled WhatsApp message with Problem, Recipient, Address, and Original Map Location
    const waTextLines = [
      `🚨 *EMERGENCY SOS ALERT!*`,
      `*EMERGENCY TYPE:* ${emergencyType}`,
      `*RESPONDER:* ${targetContact.name} (${targetContact.designation || 'Emergency Responder'})`,
      `*RESIDENT:* ${user?.name || 'Resident'} (${user?.phone || 'N/A'}${user?.door_no ? `, Door #${user.door_no}` : ''})`,
      `*HOME ADDRESS:* ${residentAddress}`,
      `*ASSOCIATION:* ${user?.association_name || 'Community Layout'}`,
      `*ORIGINAL MAP LOCATION:* ${mapsLink}`,
      `*TIME:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
      `Urgent emergency assistance requested! Please respond immediately.`,
    ];
    const waEncoded = encodeURIComponent(waTextLines.join('\n'));

    // 4. Trigger Phone Call
    const cleanCallPhone = targetPhone.replace(/\D/g, '');
    const callUrl = `tel:${cleanCallPhone || targetPhone}`;
    window.location.href = callUrl;

    // 5. Open WhatsApp with Original Map Location link
    const formattedWa = formatWaPhone(targetPhone);
    const waUrl = formattedWa
      ? `https://wa.me/${formattedWa}?text=${waEncoded}`
      : `https://wa.me/?text=${waEncoded}`;

    setTimeout(() => {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }, 450);

    // 6. Record and broadcast SOS Alert in Backend
    const alertNote = [
      `Emergency: ${emergencyType}`,
      `Target Responder: ${targetContact.name} (${targetContact.phone})`,
      `Address: ${residentAddress}`,
      `Original Map Location: ${mapsLink}`,
    ].join(' | ');

    await triggerSOS(emergencyType, alertNote);
  };

  // Google Maps embed URL
  const originalMapEmbedUrl = useMemo(() => {
    const lat = dispatchedCoords.latitude || lastAlert?.latitude;
    const lng = dispatchedCoords.longitude || lastAlert?.longitude;
    if (lat && lng) {
      return `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
    }
    return `https://maps.google.com/maps?q=${encodeURIComponent(residentAddress)}&z=16&output=embed`;
  }, [dispatchedCoords, lastAlert, residentAddress]);

  const originalMapExternalUrl = useMemo(() => {
    const lat = dispatchedCoords.latitude || lastAlert?.latitude;
    const lng = dispatchedCoords.longitude || lastAlert?.longitude;
    if (lat && lng) {
      return `https://maps.google.com/?q=${lat},${lng}`;
    }
    return `https://maps.google.com/?q=${encodeURIComponent(residentAddress)}`;
  }, [dispatchedCoords, lastAlert, residentAddress]);

  return (
    <>
      {/* Floating SOS Trigger Button (Fixed Bottom-Right) */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        <button
          onClick={() => setShowTypeSelector(true)}
          className="relative group p-4 sm:p-5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-2xl shadow-red-600/50 hover:shadow-red-600/70 hover:scale-105 active:scale-95 transition duration-200 cursor-pointer flex items-center justify-center border-4 border-white dark:border-gray-800"
          title="Instant Emergency SOS"
          aria-label="Instant Emergency SOS"
        >
          <span className="absolute -inset-1 rounded-full bg-red-600/40 animate-ping opacity-75 pointer-events-none" />
          <div className="relative flex items-center gap-2">
            <HiShieldExclamation className="w-8 h-8 sm:w-9 sm:h-9 animate-pulse" />
            <span className="hidden sm:inline-block font-extrabold text-sm tracking-wider uppercase pr-1">
              SOS
            </span>
          </div>
        </button>
      </div>

      {/* MODAL 1: Exactly 5 Simple Emergencies (Single Contact Selected in SOS Contacts) */}
      <Modal
        isOpen={showTypeSelector && !isTriggered}
        onClose={() => setShowTypeSelector(false)}
        title="🚨 Select Emergency Situation"
        size="md"
      >
        <div className="space-y-3.5 py-1">
          {/* Header instructions */}
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-2xl">
            <p className="text-xs font-semibold text-red-900 dark:text-red-200 leading-snug">
              ⚡ <strong>Instant Emergency Reaction:</strong> Touching any emergency below immediately calls your chosen contact and transmits your <strong>Home Address</strong> & <strong>Original Map Location</strong> via WhatsApp!
            </p>
            <p className="text-[10px] text-red-700 dark:text-red-300 font-medium mt-1">
              💡 <em>To change which number is active for any emergency, select your preference in the Emergency SOS Contacts page.</em>
            </p>
          </div>

          <div className="space-y-2.5">
            {/* 1. FAMILY EMERGENCY */}
            <div className="rounded-2xl border-2 border-purple-200 dark:border-purple-900/60 bg-gradient-to-r from-purple-50/70 to-white dark:from-purple-950/40 dark:to-slate-900 p-3.5 space-y-2.5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xl shadow-sm flex-shrink-0">
                  👨‍👩‍👧
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-extrabold text-purple-950 dark:text-purple-200 truncate">
                    Family Emergency
                  </h4>
                  {activeFamily ? (
                    <p className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold truncate">
                      {activeFamily.name} ({activeFamily.designation || 'Family Kin'}) • {activeFamily.phone}
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-500 italic truncate">
                      No family member saved yet (Default Helpline: 112)
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleAlertEmergency(
                    'Family Emergency',
                    activeFamily || { name: 'Emergency Helpline', phone: '112', designation: 'National Helpline' }
                  )
                }
                disabled={isSending}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>
                  Alert {activeFamily ? activeFamily.name : 'Family Helpline'} (Call & WhatsApp ⚡)
                </span>
              </button>
            </div>

            {/* 2. MEDICAL EMERGENCY */}
            <div className="rounded-2xl border-2 border-rose-200 dark:border-rose-900/60 bg-gradient-to-r from-rose-50/70 to-white dark:from-rose-950/40 dark:to-slate-900 p-3.5 space-y-2.5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-xl shadow-sm flex-shrink-0">
                  🏥
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-extrabold text-rose-950 dark:text-rose-200 truncate">
                    Medical Emergency
                  </h4>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 font-semibold truncate">
                    {activeMedical?.name} • {activeMedical?.phone}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAlertEmergency('Medical Emergency', activeMedical)}
                disabled={isSending}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>
                  Alert {activeMedical?.name} (Call & WhatsApp ⚡)
                </span>
              </button>
            </div>

            {/* 3. POLICE EMERGENCY */}
            <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-900/60 bg-gradient-to-r from-blue-50/70 to-white dark:from-blue-950/40 dark:to-slate-900 p-3.5 space-y-2.5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-sm flex-shrink-0">
                  🚓
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-extrabold text-blue-950 dark:text-blue-200 truncate">
                    Police Emergency
                  </h4>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 font-semibold truncate">
                    {activePolice?.name} • {activePolice?.phone}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAlertEmergency('Police Emergency', activePolice)}
                disabled={isSending}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>
                  Alert {activePolice?.name} (Call & WhatsApp ⚡)
                </span>
              </button>
            </div>

            {/* 4. RESIDENT RESPONSE */}
            <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-900/60 bg-gradient-to-r from-amber-50/70 to-white dark:from-amber-950/40 dark:to-slate-900 p-3.5 space-y-2.5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-xl shadow-sm flex-shrink-0">
                  🏡
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-extrabold text-amber-950 dark:text-amber-200 truncate">
                    Resident Response
                  </h4>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold truncate">
                    {activeResident?.name} ({activeResident?.designation || 'Committee'}) • {activeResident?.phone}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAlertEmergency('Resident Response', activeResident)}
                disabled={isSending}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>
                  Alert {activeResident?.name} (Call & WhatsApp ⚡)
                </span>
              </button>
            </div>

            {/* 5. FIRE EMERGENCY */}
            <div className="rounded-2xl border-2 border-orange-200 dark:border-orange-900/60 bg-gradient-to-r from-orange-50/70 to-white dark:from-orange-950/40 dark:to-slate-900 p-3.5 space-y-2.5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold text-xl shadow-sm flex-shrink-0">
                  🔥
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-extrabold text-orange-950 dark:text-orange-200 truncate">
                    Fire Emergency
                  </h4>
                  <p className="text-[11px] text-orange-700 dark:text-orange-300 font-semibold truncate">
                    {activeFire?.name} • {activeFire?.phone}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAlertEmergency('Fire Emergency', activeFire)}
                disabled={isSending}
                className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-extrabold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>
                  Alert {activeFire?.name} (Call & WhatsApp ⚡)
                </span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: Dispatched Confirmation Modal with Problem, Responder Details & Original Map Location */}
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
                  <h3 className="text-base font-extrabold">EMERGENCY ASSISTANCE INITIATED</h3>
                  <p className="text-xs text-rose-100">
                    Phone dialer opened & WhatsApp message sent with your live address & location.
                  </p>
                </div>
              </div>
            </div>

            {/* Responder & Emergency Details Box */}
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/60 dark:border-amber-900/40">
                <span className="font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider text-[10px]">
                  Emergency Situation
                </span>
                <span className="font-extrabold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/70 px-2.5 py-0.5 rounded-full text-xs">
                  {lastAlert?.emergency_type || 'Emergency Alert'}
                </span>
              </div>

              {dispatchedContact && (
                <div className="flex items-center justify-between pt-0.5 text-gray-800 dark:text-gray-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 block">
                      Alerted Responder
                    </span>
                    <p className="font-bold text-gray-900 dark:text-white text-xs">
                      {dispatchedContact.name} ({dispatchedContact.designation || 'Emergency Responder'})
                    </p>
                  </div>
                  <a
                    href={`tel:${dispatchedContact.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    <HiPhone className="w-3.5 h-3.5" />
                    <span>Call {dispatchedContact.phone}</span>
                  </a>
                </div>
              )}

              <div className="flex items-start gap-2 pt-1 text-gray-800 dark:text-gray-200">
                <HiHome className="w-4 h-4 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Resident Address Dispatched:</p>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-mono text-[11px] mt-0.5">
                    {residentAddress}
                  </p>
                </div>
              </div>
            </div>

            {/* Original Map Location Box */}
            <div className="rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden bg-gray-50 dark:bg-slate-900/60 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white">
                  <HiMapPin className="w-4 h-4 text-red-600 animate-bounce" />
                  <span>Original Map Location</span>
                </div>
                <a
                  href={originalMapExternalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <span>Open in Google Maps</span>
                  <HiArrowTopRightOnSquare className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Embedded Google Map */}
              <iframe
                title="Original Map Location"
                src={originalMapEmbedUrl}
                className="w-full h-44 rounded-xl border border-gray-200 dark:border-slate-800 shadow-inner bg-slate-100 dark:bg-slate-950"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-gray-600 dark:text-gray-400">
                <span>📍 {residentAddress}</span>
                {(dispatchedCoords.latitude || lastAlert?.latitude) && (
                  <span className="font-mono text-[10px] text-gray-500">
                    GPS: {Number(dispatchedCoords.latitude || lastAlert?.latitude).toFixed(5)}, {Number(dispatchedCoords.longitude || lastAlert?.longitude).toFixed(5)}
                  </span>
                )}
              </div>
            </div>

            {/* Actions: Redial / Dismiss */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  const num = dispatchedContact?.phone || user?.association_phone || '112';
                  window.location.href = `tel:${num}`;
                }}
                className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <HiPhone className="w-4 h-4" />
                <span>Redial Responder ({dispatchedContact?.phone || '112'})</span>
              </button>

              <button
                type="button"
                onClick={resetSOS}
                className="py-2.5 px-4 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
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
