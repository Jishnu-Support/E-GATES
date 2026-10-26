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
  const [loading, setLoading] = useState(true);

  // Configuration modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Add Single Emergency Contact form
  const [addForm, setAddForm] = useState({
    contact_type: 'medical',
    name: '',
    phone: '',
    designation: '',
  });

  // Form State: Medical, Police
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

  // Dynamic Resident Responders: Manually typed directly by Admin (No dropdown picking)
  // Member 1 is mandatory, and + Add Another Member allows Member 2, 3...
  const [residentMembers, setResidentMembers] = useState([
    { name: '', phone: '', designation: 'Association President' },
  ]);

  // Dynamic Other Emergency Services: Admin can add multiple services (Fire, Security Gate, EB, Snake, etc.)
  const [otherServices, setOtherServices] = useState([
    { name: 'Fire Station & Rescue (101)', phone: '101', designation: 'Fire & Gas Leak Emergency' },
  ]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/sos/contacts');
      const raw = res.data?.data || res.data?.defaultContacts || [];
      const loadedContacts = Array.isArray(raw) ? raw : [];
      setContacts(loadedContacts);

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

      // Populate Resident Members (Manual typing)
      const residentResponders = loadedContacts.filter(
        (c) => c.contact_type === 'member' || c.contact_type === 'resident'
      );
      if (residentResponders.length > 0) {
        setResidentMembers(
          residentResponders.map((r, idx) => ({
            name: r.name || '',
            phone: r.phone || '',
            designation: r.designation || (idx === 0 ? 'Association President' : `Resident Responder ${idx + 1}`),
          }))
        );
      } else {
        setResidentMembers([
          { name: '', phone: '', designation: 'Association President' },
        ]);
      }

      // Populate Other Emergency Services (Multi-service)
      const oths = loadedContacts.filter(
        (c) => c.contact_type === 'other' || c.contact_type === 'fire'
      );
      if (oths.length > 0) {
        setOtherServices(
          oths.map((o) => ({
            name: o.name || '',
            phone: o.phone || '',
            designation: o.designation || 'Fire, Gas leak, Security, or Helpline',
          }))
        );
      } else {
        setOtherServices([
          { name: 'Fire Station & Rescue (101)', phone: '101', designation: 'Fire & Gas Leak Emergency' },
        ]);
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

  // Update member field (manually typed)
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

  // Other Services helpers
  const handleUpdateOtherField = (index, field, value) => {
    setOtherServices((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const handleAddAnotherOtherService = () => {
    setOtherServices((prev) => [
      ...prev,
      {
        name: '',
        phone: '',
        designation: `Emergency Helpline ${prev.length + 1}`,
      },
    ]);
  };

  const handleRemoveOtherService = (index) => {
    setOtherServices((prev) => prev.filter((_, i) => i !== index));
  };

  // Delete single emergency contact (All allowed except Family Emergency)
  const handleDeleteContact = async (contactId, contactName, contactType) => {
    if (contactType === 'family') {
      toast.error('Family Emergency contacts cannot be deleted by Admin');
      return;
    }
    if (!contactId) {
      toast.error('This default contact has not been created yet');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${contactName || 'this emergency contact'}"?`)) {
      return;
    }
    try {
      await api.delete(`/sos/contacts/${contactId}`);
      toast.success(`${contactName || 'Emergency contact'} deleted successfully`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete emergency contact');
    }
  };

  // Add single emergency contact
  const handleAddSingleContact = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.phone.trim()) {
      toast.error('Name and Phone number are required');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/sos/contacts/single', {
        contact_type: addForm.contact_type,
        name: addForm.name.trim(),
        phone: addForm.phone.trim(),
        designation: addForm.designation.trim() || undefined,
      });
      toast.success('New emergency contact added successfully!');
      setIsAddModalOpen(false);
      setAddForm({
        contact_type: 'medical',
        name: '',
        phone: '',
        designation: '',
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add emergency contact');
    } finally {
      setSubmitting(false);
    }
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

    // 3. Resident Responders (Multi-member manually entered)
    residentMembers.forEach((m, idx) => {
      if (m.name && m.phone) {
        payload.push({
          contact_type: 'member',
          user_id: null,
          name: m.name.trim(),
          phone: m.phone.trim(),
          designation: m.designation.trim() || (idx === 0 ? 'Association President' : `Resident Responder ${idx + 1}`),
        });
      }
    });

    // 4. Other Emergency Services (Multi-service: Fire, Security Gate, EB, Snake, etc.)
    otherServices.forEach((o, idx) => {
      if (o.name && o.phone) {
        payload.push({
          contact_type: 'other',
          user_id: null,
          name: o.name.trim(),
          phone: o.phone.trim(),
          designation: o.designation.trim() || `Emergency Helpline ${idx + 1}`,
        });
      }
    });

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
  const otherContactsList = contacts.filter((c) => c.contact_type === 'other' || c.contact_type === 'fire');

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
            Emergency contacts automatically dialed and messaged upon resident SOS: Medical, Police, Resident Responders (Multi-Member), and Other Helplines (Fire, Security, EB).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchData}
            title="Refresh contacts"
            className="p-2 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
          >
            <HiArrowPath className={`w-5 h-5 ${loading ? 'animate-spin text-primary-600' : ''}`} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <HiPlus className="w-4 h-4" />
            <span>+ Add Emergency Contact</span>
          </button>
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition"
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
            • <strong>Medical & Police:</strong> 108 Ambulance and 100 Police jurisdiction hotlines.<br />
            • <strong>Resident Responders:</strong> Manually typed member names & phones with <strong>"+ Add Another Member"</strong>.<br />
            • <strong>Other Services & Helplines:</strong> Fire (101), Security Gate, EB Breakdown with <strong>"+ Add Another Emergency Service"</strong>.<br />
            • <strong>Family Emergency:</strong> Residents configure 2 personal family contacts in their portal and choose either one when triggering SOS.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 bg-white rounded-2xl border border-gray-100">
          <LoadingSpinner message="Loading emergency contacts..." />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top 3 Primary Cards: Medical, Police, Family Notice */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Medical Emergency Contact */}
            <div className="bg-white rounded-2xl p-5 border-2 border-rose-100 shadow-sm flex flex-col justify-between hover:border-rose-300 transition">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 flex items-center gap-1">
                    🏥 Medical Emergency
                  </span>
                  <div className="flex items-center gap-1.5">
                    {medicalContact?.id && (
                      <button
                        type="button"
                        onClick={() => handleDeleteContact(medicalContact.id, medicalContact.name, 'medical')}
                        title="Delete Medical Emergency Contact"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <HiTrash className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                    <span className="w-7 h-7 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">
                      🩺
                    </span>
                  </div>
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

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => setIsConfigModalOpen(true)}
                  className="flex-1 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                >
                  Configure Medical
                </button>
                {medicalContact?.id && (
                  <button
                    type="button"
                    onClick={() => handleDeleteContact(medicalContact.id, medicalContact.name, 'medical')}
                    className="p-2 text-red-600 bg-rose-50 hover:bg-red-100 rounded-lg transition"
                    title="Delete Medical Contact"
                  >
                    <HiTrash className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Police Emergency Contact */}
            <div className="bg-white rounded-2xl p-5 border-2 border-blue-100 shadow-sm flex flex-col justify-between hover:border-blue-300 transition">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
                    🚓 Police Emergency
                  </span>
                  <div className="flex items-center gap-1.5">
                    {policeContact?.id && (
                      <button
                        type="button"
                        onClick={() => handleDeleteContact(policeContact.id, policeContact.name, 'police')}
                        title="Delete Police Emergency Contact"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <HiTrash className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                    <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                      👮
                    </span>
                  </div>
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

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => setIsConfigModalOpen(true)}
                  className="flex-1 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                >
                  Configure Police
                </button>
                {policeContact?.id && (
                  <button
                    type="button"
                    onClick={() => handleDeleteContact(policeContact.id, policeContact.name, 'police')}
                    className="p-2 text-red-600 bg-blue-50 hover:bg-red-100 rounded-lg transition"
                    title="Delete Police Contact"
                  >
                    <HiTrash className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 3. Family Emergency Notice */}
            <div className="bg-purple-50/30 rounded-2xl p-5 border-2 border-dashed border-purple-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
                    <HiHeart className="w-3 h-3 text-purple-600" /> Family Emergency
                  </span>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100/70 px-2.5 py-1 rounded-full flex items-center gap-1">
                    🔒 Resident Personal • Protected
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-base font-bold">
                      👨‍👩‍👧
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">Family Emergency Contacts</h3>
                      <p className="text-xs text-gray-500">2 Contacts • Choice on SOS</p>
                    </div>
                  </div>

                  <div className="bg-white/80 rounded-xl p-3 border border-purple-100 text-xs text-gray-600 space-y-1">
                    <p className="font-bold text-purple-900 text-[11px]">
                      🔒 Up to 2 Family Contacts Configured by Residents
                    </p>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Residents configure up to 2 personal family kin (Spouse, Parent, Guardian) and can choose either contact when triggering a Family Emergency.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 w-full py-2 px-3 text-center text-xs font-semibold text-purple-600 bg-purple-50 border border-purple-200/60 rounded-lg">
                Managed Privately in Member Portal
              </div>
            </div>
          </div>

          {/* Section A: Resident Emergency Responders (Manually Typed, Multi-Member) */}
          <div className="bg-white rounded-2xl p-6 border-2 border-amber-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏡</span>
                  <h2 className="text-base font-bold text-gray-900">
                    Resident Emergency Responders ({residentResponders.length} Configured)
                  </h2>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Manually Typed • Multi-Member
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Community responders who receive alerts when residents trigger a <strong>Resident Emergency</strong>. Member #1 is mandatory, and you can add as many members as needed.
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
                No resident responders configured yet. Click "+ Add / Manage Members" to type member details.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {residentResponders.map((r, idx) => (
                  <div
                    key={r.id || idx}
                    className="p-4 rounded-xl border border-amber-200/70 bg-amber-50/20 hover:bg-amber-50/50 transition flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {r.name.charAt(0) || 'M'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900">
                              Member #{idx + 1} {idx === 0 ? '(Lead)' : ''}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-gray-900 mt-0.5 truncate">{r.name}</h4>
                          <p className="text-xs text-gray-500 truncate">{r.designation || 'Resident Responder'}</p>
                        </div>
                      </div>
                      {r.id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteContact(r.id, r.name, 'member')}
                          title="Delete Resident Responder"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                        >
                          <HiTrash className="w-4 h-4 text-red-500" />
                        </button>
                      )}
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

          {/* Section B: Other Emergency Services (Fire, Security Gate, EB, Snake, Multi-Service) */}
          <div className="bg-white rounded-2xl p-6 border-2 border-slate-300 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔥</span>
                  <h2 className="text-base font-bold text-gray-900">
                    Other Emergency Helplines & Services ({otherContactsList.length} Configured)
                  </h2>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
                    Fire • Security • Helplines
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Public safety services and helplines (Fire Station 101, Main Gate Security, Electricity Board, Snake Rescue) that residents can contact.
                </p>
              </div>

              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <HiPlus className="w-4 h-4" />
                <span>+ Add / Manage Helplines</span>
              </button>
            </div>

            {otherContactsList.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 italic">
                No extra emergency helplines configured yet. Click "+ Add / Manage Helplines" to add Fire Station, Security Gate, or Electrician.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherContactsList.map((o, idx) => (
                  <div
                    key={o.id || idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {idx === 0 ? '🔥' : '⚠️'}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-900">
                            Service #{idx + 1}
                          </span>
                          <h4 className="text-sm font-bold text-gray-900 mt-0.5 truncate">{o.name}</h4>
                          <p className="text-xs text-gray-500 truncate">{o.designation || 'Emergency Helpline'}</p>
                        </div>
                      </div>
                      {o.id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteContact(o.id, o.name, 'other')}
                          title="Delete Emergency Helpline"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                        >
                          <HiTrash className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                    </div>

                    <div className="bg-white rounded-lg p-2.5 border border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium">Helpline Phone:</span>
                      <a
                        href={`tel:${o.phone}`}
                        className="font-bold text-slate-900 hover:underline flex items-center gap-1"
                      >
                        <HiPhone className="w-3.5 h-3.5 text-slate-600" />
                        {o.phone}
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
            Configure the emergency contacts matching each SOS situation. Type member details directly (no selection needed). You can add multiple resident members and multiple other services like Fire Station and Security Gate.
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

          {/* Section 3: Resident Emergency Responders (Manually Typed directly) */}
          <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-amber-900 uppercase flex items-center gap-1.5">
                  <span>🏡</span> 3. Resident Emergency Responders (Manually Enter Member Details)
                </h3>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Type member name, phone, and role directly. Member #1 is mandatory. Use <strong>+ Add Another Member</strong> for more members.
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">
                        Member Name *
                      </label>
                      <input
                        type="text"
                        required={idx === 0}
                        placeholder="e.g. John Doe / Secretary"
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

          {/* Section 4: Other Emergency Services (Fire, Security Gate, EB, Snake, etc.) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                  <span>🔥</span> 4. Other Emergency Services & Helplines (Add Fire, Security, etc.)
                </h3>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  Add custom emergency services like Fire Station (101), Layout Main Gate Security, Electricity Board (1912), or Snake Rescue.
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-800 bg-slate-200 px-2 py-0.5 rounded-full">
                {otherServices.length} Services
              </span>
            </div>

            <div className="space-y-3">
              {otherServices.map((o, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3 relative"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-gray-800">
                        Emergency Service #{idx + 1}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveOtherService(idx)}
                      className="inline-flex items-center gap-1 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-md transition"
                      title="Remove this service"
                    >
                      <HiTrash className="w-3.5 h-3.5" />
                      <span>Remove Service</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">
                        Service / Agency Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Fire Station (101) / Security Gate"
                        value={o.name}
                        onChange={(e) => handleUpdateOtherField(idx, 'name', e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-slate-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">
                        Helpline Phone Number *
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. 101 or 9876543210"
                        value={o.phone}
                        onChange={(e) => handleUpdateOtherField(idx, 'phone', e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-slate-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">
                        Description / Scope
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Fire, Gas leak, Main Gate Guard"
                        value={o.designation}
                        onChange={(e) => handleUpdateOtherField(idx, 'designation', e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-slate-500 bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* + Add Another Service Button */}
              <button
                type="button"
                onClick={handleAddAnotherOtherService}
                className="w-full py-2.5 border-2 border-dashed border-slate-300 hover:border-slate-500 hover:bg-slate-100/70 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <HiPlus className="w-4 h-4 text-slate-700" />
                <span>+ Add Another Emergency Service (Fire, Security, EB, etc.)</span>
              </button>
            </div>
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

      {/* Modal: Add Single Emergency Contact */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="➕ Add Emergency Contact"
        size="md"
      >
        <form onSubmit={handleAddSingleContact} className="space-y-4 py-1">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Emergency Category / Type *
            </label>
            <select
              value={addForm.contact_type}
              onChange={(e) => setAddForm({ ...addForm, contact_type: e.target.value })}
              className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            >
              <option value="medical">🏥 Medical Emergency (Ambulance / Hospital / Doctor)</option>
              <option value="police">🚓 Police Emergency (Station / Security / Patrol)</option>
              <option value="member">🏡 Resident Emergency Responder (President / Secretary)</option>
              <option value="fire">🔥 Fire Outbreak & Rescue (Fire Station 101)</option>
              <option value="other">⚠️ Other Helpline (Gate Security, EB, Ambulance, Snake, etc.)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Contact / Service Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. City General Hospital or Gate 1 Guard"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Phone Number / Hotline *
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. 108 or 9876543210"
              value={addForm.phone}
              onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
              className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Designation / Role / Instructions
            </label>
            <input
              type="text"
              placeholder="e.g. 24x7 Emergency Room, Main Gate Intercom"
              value={addForm.designation}
              onChange={(e) => setAddForm({ ...addForm, designation: e.target.value })}
              className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2"
            >
              {submitting && <HiArrowPath className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Emergency Contact</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}