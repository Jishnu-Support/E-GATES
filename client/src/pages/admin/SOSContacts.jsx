import React, { useState, useEffect, useCallback } from 'react';
import {
  HiShieldExclamation,
  HiPhone,
  HiUser,
  HiBuildingOffice2,
  HiPencilSquare,
  HiCheckCircle,
  HiArrowPath,
  HiExclamationTriangle,
  HiHeart,
  HiTrash,
  HiPlus,
  HiUserGroup,
  HiFire,
  HiShieldCheck,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function AdminSOSContacts() {
  const [contacts, setContacts] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Configuration modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State: Medical, Police, Dynamic Resident Responders (Multi-Member), and Other Emergency
  const [medicalForm, setMedicalForm] = useState({
    name: '108 Ambulance / Emergency Medical',
    phone: '108',
    designation: 'Ambulance, Hospital, Emergency Doctor',
  });

  const [policeForm, setPoliceForm] = useState({
    name: 'Local Police Station (100)',
    phone: '100',
    designation: 'Police Station (100), Intruder, Layout Security',
  });

  // Dynamic Resident Responders: Member 1 is mandatory, + Add Another Member allows Member 2, 3...
  const [residentMembers, setResidentMembers] = useState([
    { user_id: '', name: '', phone: '', designation: 'Association President' },
  ]);

  const [otherForm, setOtherForm] = useState({
    name: '',
    phone: '',
    designation: 'Fire (101), Gas Leak, Security, or Custom issue',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [contactsRes, membersRes] = await Promise.allSettled([
        api.get('/sos/contacts'),
        api.get('/users'),
      ]);

      let loadedContacts = [];
      if (contactsRes.status === 'fulfilled') {
        const raw = contactsRes.value.data?.data || contactsRes.value.data?.defaultContacts || [];
        loadedContacts = Array.isArray(raw) ? raw : [];
        setContacts(loadedContacts);
      }

      let loadedMembers = [];
      if (membersRes.status === 'fulfilled') {
        const rawUsers = membersRes.value.data?.data || membersRes.value.data || [];
        loadedMembers = Array.isArray(rawUsers) ? rawUsers.filter((u) => u.status === 'approved') : [];
        setMembers(loadedMembers);
      }

      // Populate Medical Contact
      const med = loadedContacts.find(
        (c) => c.contact_type === 'medical' || c.contact_type === 'ambulance' || c.designation?.toLowerCase().includes('medical') || c.designation?.toLowerCase().includes('ambulance')
      );
      if (med) {
        setMedicalForm({
          name: med.name || '108 Ambulance / Emergency Medical',
          phone: med.phone || '108',
          designation: med.designation || 'Ambulance, Hospital, Emergency Doctor',
        });
      }

      // Populate Police Contact
      const pol = loadedContacts.find((c) => c.contact_type === 'police');
      if (pol) {
        setPoliceForm({
          name: pol.name || 'Local Police Station (100)',
          phone: pol.phone || '100',
          designation: pol.designation || 'Police Station (100), Intruder, Layout Security',
        });
      }

      // Populate Resident Members
      const residentResponders = loadedContacts.filter(
        (c) => c.contact_type === 'member' || c.contact_type === 'resident'
      );
      if (residentResponders.length > 0) {
        setResidentMembers(
          residentResponders.map((r, idx) => ({
            user_id: r.user_id || '',
            name: r.name || '',
            phone: r.phone || '',
            designation: r.designation || (idx === 0 ? 'Association President' : `Resident Responder ${idx + 1}`),
          }))
        );
      } else {
        setResidentMembers([
          { user_id: '', name: '', phone: '', designation: 'Association President' },
        ]);
      }

      // Populate Other Emergency Contact
      const oth = loadedContacts.find((c) => c.contact_type === 'other' || c.contact_type === 'fire');
      if (oth) {
        setOtherForm({
          name: oth.name || '',
          phone: oth.phone || '',
          designation: oth.designation || 'Fire, Gas leak, Snake, Lift stuck, or Custom issue',
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
    fetchData();
  }, [fetchData]);

  // Handle Resident Selection from verified user list for member at specific index
  const handleSelectResident = (index, userId) => {
    const found = members.find((m) => String(m.id) === String(userId));
    setResidentMembers((prev) => {
      const updated = [...prev];
      if (found) {
        updated[index] = {
          user_id: found.id,
          name: found.name || '',
          phone: found.phone || '',
          designation: updated[index].designation || (index === 0 ? 'Association President' : `Resident Responder ${index + 1}`),
        };
      } else {
        updated[index] = {
          ...updated[index],
          user_id: '',
        };
      }
      return updated;
    });
  };

  const handleUpdateMemberField = (index, field, value) => {
    setResidentMembers((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  // + Add Another Member button action
  const handleAddAnotherMember = () => {
    setResidentMembers((prev) => [
      ...prev,
      {
        user_id: '',
        name: '',
        phone: '',
        designation: `Resident Responder ${prev.length + 1}`,
      },
    ]);
  };

  // Remove extra member (only non-mandatory index > 0)
  const handleRemoveMember = (index) => {
    if (residentMembers.length <= 1) {
      toast.error('At least one Resident Emergency Responder is mandatory');
      return;
    }
    setResidentMembers((prev) => prev.filter((_, i) => i !== index));
  };

  // Save all SOS contacts matching the SOS situations
  const handleSaveContacts = async (e) => {
    e.preventDefault();

    // Validations
    if (!policeForm.name || !policeForm.phone) {
      toast.error('Police Emergency Contact name and phone are required');
      return;
    }

    if (!residentMembers[0]?.name || !residentMembers[0]?.phone) {
      toast.error('Resident Responder #1 (Mandatory) name and phone are required');
      return;
    }

    const payload = [];

    // 1. Medical Contact
    if (medicalForm.name && medicalForm.phone) {
      payload.push({
        contact_type: 'medical',
        user_id: null,
        name: medicalForm.name.trim(),
        phone: medicalForm.phone.trim(),
        designation: medicalForm.designation.trim() || 'Ambulance (108), Hospital, Emergency Doctor',
      });
    }

    // 2. Police Contact
    payload.push({
      contact_type: 'police',
      user_id: null,
      name: policeForm.name.trim(),
      phone: policeForm.phone.trim(),
      designation: policeForm.designation.trim() || 'Police Station (100), Intruder, Layout Security',
    });

    // 3. Resident Responders (Multi-member)
    residentMembers.forEach((m, idx) => {
      if (m.name && m.phone) {
        payload.push({
          contact_type: 'member',
          user_id: m.user_id ? Number(m.user_id) : null,
          name: m.name.trim(),
          phone: m.phone.trim(),
          designation: m.designation.trim() || (idx === 0 ? 'Association President' : `Resident Responder ${idx + 1}`),
        });
      }
    });

    // 4. Other Emergency (optional)
    if (otherForm.name && otherForm.phone) {
      payload.push({
        contact_type: 'other',
        user_id: null,
        name: otherForm.name.trim(),
        phone: otherForm.phone.trim(),
        designation: otherForm.designation.trim() || 'Fire, Gas leak, Snake, Lift stuck, or Custom issue',
      });
    }

    try {
      setSubmitting(true);
      await api.post('/sos/contacts', { contacts: payload });
      toast.success('Association SOS emergency contacts configured successfully!');
      setIsConfigModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update SOS contacts');
    } finally {
      setSubmitting(false);
    }
  };

  const medicalContact = contacts.find(
    (c) => c.contact_type === 'medical' || c.contact_type === 'ambulance' || c.designation?.toLowerCase().includes('medical') || c.designation?.toLowerCase().includes('ambulance')
  );
  const policeContact = contacts.find((c) => c.contact_type === 'police');
  const residentResponders = contacts.filter((c) => c.contact_type === 'member' || c.contact_type === 'resident');
  const otherContact = contacts.find((c) => c.contact_type === 'other' || c.contact_type === 'fire');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <HiShieldExclamation className="w-7 h-7 text-red-600" />
            Association SOS Emergency Contacts
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Emergency contacts automatically dialed and messaged upon resident SOS: Medical, Police, Resident Responders (Multi-Member), and Other Helplines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            title="Refresh contacts"
            className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
          >
            <HiArrowPath className={`w-5 h-5 ${loading ? 'animate-spin text-primary-600' : ''}`} />
          </button>
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <HiPencilSquare className="w-4 h-4" />
            <span>Configure Contacts</span>
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="bg-gradient-to-r from-red-50 via-amber-50 to-indigo-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
        <HiShieldCheck className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-gray-800 space-y-1">
          <p className="font-bold text-gray-900">Synchronized SOS Emergency Dispatch:</p>
          <p className="leading-relaxed text-gray-700">
            These contacts directly map to the <strong>SOS Emergency Situations</strong> (Medical Emergency, Police Emergency, Resident Emergency, and Other Emergency).
            When a resident triggers SOS, the selected contact receives immediate call dialing and WhatsApp GPS dispatch.
          </p>
          <p className="text-[11px] text-indigo-700 font-medium">
            💡 <strong>Resident Emergency Responders:</strong> Member #1 is mandatory, and admins can use <strong>"+ Add Another Member"</strong> to add as many community responders (President, Secretary, Wardens) as needed.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 bg-white rounded-2xl border border-gray-100">
          <LoadingSpinner message="Loading emergency contacts..." />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top 4 Primary Situation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* 1. Medical Emergency Contact */}
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
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-base font-bold">
                      +
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 truncate">
                        {medicalContact ? medicalContact.name : '108 Ambulance / Emergency Medical'}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">
                        {medicalContact ? medicalContact.designation : 'Ambulance, Hospital, Emergency Doctor'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-100">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Emergency Phone / Hotline</span>
                    <a
                      href={`tel:${medicalContact ? medicalContact.phone : '108'}`}
                      className="text-xs font-bold text-rose-700 hover:underline flex items-center gap-1.5"
                    >
                      <HiPhone className="w-3.5 h-3.5 text-rose-600" />
                      {medicalContact ? medicalContact.phone : '108 (Default Ambulance)'}
                    </a>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="mt-4 w-full py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
              >
                Configure Medical
              </button>
            </div>

            {/* 2. Police Emergency Contact */}
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
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-base font-bold">
                      P
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 truncate">
                        {policeContact ? policeContact.name : 'Police Station (100)'}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">
                        {policeContact ? policeContact.designation : 'Police Control, Security Guard'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Hotline / Mobile</span>
                    <a
                      href={`tel:${policeContact ? policeContact.phone : '100'}`}
                      className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1.5"
                    >
                      <HiPhone className="w-3.5 h-3.5 text-blue-600" />
                      {policeContact ? policeContact.phone : '100 (Police)'}
                    </a>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="mt-4 w-full py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
              >
                Configure Police
              </button>
            </div>

            {/* 3. Family Emergency Notice */}
            <div className="bg-purple-50/30 rounded-2xl p-5 border-2 border-dashed border-purple-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
                    <HiHeart className="w-3 h-3 text-purple-600" /> Family Emergency
                  </span>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-md">
                    Resident Managed
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-base font-bold">
                      👨‍👩‍👧
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">Family Emergency Contact</h3>
                      <p className="text-xs text-gray-500">Resident Personal Contact</p>
                    </div>
                  </div>

                  <div className="bg-white/80 rounded-xl p-3 border border-purple-100 text-xs text-gray-600 space-y-1">
                    <p className="font-bold text-purple-900 text-[11px]">
                      🔒 Managed Privately by Each Resident
                    </p>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Residents configure their own personal family kin (Spouse, Parent, Guardian) directly in the Member Portal.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 w-full py-2 px-3 text-center text-xs font-semibold text-purple-600 bg-purple-50 border border-purple-200/60 rounded-lg">
                Configured by Residents in Member Portal
              </div>
            </div>

            {/* 4. Other Emergency Contact */}
            <div className="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-400 transition">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 flex items-center gap-1">
                    <HiFire className="w-3 h-3 text-amber-600" /> Other Emergency
                  </span>
                  <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                    ⚠️
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-base font-bold">
                      !
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 truncate">
                        {otherContact ? otherContact.name : 'Fire, Gas leak, Security'}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">
                        {otherContact ? otherContact.designation : 'Fire & Rescue (101), Main Gate Security'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Helpline Phone</span>
                    {otherContact?.phone ? (
                      <a
                        href={`tel:${otherContact.phone}`}
                        className="text-xs font-bold text-slate-800 hover:underline flex items-center gap-1.5"
                      >
                        <HiPhone className="w-3.5 h-3.5 text-slate-600" />
                        {otherContact.phone}
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Optional Helpline</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="mt-4 w-full py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Configure Other Services
              </button>
            </div>
          </div>

          {/* Section: Resident Emergency Responders (Multi-Member List with + Add Another Member) */}
          <div className="bg-white rounded-2xl p-6 border-2 border-amber-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏡</span>
                  <h2 className="text-base font-bold text-gray-900">
                    Resident Emergency Responders ({residentResponders.length} Configured)
                  </h2>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Multi-Member Active
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Community members who receive alerts when residents trigger a <strong>Resident Emergency</strong>. Member #1 is mandatory, and you can add as many additional members as needed.
                </p>
              </div>

              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <HiPlus className="w-4 h-4" />
                <span>+ Add / Manage Members</span>
              </button>
            </div>

            {residentResponders.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 italic">
                No resident responders configured yet. Click "+ Add / Manage Members" to add Association President, Secretary, or Responders.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {residentResponders.map((r, idx) => (
                  <div
                    key={r.id || idx}
                    className="p-4 rounded-xl border border-amber-200/70 bg-amber-50/20 hover:bg-amber-50/50 transition flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                          {r.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900">
                              Member #{idx + 1} {idx === 0 ? '(Mandatory)' : ''}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-gray-900 mt-0.5">{r.name}</h4>
                          <p className="text-xs text-gray-500">{r.designation || 'Resident Responder'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-2.5 border border-amber-100 flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium">Emergency Phone:</span>
                      <a
                        href={`tel:${r.phone}`}
                        className="font-bold text-primary-700 hover:underline flex items-center gap-1"
                      >
                        <HiPhone className="w-3.5 h-3.5" />
                        {r.phone}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Configure SOS Emergency Contacts */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title="Configure Association SOS Emergency Contacts"
        size="2xl"
      >
        <form onSubmit={handleSaveContacts} className="space-y-6 max-h-[75vh] overflow-y-auto px-1 pr-2">
          <p className="text-xs text-gray-500 leading-relaxed">
            Configure the emergency contacts matching each SOS situation. Resident Responder #1 is mandatory, and you can click <strong>"+ Add Another Member"</strong> to add more resident responders.
          </p>

          {/* Section 1: Medical Emergency */}
          <div className="bg-rose-50/40 p-4 rounded-xl border border-rose-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-rose-900 uppercase flex items-center gap-1.5">
                <span>🩺</span> 1. Medical Emergency Contact
              </h3>
              <span className="text-[10px] font-semibold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                Ambulance / Hospital / Doctor
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Hospital / Doctor / Service *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 108 Ambulance / Apollo Clinic"
                  value={medicalForm.name}
                  onChange={(e) => setMedicalForm({ ...medicalForm, name: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-rose-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Emergency Phone / Hotline *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 108 or clinic phone"
                  value={medicalForm.phone}
                  onChange={(e) => setMedicalForm({ ...medicalForm, phone: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-rose-500 bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Role / Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Ambulance (108), Hospital, Emergency Doctor"
                  value={medicalForm.designation}
                  onChange={(e) => setMedicalForm({ ...medicalForm, designation: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-rose-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Police Emergency */}
          <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-blue-900 uppercase flex items-center gap-1.5">
                <span>👮</span> 2. Police Emergency Contact
              </h3>
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                Police Station / Security
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Police Station / Officer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Local Police Station (100)"
                  value={policeForm.name}
                  onChange={(e) => setPoliceForm({ ...policeForm, name: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Station Phone / Hotline *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 100 or Inspector Mobile"
                  value={policeForm.phone}
                  onChange={(e) => setPoliceForm({ ...policeForm, phone: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Role / Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Police Station (100), Intruder, Layout Security"
                  value={policeForm.designation}
                  onChange={(e) => setPoliceForm({ ...policeForm, designation: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Resident Emergency Responders (Multi-Member) */}
          <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-amber-900 uppercase flex items-center gap-1.5">
                  <span>🏡</span> 3. Resident Emergency Responders (Multi-Member)
                </h3>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Member #1 is mandatory. Add another member if you have more community responders.
                </p>
              </div>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                {residentMembers.length} Responders
              </span>
            </div>

            <div className="space-y-3.5">
              {residentMembers.map((m, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-amber-200 bg-white shadow-xs space-y-3 relative"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-gray-800">
                        Resident Responder #{idx + 1} {idx === 0 ? '(Mandatory)' : ''}
                      </h4>
                    </div>

                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(idx)}
                        className="inline-flex items-center gap-1 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-md transition"
                        title="Remove this member"
                      >
                        <HiTrash className="w-3.5 h-3.5" />
                        <span>Remove Member</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">
                        Select Verified Resident (Optional Auto-fill)
                      </label>
                      <select
                        value={m.user_id}
                        onChange={(e) => handleSelectResident(idx, e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="">-- Choose verified resident --</option>
                        {members.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.door_no ? `Door #${u.door_no}` : u.phone})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">
                        Contact Name *
                      </label>
                      <input
                        type="text"
                        required={idx === 0}
                        placeholder="e.g. John Doe"
                        value={m.name}
                        onChange={(e) => handleUpdateMemberField(idx, 'name', e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">
                        Emergency Phone *
                      </label>
                      <input
                        type="tel"
                        required={idx === 0}
                        placeholder="e.g. 9876543210"
                        value={m.phone}
                        onChange={(e) => handleUpdateMemberField(idx, 'phone', e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">
                        Role / Designation
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Association President / Secretary"
                        value={m.designation}
                        onChange={(e) => handleUpdateMemberField(idx, 'designation', e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* + Add Another Member Button */}
              <button
                type="button"
                onClick={handleAddAnotherMember}
                className="w-full py-2.5 border-2 border-dashed border-amber-300 hover:border-amber-500 hover:bg-amber-100/50 text-amber-900 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <HiPlus className="w-4 h-4 text-amber-700" />
                <span>+ Add Another Member (Responder #{residentMembers.length + 1})</span>
              </button>
            </div>
          </div>

          {/* Section 4: Other Emergency (Optional) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                <span>⚠️</span> 4. Other Emergency Helpline (Optional)
              </h3>
              <span className="text-[10px] text-gray-500">Fire, Security Gate, Electrician</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Service / Agency Name</label>
                <input
                  type="text"
                  placeholder="e.g. Fire Station (101) or Main Gate Security"
                  value={otherForm.name}
                  onChange={(e) => setOtherForm({ ...otherForm, name: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-slate-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 101 or 9876543210"
                  value={otherForm.phone}
                  onChange={(e) => setOtherForm({ ...otherForm, phone: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-slate-500 bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Scope / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Fire, Gas leak, Snake, Lift stuck, or Custom issue"
                  value={otherForm.designation}
                  onChange={(e) => setOtherForm({ ...otherForm, designation: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-slate-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Family Emergency Notice */}
          <div className="bg-purple-50/50 p-3.5 rounded-xl border border-dashed border-purple-200 text-xs text-purple-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <HiHeart className="w-3.5 h-3.5 text-purple-600" />
              <span>5. Family Emergency Contact:</span>
            </p>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Family emergency contacts are private to each individual resident member and can only be added or updated by residents directly in their Member Portal.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(false)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-2"
            >
              {submitting && <HiArrowPath className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Emergency Contacts</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
