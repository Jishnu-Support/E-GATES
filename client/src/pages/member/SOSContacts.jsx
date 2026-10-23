import React, { useState, useEffect, useCallback } from 'react';
import {
  HiShieldExclamation,
  HiPhone,
  HiUser,
  HiHeart,
  HiPencilSquare,
  HiCheckCircle,
  HiArrowPath,
  HiExclamationTriangle,
  HiTrash,
  HiPlus,
  HiBuildingOffice2,
  HiMapPin,
  HiShieldCheck,
  HiFire,
  HiUserGroup,
  HiChatBubbleOvalLeftEllipsis,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useSOS } from '../../hooks/useSOS';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function MemberSOSContacts() {
  const { user } = useAuth();
  const { triggerSOS, isSending, cancelSOS, showCancel, cancelCountdown, resetSOS, isTriggered, lastAlert, getCoordinates } = useSOS();

  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [medicalContact, setMedicalContact] = useState(null);
  const [policeContact, setPoliceContact] = useState(null);
  const [memberResponders, setMemberResponders] = useState([]);
  const [otherContactsList, setOtherContactsList] = useState([]);
  const [familyContacts, setFamilyContacts] = useState([]);

  // Edit Family Contacts Modal State (Up to 2 contacts)
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [submittingFamily, setSubmittingFamily] = useState(false);
  const [familyForms, setFamilyForms] = useState([
    { name: '', phone: '', designation: 'Spouse' },
    { name: '', phone: '', designation: 'Father' },
  ]);

  const relationPresets = [
    'Spouse',
    'Father',
    'Mother',
    'Son',
    'Daughter',
    'Brother',
    'Sister',
    'Guardian',
    'Relative / Neighbor',
  ];

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/sos/contacts');
      const rawAll = res.data?.data || [];
      const defaults = res.data?.defaultContacts || [];

      setContacts(rawAll);

      // Parse up to 2 family contacts
      const fams = res.data?.familyContacts || (res.data?.familyContact ? [res.data.familyContact] : []);
      setFamilyContacts(fams);

      if (fams.length > 0) {
        setFamilyForms([
          {
            id: fams[0]?.id || null,
            name: fams[0]?.name || '',
            phone: fams[0]?.phone || '',
            designation: fams[0]?.designation || 'Spouse',
          },
          {
            id: fams[1]?.id || null,
            name: fams[1]?.name || '',
            phone: fams[1]?.phone || '',
            designation: fams[1]?.designation || 'Father',
          },
        ]);
      } else {
        setFamilyForms([
          { name: '', phone: '', designation: 'Spouse' },
          { name: '', phone: '', designation: 'Father' },
        ]);
      }

      // Parse medical contact
      const med = res.data?.medicalContact || defaults.find(
        (c) => c.contact_type === 'medical' || c.contact_type === 'ambulance' || c.designation?.toLowerCase().includes('medical') || c.designation?.toLowerCase().includes('ambulance')
      ) || null;
      setMedicalContact(med);

      // Parse police contact
      const pol = res.data?.policeContact || defaults.find((c) => c.contact_type === 'police') || null;
      setPoliceContact(pol);

      // Parse resident member responders
      const members = res.data?.memberContacts || defaults.filter(
        (c) => c.contact_type === 'member' || c.contact_type === 'resident'
      );
      setMemberResponders(members);

      // Parse other emergency services (Fire, Security Gate, EB Breakdown, etc.)
      const oths = res.data?.otherContacts || defaults.filter((c) => c.contact_type === 'other' || c.contact_type === 'fire');
      setOtherContactsList(oths);
    } catch (err) {
      console.error('Failed to load SOS contacts:', err);
      toast.error('Failed to load emergency contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleOpenAddEditFamily = () => {
    setIsFamilyModalOpen(true);
  };

  const handleSaveFamily = async (e) => {
    e.preventDefault();

    const validList = familyForms
      .filter((c) => c.name && c.phone && c.name.trim() && c.phone.trim())
      .map((c) => ({
        name: c.name.trim(),
        phone: c.phone.trim(),
        designation: (c.designation || 'Family / Relative').trim(),
      }));

    if (validList.length === 0) {
      toast.error('Please enter at least one family contact (Name and Phone)');
      return;
    }

    try {
      setSubmittingFamily(true);
      const res = await api.post('/sos/family-contact', { contacts: validList });
      toast.success(res.data?.message || 'Family emergency contacts saved successfully!');
      setIsFamilyModalOpen(false);
      fetchContacts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save family emergency contacts');
    } finally {
      setSubmittingFamily(false);
    }
  };

  const handleDeleteSingleFamily = async (contactId) => {
    if (!window.confirm('Are you sure you want to remove this family emergency contact?')) return;
    try {
      await api.delete(`/sos/family-contact/${contactId}`);
      toast.success('Family emergency contact removed');
      fetchContacts();
    } catch (err) {
      toast.error('Failed to remove family contact');
    }
  };

  // Compile resident address
  const compileAddress = () => {
    const parts = [];
    if (user?.door_no) parts.push(`Door/Flat #${user.door_no}`);
    if (user?.street) parts.push(`Street: ${user.street}`);
    if (user?.layout_name) parts.push(`Layout: ${user.layout_name}`);
    if (user?.taluk) parts.push(`Taluk: ${user.taluk}`);
    if (user?.district) parts.push(`District: ${user.district}`);
    return parts.length > 0 ? parts.join(', ') : 'Registered Association Residence';
  };

  const formatWaPhone = (phoneStr) => {
    if (!phoneStr) return '';
    const digits = String(phoneStr).replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    return digits;
  };

  const openWhatsAppWithLocation = async (phone, recipientRole = 'Emergency Responder') => {
    if (!phone) {
      toast.error('No phone number available for WhatsApp');
      return;
    }
    const cleanPhone = formatWaPhone(phone);
    let coords = { latitude: null, longitude: null };
    try {
      coords = await getCoordinates();
    } catch (e) {
      console.warn('Fast GPS coords lookup fallback:', e);
    }

    const mapsLink = (coords.latitude && coords.longitude)
      ? `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`
      : 'Location Coordinates Pending';

    const msg = [
      `🚨 *EMERGENCY SOS ALERT!*`,
      `*RESIDENT:* ${user?.name || 'Resident'} (${user?.phone || 'N/A'}${user?.member_code ? `, Code: ${user.member_code}` : ''})`,
      `*ADDRESS:* ${compileAddress()}`,
      `*LIVE LOCATION:* ${mapsLink}`,
      `*ATTENTION:* Urgent assistance required!`,
    ].join('\n');

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-700 via-rose-700 to-amber-700 p-6 sm:p-8 text-white shadow-xl shadow-red-950/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-rose-200 text-xs font-semibold">
              <HiShieldExclamation className="w-4 h-4 text-rose-400" />
              <span>SOS Emergency Preparedness & Contacts</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Emergency SOS Contacts
            </h1>
            <p className="text-rose-100 text-xs sm:text-sm leading-relaxed">
              Contacts configured to respond to your emergencies: <strong>Medical (108)</strong>, <strong>Police (100)</strong>, <strong>2 Family Contacts</strong>, <strong>Resident Responders</strong>, and <strong>Fire & Helplines</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleOpenAddEditFamily}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-rose-950/40 transition"
            >
              <HiPencilSquare className="w-4 h-4" />
              <span>{familyContacts.length > 0 ? 'Manage 2 Family Contacts' : '+ Add Family Contacts'}</span>
            </button>
            <button
              type="button"
              onClick={fetchContacts}
              title="Refresh Contacts"
              className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 rounded-2xl transition text-white"
            >
              <HiArrowPath className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Notice Explaining Rules */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
            <HiShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Synchronized SOS Emergency Categories</p>
            <p className="text-gray-500 mt-0.5 leading-relaxed">
              • <strong>Family Emergency (2 Contacts):</strong> You can configure 2 personal family members and choose either one when triggering SOS.<br />
              • <strong>Medical & Police:</strong> Hospital (108) and Police Station (100) configured by Administration.<br />
              • <strong>Resident Responders:</strong> Community guardians (President, Secretary) alerted on Resident Emergency.<br />
              • <strong>Other Services:</strong> Public safety helplines including Fire & Rescue (101) and Security Gate.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-3 bg-white rounded-3xl border border-gray-100">
          <LoadingSpinner message="Loading emergency responders..." />
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION A: Primary Emergency Contacts Grid (Medical, Police) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Medical Emergency */}
            <div className="bg-white rounded-2xl p-5 border-2 border-rose-100 shadow-sm flex flex-col justify-between hover:border-rose-300 transition">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 flex items-center gap-1">
                    🏥 Medical Emergency
                  </span>
                  <span className="w-7 h-7 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">
                    🩺
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center text-base font-bold">
                      +
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 truncate">
                        {medicalContact ? medicalContact.name : '108 Ambulance / Emergency Medical'}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">
                        {medicalContact ? medicalContact.designation : 'Ambulance (108), Hospital, Doctor'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-100/70">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Emergency Phone</span>
                    <a
                      href={`tel:${medicalContact ? medicalContact.phone : '108'}`}
                      className="text-xs font-bold text-rose-700 hover:underline flex items-center gap-1.5"
                    >
                      <HiPhone className="w-3.5 h-3.5 text-rose-600" />
                      <span>{medicalContact ? medicalContact.phone : '108 (National Ambulance)'}</span>
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <a
                  href={`tel:${medicalContact ? medicalContact.phone : '108'}`}
                  className="inline-flex items-center justify-center gap-1.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  <HiPhone className="w-3.5 h-3.5" />
                  <span>Call</span>
                </a>
                <button
                  type="button"
                  onClick={() => openWhatsAppWithLocation(medicalContact?.phone || '108', 'Medical Responder')}
                  className="inline-flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  <HiChatBubbleOvalLeftEllipsis className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>

            {/* 2. Police Emergency */}
            <div className="bg-white rounded-2xl p-5 border-2 border-blue-100 shadow-sm flex flex-col justify-between hover:border-blue-300 transition">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
                    🚓 Police Emergency
                  </span>
                  <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                    👮
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-base font-bold">
                      P
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 truncate">
                        {policeContact ? policeContact.name : 'Local Police Station (100)'}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">
                        {policeContact ? policeContact.designation : 'Police Station (100), Intruder, Layout Security'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100/70">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Police Hotline</span>
                    <a
                      href={`tel:${policeContact ? policeContact.phone : '100'}`}
                      className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1.5"
                    >
                      <HiPhone className="w-3.5 h-3.5 text-blue-600" />
                      <span>{policeContact ? policeContact.phone : '100 (Police)'}</span>
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <a
                  href={`tel:${policeContact ? policeContact.phone : '100'}`}
                  className="inline-flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  <HiPhone className="w-3.5 h-3.5" />
                  <span>Call</span>
                </a>
                <button
                  type="button"
                  onClick={() => openWhatsAppWithLocation(policeContact?.phone || '100', 'Police Station')}
                  className="inline-flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  <HiChatBubbleOvalLeftEllipsis className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
          </div>

          {/* SECTION B: Personal Family Emergency Contacts (2 Contacts Allowed) */}
          <div className="bg-white rounded-3xl p-6 border-2 border-purple-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">👨‍👩‍👧</span>
                  <h2 className="text-base font-bold text-gray-900">
                    Personal Family Emergency Contacts ({familyContacts.length}/2 Configured)
                  </h2>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    2 Contacts • Choice on SOS
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Configure up to 2 personal family contacts. When you tap <strong>Family Emergency</strong>, you can choose which contact to call and WhatsApp.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddEditFamily}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <HiPencilSquare className="w-4 h-4" />
                <span>{familyContacts.length > 0 ? 'Edit 2 Family Contacts' : '+ Add Family Contacts'}</span>
              </button>
            </div>

            {familyContacts.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 italic">
                No personal family contacts added yet. Click "+ Add Family Contacts" to configure Contact 1 & Contact 2.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {familyContacts.map((f, idx) => (
                  <div
                    key={f.id || idx}
                    className="p-4 rounded-2xl border border-purple-200 bg-purple-50/20 hover:bg-purple-50/50 transition flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-200 text-purple-900">
                          Family Member #{idx + 1} {idx === 0 ? '(Primary)' : '(Secondary)'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSingleFamily(f.id)}
                          title="Delete contact"
                          className="p-1 text-gray-400 hover:text-red-600 transition"
                        >
                          <HiTrash className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-sm">
                          {f.name.charAt(0) || 'F'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-gray-900 truncate">{f.name}</h4>
                          <p className="text-xs text-purple-700 font-semibold truncate">{f.designation || 'Family Kin'}</p>
                        </div>
                      </div>

                      <div className="mt-3 bg-white rounded-xl p-2.5 border border-purple-100 flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-medium">Mobile Phone:</span>
                        <a
                          href={`tel:${f.phone}`}
                          className="font-bold text-purple-700 hover:underline flex items-center gap-1"
                        >
                          <HiPhone className="w-3.5 h-3.5 text-purple-600" />
                          <span>{f.phone}</span>
                        </a>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <a
                        href={`tel:${f.phone}`}
                        className="inline-flex items-center justify-center gap-1.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition"
                      >
                        <HiPhone className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => openWhatsAppWithLocation(f.phone, f.name)}
                        className="inline-flex items-center justify-center gap-1.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition"
                      >
                        <HiChatBubbleOvalLeftEllipsis className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                ))}

                {familyContacts.length === 1 && (
                  <button
                    type="button"
                    onClick={handleOpenAddEditFamily}
                    className="p-4 rounded-2xl border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/10 hover:bg-purple-50/30 transition flex flex-col items-center justify-center gap-2 text-purple-700 min-h-[140px]"
                  >
                    <HiPlus className="w-6 h-6" />
                    <span className="text-xs font-bold">+ Add 2nd Family Emergency Contact</span>
                    <span className="text-[11px] text-gray-400">(Father, Mother, Sibling, etc.)</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* SECTION C: Resident Emergency Responders (Multi-Member List) */}
          <div className="bg-white rounded-3xl p-6 border-2 border-amber-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏡</span>
                  <h2 className="text-base font-bold text-gray-900">
                    Resident Emergency Responders ({memberResponders.length})
                  </h2>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Community Guardians
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Neighbors, Association President, and Executive Members alerted when you trigger a <strong>Resident Emergency</strong>.
                </p>
              </div>
            </div>

            {memberResponders.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 italic">
                No resident responders configured by Association Admin yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {memberResponders.map((r, idx) => (
                  <div
                    key={r.id || idx}
                    className="p-4 rounded-2xl border border-amber-200/70 bg-amber-50/20 hover:bg-amber-50/50 transition flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900">
                          Responder #{idx + 1} {idx === 0 ? '(Lead)' : ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                          {r.name?.charAt(0) || 'R'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-gray-900 truncate">{r.name}</h4>
                          <p className="text-xs text-gray-500 truncate">{r.designation || 'Resident Responder'}</p>
                        </div>
                      </div>

                      <div className="mt-3 bg-white rounded-xl p-2.5 border border-amber-100 flex items-center justify-between text-xs">
                        <span className="text-gray-400 font-medium">Emergency Phone:</span>
                        <a
                          href={`tel:${r.phone}`}
                          className="font-bold text-amber-800 hover:underline flex items-center gap-1"
                        >
                          <HiPhone className="w-3.5 h-3.5 text-amber-600" />
                          <span>{r.phone}</span>
                        </a>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <a
                        href={`tel:${r.phone}`}
                        className="inline-flex items-center justify-center gap-1.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition"
                      >
                        <HiPhone className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => openWhatsAppWithLocation(r.phone, r.name)}
                        className="inline-flex items-center justify-center gap-1.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition"
                      >
                        <HiChatBubbleOvalLeftEllipsis className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION D: Other Emergency Helplines (Fire, Security Gate, EB, Snake, etc.) */}
          {otherContactsList.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border-2 border-slate-300 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🔥</span>
                    <h2 className="text-base font-bold text-gray-900">
                      Other Emergency Helplines & Services ({otherContactsList.length})
                    </h2>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
                      Public Safety & Gate Helplines
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Specialized emergency helplines configured for the layout (Fire, Main Gate Security, Electricity Board).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherContactsList.map((o, idx) => (
                  <div
                    key={o.id || idx}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-900 mb-2 inline-block">
                        Helpline #{idx + 1}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center text-lg font-bold">
                          {idx === 0 ? '🔥' : '⚠️'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-gray-900 truncate">{o.name}</h4>
                          <p className="text-xs text-gray-500 truncate">{o.designation || 'Emergency Helpline'}</p>
                        </div>
                      </div>

                      <div className="mt-3 bg-white rounded-xl p-2.5 border border-slate-200 flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-medium">Helpline:</span>
                        <a
                          href={`tel:${o.phone}`}
                          className="font-bold text-slate-900 hover:underline flex items-center gap-1"
                        >
                          <HiPhone className="w-3.5 h-3.5 text-slate-600" />
                          <span>{o.phone}</span>
                        </a>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <a
                        href={`tel:${o.phone}`}
                        className="inline-flex items-center justify-center gap-1.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition"
                      >
                        <HiPhone className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => openWhatsAppWithLocation(o.phone, o.name)}
                        className="inline-flex items-center justify-center gap-1.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition"
                      >
                        <HiChatBubbleOvalLeftEllipsis className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION E: Instant Distress Trigger Beacon */}
          <div className="bg-red-50 border border-red-200 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                <HiShieldExclamation className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-red-950">
                  Instant Emergency Distress Beacon
                </h3>
                <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                  Triggers an automated emergency broadcast to all association responders and your family contacts with live GPS coordinates.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => triggerSOS('Immediate Distress')}
                disabled={isSending}
                className="inline-flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-red-600/30 transition disabled:opacity-50"
              >
                <HiShieldExclamation className="w-5 h-5 animate-pulse" />
                <span>{isSending ? 'Dispatching SOS...' : '🚨 Trigger Instant SOS'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Configure 2 Personal Family Emergency Contacts */}
      <Modal
        isOpen={isFamilyModalOpen}
        onClose={() => setIsFamilyModalOpen(false)}
        title="Configure 2 Family Emergency Contacts"
        size="lg"
      >
        <form onSubmit={handleSaveFamily} className="space-y-5 max-h-[75vh] overflow-y-auto px-1 pr-2">
          <p className="text-xs text-gray-500 leading-relaxed">
            Configure up to 2 personal family members. When you touch <strong>Family Emergency</strong> in the SOS menu, you will be given the choice to alert either contact immediately.
          </p>

          {/* Contact 1 */}
          <div className="p-4 bg-purple-50/40 rounded-2xl border border-purple-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-purple-950 uppercase flex items-center gap-1.5">
                <span>👨‍👩‍👧</span> 1. Family Contact #1 (Primary) *
              </h4>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                Primary Kin
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Family Member Name *
                </label>
                <input
                  type="text"
                  required
                  value={familyForms[0]?.name || ''}
                  onChange={(e) => {
                    const updated = [...familyForms];
                    updated[0] = { ...updated[0], name: e.target.value };
                    setFamilyForms(updated);
                  }}
                  placeholder="e.g. Priya Murali"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mobile Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={familyForms[0]?.phone || ''}
                  onChange={(e) => {
                    const updated = [...familyForms];
                    updated[0] = { ...updated[0], phone: e.target.value };
                    setFamilyForms(updated);
                  }}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Relationship / Role *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {relationPresets.map((rel) => (
                    <button
                      type="button"
                      key={rel}
                      onClick={() => {
                        const updated = [...familyForms];
                        updated[0] = { ...updated[0], designation: rel };
                        setFamilyForms(updated);
                      }}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition ${
                        familyForms[0]?.designation === rel
                          ? 'bg-purple-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {rel}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={familyForms[0]?.designation || ''}
                  onChange={(e) => {
                    const updated = [...familyForms];
                    updated[0] = { ...updated[0], designation: e.target.value };
                    setFamilyForms(updated);
                  }}
                  placeholder="e.g. Spouse / Father / Sister"
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Contact 2 */}
          <div className="p-4 bg-purple-50/40 rounded-2xl border border-purple-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-purple-950 uppercase flex items-center gap-1.5">
                <span>👨‍👩‍👦</span> 2. Family Contact #2 (Secondary / Optional)
              </h4>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                Secondary Kin
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Family Member Name
                </label>
                <input
                  type="text"
                  value={familyForms[1]?.name || ''}
                  onChange={(e) => {
                    const updated = [...familyForms];
                    updated[1] = { ...updated[1], name: e.target.value };
                    setFamilyForms(updated);
                  }}
                  placeholder="e.g. K. Senthil"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mobile Phone Number
                </label>
                <input
                  type="tel"
                  value={familyForms[1]?.phone || ''}
                  onChange={(e) => {
                    const updated = [...familyForms];
                    updated[1] = { ...updated[1], phone: e.target.value };
                    setFamilyForms(updated);
                  }}
                  placeholder="e.g. 9876543211"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Relationship / Role
                </label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {relationPresets.map((rel) => (
                    <button
                      type="button"
                      key={rel}
                      onClick={() => {
                        const updated = [...familyForms];
                        updated[1] = { ...updated[1], designation: rel };
                        setFamilyForms(updated);
                      }}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition ${
                        familyForms[1]?.designation === rel
                          ? 'bg-purple-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {rel}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={familyForms[1]?.designation || ''}
                  onChange={(e) => {
                    const updated = [...familyForms];
                    updated[1] = { ...updated[1], designation: e.target.value };
                    setFamilyForms(updated);
                  }}
                  placeholder="e.g. Father / Mother / Brother / Guardian"
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              disabled={submittingFamily}
              onClick={() => setIsFamilyModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingFamily}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition shadow-md disabled:opacity-50"
            >
              {submittingFamily ? 'Saving...' : 'Save 2 Family Contacts'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}