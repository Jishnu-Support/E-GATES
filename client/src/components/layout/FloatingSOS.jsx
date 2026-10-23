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
  const [familyContact, setFamilyContact] = useState(null);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherDetails, setOtherDetails] = useState('');

  // Fetch configured SOS contacts on mount or when alert triggers
  useEffect(() => {
    if (user?.role === 'member') {
      api.get('/sos/contacts')
        .then((res) => {
          const list = res.data?.data || res.data?.defaultContacts || [];
          if (Array.isArray(list)) setEmergencyContacts(list);
          if (res.data?.familyContact) setFamilyContact(res.data.familyContact);
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
  const handleTriggerWithAction = async (emergencyType, customText = '') => {
    if (isSending) return;

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
    const otherContact = emergencyContacts.find(
      (c) => c.contact_type === 'other' || c.contact_type === 'fire'
    );
    const fam = familyContact || emergencyContacts.find((c) => c.contact_type === 'family');

    // 2. Select specific call & WhatsApp phone numbers based on Emergency Type
    let targetCallPhone = '112'; // Default National Emergency Helpline
    let targetWaPhone = '';

    if (emergencyType === 'Medical Emergency') {
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
    const fullSituation = customText ? `${emergencyType} (${customText})` : emergencyType;
    const waText =
      `🚨 *EMERGENCY SOS DISTRESS ALERT!*\n` +
      `⚠️ *Situation:* ${fullSituation}\n` +
      `👤 *Resident:* ${user?.name || 'Resident'} (${user?.phone || 'N/A'})\n` +
      `🏠 *Home Address:* ${residentAddress}\n` +
      `📍 *Live GPS Location:* ${mapsLink}\n` +
      `🏛️ *Association:* ${user?.association_name || 'Layout Association'}\n` +
      `⏰ *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n` +
      `*PLEASE RESPOND AND DISPATCH IMMEDIATE EMERGENCY ASSISTANCE!*`;

    // 5. Open WhatsApp with pre-filled distress message
    const cleanWaNumber = formatWaPhone(targetWaPhone);
    const waUrl = cleanWaNumber
      ? `https://api.whatsapp.com/send?phone=${cleanWaNumber}&text=${encodeURIComponent(waText)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;

    try {
      window.open(waUrl, '_blank');
    } catch (wErr) {
      console.warn('WhatsApp launch notice:', wErr);
    }

    // 6. Immediately trigger phone call without delay
    if (targetCallPhone) {
      const cleanCallNumber = String(targetCallPhone).replace(/[^\d+]/g, '');
      setTimeout(() => {
        window.location.href = `tel:${cleanCallNumber}`;
      }, 100);
    }

    // 7. Dispatch to Backend for realtime socket broadcast, SMS, and database logging
    try {
      await triggerSOS(emergencyType, customText);
    } catch (err) {
      console.error('Backend SOS trigger warning:', err);
    }
  };

  const problemName = lastAlert?.problem || lastAlert?.emergency_type || 'Emergency Distress';
  const displayedContacts = (lastAlert?.contacts && lastAlert.contacts.length > 0)
    ? lastAlert.contacts
    : emergencyContacts;

  const constructDistressText = () => {
    const maps = lastAlert?.location_link || 'Location Coordinates Pending';
    return (
      `🚨 *EMERGENCY SOS DISTRESS ALERT!*\n` +
      `⚠️ *Problem:* ${problemName}\n` +
      `👤 *Resident:* ${user?.name || 'Resident'} (${user?.phone || 'N/A'})\n` +
      `🏠 *Home Address:* ${residentAddress}\n` +
      `📍 *Live GPS Location:* ${maps}\n` +
      `🏛️ *Association:* ${user?.association_name || 'Layout Association'}\n` +
      `⏰ *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n` +
      `*PLEASE RESPOND AND DISPATCH IMMEDIATE EMERGENCY ASSISTANCE!*`
    );
  };

  return (
    <>
      {/* Floating SOS Action Button (Opens Emergency Type Selection immediately) */}
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
            aria-label="Emergency SOS (Click to select emergency)"
            title="Click for Emergency SOS"
          >
            <span className="text-sm sm:text-base md:text-xl tracking-wider leading-none">SOS</span>
            <span className="text-[7px] sm:text-[8px] md:text-[9px] font-bold tracking-normal mt-0.5 bg-white/20 px-1.5 py-0.2 rounded-full">
              {isSending ? '...' : 'CLICK'}
            </span>
          </button>
        </div>

        {/* Small hint label */}
        <span className="mt-1 sm:mt-2 text-[10px] sm:text-[11px] font-bold text-gray-700 bg-white/95 backdrop-blur px-2 py-0.5 rounded-full shadow-sm border border-gray-200 hidden md:block pointer-events-none">
          {t('sos_button_title') || 'Emergency SOS (Click)'}
        </span>
      </div>

      {/* Emergency Type Selector Modal (Reacts Immediately on Click with Call & WhatsApp) */}
      <Modal
        isOpen={showTypeSelector}
        onClose={() => {
          setShowTypeSelector(false);
          setShowOtherInput(false);
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
              className="w-full flex items-center justify-between p-3.5 rounded-2xl border-2 border-rose-200 bg-gradient-to-r from-rose-50 to-white hover:from-rose-100 hover:to-rose-50 hover:border-rose-400 transition transform active:scale-[0.98] cursor-pointer shadow-xs text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-xl shadow-sm flex-shrink-0">
                  🏥
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-extrabold text-rose-950 truncate">
                    Medical Emergency
                  </h4>
                  <p className="text-[11px] text-rose-700 font-medium truncate">
                    Ambulance (108), Hospital, Emergency Doctor
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 text-[11px] font-bold text-rose-700 bg-rose-100/80 px-2.5 py-1 rounded-xl">
                <span>Call & WhatsApp</span>
                <span className="text-xs">⚡</span>
              </div>
            </button>

            {/* 2. Police Emergency */}
            <button
              type="button"
              onClick={() => handleTriggerWithAction('Police Emergency')}
              disabled={isSending}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white hover:from-blue-100 hover:to-blue-50 hover:border-blue-400 transition transform active:scale-[0.98] cursor-pointer shadow-xs text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-sm flex-shrink-0">
                  🚓
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-extrabold text-blue-950 truncate">
                    Police Emergency
                  </h4>
                  <p className="text-[11px] text-blue-700 font-medium truncate">
                    Police Station (100), Intruder, Layout Security
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2.5 py-1 rounded-xl">
                <span>Call & WhatsApp</span>
                <span className="text-xs">⚡</span>
              </div>
            </button>

            {/* 3. Family Emergency */}
            <button
              type="button"
              onClick={() => handleTriggerWithAction('Family Emergency')}
              disabled={isSending}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-white hover:from-purple-100 hover:to-purple-50 hover:border-purple-400 transition transform active:scale-[0.98] cursor-pointer shadow-xs text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xl shadow-sm flex-shrink-0">
                  👨‍👩‍👧‍👦
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-extrabold text-purple-950 truncate">
                    Family Emergency
                  </h4>
                  <p className="text-[11px] text-purple-700 font-medium truncate">
                    Immediate Family Contact, Relatives & Guardian
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 text-[11px] font-bold text-purple-700 bg-purple-100/80 px-2.5 py-1 rounded-xl">
                <span>Call & WhatsApp</span>
                <span className="text-xs">⚡</span>
              </div>
            </button>

            {/* 4. Resident Emergency */}
            <button
              type="button"
              onClick={() => handleTriggerWithAction('Resident Emergency')}
              disabled={isSending}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-white hover:from-amber-100 hover:to-amber-50 hover:border-amber-400 transition transform active:scale-[0.98] cursor-pointer shadow-xs text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-xl shadow-sm flex-shrink-0">
                  🏘️
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-extrabold text-amber-950 truncate">
                    Resident Emergency
                  </h4>
                  <p className="text-[11px] text-amber-700 font-medium truncate">
                    Association Admin, President, Secretary & Neighbors
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 text-[11px] font-bold text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-xl">
                <span>Call & WhatsApp</span>
                <span className="text-xs">⚡</span>
              </div>
            </button>

            {/* 5. Other Emergency (with option to add details if desired) */}
            <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-slate-700 text-white flex items-center justify-center font-bold text-xl shadow-sm flex-shrink-0">
                    ⚠️
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">
                      Other Emergency
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Fire, Gas leak, Snake, Lift stuck, or Custom issue
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowOtherInput(!showOtherInput)}
                  className="text-xs font-bold text-primary-600 hover:text-primary-800 underline cursor-pointer"
                >
                  {showOtherInput ? 'Hide Box' : '+ Add Details'}
                </button>
              </div>

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
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-lg shadow-sm">
                ✓
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-900">
                  Distress Alert Dispatched Automatically!
                </h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Your emergency situation, resident profile, and full address have been transmitted to all association responders and emergency contacts.
                </p>
              </div>
            </div>

            {/* Problem & Resident Address Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Problem Details */}
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl space-y-1.5">
                <span className="font-bold text-red-800 uppercase tracking-wider block text-[10px]">
                  Emergency Problem
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-red-700">
                    {problemName}
                  </span>
                </div>
                <div className="text-[11px] text-gray-600 flex items-center gap-1 pt-1">
                  <HiClock className="w-3.5 h-3.5 text-gray-400" />
                  <span>Time: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Address Details */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl space-y-1.5">
                <span className="font-bold text-blue-800 uppercase tracking-wider block text-[10px]">
                  Dispatched Resident Address
                </span>
                <p className="font-semibold text-gray-900 leading-relaxed">
                  {residentAddress}
                </p>
                {lastAlert?.location_link && (
                  <a
                    href={lastAlert.location_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:underline pt-1"
                  >
                    <HiMapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>View Live GPS Location</span>
                    <HiArrowTopRightOnSquare className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Quick 1-Tap Call & WhatsApp Actions for Each Contact */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                Immediate Responder Contacts:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {displayedContacts.map((contact, idx) => {
                  const cleanPhone = String(contact.phone || '').replace(/\D/g, '');
                  const waNumber = formatWaPhone(contact.phone);
                  const singleWaUrl = waNumber
                    ? `https://api.whatsapp.com/send?phone=${waNumber}&text=${encodeURIComponent(constructDistressText())}`
                    : `https://api.whatsapp.com/send?text=${encodeURIComponent(constructDistressText())}`;

                  return (
                    <div
                      key={contact.id || idx}
                      className="p-3 rounded-xl border border-gray-200 bg-white shadow-xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {contact.name || 'Emergency Responder'}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate">
                          {contact.designation || (contact.contact_type === 'family' ? 'Family Contact' : 'Community Responder')} • {contact.phone}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {contact.phone && (
                          <a
                            href={`tel:${cleanPhone}`}
                            className="inline-flex items-center justify-center p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition shadow-xs"
                            title={`Call ${contact.name}`}
                          >
                            <HiPhone className="w-4 h-4" />
                          </a>
                        )}

                        <a
                          href={singleWaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition shadow-xs"
                          title={`WhatsApp ${contact.name}`}
                        >
                          <HiChatBubbleOvalLeftEllipsis className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Close / Acknowledge Button */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(constructDistressText())}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
              >
                <HiChatBubbleOvalLeftEllipsis className="w-4 h-4" />
                <span>Share SOS on WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={resetSOS}
                className="px-5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close Alert
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
