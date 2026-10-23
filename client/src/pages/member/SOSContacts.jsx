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
  const [otherContact, setOtherContact] = useState(null);
  const [familyContact, setFamilyContact] = useState(null);

  // Edit Family Contact Modal State
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [submittingFamily, setSubmittingFamily] = useState(false);
  const [familyForm, setFamilyForm] = useState({
    name: '',
    phone: '',
    designation: 'Spouse',
  });

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
      const fam = res.data?.familyContact || null;
      const defaults = res.data?.defaultContacts || [];

      setContacts(rawAll);
      setFamilyContact(fam);

      // Parse specific categories
      const med = res.data?.medicalContact || defaults.find(
        (c) => c.contact_type === 'medical' || c.contact_type === 'ambulance' || c.designation?.toLowerCase().includes('medical') || c.designation?.toLowerCase().includes('ambulance')
      ) || null;
      setMedicalContact(med);

      const pol = res.data?.policeContact || defaults.find((c) => c.contact_type === 'police') || null;
      setPoliceContact(pol);

      const members = res.data?.memberContacts || defaults.filter(
        (c) => c.contact_type === 'member' || c.contact_type === 'resident'
      );
      setMemberResponders(members);

      const oth = res.data?.otherContact || defaults.find((c) => c.contact_type === 'other' || c.contact_type === 'fire') || null;
      setOtherContact(oth);

      if (fam) {
        setFamilyForm({
          name: fam.name || '',
          phone: fam.phone || '',
          designation: fam.designation || 'Family / Relative',
        });
      }
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
    if (familyContact) {
      setFamilyForm({
        name: familyContact.name || '',
        phone: familyContact.phone || '',
        designation: familyContact.designation || 'Spouse',
      });
    } else {
      setFamilyForm({
        name: '',
        phone: '',
        designation: 'Spouse',
      });
    }
    setIsFamilyModalOpen(true);
  };

  const handleSaveFamily = async (e) => {
    e.preventDefault();
    if (!familyForm.name.trim()) {
      toast.error('Please enter the family member name');
      return;
    }
    if (!familyForm.phone.trim()) {
      toast.error('Please enter the family member phone number');
      return;
    }

    try {
      setSubmittingFamily(true);
      const res = await api.post('/sos/family-contact', {
        name: familyForm.name.trim(),
        phone: familyForm.phone.trim(),
        designation: familyForm.designation.trim() || 'Family / Relative',
      });
      toast.success(res.data?.message || 'Family emergency contact saved successfully!');
      setIsFamilyModalOpen(false);
      fetchContacts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save family emergency contact');
    } finally {
      setSubmittingFamily(false);
    }
  };

  const handleDeleteFamily = async () => {
    if (!window.confirm('Are you sure you want to remove your family emergency contact?')) return;
    try {
      await api.delete('/sos/family-contact');
      toast.success('Family emergency contact removed');
      setFamilyContact(null);
      setFamilyForm({ name: '', phone: '', designation: 'Spouse' });
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
              Contacts configured to respond to your emergency situations: <strong>Medical (108)</strong>, <strong>Police (100)</strong>, <strong>Resident Responders (Multi-Member)</strong>, <strong>Your Family Contact</strong>, and <strong>Helplines</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleOpenAddEditFamily}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-rose-950/40 transition"
            >
              <HiPencilSquare className="w-4 h-4" />
              <span>{familyContact ? 'Edit Family Contact' : '+ Add Family Contact'}</span>
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
              • <strong>Medical, Police & Other Services:</strong> Managed by your Association Administration for all layout residents.<br />
              • <strong>Resident Emergency Responders:</strong> Active community members (President, Secretary, Floor Wardens) ready to assist.<br />
              • <strong>Personal Family Contact:</strong> Managed exclusively by you in your member profile.
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
          {/* SECTION A: Primary Emergency Contacts Grid (Medical, Police, Family, Other) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                        {medicalContact ? medicalContact.name : '108 Ambulance / Emergency Doctor'}
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

            {/* 3. Personal Family Contact */}
            <div className="bg-white rounded-2xl p-5 border-2 border-purple-100 shadow-sm flex flex-col justify-between hover:border-purple-300 transition">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
                    <HiHeart className="w-3 h-3 text-purple-600" /> Family Emergency
                  </span>
                  <div className="flex items-center gap-1">
                    {familyContact && (
                      <button
                        type="button"
                        onClick={handleDeleteFamily}
                        title="Delete family contact"
                        className="p-1 text-gray-400 hover:text-red-600 transition"
                      >
                        <HiTrash className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                      Personal
                    </span>
                  </div>
                </div>

                {familyContact ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-base font-bold">
                        👨‍👩‍👧
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 truncate">{familyContact.name}</h3>
                        <p className="text-xs text-purple-700 font-semibold truncate">{familyContact.designation || 'Family Kin'}</p>
                      </div>
                    </div>

                    <div className="bg-purple-50/50 rounded-xl p-3 border border-purple-100/70">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Mobile Phone</span>
                      <a
                        href={`tel:${familyContact.phone}`}
                        className="text-xs font-bold text-purple-700 hover:underline flex items-center gap-1.5"
                      >
                        <HiPhone className="w-3.5 h-3.5 text-purple-600" />
                        <span>{familyContact.phone}</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-gray-400 italic">
                    No family contact added yet.
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2">
                {familyContact ? (
                  <>
                    <a
                      href={`tel:${familyContact.phone}`}
                      className="flex-1 inline-flex items-center justify-center gap-1 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                    >
                      <HiPhone className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => openWhatsAppWithLocation(familyContact.phone, 'Family Contact')}
                      className="flex-1 inline-flex items-center justify-center gap-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                    >
                      <HiChatBubbleOvalLeftEllipsis className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenAddEditFamily}
                      title="Edit Family Contact"
                      className="p-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl transition"
                    >
                      <HiPencilSquare className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenAddEditFamily}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                  >
                    <HiPlus className="w-4 h-4" />
                    <span>Add Family Contact</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* SECTION B: Resident Emergency Responders (Multi-Member List) */}
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
                  Neighbors, Association President, and Executive Members instantly alerted when you trigger a <strong>Resident Emergency</strong>.
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

          {/* SECTION C: Other Emergency Helpline (if configured) */}
          {otherContact?.phone && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 text-xl font-bold">
                  ⚠️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Other Emergency Helpline:</span>
                    <span className="text-xs font-bold text-gray-900">{otherContact.name}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{otherContact.designation || 'Fire, Security Gate, Lift or Custom Assistance'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`tel:${otherContact.phone}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  <HiPhone className="w-3.5 h-3.5" />
                  <span>Call {otherContact.phone}</span>
                </a>
                <button
                  type="button"
                  onClick={() => openWhatsAppWithLocation(otherContact.phone, 'Other Emergency')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  <HiChatBubbleOvalLeftEllipsis className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
          )}

          {/* SECTION D: Instant Distress Trigger Beacon */}
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
                  Triggers an automated emergency broadcast to all association responders and your family contact with live GPS coordinates.
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

      {/* MODAL: Add / Edit Personal Family Contact */}
      <Modal
        isOpen={isFamilyModalOpen}
        onClose={() => setIsFamilyModalOpen(false)}
        title={familyContact ? 'Edit Personal Family Emergency Contact' : 'Add Personal Family Emergency Contact'}
        size="md"
      >
        <form onSubmit={handleSaveFamily} className="space-y-4">
          <p className="text-xs text-gray-500">
            This contact belongs exclusively to your profile. Only you can view or change this information.
          </p>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Family Member Name *
            </label>
            <input
              type="text"
              required
              value={familyForm.name}
              onChange={(e) => setFamilyForm({ ...familyForm, name: e.target.value })}
              placeholder="e.g. Priya Murali / K. Senthil"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Relationship / Role *
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {relationPresets.map((rel) => (
                <button
                  type="button"
                  key={rel}
                  onClick={() => setFamilyForm({ ...familyForm, designation: rel })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    familyForm.designation === rel
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {rel}
                </button>
              ))}
            </div>
            <input
              type="text"
              required
              value={familyForm.designation}
              onChange={(e) => setFamilyForm({ ...familyForm, designation: e.target.value })}
              placeholder="e.g. Spouse / Father / Sister"
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Mobile Phone Number (for SMS & Calls) *
            </label>
            <input
              type="tel"
              required
              value={familyForm.phone}
              onChange={(e) => setFamilyForm({ ...familyForm, phone: e.target.value })}
              placeholder="e.g. 9876543210"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
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
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-md disabled:opacity-50"
            >
              {submittingFamily ? 'Saving...' : 'Save Family Contact'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
