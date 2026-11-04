import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  HiCalendar,
  HiPlus,
  HiPencilSquare,
  HiTrash,
  HiMapPin,
  HiClock,
  HiArrowPath,
  HiListBullet,
  HiSquares2X2,
  HiChevronLeft,
  HiChevronRight,
  HiSparkles,
  HiCheck,
  HiBuildingOffice2,
  HiFunnel,
  HiInformationCircle,
} from 'react-icons/hi2';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
import { getYearFestivalsAndHolidays } from '../../utils/calendarHolidays';

const CALENDAR_DAYS = [
  { full: 'Sunday', short: 'Sun' },
  { full: 'Monday', short: 'Mon' },
  { full: 'Tuesday', short: 'Tue' },
  { full: 'Wednesday', short: 'Wed' },
  { full: 'Thursday', short: 'Thu' },
  { full: 'Friday', short: 'Fri' },
  { full: 'Saturday', short: 'Sat' },
];

export default function AdminEvents() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [dbEvents, setDbEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Super Admin Association Filter
  const [associations, setAssociations] = useState([]);
  const [selectedAssociationFilter, setSelectedAssociationFilter] = useState('all');

  // View Mode: 'month' (Single month) | 'year' (Full 12-month calendar) | 'list' (Table)
  const [viewMode, setViewMode] = useState('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Category Filter: 'all' | 'festival' | 'govt_holiday' | 'bank_holiday' | 'meeting'
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventToView, setEventToView] = useState(null);
  const [eventToDelete, setEventToDelete] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    end_date: '',
    location: '',
    category: 'meeting',
    association_id: 'all',
  });

  const [submitting, setSubmitting] = useState(false);

  // Sync selectedYear with currentMonth whenever currentMonth changes
  useEffect(() => {
    setSelectedYear(currentMonth.getFullYear());
  }, [currentMonth]);

  // Load associations for super_admin
  useEffect(() => {
    if (user?.role === 'super_admin') {
      api.get('/associations')
        .then((res) => {
          const list = res.data?.data || res.data || [];
          setAssociations(Array.isArray(list) ? list : []);
        })
        .catch((err) => console.warn('Could not load associations for events:', err));
    }
  }, [user?.role]);

  // Fetch Custom DB Events from Backend
  const fetchDbEvents = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({ limit: '500' });
      if (user?.role === 'super_admin' && selectedAssociationFilter !== 'all') {
        queryParams.append('association_id', selectedAssociationFilter);
      }
      const res = await api.get(`/events?${queryParams.toString()}`);
      const raw = res.data?.data || res.data || [];
      setDbEvents(Array.isArray(raw) ? raw : []);
    } catch (err) {
      console.error('Failed to load events:', err);
      toast.error('Failed to load association events');
    } finally {
      setLoading(false);
    }
  }, [user?.role, selectedAssociationFilter]);

  useEffect(() => {
    fetchDbEvents();
  }, [fetchDbEvents]);

  // Combined System Holidays + DB Custom Events for the active Year
  const allEventsForYear = useMemo(() => {
    // 1. Automatically calculate full festivals, gazetted holidays, and 2nd/4th Saturday bank holidays for the year
    const sysHolidays = getYearFestivalsAndHolidays(selectedYear);

    // 2. Custom DB events
    const mappedDbEvents = dbEvents.map((evt) => {
      let cat = 'meeting';
      const descLower = (evt.description || '').toLowerCase();
      const titleLower = (evt.title || '').toLowerCase();

      if (titleLower.includes('festival') || titleLower.includes('pongal') || titleLower.includes('diwali') || titleLower.includes('pooja')) {
        cat = 'festival';
      } else if (titleLower.includes('holiday') || titleLower.includes('republic') || titleLower.includes('independence')) {
        cat = 'govt_holiday';
      } else if (titleLower.includes('meeting') || descLower.includes('meeting') || titleLower.includes('agm') || descLower.includes('agenda')) {
        cat = 'meeting';
      }

      return {
        ...evt,
        is_custom: true,
        category: cat,
        badge: cat === 'meeting' ? 'Community Meeting' : 'Community Event',
      };
    });

    // 3. Deduplicate: if an event in DB has matching title on the same day, prefer the DB custom version
    const filteredSys = sysHolidays.filter((sh) => {
      return !mappedDbEvents.some((de) => {
        return (
          isSameDay(new Date(de.event_date), new Date(sh.event_date)) &&
          de.title.toLowerCase().trim() === sh.title.toLowerCase().trim()
        );
      });
    });

    const combined = [...filteredSys, ...mappedDbEvents];

    // Filter by active category tab if selected
    if (categoryFilter !== 'all') {
      return combined.filter((e) => e.category === categoryFilter);
    }

    return combined.sort(
      (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
  }, [selectedYear, dbEvents, categoryFilter]);

  // Category Badge Helper
  const getCategoryBadge = (category, badgeText) => {
    switch (category) {
      case 'bank_holiday':
        return {
          icon: '🏦',
          label: badgeText || 'Bank Holiday (2nd/4th Sat)',
          pillClass: 'bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800',
          dotClass: 'bg-blue-600',
        };
      case 'govt_holiday':
        return {
          icon: '🏛️',
          label: badgeText || 'Government Holiday',
          pillClass: 'bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-800',
          dotClass: 'bg-rose-600',
        };
      case 'festival':
        return {
          icon: '🪔',
          label: badgeText || 'Festival',
          pillClass: 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800',
          dotClass: 'bg-amber-600',
        };
      case 'meeting':
      default:
        return {
          icon: '🤝',
          label: badgeText || 'Community Meeting',
          pillClass: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
          dotClass: 'bg-emerald-600',
        };
    }
  };

  // Open Create Modal
  const handleOpenCreate = (prefilledDate = null, defaultCategory = 'meeting') => {
    const defaultDateStr = prefilledDate
      ? format(prefilledDate, "yyyy-MM-dd'T'10:00")
      : format(new Date(), "yyyy-MM-dd'T'10:00");

    setFormData({
      title: '',
      description: '',
      event_date: defaultDateStr,
      end_date: '',
      category: defaultCategory,
      location: 'Association Community Hall / Layout Ground',
      association_id: selectedAssociationFilter !== 'all' ? selectedAssociationFilter : 'all',
    });
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal (Admins only)
  const handleOpenEdit = (evt) => {
    if (!isAdmin) return;
    setSelectedEvent(evt);
    setFormData({
      title: evt.title || '',
      description: evt.description || '',
      event_date: evt.event_date ? new Date(evt.event_date).toISOString().slice(0, 16) : '',
      end_date: evt.end_date ? new Date(evt.end_date).toISOString().slice(0, 16) : '',
      location: evt.location || 'Association Community Hall',
      category: evt.category || 'meeting',
      association_id: evt.association_id || 'all',
    });
    setIsEditModalOpen(true);
  };

  // Open Event (View Details for everyone, with Edit/Delete buttons for Admins)
  const handleOpenEvent = (evt) => {
    setEventToView(evt);
    setIsViewModalOpen(true);
  };

  // Submit Create Event or Meeting
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.event_date) {
      toast.error('Title and start date are required');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim()
          ? `${formData.description.trim()} [Category: ${formData.category}]`
          : `Community ${formData.category}`,
        event_date: new Date(formData.event_date).toISOString(),
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        location: formData.location.trim() || 'Association Community Hall',
      };

      if (user?.role === 'super_admin') {
        payload.association_id = formData.association_id || 'all';
      }

      const res = await api.post('/events', payload);
      toast.success(res.data?.message || 'Event added to community calendar!');
      setIsCreateModalOpen(false);
      fetchDbEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save event');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit Event (Admins)
  const handleEditEvent = async (e) => {
    e.preventDefault();
    if (!selectedEvent) return;

    try {
      setSubmitting(true);

      // If it's a custom DB event, update it directly
      if (selectedEvent.is_custom && selectedEvent.id) {
        await api.put(`/events/${selectedEvent.id}`, {
          title: formData.title.trim(),
          description: formData.description.trim(),
          event_date: new Date(formData.event_date).toISOString(),
          end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
          location: formData.location.trim(),
        });
        toast.success('Calendar event updated successfully!');
      } else {
        // System Holiday being customized: save as custom event override
        await api.post('/events', {
          title: formData.title.trim(),
          description: formData.description.trim() || selectedEvent.description,
          event_date: new Date(formData.event_date).toISOString(),
          end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
          location: formData.location.trim() || selectedEvent.location,
        });
        toast.success('Holiday customized and saved to community calendar!');
      }

      setIsEditModalOpen(false);
      fetchDbEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update event');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Delete (Admins)
  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      setSubmitting(true);
      if (eventToDelete.is_custom && eventToDelete.id) {
        await api.delete(`/events/${eventToDelete.id}`);
        toast.success('Event removed from calendar');
      } else {
        toast.success('System holiday removed from active view');
      }
      setIsDeleteConfirmOpen(false);
      setEventToDelete(null);
      fetchDbEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete event');
    } finally {
      setSubmitting(false);
    }
  };

  // Months name array
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // DataTable columns for 'list' view
  const columns = useMemo(() => {
    const baseCols = [
      {
        header: 'Event / Holiday / Meeting',
        accessor: 'title',
        sortable: true,
        render: (title, row) => {
          const badgeInfo = getCategoryBadge(row.category, row.badge);
          return (
            <div
              onClick={() => handleOpenEvent(row)}
              className="cursor-pointer hover:text-primary-600 transition space-y-1"
              title="Click to view details"
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-gray-900 dark:text-white text-xs hover:underline">
                  {badgeInfo.icon} {title}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeInfo.pillClass}`}>
                  {badgeInfo.label}
                </span>
              </div>
              {row.description && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
                  {row.description}
                </p>
              )}
            </div>
          );
        },
      },
      {
        header: 'Date & Time',
        accessor: 'event_date',
        sortable: true,
        render: (d) => (
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
            {d ? format(new Date(d), 'dd MMM yyyy, hh:mm a') : '—'}
          </span>
        ),
      },
      {
        header: 'Location / Venue',
        accessor: 'location',
        sortable: true,
        render: (loc) => (
          <span className="text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1">
            <HiMapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            <span className="truncate max-w-xs">{loc || 'Community Grounds'}</span>
          </span>
        ),
      },
    ];

    if (user?.role === 'super_admin') {
      baseCols.splice(1, 0, {
        header: 'Association',
        accessor: 'association_name',
        sortable: true,
        render: (name, row) => (
          <span className="inline-flex items-center text-[11px] font-bold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/60 px-2.5 py-0.5 rounded border border-primary-200 dark:border-primary-800">
            {name || (row.is_system ? '🌐 All Communities' : 'Layout Community')}
          </span>
        ),
      });
    }

    if (isAdmin) {
      baseCols.push({
        header: 'Actions',
        align: 'right',
        render: (_, row) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => handleOpenEdit(row)}
              title="Edit / Customize"
              className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition"
            >
              <HiPencilSquare className="w-4 h-4" />
            </button>
            {row.is_custom && (
              <button
                onClick={() => {
                  setEventToDelete(row);
                  setIsDeleteConfirmOpen(true);
                }}
                title="Delete Event"
                className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <HiTrash className="w-4 h-4" />
              </button>
            )}
          </div>
        ),
      });
    }

    return baseCols;
  }, [isAdmin, user?.role]);

  return (
    <div className="space-y-6">
      {/* =========================================================================
          PAGE HEADER & VIEW TOGGLES
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <HiCalendar className="w-6 h-6 sm:w-7 sm:h-7 text-primary-600 dark:text-cyan-400" />
            <span>Community Events & Annual Calendar</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Official Government Holidays, Tamil & National Festivals, 2nd & 4th Saturday Bank Holidays, and Community Meetings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* View Mode Toggle: Month | Full Year | Table */}
          <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border border-gray-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-slate-900 text-primary-700 dark:text-cyan-300 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <HiSquares2X2 className="w-4 h-4" />
              <span>Month</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('year')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                viewMode === 'year'
                  ? 'bg-white dark:bg-slate-900 text-primary-700 dark:text-cyan-300 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <HiCalendar className="w-4 h-4" />
              <span>Full Year ({selectedYear})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-primary-700 dark:text-cyan-300 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <HiListBullet className="w-4 h-4" />
              <span>Table</span>
            </button>
          </div>

          {/* Super Admin Association Filter */}
          {user?.role === 'super_admin' && (
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 py-1.5 rounded-xl">
              <HiBuildingOffice2 className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0" />
              <select
                value={selectedAssociationFilter}
                onChange={(e) => setSelectedAssociationFilter(e.target.value)}
                className="text-xs bg-transparent border-0 font-bold text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer"
                title="Filter events by association"
              >
                <option value="all" className="dark:bg-slate-800">🌐 All Associations (Platform-Wide)</option>
                {associations.map((a) => (
                  <option key={a.id} value={a.id} className="dark:bg-slate-800">
                    {a.name} ({a.city || 'Tamil Nadu'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Add Meeting / Event Button (Accessible to all members, edit/delete managed by Admins) */}
          <button
            type="button"
            onClick={() => handleOpenCreate()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
          >
            <HiPlus className="w-4 h-4" />
            <span>+ Add Meeting / Event</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          CATEGORY FILTER TABS (FESTIVALS, GOVT HOLIDAYS, BANK HOLIDAYS, MEETINGS)
         ========================================================================= */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar select-none">
        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            categoryFilter === 'all'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
          }`}
        >
          <span>🌐 All ({allEventsForYear.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('govt_holiday')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            categoryFilter === 'govt_holiday'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
          }`}
        >
          <span>🏛️ Government Holidays</span>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('bank_holiday')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            categoryFilter === 'bank_holiday'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
          }`}
        >
          <span>🏦 Bank Holidays (2nd & 4th Sat)</span>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('festival')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            categoryFilter === 'festival'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
          }`}
        >
          <span>🪔 Festivals & Cultural</span>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('meeting')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            categoryFilter === 'meeting'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
          }`}
        >
          <span>🤝 Community Meetings & Events</span>
        </button>
      </div>

      {/* =========================================================================
          VIEW 1: FULL YEAR 12-MONTH CALENDAR GRID (2026, 2027, ETC.)
         ========================================================================= */}
      {viewMode === 'year' && (
        <div className="space-y-6">
          {/* Dynamic Year Navigator Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const newYear = selectedYear - 1;
                  setSelectedYear(newYear);
                  setCurrentMonth(new Date(newYear, currentMonth.getMonth(), 1));
                }}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                title="Previous Year"
              >
                <HiChevronLeft className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-black text-gray-900 dark:text-white">
                Year {selectedYear} Community Calendar
              </h2>

              <button
                type="button"
                onClick={() => {
                  const newYear = selectedYear + 1;
                  setSelectedYear(newYear);
                  setCurrentMonth(new Date(newYear, currentMonth.getMonth(), 1));
                }}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                title="Next Year (View 2027 Festivals)"
              >
                <HiChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const nowYear = new Date().getFullYear();
                  setSelectedYear(nowYear);
                  setCurrentMonth(new Date());
                }}
                className="px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 transition cursor-pointer"
              >
                Current Year ({new Date().getFullYear()})
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedYear(2027);
                  setCurrentMonth(new Date(2027, 0, 1));
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                  selectedYear === 2027
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700'
                }`}
              >
                View 2027 Festivals &rarr;
              </button>
            </div>
          </div>

          {/* 12 Months Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {months.map((mName, mIdx) => {
              const monthDate = new Date(selectedYear, mIdx, 1);
              const mStart = startOfWeek(startOfMonth(monthDate));
              const mEnd = endOfWeek(endOfMonth(monthDate));

              // Find events in this month
              const monthEvents = allEventsForYear.filter((e) => {
                const ed = new Date(e.event_date);
                return ed.getFullYear() === selectedYear && ed.getMonth() === mIdx;
              });

              // Generate days
              const days = [];
              let day = mStart;
              while (day <= mEnd) {
                days.push(day);
                day = addDays(day, 1);
              }

              return (
                <div
                  key={mName}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 flex flex-col justify-between hover:border-primary-300 dark:hover:border-slate-700 hover:shadow-md transition"
                >
                  <div>
                    {/* Month Header */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentMonth(monthDate);
                          setViewMode('month');
                        }}
                        className="text-sm font-black text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-cyan-400 transition cursor-pointer"
                      >
                        {mName} {selectedYear}
                      </button>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                        {monthEvents.length} events
                      </span>
                    </div>

                    {/* Day of Week Labels */}
                    <div className="grid grid-cols-7 text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-1">
                      <span>S</span>
                      <span>M</span>
                      <span>T</span>
                      <span>W</span>
                      <span>T</span>
                      <span>F</span>
                      <span>S</span>
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 text-center text-xs gap-y-1">
                      {days.map((d, dIdx) => {
                        const isCurrentM = isSameMonth(d, monthDate);
                        const isToday = isSameDay(d, new Date());
                        const dayEvents = allEventsForYear.filter((e) => isSameDay(new Date(e.event_date), d));
                        const hasEvent = dayEvents.length > 0;
                        const topEvent = dayEvents[0];
                        const badgeInfo = topEvent ? getCategoryBadge(topEvent.category) : null;

                        return (
                          <div
                            key={dIdx}
                            onClick={() => {
                              if (hasEvent) {
                                handleOpenEvent(dayEvents[0]);
                              } else {
                                handleOpenCreate(d);
                              }
                            }}
                            title={
                              hasEvent
                                ? dayEvents.map((e) => `${badgeInfo?.icon || '•'} ${e.title}`).join('\n')
                                : `Click to add meeting/event on ${format(d, 'dd MMM yyyy')}`
                            }
                            className={`h-7 w-7 mx-auto rounded-lg flex flex-col items-center justify-center cursor-pointer text-[11px] transition relative ${
                              !isCurrentM
                                ? 'text-gray-300 dark:text-gray-700'
                                : isToday
                                ? 'bg-primary-600 text-white font-bold shadow-xs'
                                : hasEvent
                                ? `${badgeInfo?.pillClass || 'bg-amber-100 text-amber-900'} font-bold`
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <span>{format(d, 'd')}</span>
                            {hasEvent && !isToday && (
                              <span className={`w-1.5 h-1.5 ${badgeInfo?.dotClass || 'bg-amber-600'} rounded-full absolute bottom-0.5`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Month Highlights: Festivals, Holidays, 2nd Saturday */}
                  <div className="mt-3 pt-2 border-t border-gray-100 dark:border-slate-800 space-y-1 max-h-28 overflow-y-auto no-scrollbar">
                    {monthEvents.length === 0 ? (
                      <span className="text-[10px] text-gray-400 italic block">No events scheduled</span>
                    ) : (
                      monthEvents.map((evt) => {
                        const bInfo = getCategoryBadge(evt.category, evt.badge);
                        return (
                          <div
                            key={evt.id}
                            onClick={() => handleOpenEvent(evt)}
                            className="flex items-center justify-between text-[11px] p-1 rounded hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer text-gray-800 dark:text-gray-200 gap-1"
                          >
                            <span className="truncate font-medium flex items-center gap-1">
                              <span>{bInfo.icon}</span>
                              <span className="truncate">{evt.short_title || evt.title}</span>
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">
                              {format(new Date(evt.event_date), 'dd MMM')}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: SINGLE MONTH DETAILED INTERACTIVE CALENDAR
         ========================================================================= */}
      {viewMode === 'month' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 sm:p-6 border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
          {/* Month Header & Quick Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-slate-800 px-1 sm:px-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                {allEventsForYear.filter((e) => isSameMonth(new Date(e.event_date), currentMonth)).length} holidays & events
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                title="Previous Month"
              >
                <HiChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date())}
                className="px-3 py-1 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 transition cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                title="Next Month"
              >
                <HiChevronRight className="w-5 h-5" />
              </button>

              {/* Quick Year Selector (2026, 2027, 2028...) */}
              <select
                value={currentMonth.getFullYear()}
                onChange={(e) => {
                  const y = parseInt(e.target.value, 10);
                  setSelectedYear(y);
                  setCurrentMonth(new Date(y, currentMonth.getMonth(), 1));
                }}
                className="ml-1 text-xs font-black bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-100 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:outline-none cursor-pointer"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
                <option value={2028}>2028</option>
              </select>
            </div>
          </div>

          {/* Month Day Headers */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-slate-700 rounded-t-xl overflow-hidden text-center font-bold text-gray-700 dark:text-gray-200">
            {CALENDAR_DAYS.map((d) => (
              <div key={d.full} className="bg-gray-50 dark:bg-slate-800 py-2">
                <span className="hidden md:inline text-xs font-extrabold">{d.full}</span>
                <span className="inline md:hidden text-[11px] sm:text-xs font-extrabold">{d.short}</span>
              </div>
            ))}
          </div>

          {/* Month Days Cell Grid */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-b-xl overflow-hidden">
            {(() => {
              const mStart = startOfWeek(startOfMonth(currentMonth));
              const mEnd = endOfWeek(endOfMonth(currentMonth));
              const cells = [];
              let curDay = mStart;

              while (curDay <= mEnd) {
                const dayToRender = curDay;
                const isCurMonth = isSameMonth(dayToRender, currentMonth);
                const isToday = isSameDay(dayToRender, new Date());
                const dayEvents = allEventsForYear.filter((e) => isSameDay(new Date(e.event_date), dayToRender));

                cells.push(
                  <div
                    key={dayToRender.toISOString()}
                    onClick={() => {
                      if (dayEvents.length > 0) {
                        handleOpenEvent(dayEvents[0]);
                      } else {
                        handleOpenCreate(dayToRender);
                      }
                    }}
                    className={`min-h-[82px] sm:min-h-[105px] p-1 sm:p-1.5 bg-white dark:bg-slate-900 cursor-pointer hover:bg-primary-50/30 dark:hover:bg-slate-800 transition flex flex-col justify-between ${
                      !isCurMonth ? 'bg-gray-50/60 dark:bg-slate-950/50 text-gray-400 dark:text-gray-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] sm:text-xs font-extrabold w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
                          isToday
                            ? 'bg-primary-600 text-white shadow-xs'
                            : isCurMonth
                            ? 'text-gray-800 dark:text-gray-100'
                            : 'text-gray-400 dark:text-gray-600'
                        }`}
                      >
                        {format(dayToRender, 'd')}
                      </span>
                      {dayEvents.length > 1 && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-500 text-white leading-tight">
                          +{dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Day's Events / Holidays list inside the cell */}
                    <div className="space-y-1 mt-1 overflow-y-auto max-h-[50px] sm:max-h-[68px] no-scrollbar">
                      {dayEvents.map((evt) => {
                        const bInfo = getCategoryBadge(evt.category, evt.badge);
                        return (
                          <div
                            key={evt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEvent(evt);
                            }}
                            className={`px-1 py-0.5 sm:px-1.5 sm:py-0.5 rounded text-[9px] sm:text-[10px] font-bold truncate border transition cursor-pointer ${bInfo.pillClass}`}
                            title={evt.title}
                          >
                            <span>{bInfo.icon} </span>
                            <span className="truncate">{evt.short_title || evt.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
                curDay = addDays(curDay, 1);
              }
              return cells;
            })()}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: TABLE / AGENDA LIST VIEW
         ========================================================================= */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden p-4">
          <DataTable
            columns={columns}
            data={allEventsForYear}
            loading={loading}
            searchPlaceholder="Search events, festivals, or holidays..."
            emptyTitle="No events or holidays found"
            emptyDescription="No events match your current filter."
          />
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD MEETING OR EVENT (ACCESSIBLE TO ALL MEMBERS & ADMINS)
         ========================================================================= */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Schedule Community Meeting or Event"
        size="md"
      >
        <form onSubmit={handleCreateEvent} className="space-y-4">
          {/* Target Association for Super Admin */}
          {user?.role === 'super_admin' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                Target Association *
              </label>
              <select
                value={formData.association_id}
                onChange={(e) => setFormData({ ...formData, association_id: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">📢 All Associations (Broadcast to all communities)</option>
                {associations.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.city || 'Tamil Nadu'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Event Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
              Category / Type *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-primary-500"
            >
              <option value="meeting">🤝 Community Meeting (AGM / Committee / Resident Discussion)</option>
              <option value="festival">🪔 Festival / Cultural Celebration</option>
              <option value="govt_holiday">🏛️ Government Holiday Observance</option>
              <option value="event">🎈 Maintenance, Sports & Community Event</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
              Event / Meeting Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Annual General Body Meeting (AGM) / Diwali Committee Meeting"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                Start Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                End Date & Time
              </label>
              <input
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
              Meeting Location / Venue
            </label>
            <input
              type="text"
              placeholder="e.g. Association Community Hall / Layout Central Park"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
              Description / Meeting Agenda
            </label>
            <textarea
              rows={3}
              placeholder="Provide meeting agenda items, discussion topics, guidelines, or festival schedule..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm disabled:opacity-50 transition cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Save to Community Calendar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: EDIT / MODIFY EVENT OR FESTIVAL (ADMIN & SUPER ADMIN ONLY)
         ========================================================================= */}
      {isAdmin && isEditModalOpen && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit / Customize Event in Calendar"
          size="md"
        >
          <form onSubmit={handleEditEvent} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                Event / Meeting Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                  Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                Location / Venue
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                Description / Notes / Agenda
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-800">
              {selectedEvent?.is_custom && (
                <button
                  type="button"
                  onClick={() => {
                    setEventToDelete(selectedEvent);
                    setIsEditModalOpen(false);
                    setIsDeleteConfirmOpen(true);
                  }}
                  className="text-xs font-bold text-red-600 hover:text-red-800 cursor-pointer"
                >
                  Delete Event
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm disabled:opacity-50 transition cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* =========================================================================
          EVENT DETAILS VIEW MODAL (WITH EDIT & DELETE FOR ADMINS)
         ========================================================================= */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={eventToView?.title || 'Event Details'}
        size="md"
      >
        {eventToView && (() => {
          const badgeInfo = getCategoryBadge(eventToView.category, eventToView.badge);

          return (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badgeInfo.pillClass}`}>
                    {badgeInfo.icon} {badgeInfo.label}
                  </span>
                  {eventToView.is_system && (
                    <span className="text-[10px] text-gray-500 font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-gray-200 dark:border-slate-800">
                      Standard Annual Calendar
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                  {eventToView.title}
                </h3>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-gray-600 dark:text-gray-300 pt-1">
                  <span className="flex items-center gap-1.5 font-bold text-primary-700 dark:text-primary-300">
                    <HiClock className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                    {eventToView.event_date ? format(new Date(eventToView.event_date), 'EEEE, dd MMMM yyyy, hh:mm a') : 'TBD'}
                  </span>
                  {eventToView.location && (
                    <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                      <HiMapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <span>{eventToView.location}</span>
                    </span>
                  )}
                </div>
              </div>

              {eventToView.description && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Program Agenda / Significance
                  </label>
                  <p className="text-xs text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-slate-800 p-3.5 rounded-xl border border-gray-100 dark:border-slate-700 whitespace-pre-wrap leading-relaxed">
                    {eventToView.description}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                {isAdmin ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsViewModalOpen(false);
                        handleOpenEdit(eventToView);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <HiPencilSquare className="w-4 h-4" />
                      <span>{eventToView.is_custom ? 'Edit Event' : 'Customize in Calendar'}</span>
                    </button>

                    {eventToView.is_custom && (
                      <button
                        type="button"
                        onClick={() => {
                          setEventToDelete(eventToView);
                          setIsViewModalOpen(false);
                          setIsDeleteConfirmOpen(true);
                        }}
                        className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ) : (
                  <div />
                )}

                <button
                  type="button"
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-5 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* CONFIRM DELETE DIALOG (ADMIN ONLY) */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Remove Event from Calendar"
        message={`Are you sure you want to remove "${eventToDelete?.title}" from the community calendar?`}
        confirmText="Delete Event"
        isDestructive
        loading={submitting}
      />
    </div>
  );
}
