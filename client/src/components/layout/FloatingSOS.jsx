import React, { useState, useEffect, useMemo } from 'react';
import {
  HiPhone,
  HiChatBubbleOvalLeftEllipsis,
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
  const [showAddFamilyInline, setShowAddFamilyInline] = useState(false);
  const [newFamilyForm, setNewFamilyForm] = useState({ name: '', phone: '', designation: 'Family Contact' });
  const [savingFamily, setSavingFamily] = useState(false);

  // Popup modal for "Emergency Alert Sent Successfully!"
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  // Preference selection state: resident chooses ONLY ONE active contact per emergency category
  const [preferredContacts, setPreferredContacts] = useState(() => {
    try {
      const saved = localStorage.getItem('preferred_sos_contacts');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

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

  useEffect(() => {
    if (showTypeSelector) {
      try {
        const saved = localStorage.getItem('preferred_sos_contacts');
        if (saved) setPreferredContacts(JSON.parse(saved));
      } catch (e) {}
    }
  }, [showTypeSelector]);

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
        .catch((err) => console.warn('Could not load SOS contacts:', err));
    }
  };

  useEffect(() => {
    fetchSOSContacts();
  }, [user?.role, isTriggered]);

  if (user?.role !== 'member') {
    return null;
  }

  // 1. Group configured contacts into categories
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
      return [{ id: 'def-med-1', name: '108 Ambulance Service', phone: '108', designation: 'Emergency Medical Responder' }];
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
      return [{ id: 'def-pol-1', name: '100 Police Control Room', phone: '100', designation: 'Police Control' }];
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
        name: user?.association_name ? `${user.association_name} Security` : 'Security Gate Responder',
        phone: user?.association_phone || '112',
        designation: 'Security Gate / Association Admin',
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
      return [{ id: 'def-fire-1', name: '101 Fire & Rescue Service', phone: '101', designation: 'Fire Department' }];
    }
    return list;
  }, [emergencyContacts]);

  // Resolve active contacts
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

  const formatWaPhone = (rawPhone) => {
    if (!rawPhone) return '';
    const digits = String(rawPhone).replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length > 10) return digits;
    return '';
  };

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

  // Immediate 1-Tap Calling or WhatsApp + Open Success Confirmation Popup
  const handleAction = async (actionType, targetContact, emergencyType = 'Emergency Alert') => {
    if (navigator.vibrate) navigator.vibrate([150, 80, 150]);

    const targetPhone = targetContact?.phone || '112';
    const targetName = targetContact?.name || 'Emergency Contact';

    // 1. Get Live GPS Coordinates
    let coords = { latitude: null, longitude: null };
    try {
      coords = await getCoordinates();
    } catch (e) {
      console.warn('Coordinates fallback:', e);
    }
    setDispatchedContact({ ...targetContact, emergencyType, actionType });

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

    // 4. Perform Action: Native Phone Call OR WhatsApp
    if (actionType === 'call') {
      const cleanCallPhone = targetPhone.replace(/\D/g, '');
      const callUrl = `tel:${cleanCallPhone || targetPhone}`;
      window.location.href = callUrl;
    } else if (actionType === 'whatsapp') {
      const formattedWa = formatWaPhone(targetPhone);
      if (formattedWa) {
        window.open(`https://wa.me/${formattedWa}?text=${waEncoded}`, '_blank', 'noopener,noreferrer');
      } else {
        window.open(`https://wa.me/?text=${waEncoded}`, '_blank', 'noopener,noreferrer');
      }
    }

    // 5. Record SOS Alert on Backend without activating siren blinking
    api.post('/sos/trigger', {
      emergency_type: emergencyType,
      notes: `${actionType.toUpperCase()} dispatched to ${targetName} (${targetPhone})`,
      latitude: coords.latitude,
      longitude: coords.longitude,
    }).catch((err) => {
      console.warn('Backend SOS log error:', err);
    });

    // 6. Close the contacts chooser modal & open the "Emergency Alert Sent Successfully!" popup!
    setShowTypeSelector(false);
    setSuccessModalOpen(true);
  };

  return (
    <>
      {/* ======================================================== */}
      {/* 1. RESPONSIVE FLOATING SOS TRIGGER BUTTON (ANDROID-FRIENDLY) */}
      {/* ======================================================== */}
      <div className="fixed bottom-6 right-4 sm:bottom-7 sm:right-5 z-40 flex flex-col items-center">
        <div className="relative group">
          <div className="absolute -inset-1 bg-red-600 rounded-full blur-sm opacity-60 group-hover:opacity-100 animate-pulse transition duration-500 pointer-events-none" />

          <button
            type="button"
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
              if (isTriggered) resetSOS();
              setShowTypeSelector(true);
            }}
            disabled={isSending}
            className="relative w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-full flex flex-col items-center justify-center font-black text-white shadow-2xl select-none focus:outline-none cursor-pointer transform hover:scale-105 active:scale-95 transition-all duration-200 touch-manipulation bg-red-600 hover:bg-red-700 ring-2 sm:ring-4 ring-white/60 dark:ring-red-400/50"
            aria-label="Emergency SOS"
            title="Click for Emergency Contacts"
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
      {/* 2. SIMPLIFIED EMERGENCY CONTACTS MODAL (SINGLE PAGE, NO SCROLL) */}
      {/* ======================================================== */}
      <Modal
        isOpen={showTypeSelector}
        onClose={() => setShowTypeSelector(false)}
        title="🚨 Emergency Contacts"
        size="md"
      >
        <div className="space-y-2.5 py-1 overflow-hidden select-none">
          {/* Quick Add Family Form (if toggled) */}
          {showAddFamilyInline && (
            <form
              onSubmit={handleSaveInlineFamily}
              className="p-2.5 bg-purple-50 dark:bg-slate-800 rounded-xl border border-purple-300 dark:border-purple-700 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-purple-950 dark:text-purple-200">
                  + Add Personal Family Number:
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddFamilyInline(false)}
                  className="text-purple-600 hover:text-purple-800 text-[11px] font-bold cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Name (e.g. Priya)"
                  value={newFamilyForm.name}
                  onChange={(e) => setNewFamilyForm({ ...newFamilyForm, name: e.target.value })}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-xs"
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone Number *"
                  value={newFamilyForm.phone}
                  onChange={(e) => setNewFamilyForm({ ...newFamilyForm, phone: e.target.value })}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-xs font-mono"
                  required
                />
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Relation (Spouse)"
                    value={newFamilyForm.designation}
                    onChange={(e) => setNewFamilyForm({ ...newFamilyForm, designation: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-xs"
                  />
                  <button
                    type="submit"
                    disabled={savingFamily}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    {savingFamily ? '...' : 'Save'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* 1. FAMILY EMERGENCY CONTACT */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl border-2 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center text-lg flex-shrink-0 shadow-xs">
                👨‍👩‍👧
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-gray-900 dark:text-white truncate">
                    {activeFamily ? activeFamily.name : 'Family Emergency'}
                  </span>
                  {activeFamily?.designation && (
                    <span className="text-[10px] font-bold text-purple-800 dark:text-purple-200 bg-purple-100 dark:bg-purple-900/60 px-1.5 py-0.2 rounded">
                      {activeFamily.designation}
                    </span>
                  )}
                  {familyList.length > 1 && (
                    <div className="inline-flex items-center gap-1 ml-1 flex-wrap">
                      {familyList.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => updatePreference('family', f.id)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold transition cursor-pointer ${
                            activeFamily?.id === f.id
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-purple-900 dark:text-purple-200 border border-purple-300'
                          }`}
                        >
                          {activeFamily?.id === f.id ? '✓ ' : ''}{f.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* PHONE NUMBER CLEARLY DISPLAYED BELOW NAME */}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs font-mono font-black text-purple-900 dark:text-purple-200 flex items-center gap-1">
                    <HiPhone className="w-3.5 h-3.5 text-purple-600" />
                    <span>{activeFamily ? activeFamily.phone : 'Helpline: 112'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddFamilyInline(!showAddFamilyInline)}
                    className="text-[10px] font-bold text-purple-700 dark:text-purple-300 hover:underline cursor-pointer"
                  >
                    {activeFamily ? '+ Change' : '+ Add Number'}
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons: Call & WhatsApp */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => handleAction('call', activeFamily || { name: 'Family Helpline', phone: '112' }, 'Family Emergency')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                title="Direct Phone Call"
              >
                <HiPhone className="w-3.5 h-3.5" />
                <span>Call</span>
              </button>
              <button
                type="button"
                onClick={() => handleAction('whatsapp', activeFamily || { name: 'Family Contact', phone: '112' }, 'Family Emergency')}
                className="px-2.5 py-1.5 bg-green-500 hover:bg-green-600 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                title="Send WhatsApp SOS Alert with GPS Location"
              >
                <HiChatBubbleOvalLeftEllipsis className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {/* 2. MEDICAL / AMBULANCE CONTACT */}
          {activeMedical && (
            <div className="flex items-center justify-between p-2.5 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center text-lg flex-shrink-0 shadow-xs">
                  🏥
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-gray-900 dark:text-white truncate">
                      {activeMedical.name}
                    </span>
                    <span className="text-[10px] font-bold text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-900/60 px-1.5 py-0.2 rounded truncate max-w-[140px]">
                      {activeMedical.designation || 'Medical'}
                    </span>
                  </div>

                  {/* PHONE NUMBER CLEARLY DISPLAYED BELOW NAME */}
                  <div className="flex items-center gap-1 mt-0.5 text-xs font-mono font-black text-rose-900 dark:text-rose-200">
                    <HiPhone className="w-3.5 h-3.5 text-rose-600" />
                    <span>{activeMedical.phone}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Call & WhatsApp */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleAction('call', activeMedical, 'Medical Emergency')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                  title="Direct Call Ambulance / Doctor"
                >
                  <HiPhone className="w-3.5 h-3.5" />
                  <span>Call</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('whatsapp', activeMedical, 'Medical Emergency')}
                  className="px-2.5 py-1.5 bg-green-500 hover:bg-green-600 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                  title="Send WhatsApp Alert"
                >
                  <HiChatBubbleOvalLeftEllipsis className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. POLICE EMERGENCY CONTACT */}
          {activePolice && (
            <div className="flex items-center justify-between p-2.5 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg flex-shrink-0 shadow-xs">
                  🚓
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-gray-900 dark:text-white truncate">
                      {activePolice.name}
                    </span>
                    <span className="text-[10px] font-bold text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.2 rounded">
                      {activePolice.designation || 'Police'}
                    </span>
                  </div>

                  {/* PHONE NUMBER CLEARLY DISPLAYED BELOW NAME */}
                  <div className="flex items-center gap-1 mt-0.5 text-xs font-mono font-black text-blue-900 dark:text-blue-200">
                    <HiPhone className="w-3.5 h-3.5 text-blue-600" />
                    <span>{activePolice.phone}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Call & WhatsApp */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleAction('call', activePolice, 'Police Distress')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                  title="Direct Call Police"
                >
                  <HiPhone className="w-3.5 h-3.5" />
                  <span>Call</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('whatsapp', activePolice, 'Police Distress')}
                  className="px-2.5 py-1.5 bg-green-500 hover:bg-green-600 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                  title="Send WhatsApp Alert"
                >
                  <HiChatBubbleOvalLeftEllipsis className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. SECURITY GATE / RESPONDER */}
          {activeResident && (
            <div className="flex items-center justify-between p-2.5 rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/30">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center text-lg flex-shrink-0 shadow-xs">
                  🏡
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-gray-900 dark:text-white truncate">
                      {activeResident.name}
                    </span>
                    <span className="text-[10px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.2 rounded">
                      {activeResident.designation || 'Gate Security'}
                    </span>
                  </div>

                  {/* PHONE NUMBER CLEARLY DISPLAYED BELOW NAME */}
                  <div className="flex items-center gap-1 mt-0.5 text-xs font-mono font-black text-amber-900 dark:text-amber-200">
                    <HiPhone className="w-3.5 h-3.5 text-amber-600" />
                    <span>{activeResident.phone}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Call & WhatsApp */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleAction('call', activeResident, 'Security Alert')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                  title="Direct Call Security Gate"
                >
                  <HiPhone className="w-3.5 h-3.5" />
                  <span>Call</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('whatsapp', activeResident, 'Security Alert')}
                  className="px-2.5 py-1.5 bg-green-500 hover:bg-green-600 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                  title="Send WhatsApp Alert"
                >
                  <HiChatBubbleOvalLeftEllipsis className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
          )}

          {/* 5. FIRE & RESCUE */}
          {activeFire && (
            <div className="flex items-center justify-between p-2.5 rounded-2xl border border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/30">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center text-lg flex-shrink-0 shadow-xs">
                  🔥
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-gray-900 dark:text-white truncate">
                      {activeFire.name}
                    </span>
                    <span className="text-[10px] font-bold text-orange-800 dark:text-orange-200 bg-orange-100 dark:bg-orange-900/60 px-1.5 py-0.2 rounded">
                      {activeFire.designation || 'Fire'}
                    </span>
                  </div>

                  {/* PHONE NUMBER CLEARLY DISPLAYED BELOW NAME */}
                  <div className="flex items-center gap-1 mt-0.5 text-xs font-mono font-black text-orange-900 dark:text-orange-200">
                    <HiPhone className="w-3.5 h-3.5 text-orange-600" />
                    <span>{activeFire.phone}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Call & WhatsApp */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleAction('call', activeFire, 'Fire Emergency')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                  title="Direct Call Fire Station"
                >
                  <HiPhone className="w-3.5 h-3.5" />
                  <span>Call</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('whatsapp', activeFire, 'Fire Emergency')}
                  className="px-2.5 py-1.5 bg-green-500 hover:bg-green-600 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                  title="Send WhatsApp Alert"
                >
                  <HiChatBubbleOvalLeftEllipsis className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* 3. EMERGENCY ALERT SENT SUCCESSFULLY POPUP MODAL           */}
      {/* ======================================================== */}
      {successModalOpen && (
        <Modal
          isOpen={successModalOpen}
          onClose={() => {
            setSuccessModalOpen(false);
            resetSOS();
          }}
          title="🚨 Emergency Status"
          size="sm"
        >
          <div className="text-center py-4 px-2 space-y-4">
            {/* Animated Checkmark Circle */}
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
              <div className="relative w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center text-3xl font-black shadow-lg">
                ✓
              </div>
            </div>

            <div>
              <h4 className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                Emergency Alert Sent Successfully!
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                Your emergency notification and live GPS location have been dispatched.
              </p>
            </div>

            {/* Dispatched Info Box */}
            {dispatchedContact && (
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-left space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
                    Contact Alerted:
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    ● Dispatched ({dispatchedContact.actionType === 'whatsapp' ? 'WhatsApp' : 'Call'})
                  </span>
                </div>
                <p className="font-extrabold text-gray-900 dark:text-white text-sm">
                  {dispatchedContact.name}
                </p>
                <p className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  📞 {dispatchedContact.phone}
                </p>
              </div>
            )}

            {/* Action Buttons in Success Popup */}
            <div className="flex items-center gap-2 pt-1">
              {dispatchedContact?.actionType === 'whatsapp' ? (
                <button
                  type="button"
                  onClick={() => {
                    const formattedWa = formatWaPhone(dispatchedContact?.phone);
                    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(residentAddress)}`;
                    const msg = encodeURIComponent(`🚨 *EMERGENCY SOS DISTRESS ALERT!*\\nImmediate help requested!\\nLocation: ${residentAddress}\\nLive GPS: ${mapsLink}`);
                    window.open(`https://wa.me/${formattedWa || ''}?text=${msg}`, '_blank', 'noopener,noreferrer');
                  }}
                  className="flex-1 py-2.5 px-3 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <HiChatBubbleOvalLeftEllipsis className="w-4 h-4" />
                  <span>WhatsApp Again</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const num = dispatchedContact?.phone || '112';
                    window.location.href = `tel:${num}`;
                  }}
                  className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <HiPhone className="w-4 h-4" />
                  <span>Call Again</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setSuccessModalOpen(false);
                  resetSOS();
                }}
                className="flex-1 py-2.5 px-3 bg-gray-900 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
              >
                <span>OK / Done</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
