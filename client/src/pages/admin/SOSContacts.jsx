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
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const EMERGENCY_TYPE_INFO = {
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
  family: {
    label: 'Family Emergency',
    icon: '👨‍👩‍👧',
    color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800/60',
  },
  other: {
    label: 'Other Emergency / Helpline',
    icon: '⚠️',
    color: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700',
  },
};

export default function AdminSOSContacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({
    contact_type: 'medical',
    name: '',
    phone: '',
    designation: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/sos/contacts');
      const all = res.data?.data || res.data?.defaultContacts || [];
      setContacts(Array.isArray(all) ? all : []);
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

  // Open modal to Add new contact
  const handleOpenAdd = () => {
    setEditingContact(null);
    setFormData({
      contact_type: 'medical',
      name: '',
      phone: '',
      designation: '',
    });
    setIsModalOpen(true);
  };

  // Open modal to Edit existing contact (Blocked for Family)
  const handleOpenEdit = (contact) => {
    if (contact.contact_type === 'family') {
      toast.error('Family Emergency contacts are managed by residents and cannot be edited by Admin');
      return;
    }
    setEditingContact(contact);
    setFormData({
      contact_type: contact.contact_type || 'other',
      name: contact.name || '',
      phone: contact.phone || '',
      designation: contact.designation || '',
    });
    setIsModalOpen(true);
  };

  // Save Contact (Create or Update)
  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Name and Phone number are required');
      return;
    }

    try {
      setSubmitting(true);
      if (editingContact?.id) {
        // Edit existing contact
        await api.put(`/sos/contacts/${editingContact.id}`, {
          contact_type: formData.contact_type,
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          designation: formData.designation.trim() || undefined,
        });
        toast.success(`"${formData.name}" updated successfully`);
      } else {
        // Add new contact
        await api.post('/sos/contacts/single', {
          contact_type: formData.contact_type,
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          designation: formData.designation.trim() || undefined,
        });
        toast.success(`"${formData.name}" added to emergency contacts`);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save emergency contact');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Contact (Blocked for Family)
  const handleDeleteContact = async (contact) => {
    if (contact.contact_type === 'family') {
      toast.error('Family Emergency contacts cannot be deleted by Admin');
      return;
    }
    if (!contact.id) {
      toast.error('Cannot delete this contact');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${contact.name}" (${contact.phone})?`)) {
      return;
    }

    try {
      await api.delete(`/sos/contacts/${contact.id}`);
      toast.success(`"${contact.name}" deleted successfully`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete contact');
    }
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
            Manage association emergency numbers. Add, edit, and delete emergency contacts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            title="Refresh"
            className="p-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <HiArrowPath className={`w-4 h-4 ${loading ? 'animate-spin text-primary-600' : ''}`} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
          >
            <HiPlus className="w-4 h-4" />
            <span>+ Add Emergency Number</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <HiMagnifyingGlass className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, number, designation..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { key: 'all', label: 'All Contacts' },
            { key: 'medical', label: 'Medical' },
            { key: 'police', label: 'Police' },
            { key: 'member', label: 'Responders' },
            { key: 'fire', label: 'Fire' },
            { key: 'family', label: 'Family' },
            { key: 'other', label: 'Other' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterType(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                filterType === tab.key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Unified Emergency Contacts List */}
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
            No emergency contacts found.
          </p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-xs hover:bg-emerald-700 transition"
          >
            <HiPlus className="w-4 h-4" />
            <span>Add First Emergency Number</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((contact) => {
            const isFamily = contact.contact_type === 'family';
            const typeInfo = EMERGENCY_TYPE_INFO[contact.contact_type] || EMERGENCY_TYPE_INFO.other;

            return (
              <div
                key={contact.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-gray-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-gray-300 dark:hover:border-slate-700 transition space-y-3"
              >
                <div>
                  {/* Category Badge & Action Buttons */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${typeInfo.color}`}
                    >
                      <span>{typeInfo.icon}</span>
                      <span>{typeInfo.label}</span>
                    </span>

                    {/* Admin Actions: Edit & Delete for all EXCEPT Family */}
                    <div className="flex items-center gap-1">
                      {isFamily ? (
                        <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md flex items-center gap-1 border border-purple-200/50">
                          <HiLockClosed className="w-3 h-3" />
                          <span>Resident Only</span>
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(contact)}
                            title="Edit Contact"
                            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition cursor-pointer"
                          >
                            <HiPencilSquare className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteContact(contact)}
                            title="Delete Contact"
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition cursor-pointer"
                          >
                            <HiTrash className="w-4 h-4 text-red-500" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Name & Role */}
                  <div className="space-y-0.5">
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                      {contact.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {contact.designation || 'Emergency Helpline'}
                    </p>
                    {isFamily && contact.linked_user_name && (
                      <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold truncate pt-0.5">
                        Resident: {contact.linked_user_name} {contact.linked_user_door ? `(Door #${contact.linked_user_door})` : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* Phone & Quick Actions */}
                <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <a
                    href={`tel:${contact.phone}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-emerald-600 transition"
                  >
                    <HiPhone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{contact.phone}</span>
                  </a>

                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${contact.phone}`}
                      className="px-2.5 py-1 bg-gray-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold transition"
                    >
                      Call
                    </a>
                    <a
                      href={`https://wa.me/${cleanPhone(contact.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-400 rounded-lg transition"
                      title="WhatsApp"
                    >
                      <HiChatBubbleOvalLeftEllipsis className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Simple Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingContact ? '✏️ Edit Emergency Contact' : '➕ Add Emergency Number'}
        size="md"
      >
        <form onSubmit={handleSaveContact} className="space-y-4 py-1">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Emergency Type / Category *
            </label>
            <select
              value={formData.contact_type}
              onChange={(e) => setFormData({ ...formData, contact_type: e.target.value })}
              className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="medical">🏥 Medical Emergency (Ambulance / Hospital / Doctor)</option>
              <option value="police">🚓 Police Emergency (Station / Security / Patrol)</option>
              <option value="member">🏡 Resident Emergency Responder (President / Secretary)</option>
              <option value="fire">🔥 Fire Emergency (Fire Station 101)</option>
              <option value="other">⚠️ Other Helpline (Gate Security, EB, Electrician, etc.)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Contact / Service Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Apollo Hospital or Gate 1 Security"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Phone Number / Emergency Hotline *
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. 108 or 9876543210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Designation / Instructions (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 24x7 Ambulance, Main Gate Guard"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer"
            >
              {submitting && <HiArrowPath className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingContact ? 'Save Changes' : 'Add Contact'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
