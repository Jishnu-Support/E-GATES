import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  HiShieldExclamation,
  HiPhone,
  HiPencilSquare,
  HiTrash,
  HiPlus,
  HiArrowPath,
  HiChatBubbleOvalLeftEllipsis,
  HiLockClosed,
  HiMagnifyingGlass,
  HiMapPin,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useSOS } from '../../hooks/useSOS';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const EMERGENCY_TYPE_INFO = {
  family: {
    label: 'Family Emergency',
    icon: '👨‍👩‍👧',
    color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800/60',
  },
  medical: {
    label: 'Medical Emergency',
    icon: '🏥',
    color: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/60',
  },
  ambulance: {
    label: 'Medical Emergency',
    icon: '🚑',
    color: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/60',
  },
  police: {
    label: 'Police Emergency',
    icon: '🚓',
    color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800/60',
  },
  member: {
    label: 'Resident Responder',
    icon: '🏡',
    color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/60',
  },
  resident: {
    label: 'Resident Responder',
    icon: '🏡',
    color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/60',
  },
  fire: {
    label: 'Fire Emergency',
    icon: '🔥',
    color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-800/60',
  },
  other: {
    label: 'Emergency Helpline',
    icon: '⚠️',
    color: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700',
  },
};

const RELATION_PRESETS = [
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

export default function MemberSOSContacts() {
  const { user } = useAuth();
  const { getCoordinates } = useSOS();

  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [familyContacts, setFamilyContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  // User's Preferred SOS Contacts (Choose which contact to trigger in SOS popup)
  const [preferredContacts, setPreferredContacts] = useState(() => {
    try {
      const saved = localStorage.getItem('preferred_sos_contacts');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Dedicated ONE-TAP SOS Primary Contact: Instantly called when tapping SOS button once
  const [primaryOneTapId, setPrimaryOneTapId] = useState(() => {
    try {
      return localStorage.getItem('preferred_sos_primary') || '';
    } catch (e) {
      return '';
    }
  });

  const handleSetOneTapPrimary = (contact) => {
    const contactIdStr = String(contact.id);
    setPrimaryOneTapId(contactIdStr);
    try {
      localStorage.setItem('preferred_sos_primary', contactIdStr);
      api.put('/sos/preferences', { primary_contact_id: contact.id }).catch(() => {});
    } catch (e) {}
    toast.success(
      `⭐ "${contact.name}" (${contact.phone}) is now your ONE-TAP SOS CONTACT!\nTouching the floating SOS button once will call & WhatsApp them immediately without asking anything.`,
      { duration: 6000 }
    );
  };

  const getCategoryKey = (contactType) => {
    if (contactType === 'family') return 'family';
    if (contactType === 'medical' || contactType === 'ambulance') return 'medical';
    if (contactType === 'police') return 'police';
    if (contactType === 'member' || contactType === 'resident') return 'resident';
    if (contactType === 'fire') return 'fire';
    return 'other';
  };

  const handleSetPreferred = (contact) => {
    const cat = getCategoryKey(contact.contact_type);
    const updated = {
      ...preferredContacts,
      [cat]: contact.id,
    };
    setPreferredContacts(updated);
    try {
      localStorage.setItem('preferred_sos_contacts', JSON.stringify(updated));
      api.put('/sos/preferences', { preferred_contacts: updated }).catch(() => {});
    } catch (e) {}
    toast.success(`⭐ "${contact.name}" is now your active contact for ${contact.contact_type.toUpperCase()} in the SOS button!`);
  };

  // Family Add / Edit Modal State
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState(null);
  const [familyFormData, setFamilyFormData] = useState({
    name: '',
    phone: '',
    designation: 'Spouse',
  });
  const [submittingFamily, setSubmittingFamily] = useState(false);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/sos/contacts');
      const all = res.data?.data || [];
      const defaults = res.data?.defaultContacts || [];
      const fams = res.data?.familyContacts || (res.data?.familyContact ? [res.data.familyContact] : []);

      setFamilyContacts(Array.isArray(fams) ? fams : []);

      // Combine family contacts and association default contacts into one unified list
      // Family contacts appear first so resident easily sees and manages them
      const unified = [...fams, ...defaults.filter((c) => c.contact_type !== 'family')];
      setContacts(unified);
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

  // Open Family Modal for Add (Allow adding multiple family members)
  const handleOpenAddFamily = () => {
    if (familyContacts.length >= 10) {
      toast.error('You can add up to 10 family emergency contacts.');
      return;
    }
    setEditingFamily(null);
    setFamilyFormData({
      name: '',
      phone: '',
      designation: familyContacts.length === 0 ? 'Spouse' : 'Father',
    });
    setIsFamilyModalOpen(true);
  };

  // Open Family Modal for Edit
  const handleOpenEditFamily = (fContact) => {
    setEditingFamily(fContact);
    setFamilyFormData({
      name: fContact.name || '',
      phone: fContact.phone || '',
      designation: fContact.designation || 'Family Kin',
    });
    setIsFamilyModalOpen(true);
  };

  // Save Family Contact
  const handleSaveFamily = async (e) => {
    e.preventDefault();
    if (!familyFormData.name.trim() || !familyFormData.phone.trim()) {
      toast.error('Please enter family member name and phone number');
      return;
    }

    try {
      setSubmittingFamily(true);
      let updatedList = [];

      if (editingFamily?.id) {
        // Update existing family contact in list
        updatedList = familyContacts.map((f) =>
          f.id === editingFamily.id
            ? {
                ...f,
                name: familyFormData.name.trim(),
                phone: familyFormData.phone.trim(),
                designation: familyFormData.designation.trim() || 'Family Kin',
              }
            : f
        );
      } else {
        // Add new contact to list
        updatedList = [
          ...familyContacts,
          {
            name: familyFormData.name.trim(),
            phone: familyFormData.phone.trim(),
            designation: familyFormData.designation.trim() || 'Family Kin',
          },
        ];
      }

      await api.post('/sos/family-contacts', { contacts: updatedList });
      toast.success(
        editingFamily
          ? `Family contact "${familyFormData.name}" updated successfully!`
          : `Family contact "${familyFormData.name}" added successfully!`
      );
      setIsFamilyModalOpen(false);
      fetchContacts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save family emergency contact');
    } finally {
      setSubmittingFamily(false);
    }
  };

  // Delete Single Family Contact
  const handleDeleteFamily = async (contactId, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name || 'this family contact'}?`)) {
      return;
    }
    try {
      await api.delete(`/sos/family-contact/${contactId}`);
      toast.success('Family emergency contact removed');
      fetchContacts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove family contact');
    }
  };

  // Compile Address
  const compileAddress = () => {
    const parts = [];
    if (user?.door_no) parts.push(`Door/Flat #${user.door_no}`);
    if (user?.street) parts.push(`Street: ${user.street}`);
    if (user?.layout_name) parts.push(`Layout: ${user.layout_name}`);
    if (user?.taluk) parts.push(`Taluk: ${user.taluk}`);
    if (user?.district) parts.push(`District: ${user.district}`);
    if (user?.state) parts.push(`State: ${user.state || 'Tamil Nadu'}`);
    return parts.length > 0 ? parts.join(', ') : 'Registered Association Residence';
  };

  // WhatsApp with Live GPS & Address
  const openWhatsAppWithLocation = async (phone, responderName) => {
    const clean = String(phone || '').replace(/\D/g, '');
    if (!clean) {
      toast.error('Invalid phone number');
      return;
    }
    const cleanPhone = clean.length === 10 ? `91${clean}` : clean;

    let coords = { latitude: null, longitude: null };
    try {
      coords = await getCoordinates();
    } catch (e) {
      console.warn('GPS location lookup:', e);
    }

    const mapsLink =
      coords.latitude && coords.longitude
        ? `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`
        : 'Location Coordinates Pending';

    const msg = [
      `🚨 *EMERGENCY SOS ALERT!*`,
      `*RESIDENT:* ${user?.name || 'Resident'} (${user?.phone || 'N/A'}${user?.member_code ? `, Code: ${user.member_code}` : ''})`,
      `*ADDRESS:* ${compileAddress()}`,
      `*LIVE LOCATION:* ${mapsLink}`,
      `*ATTENTION:* Urgent assistance required!`,
    ].join('\n');

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Filtered contacts list
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        c.name?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.designation?.toLowerCase().includes(q) ||
        c.contact_type?.toLowerCase().includes(q);

      const matchType = filterType === 'all' || c.contact_type === filterType;
      return matchSearch && matchType;
    });
  }, [contacts, searchQuery, filterType]);

  // Active One-Tap SOS Contact
  const activeOneTapContact = useMemo(() => {
    if (primaryOneTapId) {
      const found = contacts.find((c) => String(c.id) === String(primaryOneTapId));
      if (found) return found;
    }
    if (familyContacts.length > 0) return familyContacts[0];
    return contacts[0] || null;
  }, [contacts, familyContacts, primaryOneTapId]);

  const cleanPhone = (p) => String(p || '').replace(/\D/g, '');

  return (
    <div className="space-y-5">
      {/* Clean, Simple Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <HiShieldExclamation className="w-7 h-7 text-red-600" />
            <span>Emergency SOS Contacts</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Personal family contacts and community emergency responders.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenAddFamily}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
          >
            <HiPlus className="w-4 h-4" />
            <span>Add Family Contact</span>
          </button>
        </div>
      </div>

      {/* Active One-Tap SOS Highlight Banner */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 rounded-2xl p-4 sm:p-5 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-2xl flex-shrink-0 shadow-inner">
            🚨
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/25 px-2.5 py-0.5 rounded-full text-white">
                One-Tap Instant SOS Target
              </span>
              <span className="text-[10px] bg-amber-400 text-slate-900 font-extrabold px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black mt-1">
              {activeOneTapContact ? activeOneTapContact.name : 'Emergency Contact'}{' '}
              <span className="text-rose-200 text-xs sm:text-sm font-semibold">
                ({activeOneTapContact?.phone || '112'} • {activeOneTapContact?.designation || 'Emergency Responder'})
              </span>
            </h3>
            <p className="text-[11px] sm:text-xs text-rose-100 mt-0.5 leading-snug">
              ⚡ Tapping the floating SOS button once immediately dials this number and transmits your live home address & map location via WhatsApp with zero confirmation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`tel:${activeOneTapContact?.phone || '112'}`}
            className="px-3.5 py-2 bg-white text-red-600 hover:bg-rose-50 rounded-xl text-xs font-black shadow-sm transition flex items-center gap-1.5"
          >
            <HiPhone className="w-4 h-4" />
            <span>Call Now</span>
          </a>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <HiMagnifyingGlass className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, phone, emergency..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { key: 'all', label: 'All Contacts' },
            { key: 'family', label: 'Family' },
            { key: 'medical', label: 'Medical' },
            { key: 'police', label: 'Police' },
            { key: 'member', label: 'Responders' },
            { key: 'fire', label: 'Fire' },
            { key: 'other', label: 'Other' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterType(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                filterType === tab.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Unified Contacts Grid */}
      {loading ? (
        <div className="py-20 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 text-center">
          <LoadingSpinner message="Loading emergency contacts..." />
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="py-16 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-400 flex items-center justify-center text-xl mx-auto">
            📞
          </div>
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
            No contacts found matching filter.
          </p>
          <button
            onClick={handleOpenAddFamily}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold shadow-xs hover:bg-purple-700 transition cursor-pointer"
          >
            <HiPlus className="w-4 h-4" />
            <span>Add Family Member</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((contact) => {
            const isFamily = contact.contact_type === 'family';
            const typeInfo = EMERGENCY_TYPE_INFO[contact.contact_type] || EMERGENCY_TYPE_INFO.other;
            const catKey = getCategoryKey(contact.contact_type);
            const peers = contacts.filter((c) => getCategoryKey(c.contact_type) === catKey);
            const isPreferred =
              preferredContacts[catKey] === contact.id ||
              (!preferredContacts[catKey] && peers[0]?.id === contact.id);

            return (
              <div
                key={contact.id || `${contact.contact_type}-${contact.phone}`}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border shadow-sm flex flex-col justify-between transition space-y-3 ${
                  isFamily
                    ? 'border-purple-200 dark:border-purple-900/60 hover:border-purple-400'
                    : 'border-gray-200/80 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Top Bar: Badge & Actions (Only Family has Edit/Delete) */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${typeInfo.color}`}
                    >
                      <span>{typeInfo.icon}</span>
                      <span>{typeInfo.label}</span>
                    </span>

                    {/* Actions: ONLY Family Member has Edit/Delete; non-family emergencies are managed by Admin */}
                    {isFamily && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditFamily(contact)}
                          title="Edit Family Member"
                          className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition cursor-pointer"
                        >
                          <HiPencilSquare className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFamily(contact.id, contact.name)}
                          title="Delete Family Member"
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition cursor-pointer"
                        >
                          <HiTrash className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Name & Role */}
                  <div className="space-y-0.5">
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                      {contact.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {contact.designation || (isFamily ? 'Personal Family' : 'Emergency Responder')}
                    </p>
                  </div>

                  {/* One-Tap SOS Quick Designation */}
                  <div className="pt-2 flex items-center justify-between gap-2">
                    {String(contact.id) === String(activeOneTapContact?.id) ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xs">
                        <span>⭐ One-Tap SOS Contact</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetOneTapPrimary(contact)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/50 transition cursor-pointer"
                        title="Set this contact as the number called immediately when tapping the SOS button"
                      >
                        <span>⭐ Set as 1-Tap SOS</span>
                      </button>
                    )}
                  </div>

                  {/* Category Preference Badge / Selector (If category has multiple contacts) */}
                  {peers.length > 1 && (
                    <div className="pt-2">
                      {isPreferred ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                          <span>⭐ Active in SOS Button</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetPreferred(contact)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gray-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-gray-700 dark:text-gray-300 hover:text-amber-800 dark:hover:text-amber-300 border border-gray-200 dark:border-slate-700 transition cursor-pointer"
                        >
                          <span>🔘 Choose for SOS Button</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Phone & Direct Call / WhatsApp */}
                <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <a
                    href={`tel:${contact.phone}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-purple-600 transition"
                  >
                    <HiPhone className="w-3.5 h-3.5 text-purple-600" />
                    <span>{contact.phone}</span>
                  </a>

                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${contact.phone}`}
                      className="px-2.5 py-1 bg-gray-100 dark:bg-slate-800 hover:bg-purple-600 hover:text-white text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold transition"
                    >
                      Call
                    </a>
                    <button
                      type="button"
                      onClick={() => openWhatsAppWithLocation(contact.phone, contact.name)}
                      className="p-1.5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-400 rounded-lg transition cursor-pointer"
                      title="Send WhatsApp SOS with Live GPS & Home Address"
                    >
                      <HiChatBubbleOvalLeftEllipsis className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add / Edit Family Contact */}
      <Modal
        isOpen={isFamilyModalOpen}
        onClose={() => setIsFamilyModalOpen(false)}
        title={editingFamily ? '✏️ Edit Family Contact' : '👨‍👩‍👧 Add Family Emergency Contact'}
        size="md"
      >
        <form onSubmit={handleSaveFamily} className="space-y-4 py-1">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Family Member Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Priya Murali"
              value={familyFormData.name}
              onChange={(e) => setFamilyFormData({ ...familyFormData, name: e.target.value })}
              className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Mobile Phone Number *
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. 9876543210"
              value={familyFormData.phone}
              onChange={(e) => setFamilyFormData({ ...familyFormData, phone: e.target.value })}
              className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Relationship / Designation *
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {RELATION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setFamilyFormData({ ...familyFormData, designation: preset })}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                    familyFormData.designation === preset
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Or type custom relation (e.g. Brother, Guardian)"
              value={familyFormData.designation}
              onChange={(e) => setFamilyFormData({ ...familyFormData, designation: e.target.value })}
              className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsFamilyModalOpen(false)}
              className="px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingFamily}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer"
            >
              {submittingFamily && <HiArrowPath className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingFamily ? 'Save Family Member' : 'Add Family Member'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
