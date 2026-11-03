import React, { useState, useEffect, useMemo } from 'react';
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
  HiArrowTopRightOnSquare,
  HiCheckCircle,
  HiChatBubbleOvalLeftEllipsis,
  HiPlus,
  HiXMark,
  HiUserGroup,
  HiArrowPath,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
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
  const [dispatchedContact, setDispatchedContact] = useState(null);
  const [dispatchedCoords, setDispatchedCoords] = useState({ latitude: null, longitude: null });
  const [activeCategoryTab, setActiveCategoryTab] = useState('all'); // 'all' | 'family' | 'medical' | 'police' | 'resident' | 'fire'
  const [showAddFamilyInline, setShowAddFamilyInline] = useState(false);
  const [newFamilyForm, setNewFamilyForm] = useState({ name: '', phone: '', designation: 'Family Contact' });
  const [savingFamily, setSavingFamily] = useState(false);

  // Preference selection state: resident chooses ONLY ONE active contact per emergency category
  const [preferredContacts, setPreferredContacts] = useState(() => {
    try {
      const saved = localStorage.getItem('preferred_sos_contacts');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Update chosen preference and sync to localStorage
  const updatePreference = (categoryKey, contactId) => {
    const updated = {
      ...preferredContacts,
      [categoryKey]: contactId,
    };
    setPreferredContacts(updated);
    try {
      localStorage.setItem('preferred_sos_contacts', JSON.stringify(updated));
      api.put('/sos/preferences', { preferred_contacts: updated }).catch(() => {});
    } catch (e) {}
  };

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
  const fetchSOSContacts = () => {
    if (user?.role === 'member') {
      api.get('/sos/contacts')
        .then((res) => {
          const list = res.data?.data || res.data?.defaultContacts || [];
          if (Array.isArray(list)) setEmergencyContacts(list);

          const fams = res.data?.familyContacts || (res.data?.familyContact ? [res.data.familyContact] : []);
          const validFams = Array.isArray(fams) ? fams : [];
          setFamilyContacts(validFams);
        })
        .catch((err) => console.warn('Could not load SOS contacts for floating widget:', err));
    }
  };

  useEffect(() => {
    fetchSOSContacts();
  }, [user?.role, isTriggered]);

  // Floating SOS button is only displayed for resident members
  if (user?.role !== 'member') {
    return null;
  }

  // 1. Group configured contacts into clean emergency categories
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
      return [{ id: 'def-med-1', name: '108 Ambulance Service', phone: '108', designation: 'Emergency Medical & Ambulance' }];
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
        designation: 'Community Administration / Security Gate',
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
      return [{ id: 'def-fire-1', name: '101 Fire & Rescue Service', phone: '101', designation: 'Emergency Fire Department' }];
    }
    return list;
  }, [emergencyContacts]);

  const otherList = useMemo(() => {
    return emergencyContacts.filter((c) => c.contact_type === 'other');
  }, [emergencyContacts]);

  // Resolve the EXACT ONE selected/preferred contact for each emergency category
  const activeFamily = useMemo(() => {
    if (familyList.length === 0) return null;
    return familyList.find((f) => f.id === preferredContacts.family) || familyList[0];
  }, [familyList, preferredContacts.family]);

  const activeMedical = useMemo(() => {
    if (medicalList.length === 0) return null;
    return medicalList.find((m) => m.id === preferredContacts.medical) || medicalList[0];
  }, [medicalList, preferredContacts.medical]);

  const activePolice = useMemo(() => {
    if (policeList.length === 0) return null;
    return policeList.find((p) => p.id === preferredContacts.police) || policeList[0];
  }, [policeList, preferredContacts.police]);

  const activeResident = useMemo(() => {
    if (residentList.length === 0) return null;
    return residentList.find((r) => r.id === preferredContacts.resident) || residentList[0];
  }, [residentList, preferredContacts.resident]);

  const activeFire = useMemo(() => {
    if (fireList.length === 0) return null;
    return fireList.find((f) => f.id === preferredContacts.fire) || fireList[0];
  }, [fireList, preferredContacts.fire]);

  const activeOther = useMemo(() => {
    if (otherList.length === 0) return null;
    return otherList.find((o) => o.id === preferredContacts.other) || otherList[0];
  }, [otherList, preferredContacts.other]);

  // Helper to compile resident address string
  const compileAddress = () => {
    if (lastAlert?.resident_address) return lastAlert.resident_address;
    const parts = [];
    if (user?.door_no) parts.push(`Door: #${user.door_no}`);
    if (user?.street) parts.push(user.street);
    if (user?.layout_name) parts.push(user.layout_name);
    if (user?.association_name) parts.push(user.association_name);
    return parts.length > 0 ? parts.join(', ') : 'Registered Layout Residence';
  };

  const residentAddress = compileAddress();

  // Format WhatsApp phone number (India format default if 10-digit)
  const formatWaPhone = (rawPhone) => {
    if (!rawPhone) return '';
    const digits = String(rawPhone).replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length > 10) return digits;
    return '';
  };

  // Quick save inline family contact
  const handleSaveInlineFamily = async (e) => {
    e.preventDefault();
    if (!newFamilyForm.name.trim() || !newFamilyForm.phone.trim()) {
      toast.error('Please enter family member name and phone number');
      return;
    }
    try {
      setSavingFamily(true);
      const updatedList = [...familyList, {
        name: newFamilyForm.name.trim(),
        phone: newFamilyForm.phone.trim(),
        designation: newFamilyForm.designation.trim() || 'Family Kin',
      }];
      await api.post('/sos/family-contact', { contacts: updatedList });
      toast.success('Family emergency contact saved!');
      setNewFamilyForm({ name: '', phone: '', designation: 'Family Contact' });
      setShowAddFamilyInline(false);
      fetchSOSContacts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save family contact');
    } finally {
      setSavingFamily(false);
    }
  };

  // Immediate 1-Tap Calling + WhatsApp Dispatch + Backend Broadcast
  const handleDispatchContact = async (emergencyType, targetContact) => {
    if (navigator.vibrate) navigator.vibrate([150, 80, 150]);

    const targetPhone = targetContact?.phone || '112';
    const targetName = targetContact?.name || 'Emergency Responder';

    // 1. Get Live GPS
    let coords = { latitude: null, longitude: null };
    try {
      coords = await getCoordinates();
    } catch (e) {
      console.warn('Coordinates retrieval fallback:', e);
    }
    setDispatchedCoords(coords);
    setDispatchedContact({ ...targetContact, emergencyType });

    // 2. Maps Link
    const mapsLink = coords.latitude && coords.longitude
      ? `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(residentAddress)}`;

    // 3. Construct WhatsApp Message
    const waTextLines = [
      `🚨 *EMERGENCY SOS DISTRESS ALERT!*`,
      `⚠️ *Situation:* ${emergencyType}`,
      `👤 *Resident:* ${user?.name || 'Resident'} (${user?.phone || 'N/A'}${user?.door_no ? `, Door #${user.door_no}` : ''})`,
      `🏠 *Association:* ${user?.association_name || 'Community Layout'}`,
      `📍 *Home Address:* ${residentAddress}`,
      `🗺️ *Live GPS Location:* ${mapsLink}`,
      `⏰ *Time:* ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
      ``,
      `*URGENT: Immediate emergency help requested! Please respond or call back immediately.*`,
    ];
    const waEncoded = encodeURIComponent(waTextLines.join('\n'));

    // 4. Trigger Direct Phone Call to Native Android / Mobile Dialer
    const cleanCallPhone = targetPhone.replace(/\D/g, '');
    const callUrl = `tel:${cleanCallPhone || targetPhone}`;

    // Show instant toast feedback
    toast.error(`🚨 DISPATCHING EMERGENCY SOS (${emergencyType}) to ${targetName} (${targetPhone})!`, {
      duration: 6000,
    });

    // 5. Open Native Dialer
    window.location.href = callUrl;

    // 6. Launch WhatsApp if valid phone
    const formattedWa = formatWaPhone(targetPhone);
    if (formattedWa) {
      setTimeout(() => {
        window.open(`https://wa.me/${formattedWa}?text=${waEncoded}`, '_blank', 'noopener,noreferrer');
      }, 500);
    }

    // 7. Record Alert on Backend
    const alertNote = [
      `Emergency: ${emergencyType}`,
      `Responder: ${targetName} (${targetPhone})`,
      `Address: ${residentAddress}`,
      `Map: ${mapsLink}`,
    ].join(' | ');

    try {
      await triggerSOS(emergencyType, alertNote);
    } catch (err) {
      console.error('SOS dispatch record failed:', err);
    }
  };

  // Google Map embed URLs for confirmation screen
  const originalMapEmbedUrl = useMemo(() => {
    const lat = dispatchedCoords.latitude || lastAlert?.latitude;
    const lng = dispatchedCoords.longitude || lastAlert?.longitude;
    if (lat && lng) {
      return `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
    }
    const safeAddress = encodeURIComponent(residentAddress);
    return `https://maps.google.com/maps?q=${safeAddress}&z=15&output=embed`;
  }, [dispatchedCoords, lastAlert, residentAddress]);

  const originalMapExternalUrl = useMemo(() => {
    const lat = dispatchedCoords.latitude || lastAlert?.latitude;
    const lng = dispatchedCoords.longitude || lastAlert?.longitude;
    if (lat && lng) {
      return `https://maps.google.com/?q=${lat},${lng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(residentAddress)}`;
  }, [dispatchedCoords, lastAlert, residentAddress]);

  return (
    <>
      {/* ======================================================== */}
      {/* 1. RESPONSIVE FLOATING SOS TRIGGER BUTTON (ANDROID-FRIENDLY) */}
      {/* ======================================================== */}
      <div className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-center">
        <div className="relative group">
          <div className="absolute -inset-1 bg-red-600 rounded-full blur-sm opacity-60 group-hover:opacity-100 animate-pulse transition duration-500 pointer-events-none" />

          <button
            type="button"
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
              setShowTypeSelector(true);
            }}
            disabled={isSending}
            className={`relative w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-full flex flex-col items-center justify-center font-black text-white shadow-2xl select-none focus:outline-none cursor-pointer transform hover:scale-105 active:scale-95 transition-all duration-200 touch-manipulation ${
              isTriggered
                ? 'animate-siren bg-red-600 ring-4 sm:ring-8 ring-red-400'
                : 'bg-red-600 hover:bg-red-700 ring-2 sm:ring-4 ring-white/60 dark:ring-red-400/50'
            }`}
            aria-label="Emergency SOS (Click to choose contacts)"
            title="Click to Choose Emergency SOS Contacts"
          >
            <span className="text-base sm:text-lg md:text-xl font-black tracking-wider leading-none">
              SOS
            </span>
            <span className="text-[8px] sm:text-[9px] font-extrabold tracking-tight mt-1 bg-white/25 px-2 py-0.5 rounded-full uppercase">
              {isSending ? '...' : 'CLICK'}
            </span>
          </button>
        </div>

        <span className="mt-1.5 text-[10px] sm:text-[11px] font-bold text-gray-800 dark:text-gray-200 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-2.5 py-0.5 rounded-full shadow-md border border-gray-200 dark:border-slate-800 hidden md:block pointer-events-none">
          {t('sos_button_title') || 'Emergency SOS'}
        </span>
      </div>

      {/* ======================================================== */}
      {/* 2. CHOOSE 1 CONTACT PER EMERGENCY & DISPATCH MODAL */}
      {/* ======================================================== */}
      <Modal
        isOpen={showTypeSelector}
        onClose={() => setShowTypeSelector(false)}
        title="🚨 Emergency SOS Dispatch & Contacts"
        size="lg"
      >
        <div className="space-y-3.5 py-1 max-h-[82vh] overflow-y-auto px-0.5">
          {/* Mobile Drag Indicator Handle */}
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-slate-700 rounded-full mx-auto -mt-1 mb-2 block sm:hidden" />

          {/* Subtitle & Resident Location Indicator */}
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-3 flex items-start gap-2.5">
            <HiMapPin className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5 animate-bounce" />
            <div className="text-xs">
              <p className="font-bold text-rose-950 dark:text-rose-200">
                Your Dispatch Location:
              </p>
              <p className="text-rose-800 dark:text-rose-300 font-mono text-[11px] mt-0.5 leading-snug">
                {residentAddress}
              </p>
            </div>
          </div>

          {/* 1-Tap Broadcast to ALL Responders */}
          <button
            type="button"
            onClick={() => handleDispatchContact('Immediate Distress', {
              name: 'All Emergency Responders',
              phone: '112',
              designation: 'National Helpline & Community Dispatch',
            })}
            disabled={isSending}
            className="w-full p-3.5 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer touch-manipulation disabled:opacity-50"
          >
            <HiShieldExclamation className="w-5 h-5 text-white animate-pulse" />
            <span>🚨 BROADCAST IMMEDIATE SOS TO ALL RESPONDERS</span>
          </button>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveCategoryTab('all')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                activeCategoryTab === 'all'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm'
                  : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              All Options
            </button>
            <button
              type="button"
              onClick={() => setActiveCategoryTab('family')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                activeCategoryTab === 'family'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
              }`}
            >
              👨‍👩‍👧 Family
            </button>
            <button
              type="button"
              onClick={() => setActiveCategoryTab('medical')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                activeCategoryTab === 'medical'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
              }`}
            >
              🏥 Medical
            </button>
            <button
              type="button"
              onClick={() => setActiveCategoryTab('police')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                activeCategoryTab === 'police'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
              }`}
            >
              🚓 Police
            </button>
            <button
              type="button"
              onClick={() => setActiveCategoryTab('resident')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                activeCategoryTab === 'resident'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
              }`}
            >
              🏡 Responders
            </button>
            <button
              type="button"
              onClick={() => setActiveCategoryTab('fire')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                activeCategoryTab === 'fire'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
              }`}
            >
              🔥 Fire
            </button>
          </div>

          {/* ======================================================== */}
          {/* 1. FAMILY EMERGENCY (ONLY 1 SELECTED CONTACT SHOWN WITH NUMBER BELOW) */}
          {/* ======================================================== */}
          {(activeCategoryTab === 'all' || activeCategoryTab === 'family') && (
            <div className="rounded-2xl border-2 border-purple-300 dark:border-purple-800 bg-gradient-to-br from-purple-50/80 via-white to-purple-50/40 dark:from-purple-950/40 dark:via-slate-900 dark:to-purple-950/20 p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xl shadow-xs flex-shrink-0">
                    👨‍👩‍👧
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-purple-950 dark:text-purple-100 flex items-center gap-1.5">
                      <span>Family Emergency Contact</span>
                      <span className="text-[10px] font-extrabold bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-200 px-2 py-0.5 rounded-full">
                        Personal Kin
                      </span>
                    </h3>
                    <p className="text-[11px] text-purple-700 dark:text-purple-300">
                      Alert your personal family emergency contact with live location
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddFamilyInline(!showAddFamilyInline)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 bg-purple-100 dark:bg-purple-900/60 hover:bg-purple-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
                >
                  <HiPlus className="w-3.5 h-3.5" />
                  <span>{showAddFamilyInline ? 'Cancel' : 'Add Number'}</span>
                </button>
              </div>

              {/* Inline Quick Add Family Number Form */}
              {showAddFamilyInline && (
                <form
                  onSubmit={handleSaveInlineFamily}
                  className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-purple-200 dark:border-purple-700/60 space-y-2.5 text-xs shadow-inner"
                >
                  <p className="font-bold text-purple-900 dark:text-purple-200">
                    Add Family Emergency Number:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Name (e.g. Priya)"
                      value={newFamilyForm.name}
                      onChange={(e) => setNewFamilyForm({ ...newFamilyForm, name: e.target.value })}
                      className="px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      required
                    />
                    <input
                      type="tel"
                      placeholder="10-digit Mobile Phone Number *"
                      value={newFamilyForm.phone}
                      onChange={(e) => setNewFamilyForm({ ...newFamilyForm, phone: e.target.value })}
                      className="px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Relation (e.g. Spouse, Father)"
                      value={newFamilyForm.designation}
                      onChange={(e) => setNewFamilyForm({ ...newFamilyForm, designation: e.target.value })}
                      className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={savingFamily}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {savingFamily ? 'Saving...' : 'Save & Select'}
                    </button>
                  </div>
                </form>
              )}

              {/* SELECTION BAR WHEN 2 OR MORE FAMILY CONTACTS EXIST */}
              {familyList.length > 1 && (
                <div className="p-2.5 bg-purple-100/60 dark:bg-purple-950/50 rounded-xl border border-purple-200 dark:border-purple-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-950 dark:text-purple-200">
                      You have {familyList.length} family contacts. Select 1 to alert:
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {familyList.map((fam) => {
                      const isSelected = activeFamily?.id === fam.id;
                      return (
                        <button
                          key={fam.id}
                          type="button"
                          onClick={() => updatePreference('family', fam.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                            isSelected
                              ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-400'
                              : 'bg-white dark:bg-slate-800 text-purple-900 dark:text-purple-200 hover:bg-purple-50 border border-purple-200 dark:border-purple-800'
                          }`}
                        >
                          {isSelected ? '✓ ' : ''}{fam.name} ({fam.designation || 'Family'})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ONLY ONE ACTIVE FAMILY CONTACT DISPLAYED (WITH NUMBER SHOWN PROMINENTLY BELOW) */}
              {!activeFamily ? (
                <div className="p-3 bg-purple-100/50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800 text-center space-y-2">
                  <p className="text-xs text-purple-900 dark:text-purple-200">
                    No personal family contact saved yet. Click <strong>"+ Add Number"</strong> above or alert National Helpline 112:
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDispatchContact('Family Emergency', {
                      name: 'National Helpline (112)',
                      phone: '112',
                      designation: 'National Helpline',
                    })}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Call National Helpline (112)
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-800/80 bg-white dark:bg-slate-900 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-sm sm:text-base text-gray-900 dark:text-white">
                          {activeFamily.name}
                        </h4>
                        <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded-full">
                          {activeFamily.designation || 'Family Contact'}
                        </span>
                      </div>

                      {/* PROMINENT PHONE NUMBER SHOWN DIRECTLY BELOW NAME */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-xs sm:text-sm font-mono font-black text-purple-900 dark:text-purple-200 bg-purple-100/80 dark:bg-purple-950 px-3 py-1 rounded-xl border border-purple-300 dark:border-purple-700 flex items-center gap-2">
                          <HiPhone className="w-4 h-4 text-purple-700 dark:text-purple-300" />
                          <span>{activeFamily.phone}</span>
                        </span>
                      </div>
                    </div>

                    {/* Quick 1-Tap Action Pills */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <a
                        href={`tel:${activeFamily.phone}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDispatchContact('Family Emergency', activeFamily);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition active:scale-95"
                        title="Direct Phone Call"
                      >
                        <HiPhone className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleDispatchContact('Family Emergency', activeFamily)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg shadow-xs transition active:scale-95 cursor-pointer"
                        title="WhatsApp SOS Alert"
                      >
                        <HiChatBubbleOvalLeftEllipsis className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </button>
                    </div>
                  </div>

                  {/* Primary Big Confirm Button for selected family */}
                  <button
                    type="button"
                    onClick={() => handleDispatchContact('Family Emergency', activeFamily)}
                    disabled={isSending}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white rounded-xl text-xs sm:text-sm font-extrabold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <HiShieldExclamation className="w-4 h-4 text-white" />
                    <span>
                      ALERT {activeFamily.name.toUpperCase()} ({activeFamily.phone})
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. MEDICAL EMERGENCY (ONLY 1 SELECTED CONTACT SHOWN) */}
          {/* ======================================================== */}
          {(activeCategoryTab === 'all' || activeCategoryTab === 'medical') && activeMedical && (
            <div className="rounded-2xl border-2 border-rose-300 dark:border-rose-900 bg-gradient-to-br from-rose-50/80 via-white to-rose-50/40 dark:from-rose-950/40 dark:via-slate-900 dark:to-rose-950/20 p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-xl shadow-xs flex-shrink-0">
                    🏥
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-rose-950 dark:text-rose-100 flex items-center gap-1.5">
                      <span>Medical Emergency</span>
                      <span className="text-[10px] font-extrabold bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 px-2 py-0.5 rounded-full">
                        Ambulance & Hospital
                      </span>
                    </h3>
                    <p className="text-[11px] text-rose-700 dark:text-rose-300">
                      Dispatches medical distress with GPS coordinates & triggers call
                    </p>
                  </div>
                </div>
              </div>

              {/* SELECTION BAR IF MULTIPLE MEDICAL CONTACTS */}
              {medicalList.length > 1 && (
                <div className="p-2 bg-rose-100/60 dark:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-rose-900 dark:text-rose-200">
                    Select 1:
                  </span>
                  {medicalList.map((m) => {
                    const isSelected = activeMedical.id === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => updatePreference('medical', m.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${
                          isSelected
                            ? 'bg-rose-600 text-white shadow-xs ring-1 ring-rose-400'
                            : 'bg-white dark:bg-slate-800 text-rose-900 dark:text-rose-200 hover:bg-rose-50'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{m.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* SINGLE ACTIVE MEDICAL CONTACT WITH NUMBER BELOW */}
              <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-900 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-black text-sm sm:text-base text-gray-900 dark:text-white">
                      {activeMedical.name}
                    </h4>
                    <p className="text-[11px] text-gray-600 dark:text-gray-400">
                      {activeMedical.designation || 'Emergency Medical Responder'}
                    </p>

                    {/* PHONE NUMBER SHOWN PROMINENTLY BELOW */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-xs sm:text-sm font-mono font-black text-rose-900 dark:text-rose-200 bg-rose-100/80 dark:bg-rose-950 px-3 py-1 rounded-xl border border-rose-300 dark:border-rose-800 flex items-center gap-2">
                        <HiPhone className="w-4 h-4 text-rose-600" />
                        <span>{activeMedical.phone}</span>
                      </span>
                    </div>
                  </div>

                  <a
                    href={`tel:${activeMedical.phone}`}
                    onClick={() => handleDispatchContact('Medical Emergency', activeMedical)}
                    className="inline-flex items-center gap-1 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95"
                  >
                    <HiPhone className="w-3.5 h-3.5" />
                    <span>Call Now</span>
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => handleDispatchContact('Medical Emergency', activeMedical)}
                  disabled={isSending}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white rounded-xl text-xs sm:text-sm font-extrabold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <HiPhone className="w-4 h-4" />
                  <span>ALERT & CALL {activeMedical.name.toUpperCase()} ({activeMedical.phone})</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. POLICE EMERGENCY (ONLY 1 SELECTED CONTACT SHOWN) */}
          {/* ======================================================== */}
          {(activeCategoryTab === 'all' || activeCategoryTab === 'police') && activePolice && (
            <div className="rounded-2xl border-2 border-blue-300 dark:border-blue-900 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/40 dark:from-blue-950/40 dark:via-slate-900 dark:to-blue-950/20 p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-xs flex-shrink-0">
                    🚓
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-blue-950 dark:text-blue-100 flex items-center gap-1.5">
                      <span>Police & Intruder Emergency</span>
                      <span className="text-[10px] font-extrabold bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-full">
                        Law & Order
                      </span>
                    </h3>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300">
                      Alerts police station with GPS location and triggers direct call
                    </p>
                  </div>
                </div>
              </div>

              {/* SELECTION BAR IF MULTIPLE POLICE CONTACTS */}
              {policeList.length > 1 && (
                <div className="p-2 bg-blue-100/60 dark:bg-blue-950/50 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-blue-900 dark:text-blue-200">
                    Select 1:
                  </span>
                  {policeList.map((p) => {
                    const isSelected = activePolice.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => updatePreference('police', p.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-400'
                            : 'bg-white dark:bg-slate-800 text-blue-900 dark:text-blue-200 hover:bg-blue-50'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{p.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* SINGLE ACTIVE POLICE CONTACT WITH NUMBER BELOW */}
              <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-white dark:bg-slate-900 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-black text-sm sm:text-base text-gray-900 dark:text-white">
                      {activePolice.name}
                    </h4>
                    <p className="text-[11px] text-gray-600 dark:text-gray-400">
                      {activePolice.designation || 'Police Station Control Room'}
                    </p>

                    {/* PHONE NUMBER SHOWN PROMINENTLY BELOW */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-xs sm:text-sm font-mono font-black text-blue-900 dark:text-blue-200 bg-blue-100/80 dark:bg-blue-950 px-3 py-1 rounded-xl border border-blue-300 dark:border-blue-800 flex items-center gap-2">
                        <HiPhone className="w-4 h-4 text-blue-600" />
                        <span>{activePolice.phone}</span>
                      </span>
                    </div>
                  </div>

                  <a
                    href={`tel:${activePolice.phone}`}
                    onClick={() => handleDispatchContact('Theft / Intruder', activePolice)}
                    className="inline-flex items-center gap-1 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95"
                  >
                    <HiPhone className="w-3.5 h-3.5" />
                    <span>Call Now</span>
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => handleDispatchContact('Theft / Intruder', activePolice)}
                  disabled={isSending}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-xs sm:text-sm font-extrabold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <HiPhone className="w-4 h-4" />
                  <span>ALERT & CALL {activePolice.name.toUpperCase()} ({activePolice.phone})</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 4. COMMUNITY RESIDENT RESPONDER / SECURITY (ONLY 1 SHOWN) */}
          {/* ======================================================== */}
          {(activeCategoryTab === 'all' || activeCategoryTab === 'resident') && activeResident && (
            <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-900 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 dark:from-amber-950/40 dark:via-slate-900 dark:to-amber-950/20 p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-xl shadow-xs flex-shrink-0">
                    🏡
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                      <span>Community Resident Responder</span>
                      <span className="text-[10px] font-extrabold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full">
                        Gate Security & Neighbors
                      </span>
                    </h3>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">
                      Alerts layout security personnel and association committee
                    </p>
                  </div>
                </div>
              </div>

              {/* SELECTION BAR IF MULTIPLE RESIDENT RESPONDERS */}
              {residentList.length > 1 && (
                <div className="p-2 bg-amber-100/60 dark:bg-amber-950/50 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-amber-900 dark:text-amber-200">
                    Select 1:
                  </span>
                  {residentList.map((r) => {
                    const isSelected = activeResident.id === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => updatePreference('resident', r.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${
                          isSelected
                            ? 'bg-amber-600 text-white shadow-xs ring-1 ring-amber-400'
                            : 'bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-200 hover:bg-amber-50'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{r.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* SINGLE ACTIVE RESIDENT RESPONDER WITH NUMBER BELOW */}
              <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-900 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-black text-sm sm:text-base text-gray-900 dark:text-white">
                      {activeResident.name}
                    </h4>
                    <p className="text-[11px] text-gray-600 dark:text-gray-400">
                      {activeResident.designation || 'Association Security Responder'}
                    </p>

                    {/* PHONE NUMBER SHOWN PROMINENTLY BELOW */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-xs sm:text-sm font-mono font-black text-amber-900 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-950 px-3 py-1 rounded-xl border border-amber-300 dark:border-amber-800 flex items-center gap-2">
                        <HiPhone className="w-4 h-4 text-amber-600" />
                        <span>{activeResident.phone}</span>
                      </span>
                    </div>
                  </div>

                  <a
                    href={`tel:${activeResident.phone}`}
                    onClick={() => handleDispatchContact('Community Emergency', activeResident)}
                    className="inline-flex items-center gap-1 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95"
                  >
                    <HiPhone className="w-3.5 h-3.5" />
                    <span>Call Now</span>
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => handleDispatchContact('Community Emergency', activeResident)}
                  disabled={isSending}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white rounded-xl text-xs sm:text-sm font-extrabold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <HiPhone className="w-4 h-4" />
                  <span>ALERT & CALL {activeResident.name.toUpperCase()} ({activeResident.phone})</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 5. FIRE & RESCUE EMERGENCY (ONLY 1 SELECTED CONTACT SHOWN) */}
          {/* ======================================================== */}
          {(activeCategoryTab === 'all' || activeCategoryTab === 'fire') && activeFire && (
            <div className="rounded-2xl border-2 border-orange-300 dark:border-orange-900 bg-gradient-to-br from-orange-50/80 via-white to-orange-50/40 dark:from-orange-950/40 dark:via-slate-900 dark:to-orange-950/20 p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold text-xl shadow-xs flex-shrink-0">
                    🔥
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-orange-950 dark:text-orange-100 flex items-center gap-1.5">
                      <span>Fire & Rescue Emergency</span>
                      <span className="text-[10px] font-extrabold bg-orange-200 dark:bg-orange-900 text-orange-900 dark:text-orange-200 px-2 py-0.5 rounded-full">
                        Fire Station 101
                      </span>
                    </h3>
                    <p className="text-[11px] text-orange-700 dark:text-orange-300">
                      Immediate fire control dispatch with address details
                    </p>
                  </div>
                </div>
              </div>

              {/* SELECTION BAR IF MULTIPLE FIRE CONTACTS */}
              {fireList.length > 1 && (
                <div className="p-2 bg-orange-100/60 dark:bg-orange-950/50 rounded-xl border border-orange-200 dark:border-orange-800 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-orange-900 dark:text-orange-200">
                    Select 1:
                  </span>
                  {fireList.map((f) => {
                    const isSelected = activeFire.id === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => updatePreference('fire', f.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${
                          isSelected
                            ? 'bg-orange-600 text-white shadow-xs ring-1 ring-orange-400'
                            : 'bg-white dark:bg-slate-800 text-orange-900 dark:text-orange-200 hover:bg-orange-50'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{f.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* SINGLE ACTIVE FIRE CONTACT WITH NUMBER BELOW */}
              <div className="p-3.5 rounded-xl border border-orange-200 dark:border-orange-900/60 bg-white dark:bg-slate-900 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-black text-sm sm:text-base text-gray-900 dark:text-white">
                      {activeFire.name}
                    </h4>
                    <p className="text-[11px] text-gray-600 dark:text-gray-400">
                      {activeFire.designation || 'Fire & Rescue Department'}
                    </p>

                    {/* PHONE NUMBER SHOWN PROMINENTLY BELOW */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-xs sm:text-sm font-mono font-black text-orange-900 dark:text-orange-200 bg-orange-100/80 dark:bg-orange-950 px-3 py-1 rounded-xl border border-orange-300 dark:border-orange-800 flex items-center gap-2">
                        <HiPhone className="w-4 h-4 text-orange-600" />
                        <span>{activeFire.phone}</span>
                      </span>
                    </div>
                  </div>

                  <a
                    href={`tel:${activeFire.phone}`}
                    onClick={() => handleDispatchContact('Fire Incident', activeFire)}
                    className="inline-flex items-center gap-1 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95"
                  >
                    <HiPhone className="w-3.5 h-3.5" />
                    <span>Call Now</span>
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => handleDispatchContact('Fire Incident', activeFire)}
                  disabled={isSending}
                  className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white rounded-xl text-xs sm:text-sm font-extrabold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <HiPhone className="w-4 h-4" />
                  <span>ALERT & CALL {activeFire.name.toUpperCase()} ({activeFire.phone})</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 6. OTHER EMERGENCY (IF CONFIGURED) */}
          {/* ======================================================== */}
          {activeOther && (
            <div className="rounded-2xl border-2 border-purple-300 dark:border-purple-900 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xl shadow-xs flex-shrink-0">
                  ⚠️
                </div>
                <div>
                  <h3 className="text-sm font-black text-purple-950 dark:text-purple-100">
                    Other Emergency Service
                  </h3>
                  <p className="text-[11px] text-purple-700 dark:text-purple-300">
                    {activeOther.name} • {activeOther.designation}
                  </p>
                  <p className="font-mono text-xs font-black text-purple-900 dark:text-purple-200 mt-1">
                    📞 {activeOther.phone}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDispatchContact('Other Emergency', activeOther)}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition"
              >
                Call & Alert ({activeOther.phone})
              </button>
            </div>
          )}

          {/* Quick Speed-Dial Footer for Android & Mobile */}
          <div className="pt-3 border-t border-gray-200 dark:border-slate-800">
            <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-2">
              National Emergency Speed Dial (1-Tap Instant Call):
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <a
                href="tel:100"
                className="py-2.5 px-3 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <HiPhone className="w-3.5 h-3.5" />
                <span>100 (Police)</span>
              </a>
              <a
                href="tel:108"
                className="py-2.5 px-3 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <HiPhone className="w-3.5 h-3.5" />
                <span>108 (Ambulance)</span>
              </a>
              <a
                href="tel:101"
                className="py-2.5 px-3 bg-orange-50 dark:bg-orange-950/50 hover:bg-orange-100 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <HiPhone className="w-3.5 h-3.5" />
                <span>101 (Fire)</span>
              </a>
              <a
                href="tel:112"
                className="py-2.5 px-3 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <HiPhone className="w-3.5 h-3.5" />
                <span>112 (Helpline)</span>
              </a>
            </div>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* 3. DISPATCHED CONFIRMATION MODAL WITH ORIGINAL MAP & DIAL */}
      {/* ======================================================== */}
      {isTriggered && (
        <Modal
          isOpen={isTriggered}
          onClose={resetSOS}
          title="🚨 SOS Distress Signal Active"
          size="md"
        >
          <div className="text-center py-2 space-y-4 max-h-[82vh] overflow-y-auto px-1">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
              <div className="relative w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl font-bold shadow-md">
                ✓
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
                SOS Distress Dispatched!
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-sm mx-auto">
                Your emergency location and problem details were recorded and dispatched. Please stay in a safe place.
              </p>
            </div>

            {/* Alerted Contact Card */}
            {dispatchedContact && (
              <div className="p-3.5 rounded-2xl border-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-black text-emerald-800 dark:text-emerald-300 bg-emerald-200/80 dark:bg-emerald-900/80 px-2 py-0.5 rounded-full">
                    Alerted Responder
                  </span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <HiCheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Dispatched</span>
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h5 className="font-black text-sm text-gray-900 dark:text-white">
                      {dispatchedContact.name}
                    </h5>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {dispatchedContact.designation || 'Emergency Contact'}
                    </p>
                    {/* PHONE NUMBER CLEARLY DISPLAYED BELOW */}
                    <p className="font-mono text-xs font-black text-emerald-900 dark:text-emerald-200 mt-1">
                      📞 {dispatchedContact.phone}
                    </p>
                  </div>

                  <a
                    href={`tel:${dispatchedContact.phone}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
                  >
                    <HiPhone className="w-4 h-4" />
                    <span>Call Now</span>
                  </a>
                </div>
              </div>
            )}

            {/* Resident Home Address Box */}
            <div className="bg-gray-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-gray-200 dark:border-slate-700 text-left space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-gray-900 dark:text-white font-bold">
                <HiHome className="w-4 h-4 text-amber-600" />
                <span>Dispatched Residence Address:</span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 font-mono text-[11px] pl-5 leading-snug">
                {residentAddress}
              </p>
              {user?.door_no && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 pl-5">
                  Door Number: <strong>#{user.door_no}</strong> • Resident: <strong>{user?.name}</strong>
                </p>
              )}
            </div>

            {/* Interactive Original Google Map */}
            <div className="rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden bg-gray-50 dark:bg-slate-900/60 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
                  <HiMapPin className="w-4 h-4 text-red-600 animate-bounce" />
                  <span>Original GPS Map Location</span>
                </div>
                <a
                  href={originalMapExternalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <span>Open Maps</span>
                  <HiArrowTopRightOnSquare className="w-3.5 h-3.5" />
                </a>
              </div>

              <iframe
                title="Emergency GPS Map"
                src={originalMapEmbedUrl}
                className="w-full h-40 sm:h-44 rounded-xl border border-gray-200 dark:border-slate-800 shadow-inner bg-slate-100 dark:bg-slate-950"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            {/* Redial & Dismiss Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  const num = dispatchedContact?.phone || '112';
                  window.location.href = `tel:${num}`;
                }}
                className="py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95"
              >
                <HiPhone className="w-4 h-4" />
                <span>Redial ({dispatchedContact?.phone || '112'})</span>
              </button>

              <button
                type="button"
                onClick={resetSOS}
                className="py-3 px-4 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
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
