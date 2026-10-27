import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import LocationMap from '../common/LocationMap';
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

  // Pre-fetch fresh GPS coordinates silently in background so one-tap SOS is instant
  useEffect(() => {
    if (user?.role === 'member') {
      getCoordinates()
        .then((coords) => {
          if (coords.latitude && coords.longitude) {
            setDispatchedCoords(coords);
          }
        })
        .catch(() => {});
    }
  }, [user?.role]);

  // Sync latest preferred contacts from localStorage whenever component renders or modal opens
  useEffect(() => {
    try {
      const saved = localStorage.getItem('preferred_sos_contacts');
      if (saved) setPreferredContacts(JSON.parse(saved));
    } catch (e) {}
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

  // 1. Group contacts into categories
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

  // Resolve active contact for each emergency category
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

  // PRIMARY ONE-TAP CONTACT: Used when tapping the SOS button once with zero confirmation
  const primaryContact = useMemo(() => {
    try {
      const savedPrimaryId = localStorage.getItem('preferred_sos_primary');
      if (savedPrimaryId) {
        const found =
          familyList.find((f) => String(f.id) === String(savedPrimaryId)) ||
          emergencyContacts.find((c) => String(c.id) === String(savedPrimaryId));
        if (found) return found;
      }
    } catch (e) {}

    // First saved family member has highest default priority
    if (familyList.length > 0) return familyList[0];
    if (activeFamily) return activeFamily;
    if (activeMedical) return activeMedical;
    if (activePolice) return activePolice;
    if (activeResident) return activeResident;

    if (user?.association_phone) {
      return {
        id: 'assoc-admin',
        name: user?.association_name ? `${user.association_name} Admin` : 'Association Help',
        phone: user.association_phone,
        designation: 'Association Security / Admin',
      };
    }

    return {
      id: 'national-112',
      name: 'Emergency Helpline (112)',
      phone: '112',
      designation: 'National All-in-One Emergency',
    };
  }, [familyList, emergencyContacts, activeFamily, activeMedical, activePolice, activeResident, user]);

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

  // Immediate Execution: Call, WhatsApp message with Original Map Location, and broadcast
  const executeSOSDispatch = async (emergencyType, targetContact) => {
    if (isSending || !targetContact) return;

    setDispatchedContact(targetContact);

    // 1. Get GPS coords (use cached immediately if ready, or fast lookup)
    let coords = dispatchedCoords;
    if (!coords.latitude || !coords.longitude) {
      try {
        coords = await Promise.race([
          getCoordinates(),
          new Promise((resolve) => setTimeout(() => resolve(dispatchedCoords), 400)),
        ]);
        if (coords.latitude) setDispatchedCoords(coords);
      } catch (e) {
        console.warn('Geolocation fast lookup notice:', e);
      }
    }

    const mapsLink = (coords.latitude && coords.longitude)
      ? `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`
      : `https://maps.google.com/?q=${encodeURIComponent(residentAddress)}`;

    const targetPhone = targetContact.phone || '112';
    const cleanCallPhone = String(targetPhone).replace(/\D/g, '');
    const formattedWa = formatWaPhone(targetPhone);

    // 2. Pre-filled WhatsApp message with Problem, Recipient, Address, and Original Map Location
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

    // 3. STEP 1: Launch WhatsApp immediately
    const waUrl = formattedWa
      ? `https://api.whatsapp.com/send?phone=${formattedWa}&text=${waEncoded}`
      : `https://api.whatsapp.com/send?text=${waEncoded}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');

    // 4. STEP 2: Immediately initiate Phone Call without asking or waiting
    const callUrl = `tel:${cleanCallPhone || targetPhone}`;
    setTimeout(() => {
      window.location.href = callUrl;
    }, 450);

    // 5. Record and broadcast SOS Alert in Backend & WebSockets
    const alertNote = [
      `Emergency: ${emergencyType}`,
      `Target Responder: ${targetContact.name} (${targetContact.phone})`,
      `Address: ${residentAddress}`,
      `Original Map Location: ${mapsLink}`,
    ].join(' | ');

    await triggerSOS(emergencyType, alertNote);
  };

  // Determine specific emergency category based on contact type
  const getContactEmergencyType = (contact) => {
    if (!contact) return 'Family Emergency';
    if (contact.contact_type === 'family' || familyList.some((f) => String(f.id) === String(contact.id))) {
      return 'Family Emergency';
    }
    if (contact.contact_type === 'medical' || contact.contact_type === 'ambulance') {
      return 'Medical Emergency';
    }
    if (contact.contact_type === 'police') {
      return 'Police Emergency';
    }
    if (contact.contact_type === 'fire') {
      return 'Fire Emergency';
    }
    if (contact.contact_type === 'resident' || contact.contact_type === 'member') {
      return 'Resident Emergency';
    }
    return 'Family Emergency';
  };

  // ONE-TAP SOS: Immediately called when the user taps the SOS button once
  const handleOneTapSOS = () => {
    const emergencyType = getContactEmergencyType(primaryContact);
    executeSOSDispatch(emergencyType, primaryContact);
  };

  return (
    <>
      {/* Floating SOS Trigger (Fixed Bottom-Right, Fully Visible on Mobile & Desktop) */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 select-none">
        {/* ONE-TAP SOS BUTTON (Instantly calls & sends WhatsApp to saved contact) */}
        <button
          type="button"
          onClick={handleOneTapSOS}
          disabled={isSending}
          className="relative group px-3.5 py-2.5 sm:px-5 sm:py-3.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-2xl shadow-red-600/50 hover:shadow-red-600/70 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center border-2 sm:border-4 border-white dark:border-slate-800 ring-2 ring-red-500/30"
          title={`One-Tap SOS: Immediately calls & sends WhatsApp to ${primaryContact?.name || 'Emergency Contact'}`}
          aria-label="Instant Emergency SOS"
        >
          <span className="absolute -inset-1 rounded-full bg-red-600/30 animate-ping opacity-75 pointer-events-none" />
          <div className="relative flex items-center gap-1.5 sm:gap-2">
            <HiShieldExclamation className="w-6 h-6 sm:w-8 sm:h-8 animate-pulse text-white flex-shrink-0" />
            <div className="text-left flex flex-col justify-center">
              <span className="font-black text-xs sm:text-sm tracking-wider uppercase leading-none text-white drop-shadow-xs">
                SOS
              </span>
              <span className="text-[9px] sm:text-[10px] text-rose-100 font-bold leading-tight truncate max-w-[85px] sm:max-w-[120px]">
                {primaryContact ? primaryContact.name : '1-Tap Alert'}
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* MODAL 1: Specific Situations Selector (Optional for choosing specific category) */}
      <Modal
        isOpen={showTypeSelector && !isTriggered}
        onClose={() => setShowTypeSelector(false)}
        title="🚨 Specific Emergency Situations"
        size="md"
      >
        <div className="space-y-3.5 py-1">
          {/* Header instructions */}
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-2xl">
            <p className="text-xs font-semibold text-red-900 dark:text-red-200 leading-snug">
              ⚡ <strong>Instant Action:</strong> Touching any emergency below immediately calls your chosen contact and transmits your <strong>Home Address</strong> & <strong>Original Map Location</strong> via WhatsApp!
            </p>
            <p className="text-[10px] text-red-700 dark:text-red-300 font-medium mt-1">
              💡 <em>To change which number is active for any emergency, select your preference in Emergency SOS Contacts.</em>
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
                onClick={() => {
                  setShowTypeSelector(false);
                  executeSOSDispatch(
                    'Family Emergency',
                    activeFamily || { name: 'Emergency Helpline', phone: '112', designation: 'National Helpline' }
                  );
                }}
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
                  {activeMedical ? (
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 font-semibold truncate">
                      {activeMedical.name} ({activeMedical.designation || 'Ambulance'}) • {activeMedical.phone}
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-500 italic truncate">
                      108 Emergency Ambulance
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowTypeSelector(false);
                  executeSOSDispatch(
                    'Medical Emergency',
                    activeMedical || { name: '108 Ambulance', phone: '108', designation: 'Ambulance Service' }
                  );
                }}
                disabled={isSending}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>
                  Alert {activeMedical ? activeMedical.name : '108 Ambulance'} (Call & WhatsApp ⚡)
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
                  {activePolice ? (
                    <p className="text-[11px] text-blue-700 dark:text-blue-300 font-semibold truncate">
                      {activePolice.name} ({activePolice.designation || 'Police Station'}) • {activePolice.phone}
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-500 italic truncate">
                      100 Police Control Room
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowTypeSelector(false);
                  executeSOSDispatch(
                    'Police Emergency',
                    activePolice || { name: '100 Police Control Room', phone: '100', designation: 'Police Control' }
                  );
                }}
                disabled={isSending}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>
                  Alert {activePolice ? activePolice.name : 'Police Control'} (Call & WhatsApp ⚡)
                </span>
              </button>
            </div>

            {/* 4. RESIDENT RESPONDER / SECURITY */}
            <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-900/60 bg-gradient-to-r from-amber-50/70 to-white dark:from-amber-950/40 dark:to-slate-900 p-3.5 space-y-2.5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-xl shadow-sm flex-shrink-0">
                  🏡
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-extrabold text-amber-950 dark:text-amber-200 truncate">
                    Resident Responder / Security
                  </h4>
                  {activeResident ? (
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold truncate">
                      {activeResident.name} ({activeResident.designation || 'Community Responder'}) • {activeResident.phone}
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-500 italic truncate">
                      Community Layout Admin / Guard
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowTypeSelector(false);
                  executeSOSDispatch(
                    'Resident Responder Emergency',
                    activeResident || {
                      name: 'Association Admin',
                      phone: user?.association_phone || '112',
                      designation: 'Resident Admin',
                    }
                  );
                }}
                disabled={isSending}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>
                  Alert {activeResident ? activeResident.name : 'Association Security'} (Call & WhatsApp ⚡)
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
                    Fire & Rescue
                  </h4>
                  {activeFire ? (
                    <p className="text-[11px] text-orange-700 dark:text-orange-300 font-semibold truncate">
                      {activeFire.name} ({activeFire.designation || 'Fire Station'}) • {activeFire.phone}
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-500 italic truncate">
                      101 Fire & Rescue Service
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowTypeSelector(false);
                  executeSOSDispatch(
                    'Fire & Rescue Emergency',
                    activeFire || { name: '101 Fire Station', phone: '101', designation: 'Fire & Rescue' }
                  );
                }}
                disabled={isSending}
                className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-extrabold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>
                  Alert {activeFire ? activeFire.name : '101 Fire Station'} (Call & WhatsApp ⚡)
                </span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: Dispatched Confirmation Modal with Problem, Responder Details & ORIGINAL MAP LOCATION */}
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
                    Phone call initiated & WhatsApp message sent with your live address & location.
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
                  {lastAlert?.emergency_type || 'One-Tap Emergency SOS'}
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

            {/* ORIGINAL MAP LOCATION: Real Interactive Map (Leaflet + OpenStreetMap) */}
            <LocationMap
              latitude={dispatchedCoords.latitude || lastAlert?.latitude}
              longitude={dispatchedCoords.longitude || lastAlert?.longitude}
              address={residentAddress}
              title="Original Map Location"
              height="h-56"
            />

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
                className="py-2.5 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <HiCheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Dismiss / Mark Safe</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
