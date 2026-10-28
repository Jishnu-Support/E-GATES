import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  HiChartBar,
  HiPlus,
  HiTrash,
  HiPencilSquare,
  HiCheckCircle,
  HiXCircle,
  HiArrowDownTray,
  HiArrowPath,
  HiUserGroup,
  HiUsers,
  HiBuildingStorefront,
  HiCurrencyRupee,
  HiDocumentText,
  HiTrophy,
  HiLockClosed,
  HiStopCircle,
  HiWrenchScrewdriver,
  HiScale,
  HiMapPin,
  HiIdentification,
  HiShieldCheck,
  HiUser,
  HiGlobeAlt,
} from 'react-icons/hi2';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';

const SERVICE_CATEGORIES = [
  'Plumber',
  'Electrician',
  'Painter',
  'Security Agency',
  'Waste & Sanitation',
  'Civil Works / Masonry',
  'Gardening & Landscaping',
  'Lift Maintenance',
  'CCTV & Intercom',
  'Other Service',
];

const RESOLUTION_TASK_TYPES = [
  'Infrastructure & Road Tarring',
  'Security, CCTV & Gate Automation',
  'Water Supply, Borewell & Pipeline',
  'Streetlights & Common Electricity',
  'Parks, Greenery & Children Play Area',
  'Maintenance Fee Revision',
  'Layout Bylaws & Rules Amendment',
  'Annual Financial Budget & Audit',
  'Other Resolution',
];

export default function AdminVotingManage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const { socket } = useSocket();

  const checkHasVotes = (poll) => {
    if (!poll) return false;
    if (parseInt(poll.total_votes || 0, 10) > 0) return true;
    if (Array.isArray(poll.vendors) && poll.vendors.some((v) => parseInt(v.vote_count || v.votes || 0, 10) > 0)) {
      return true;
    }
    return false;
  };

  const [polls, setPolls] = useState([]);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [associationMembers, setAssociationMembers] = useState([]);
  const [allApprovedUsers, setAllApprovedUsers] = useState([]);

  // Modals
  const [isCreatePollOpen, setIsCreatePollOpen] = useState(false);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [pollToDelete, setPollToDelete] = useState(null);

  // Create Poll Form
  const [pollForm, setPollForm] = useState({
    poll_type: 'vendor_selection', // 'vendor_selection' | 'resolution_passing' | 'election'
    service_category: 'Plumber',
    resolution_task_type: 'Infrastructure & Road Tarring',
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    is_anonymous: false,
    target_audience: 'all', // 'all' | 'street' | 'selected'
    target_street: '',
    target_user_ids: [],
    // For vendor selection: 1 or more vendor options
    vendors: [
      { name: '', company: '', contact: '', quotation: '', notes: '' },
    ],
    // For election polling (Multi-role election with 1 mandatory role)
    election_type: 'all_roles',
    internal_officer_id: '',
    internal_officer_name: '',
    internal_officer_contact: '',
    external_officer_id: '',
    external_officer_name: '',
    external_officer_contact: '',
    external_officer_org: '',
    external_officer_is_manual: false,
    election_roles_builder: [
      {
        role_name: 'President',
        candidates: [
          { name: '', contact: '', notes: '' },
          { name: '', contact: '', notes: '' },
        ],
      },
    ],
  });

  // Election roles builder handlers
  const handleAddElectionRole = () => {
    setPollForm((prev) => ({
      ...prev,
      election_roles_builder: [
        ...prev.election_roles_builder,
        {
          role_name: '',
          candidates: [
            { name: '', contact: '', notes: '' },
            { name: '', contact: '', notes: '' },
          ],
        },
      ],
    }));
  };

  const handleRemoveElectionRole = (rIdx) => {
    if (pollForm.election_roles_builder.length <= 1) return;
    setPollForm((prev) => ({
      ...prev,
      election_roles_builder: prev.election_roles_builder.filter((_, idx) => idx !== rIdx),
    }));
  };

  const handleRoleNameChange = (rIdx, value) => {
    setPollForm((prev) => {
      const next = [...prev.election_roles_builder];
      next[rIdx] = { ...next[rIdx], role_name: value };
      return { ...prev, election_roles_builder: next };
    });
  };

  const handleAddCandidateToRole = (rIdx) => {
    setPollForm((prev) => {
      const next = [...prev.election_roles_builder];
      next[rIdx] = {
        ...next[rIdx],
        candidates: [...next[rIdx].candidates, { name: '', contact: '', notes: '' }],
      };
      return { ...prev, election_roles_builder: next };
    });
  };

  const handleRemoveCandidateFromRole = (rIdx, cIdx) => {
    setPollForm((prev) => {
      const next = [...prev.election_roles_builder];
      if (next[rIdx].candidates.length <= 1) return prev;
      next[rIdx] = {
        ...next[rIdx],
        candidates: next[rIdx].candidates.filter((_, idx) => idx !== cIdx),
      };
      return { ...prev, election_roles_builder: next };
    });
  };

  const handleCandidateFieldChange = (rIdx, cIdx, field, value) => {
    setPollForm((prev) => {
      const next = [...prev.election_roles_builder];
      const nextCands = [...next[rIdx].candidates];
      nextCands[cIdx] = { ...nextCands[cIdx], [field]: value };
      next[rIdx] = { ...next[rIdx], candidates: nextCands };
      return { ...prev, election_roles_builder: next };
    });
  };

  const handleInternalOfficerSelect = (userId) => {
    const member = (allApprovedUsers.length > 0 ? allApprovedUsers : associationMembers).find(
      (m) => String(m.id) === String(userId)
    );
    if (member) {
      setPollForm((prev) => ({
        ...prev,
        internal_officer_id: member.id,
        internal_officer_name: member.name,
        internal_officer_contact: member.door_number
          ? `Door ${member.door_number}${member.phone ? `, Tel: ${member.phone}` : ''}`
          : member.phone || member.email || '',
      }));
    } else {
      setPollForm((prev) => ({
        ...prev,
        internal_officer_id: '',
        internal_officer_name: '',
        internal_officer_contact: '',
      }));
    }
  };

  const handleExternalOfficerSelect = (userId) => {
    const member = (allApprovedUsers.length > 0 ? allApprovedUsers : associationMembers).find(
      (m) => String(m.id) === String(userId)
    );
    if (member) {
      setPollForm((prev) => ({
        ...prev,
        external_officer_id: member.id,
        external_officer_name: member.name,
        external_officer_contact: member.door_number
          ? `Door ${member.door_number}${member.phone ? `, Tel: ${member.phone}` : ''}`
          : member.phone || member.email || '',
        external_officer_org: member.role === 'admin' ? 'Layout Admin / Observer' : 'Resident Member / Returning Officer',
      }));
    } else {
      setPollForm((prev) => ({
        ...prev,
        external_officer_id: '',
        external_officer_name: '',
        external_officer_contact: '',
        external_officer_org: '',
      }));
    }
  };

  // Add Single Vendor Form (for adding more to an existing active poll)
  const [vendorForm, setVendorForm] = useState({
    name: '',
    company: '',
    contact: '',
    quotation: '',
    notes: '',
    documentFile: null,
  });

  const [submitting, setSubmitting] = useState(false);

  // Fetch all polls
  const fetchPolls = useCallback(async (preserveSelectedId = null) => {
    try {
      setLoading(true);
      const [pollsRes, usersRes] = await Promise.allSettled([
        api.get('/voting/polls'),
        api.get('/users'),
      ]);

      let list = [];
      if (pollsRes.status === 'fulfilled') {
        const raw = pollsRes.value.data?.data || pollsRes.value.data || [];
        list = Array.isArray(raw) ? raw : [];
        setPolls(list);
      }

      if (usersRes.status === 'fulfilled') {
        const rawUsers = usersRes.value.data?.data || usersRes.value.data || [];
        const allApproved = Array.isArray(rawUsers) ? rawUsers.filter((u) => u.status === 'approved') : [];
        const residentMembersOnly = allApproved.filter((u) => u.role === 'member');
        setAllApprovedUsers(allApproved);
        setAssociationMembers(residentMembersOnly);
      }

      // Select targeted or first poll
      const targetId = preserveSelectedId || selectedPoll?.id || list[0]?.id;
      if (targetId) {
        fetchPollDetail(targetId);
      } else {
        setSelectedPoll(null);
      }
    } catch (err) {
      console.error('Failed to load polls:', err);
      toast.error('Failed to fetch voting polls');
    } finally {
      setLoading(false);
    }
  }, [selectedPoll?.id]);

  // Fetch poll detail with vendors and live results
  const fetchPollDetail = async (pollId) => {
    try {
      setLoadingDetail(true);
      const res = await api.get(`/voting/polls/${pollId}`);
      const detail = res.data?.data || res.data;
      setSelectedPoll(detail);
    } catch (err) {
      console.error('Failed to load poll details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, []);

  // Socket.io for live updates
  useEffect(() => {
    if (!socket) return;

    const handleVoteUpdate = (data) => {
      if (selectedPoll && String(data.pollId || data.poll_id) === String(selectedPoll.id)) {
        toast('New vote cast in this poll!', { icon: '🗳️' });
        fetchPollDetail(selectedPoll.id);
      }
    };

    const handlePollEnded = (data) => {
      if (selectedPoll && String(data.poll_id) === String(selectedPoll.id)) {
        toast.success(data.auto_ended ? 'All eligible members voted! Poll automatically concluded.' : 'Poll has been closed.');
        fetchPollDetail(selectedPoll.id);
        fetchPolls(selectedPoll.id);
      }
    };

    socket.on('vote:cast', handleVoteUpdate);
    socket.on('vote:results', handleVoteUpdate);
    socket.on('poll:ended', handlePollEnded);

    return () => {
      socket.off('vote:cast', handleVoteUpdate);
      socket.off('vote:results', handleVoteUpdate);
      socket.off('poll:ended', handlePollEnded);
    };
  }, [socket, selectedPoll]);

  // Handle Vendor Form Dynamic Addition in Poll Creation
  const handleAddVendorOption = () => {
    setPollForm((prev) => ({
      ...prev,
      vendors: [
        ...prev.vendors,
        { name: '', company: '', contact: '', quotation: '', notes: '' },
      ],
    }));
  };

  const handleRemoveVendorOption = (index) => {
    if (pollForm.vendors.length <= 1) return;
    setPollForm((prev) => ({
      ...prev,
      vendors: prev.vendors.filter((_, i) => i !== index),
    }));
  };

  const handleVendorFieldChange = (index, field, value) => {
    setPollForm((prev) => {
      const nextVendors = [...prev.vendors];
      nextVendors[index] = { ...nextVendors[index], [field]: value };
      return { ...prev, vendors: nextVendors };
    });
  };

  // Create Poll Submit
  const handleCreatePoll = async (e) => {
    e.preventDefault();
    if (!pollForm.title.trim() || !pollForm.start_date || !pollForm.end_date) {
      toast.error('Title, start date, and end date are required');
      return;
    }

    if (pollForm.poll_type === 'vendor_selection') {
      const validVendors = pollForm.vendors.filter((v) => v.name.trim());
      if (validVendors.length < 2) {
        toast.error('Please provide at least 2 vendor proposals for members to choose between');
        return;
      }
    }

    if (pollForm.poll_type === 'election') {
      if (!pollForm.internal_officer_name.trim()) {
        toast.error('Please select an Internal Polling Officer from approved association members');
        return;
      }
      if (!pollForm.external_officer_name.trim()) {
        toast.error('Please specify the External Polling Officer name');
        return;
      }
      const validRoles = pollForm.election_roles_builder.filter((r) => r.role_name.trim());
      if (validRoles.length === 0) {
        toast.error('Please provide at least one role/designation for the election');
        return;
      }
      for (const r of validRoles) {
        const cands = (r.candidates || []).filter((c) => c.name.trim());
        if (cands.length < 1) {
          toast.error(`Please add at least 1 candidate for role "${r.role_name}"`);
          return;
        }
      }
    }

    if (pollForm.target_audience === 'street' && !pollForm.target_street.trim()) {
      toast.error('Please specify the target street/block name');
      return;
    }

    if (pollForm.target_audience === 'selected' && (!pollForm.target_user_ids || pollForm.target_user_ids.length === 0)) {
      toast.error('Please select at least one member for the designated committee list');
      return;
    }

    try {
      setSubmitting(true);
      const candidatesPayload = [];
      const rolesPayload = [];
      if (pollForm.poll_type === 'election') {
        pollForm.election_roles_builder.forEach((r) => {
          const rName = r.role_name.trim();
          if (rName) {
            rolesPayload.push(rName);
            (r.candidates || []).forEach((c) => {
              if (c.name.trim()) {
                candidatesPayload.push({
                  name: c.name.trim(),
                  company: rName,
                  contesting_role: rName,
                  contact: c.contact.trim(),
                  notes: c.notes.trim(),
                });
              }
            });
          }
        });
      }

      const payload = {
        title: pollForm.title.trim(),
        description: pollForm.description.trim(),
        start_date: new Date(pollForm.start_date).toISOString(),
        end_date: new Date(pollForm.end_date).toISOString(),
        is_anonymous: Boolean(pollForm.is_anonymous),
        poll_type: pollForm.poll_type,
        service_category: pollForm.poll_type === 'vendor_selection' ? pollForm.service_category : null,
        resolution_task_type: pollForm.poll_type === 'resolution_passing' ? pollForm.resolution_task_type : null,
        target_audience: pollForm.target_audience,
        target_street: pollForm.target_audience === 'street' ? pollForm.target_street.trim() : null,
        target_user_ids: pollForm.target_audience === 'selected' ? pollForm.target_user_ids : [],
        vendors: pollForm.poll_type === 'vendor_selection' ? pollForm.vendors.filter((v) => v.name.trim()) : [],
        // Election payload
        election_type: pollForm.poll_type === 'election' ? pollForm.election_type : null,
        internal_officer_name: pollForm.poll_type === 'election' ? pollForm.internal_officer_name.trim() : null,
        internal_officer_contact: pollForm.poll_type === 'election' ? pollForm.internal_officer_contact.trim() : null,
        external_officer_name: pollForm.poll_type === 'election' ? pollForm.external_officer_name.trim() : null,
        external_officer_contact: pollForm.poll_type === 'election' ? `${pollForm.external_officer_contact.trim()}${pollForm.external_officer_org ? ` (${pollForm.external_officer_org.trim()})` : ''}` : null,
        election_roles: rolesPayload,
        candidates: candidatesPayload,
      };

      const res = await api.post('/voting/polls', payload);
      toast.success(
        pollForm.poll_type === 'election'
          ? 'Association Election poll created successfully with polling officers!'
          : pollForm.poll_type === 'resolution_passing'
          ? 'Resolution poll created with automatic Yes/No options!'
          : 'Service vendor poll created successfully!'
      );
      setIsCreatePollOpen(false);

      // Reset Form
      setPollForm({
        poll_type: 'vendor_selection',
        service_category: 'Plumber',
        resolution_task_type: 'Infrastructure & Road Tarring',
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        is_anonymous: false,
        target_audience: 'all',
        target_street: '',
        target_user_ids: [],
        vendors: [{ name: '', company: '', contact: '', quotation: '', notes: '' }],
        election_type: 'all_roles',
        internal_officer_id: '',
        internal_officer_name: '',
        internal_officer_contact: '',
        external_officer_id: '',
        external_officer_name: '',
        external_officer_contact: '',
        external_officer_org: '',
        external_officer_is_manual: false,
        election_roles_builder: [
          {
            role_name: 'President',
            candidates: [
              { name: '', contact: '', notes: '' },
              { name: '', contact: '', notes: '' },
            ],
          },
        ],
      });

      const newPoll = res.data?.data || res.data;
      fetchPolls(newPoll?.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create poll');
    } finally {
      setSubmitting(false);
    }
  };

  // Add Vendor Proposal (To existing poll)
  const handleAddVendor = async (e) => {
    e.preventDefault();
    if (!selectedPoll) return;
    if (!vendorForm.name.trim()) {
      toast.error('Vendor or quotation name is required');
      return;
    }

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append('name', vendorForm.name.trim());
      data.append('company', vendorForm.company.trim());
      data.append('contact', vendorForm.contact.trim());
      data.append('quotation', vendorForm.quotation ? String(vendorForm.quotation) : '');
      data.append('notes', vendorForm.notes.trim());

      if (vendorForm.documentFile) {
        data.append('document', vendorForm.documentFile);
      }

      await api.post(`/voting/polls/${selectedPoll.id}/vendors`, data);
      toast.success('Vendor proposal added to poll!');
      setIsAddVendorOpen(false);
      setVendorForm({
        name: '',
        company: '',
        contact: '',
        quotation: '',
        notes: '',
        documentFile: null,
      });
      fetchPollDetail(selectedPoll.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add vendor proposal');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Vendor
  const handleDeleteVendor = async (vendorId) => {
    if (!confirm('Remove this proposal from the poll?')) return;
    try {
      await api.delete(`/voting/vendors/${vendorId}`);
      toast.success('Proposal removed');
      fetchPollDetail(selectedPoll.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove proposal');
    }
  };

  // Admin "End Poll Now" button
  const handleEndPollNow = async () => {
    if (!selectedPoll) return;
    if (
      !confirm(
        `Are you sure you want to end poll "${selectedPoll.title}" now? Voting will conclude immediately and final results will be locked for all members.`
      )
    ) {
      return;
    }

    try {
      await api.post(`/voting/polls/${selectedPoll.id}/end`);
      toast.success('Poll ended immediately by admin choice. Results are finalized!');
      fetchPollDetail(selectedPoll.id);
      fetchPolls(selectedPoll.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to end poll');
    }
  };

  // Confirm Delete Poll
  const handleConfirmDeletePoll = async () => {
    if (!pollToDelete) return;
    try {
      setSubmitting(true);
      await api.delete(`/voting/polls/${pollToDelete.id}`);
      toast.success('Poll deleted successfully');
      setIsDeleteConfirmOpen(false);
      setPollToDelete(null);
      fetchPolls();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete poll');
    } finally {
      setSubmitting(false);
    }
  };

  // Export Excel
  const handleExportExcel = async (pollId) => {
    try {
      toast.loading('Generating Excel report...', { id: 'export' });
      const response = await api.get(`/voting/polls/${pollId}/export/excel`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `poll-${pollId}-results.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Excel report downloaded!', { id: 'export' });
    } catch (err) {
      toast.error('Failed to export Excel', { id: 'export' });
    }
  };

  // Winner vendor calculation
  const winnerVendor = useMemo(() => {
    if (!selectedPoll || !selectedPoll.vendors || selectedPoll.vendors.length === 0) return null;
    let max = -1;
    let winner = null;
    selectedPoll.vendors.forEach((v) => {
      const count = Number(v.vote_count || v.votes || 0);
      if (count > max && count > 0) {
        max = count;
        winner = v;
      }
    });
    return winner;
  }, [selectedPoll]);

  // Chart data
  const chartData = useMemo(() => {
    if (!selectedPoll || !selectedPoll.vendors) return [];
    return selectedPoll.vendors.map((v) => ({
      name: v.name,
      shortName: v.name.length > 18 ? v.name.substring(0, 16) + '...' : v.name,
      votes: Number(v.vote_count || v.votes || 0),
      percentage: v.percentage || 0,
      isWinner: winnerVendor?.id === v.id,
    }));
  }, [selectedPoll, winnerVendor]);

  const barColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <HiChartBar className="w-7 h-7 text-primary-600 dark:text-cyan-400" />
            Voting & Polls Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Service Vendor Selections, Layout Resolution Voting, Targeted Street Polling, and Live Results.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreatePollOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <HiPlus className="w-4 h-4" />
            <span>Create New Poll</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left List (1 col) + Right Detail (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Polls List */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Community Voting & Election Polls ({polls.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-slate-800 overflow-y-auto max-h-[700px] flex-1">
            {polls.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400 dark:text-gray-500">
                No voting polls created yet. Click "Create New Poll" to start one.
              </div>
            ) : (
              polls.map((poll) => {
                const isSelected = selectedPoll?.id === poll.id;
                const isClosed = poll.status === 'closed' || poll.computed_status === 'closed';

                return (
                  <div
                    key={poll.id}
                    onClick={() => fetchPollDetail(poll.id)}
                    className={`p-4 cursor-pointer transition border-b border-gray-100 dark:border-slate-800/80 ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-slate-800 border-l-4 border-l-primary-600 dark:border-l-cyan-400'
                        : 'hover:bg-gray-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          poll.poll_type === 'election'
                            ? 'bg-amber-100 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-600'
                            : poll.poll_type === 'resolution_passing'
                            ? 'bg-purple-100 dark:bg-purple-900/70 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-600'
                            : 'bg-blue-100 dark:bg-blue-900/70 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-600'
                        }`}
                      >
                        {poll.poll_type === 'election'
                          ? '🗳️ Multi-Role Election'
                          : poll.poll_type === 'resolution_passing'
                          ? 'Resolution'
                          : 'Vendor Select'}
                      </span>

                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          isClosed
                            ? 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-slate-600'
                            : 'bg-emerald-100 dark:bg-emerald-900/70 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-600 animate-pulse'
                        }`}
                      >
                        {isClosed ? 'Closed' : 'Live Active'}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{poll.title}</h3>

                    {poll.poll_type === 'election' && (
                      <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300 mt-0.5">
                        {poll.internal_officer_name ? `Officers: ${poll.internal_officer_name} & ${poll.external_officer_name || 'External'}` : 'Association Committee Election'}
                      </p>
                    )}
                    {poll.service_category && (
                      <p className="text-[11px] font-medium text-blue-600 dark:text-cyan-300 mt-0.5">
                        Category: {poll.service_category}
                      </p>
                    )}
                    {poll.resolution_task_type && (
                      <p className="text-[11px] font-medium text-purple-600 dark:text-purple-300 mt-0.5">
                        Task: {poll.resolution_task_type}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 font-semibold mt-2 pt-1 border-t border-gray-100 dark:border-slate-700/60">
                      <span>{poll.total_votes || 0} votes cast</span>
                      <span>
                        Ends {poll.end_date ? format(new Date(poll.end_date), 'dd MMM yyyy') : ''}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Poll Detail & Live Results */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedPoll ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-gray-100 dark:border-slate-800 text-center text-gray-400 dark:text-gray-500">
              Select a poll from the list or create a new one to view live votes and results.
            </div>
          ) : (
            <>
              {/* Poll Header Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          selectedPoll.poll_type === 'election'
                            ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                            : selectedPoll.poll_type === 'resolution_passing'
                            ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800'
                            : 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
                        }`}
                      >
                        {selectedPoll.poll_type === 'election'
                          ? '🗳️ Association Election: Multi-Role Ballot'
                          : selectedPoll.poll_type === 'resolution_passing'
                          ? `Resolution: ${selectedPoll.resolution_task_type || 'General'}`
                          : `Vendor Selection: ${selectedPoll.service_category || 'Service'}`}
                      </span>

                      <span
                        className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          selectedPoll.status === 'closed'
                            ? 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                            : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                        }`}
                      >
                        {selectedPoll.status === 'closed' ? 'Closed' : 'Voting In Progress'}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedPoll.title}</h2>
                    {selectedPoll.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{selectedPoll.description}</p>
                    )}
                  </div>

                  {/* Actions: End Poll Now, Export, Delete */}
                  <div className="flex items-center gap-2">
                    {selectedPoll.status === 'active' && (
                      <button
                        onClick={handleEndPollNow}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
                      >
                        <HiStopCircle className="w-4 h-4" />
                        <span>End Poll Now</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleExportExcel(selectedPoll.id)}
                      className="p-2 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg text-xs font-medium transition"
                      title="Download Excel Report"
                    >
                      <HiArrowDownTray className="w-4 h-4" />
                    </button>

                    {(() => {
                      const votesExist = checkHasVotes(selectedPoll);
                      if (votesExist && !isSuperAdmin) {
                        return (
                          <button
                            type="button"
                            disabled
                            className="p-2 border border-gray-200 text-gray-400 bg-gray-50 rounded-lg text-xs font-medium cursor-not-allowed opacity-60 flex items-center gap-1"
                            title="Votes have already been recorded. Only Super Admin has permission to delete this poll."
                          >
                            <HiLockClosed className="w-4 h-4 text-gray-400" />
                          </button>
                        );
                      }
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setPollToDelete(selectedPoll);
                            setIsDeleteConfirmOpen(true);
                          }}
                          className={`p-2 border rounded-lg text-xs font-medium transition ${
                            votesExist && isSuperAdmin
                              ? 'border-red-300 text-red-600 bg-red-50 hover:bg-red-100 ring-1 ring-red-300'
                              : 'border-gray-200 text-red-600 hover:bg-red-50'
                          }`}
                          title={
                            votesExist && isSuperAdmin
                              ? 'Delete Poll (Super Admin Override - Recorded votes will be cleared)'
                              : 'Delete Poll'
                          }
                        >
                          <HiTrash className="w-4 h-4" />
                        </button>
                      );
                    })()}
                  </div>
                </div>

                {/* Election Polling Officers Banner (If election) */}
                {selectedPoll.poll_type === 'election' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/80 text-xs">
                    <div className="flex items-start gap-2.5">
                      <span className="text-xl mt-0.5">🏛️</span>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300 block">
                          Internal Polling Officer (Resident Member)
                        </span>
                        <p className="font-bold text-gray-900 dark:text-white text-sm mt-0.5">
                          {selectedPoll.internal_officer_name || 'Not assigned'}
                        </p>
                        {selectedPoll.internal_officer_contact && (
                          <p className="text-gray-600 dark:text-gray-300 text-[11px] mt-0.5">{selectedPoll.internal_officer_contact}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 sm:border-l sm:border-amber-200 dark:sm:border-amber-800/80 sm:pl-3.5">
                      <span className="text-xl mt-0.5">🌐</span>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300 block">
                          External Polling Officer (Observer / Returning Officer)
                        </span>
                        <p className="font-bold text-gray-900 dark:text-white text-sm mt-0.5">
                          {selectedPoll.external_officer_name || 'Not assigned'}
                        </p>
                        {selectedPoll.external_officer_contact && (
                          <p className="text-gray-600 dark:text-gray-300 text-[11px] mt-0.5">{selectedPoll.external_officer_contact}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Secret Ballot Note for Admins */}
                {selectedPoll.poll_type === 'election' && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2">
                    <span className="text-base">🔒</span>
                    <span>
                      <strong>Secret Ballot Enforced:</strong> Resident members only cast their vote. Individual vote tallies are hidden from member screens. Only the winner(s) will be visible to members after election completion.
                    </span>
                  </div>
                )}

                {/* Voter Turnout Progress Bar */}
                <div className="bg-gray-50 dark:bg-slate-800/80 p-4 rounded-xl border border-gray-100 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1">
                      <HiUserGroup className="w-4 h-4 text-primary-600 dark:text-cyan-400" />
                      Voter Turnout & Participation:
                    </span>
                    <span className="font-bold text-primary-700 dark:text-cyan-400">
                      {selectedPoll.total_votes || 0} / {selectedPoll.eligible_voters_count || 'All'} eligible members voted ({selectedPoll.turnout_percentage || 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-primary-600 dark:bg-cyan-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, selectedPoll.turnout_percentage || 0)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-1">
                    <span>
                      Target Audience:{' '}
                      <strong className="text-gray-800 dark:text-gray-200">
                        {selectedPoll.target_audience === 'street'
                          ? `Street: ${selectedPoll.target_street}`
                          : selectedPoll.target_audience === 'selected'
                          ? 'Designated Committee / Selected Members'
                          : 'All Residents (This Layout Only)'}
                      </strong>
                    </span>
                    <span>
                      {selectedPoll.status === 'closed'
                        ? 'Poll Session Ended'
                        : `Scheduled until: ${selectedPoll.end_date ? format(new Date(selectedPoll.end_date), 'dd MMM yyyy, hh:mm a') : 'TBD'}`}
                    </span>
                  </div>
                </div>

                {/* Election Winners per Role (If election and closed) */}
                {selectedPoll.poll_type === 'election' && selectedPoll.status === 'closed' && selectedPoll.role_winners_summary?.length > 0 && (
                  <div className="p-4 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white rounded-xl shadow-md space-y-3">
                    <div className="flex items-center gap-2 border-b border-amber-400/40 pb-2">
                      <span className="text-2xl">🏆</span>
                      <div>
                        <h3 className="text-sm font-extrabold tracking-wide uppercase">Official Election Winners Announced</h3>
                        <p className="text-[11px] text-amber-100">Duly elected Executive Committee by association member vote</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {selectedPoll.role_winners_summary.map((rw, rIdx) => (
                        <div key={rIdx} className="bg-white/15 backdrop-blur-sm p-3 rounded-lg border border-white/20">
                          <span className="text-[10px] font-bold text-amber-200 uppercase tracking-wider block">{rw.role}</span>
                          {rw.winners.map((win, wIdx) => (
                            <div key={wIdx} className="mt-1">
                              <p className="font-extrabold text-sm text-white flex items-center gap-1">
                                <span>🎖️</span> {win.name}
                              </p>
                              {win.vote_count !== null && (
                                <span className="text-[11px] text-amber-100 font-semibold">{win.vote_count} votes</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Non-election Winner Declaration Banner (If poll is closed) */}
                {selectedPoll.poll_type !== 'election' && selectedPoll.status === 'closed' && winnerVendor && (
                  <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-4 rounded-xl shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
                        🏆
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-100 block">
                          {selectedPoll.poll_type === 'resolution_passing' ? 'Winning Decision' : 'Selected Vendor / Winning Proposal'}
                        </span>
                        <h3 className="text-base font-extrabold">{winnerVendor.name}</h3>
                        {winnerVendor.quotation && (
                          <span className="text-xs font-semibold text-amber-100">
                            Quote: ₹{parseFloat(winnerVendor.quotation).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-amber-100 block">Votes Secured</span>
                      <span className="text-xl font-black">{winnerVendor.vote_count || 0}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Results Bar Chart */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Live Polling Results</h3>
                    <p className="text-xs text-gray-500">Real-time vote tallies updated instantly as members poll</p>
                  </div>
                  <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full">
                    {selectedPoll.total_votes || 0} Total Votes
                  </span>
                </div>

                <div className="h-64 w-full">
                  {chartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-gray-400">
                      No options or proposals added to this poll yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="shortName" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-gray-900 text-white p-2.5 rounded-lg text-xs shadow-lg">
                                  <p className="font-semibold">{d.name}</p>
                                  <p className="mt-1 text-primary-300 font-bold">
                                    {d.votes} Votes ({d.percentage}%)
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="votes" radius={[6, 6, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.isWinner ? '#f59e0b' : barColors[index % barColors.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Vendors / Options Breakdown List */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      {selectedPoll.poll_type === 'election'
                        ? 'Election Contesting Candidates & Tallies'
                        : selectedPoll.poll_type === 'resolution_passing'
                        ? 'Resolution Choices'
                        : 'Vendor Quotations & Options'}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedPoll.poll_type === 'election'
                        ? 'Confidential vote counts visible only to Association Admin'
                        : 'Breakdown of options and current tallies'}
                    </p>
                  </div>

                  {selectedPoll.status === 'active' && selectedPoll.poll_type === 'vendor_selection' && (
                    <button
                      onClick={() => setIsAddVendorOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                    >
                      <HiPlus className="w-3.5 h-3.5" />
                      <span>Add Option</span>
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {!selectedPoll.vendors || selectedPoll.vendors.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400 dark:text-gray-500 italic">
                      No options found. Click "Add Option" to add proposals.
                    </div>
                  ) : selectedPoll.poll_type === 'election' ? (
                    /* Grouped by Role for Election */
                    (() => {
                      const roleGroups = {};
                      selectedPoll.vendors.forEach((v) => {
                        const rName = (v.contesting_role || v.company || 'Executive Committee Member').trim();
                        if (!roleGroups[rName]) roleGroups[rName] = [];
                        roleGroups[rName].push(v);
                      });

                      return Object.entries(roleGroups).map(([roleName, cands], rIdx) => {
                        const roleTotalVotes = cands.reduce((acc, c) => acc + Number(c.vote_count || 0), 0);

                        return (
                          <div key={rIdx} className="p-4 bg-amber-50/30 dark:bg-amber-950/20 rounded-2xl border border-amber-200/90 dark:border-amber-800/60 space-y-3">
                            <div className="flex items-center justify-between border-b border-amber-200/60 dark:border-amber-800/40 pb-2">
                              <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                                <span>🏛️</span> {roleName} Election
                              </h4>
                              <span className="text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/60 px-3 py-1 rounded-full border border-amber-300 dark:border-amber-700">
                                {cands.length} Candidate{cands.length > 1 ? 's' : ''} Standing • {roleTotalVotes} Role Votes
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {cands.map((cand, cIdx) => {
                                const vVotes = Number(cand.vote_count || 0);
                                const pct = roleTotalVotes > 0 ? Math.round((vVotes / roleTotalVotes) * 100) : 0;
                                const isWinner = cand.is_winner;

                                return (
                                  <div
                                    key={cand.id || cIdx}
                                    className={`p-3.5 rounded-xl border transition ${
                                      isWinner
                                        ? 'border-amber-400 dark:border-amber-600 bg-amber-50/80 dark:bg-amber-950/40 ring-2 ring-amber-300 dark:ring-amber-800'
                                        : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-1.5">
                                          <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100 text-[10px] font-bold flex items-center justify-center">
                                            {cIdx + 1}
                                          </span>
                                          <h5 className="text-sm font-extrabold text-gray-900 dark:text-white">{cand.name}</h5>
                                        </div>
                                        {cand.contact && (
                                          <p className="text-xs text-gray-500 dark:text-gray-400 pl-6.5">📍 {cand.contact}</p>
                                        )}
                                        {cand.notes && (
                                          <p className="text-xs text-gray-600 dark:text-gray-300 italic mt-1 bg-gray-50 dark:bg-slate-900/80 p-1.5 rounded border border-gray-100 dark:border-slate-700/60">
                                            "{cand.notes}"
                                          </p>
                                        )}
                                      </div>

                                      <div className="text-right flex flex-col items-end">
                                        <span className="text-sm font-extrabold text-primary-700 dark:text-cyan-400">
                                          {vVotes} Votes
                                        </span>
                                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold">
                                          ({pct}%)
                                        </span>
                                        {isWinner && (
                                          <span className="mt-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500 text-white flex items-center gap-0.5">
                                            <HiTrophy className="w-3 h-3" /> {selectedPoll.status === 'closed' ? 'Elected' : 'Leading'}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mt-2.5 w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                      <div
                                        className={`h-2 rounded-full transition-all duration-300 ${
                                          isWinner ? 'bg-amber-500' : 'bg-primary-600 dark:bg-cyan-500'
                                        }`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()
                  ) : (
                    selectedPoll.vendors.map((vendor, idx) => {
                      const vVotes = Number(vendor.vote_count || vendor.votes || 0);
                      const total = selectedPoll.total_votes || 1;
                      const percentage = vendor.percentage !== undefined ? vendor.percentage : Math.round((vVotes / total) * 100);
                      const isWinner = vendor.is_winner || (winnerVendor?.id === vendor.id && selectedPoll.poll_type !== 'election');

                      return (
                        <div
                          key={vendor.id || idx}
                          className={`p-4 rounded-xl border transition ${
                            isWinner
                              ? 'border-amber-300 dark:border-amber-700 bg-amber-50/20 dark:bg-amber-950/20 ring-1 ring-amber-300'
                              : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">{vendor.name}</h4>
                                {selectedPoll.poll_type === 'election' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                    Role: {vendor.contesting_role || vendor.company || 'Executive Member'}
                                  </span>
                                )}
                                {isWinner && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                                    <HiTrophy className="w-3 h-3 text-amber-600" /> {selectedPoll.status === 'closed' ? 'Elected Winner' : 'Leading'}
                                  </span>
                                )}
                              </div>

                              {vendor.company && selectedPoll.poll_type !== 'election' && (
                                <p className="text-xs text-gray-500">Company: {vendor.company}</p>
                              )}
                              {vendor.contact && (
                                <p className="text-xs text-gray-500">Contact/Door: {vendor.contact}</p>
                              )}
                              {vendor.notes && (
                                <p className="text-xs text-gray-600 italic">"{vendor.notes}"</p>
                              )}
                            </div>

                            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1">
                              {vendor.quotation && (
                                <span className="text-sm font-bold text-gray-900 flex items-center">
                                  ₹{parseFloat(vendor.quotation).toLocaleString()}
                                </span>
                              )}
                              <span className="text-xs font-bold text-primary-600">
                                {vVotes} Votes ({percentage}%)
                              </span>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="mt-3 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                isWinner ? 'bg-amber-500' : 'bg-primary-600'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* =========================================================================
          MODAL: CREATE NEW POLL (VENDOR SELECTION OR RESOLUTION PASSING)
         ========================================================================= */}
      <Modal
        isOpen={isCreatePollOpen}
        onClose={() => setIsCreatePollOpen(false)}
        title="Create New Voting & Poll Process"
        size="lg"
      >
        <form onSubmit={handleCreatePoll} className="space-y-5">
          {/* Step 1: Poll Type Toggle */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 mb-2">
              Select Poll Type *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPollForm({ ...pollForm, poll_type: 'vendor_selection' })}
                className={`p-3.5 rounded-xl border-2 text-left transition flex items-start gap-3 cursor-pointer ${
                  pollForm.poll_type === 'vendor_selection'
                    ? 'border-blue-500 bg-blue-50/90 text-blue-950 dark:bg-blue-950/60 dark:border-blue-400 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white dark:bg-slate-800/80 dark:border-slate-700 dark:hover:border-slate-600 dark:text-gray-300'
                }`}
              >
                <HiWrenchScrewdriver className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  pollForm.poll_type === 'vendor_selection' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                }`} />
                <div>
                  <h4 className={`text-xs font-bold ${
                    pollForm.poll_type === 'vendor_selection' ? 'text-blue-950 dark:text-white' : 'text-gray-800 dark:text-gray-200'
                  }`}>
                    Service Vendor Selection
                  </h4>
                  <p className={`text-[11px] mt-0.5 leading-snug ${
                    pollForm.poll_type === 'vendor_selection'
                      ? 'text-blue-800 dark:text-blue-200 font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    Compare contractor quotes (plumber, electrician, painter).
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPollForm({ ...pollForm, poll_type: 'resolution_passing' })}
                className={`p-3.5 rounded-xl border-2 text-left transition flex items-start gap-3 cursor-pointer ${
                  pollForm.poll_type === 'resolution_passing'
                    ? 'border-purple-500 bg-purple-50/90 text-purple-950 dark:bg-purple-950/60 dark:border-purple-400 dark:text-purple-100 ring-2 ring-purple-500/20 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white dark:bg-slate-800/80 dark:border-slate-700 dark:hover:border-slate-600 dark:text-gray-300'
                }`}
              >
                <HiScale className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  pollForm.poll_type === 'resolution_passing' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'
                }`} />
                <div>
                  <h4 className={`text-xs font-bold ${
                    pollForm.poll_type === 'resolution_passing' ? 'text-purple-950 dark:text-white' : 'text-gray-800 dark:text-gray-200'
                  }`}>
                    Resolution Passing (Yes/No)
                  </h4>
                  <p className={`text-[11px] mt-0.5 leading-snug ${
                    pollForm.poll_type === 'resolution_passing'
                      ? 'text-purple-800 dark:text-purple-200 font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    Layout decisions, streetlights, gates with Yes / No member ballot.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPollForm({ ...pollForm, poll_type: 'election' })}
                className={`p-3.5 rounded-xl border-2 text-left transition flex items-start gap-3 cursor-pointer ${
                  pollForm.poll_type === 'election'
                    ? 'border-amber-500 bg-amber-50/90 text-amber-950 dark:bg-amber-950/60 dark:border-amber-400 dark:text-amber-100 ring-2 ring-amber-500/20 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white dark:bg-slate-800/80 dark:border-slate-700 dark:hover:border-slate-600 dark:text-gray-300'
                }`}
              >
                <span className="text-xl flex-shrink-0 mt-0.5">🗳️</span>
                <div>
                  <h4 className={`text-xs font-bold ${
                    pollForm.poll_type === 'election' ? 'text-amber-950 dark:text-white' : 'text-gray-800 dark:text-gray-200'
                  }`}>
                    Association Election Polling
                  </h4>
                  <p className={`text-[11px] mt-0.5 leading-snug ${
                    pollForm.poll_type === 'election'
                      ? 'text-amber-800 dark:text-amber-200 font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    Executive committee election (all roles or single role) with polling officers & secret ballot.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Conditional Controls by Poll Type */}
          {pollForm.poll_type === 'vendor_selection' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 mb-1">
                Service Category *
              </label>
              <select
                value={pollForm.service_category}
                onChange={(e) => setPollForm({ ...pollForm, service_category: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                {SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          {pollForm.poll_type === 'resolution_passing' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 mb-1">
                Resolution Task / Project Type *
              </label>
              <select
                value={pollForm.resolution_task_type}
                onChange={(e) => setPollForm({ ...pollForm, resolution_task_type: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                {RESOLUTION_TASK_TYPES.map((task) => (
                  <option key={task} value={task}>
                    {task}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Election Setup Section */}
          {pollForm.poll_type === 'election' && (
            <div className="space-y-4 p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40">
              {/* Multi-Role Election Scope Banner */}
              <div className="p-3.5 bg-amber-100/70 dark:bg-amber-900/40 rounded-xl border border-amber-300 dark:border-amber-700/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏛️</span>
                    <span className="text-xs font-black text-amber-950 dark:text-amber-200 uppercase tracking-wide">
                      Multi-Role Association Election
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-900 dark:text-amber-200 bg-amber-200/80 dark:bg-amber-800/60 px-2.5 py-0.5 rounded-full">
                    {pollForm.election_roles_builder.length} {pollForm.election_roles_builder.length === 1 ? 'Role' : 'Roles'} Configured
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1 leading-snug">
                  Role #1 is mandatory. If you want to elect multiple posts (e.g. President, Secretary, Treasurer), use the <strong>"+ Add Another Role"</strong> button below.
                </p>
              </div>

              {/* Polling Officers Assignment */}
              <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                    Official Polling Officers (Nominated by Admin) *
                  </label>
                  <span className="text-[10px] bg-amber-200/80 dark:bg-amber-800/60 text-amber-900 dark:text-amber-200 font-bold px-2 py-0.5 rounded-full">
                    2 Officers Required
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Select 1 resident member as the Internal Polling Officer, and enter 1 outside observer as the External Polling Officer.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Internal Polling Officer (Picked from Association Members) */}
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-900/50 space-y-2">
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                      🏛️ Internal Polling Officer (Resident Member) *
                    </span>
                    <select
                      value={pollForm.internal_officer_id}
                      onChange={(e) => handleInternalOfficerSelect(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                      required
                    >
                      <option value="">-- Choose Approved Member --</option>
                      {(allApprovedUsers.length > 0 ? allApprovedUsers : associationMembers).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.door_number ? `(Door ${m.door_number})` : ''} - {m.role === 'admin' ? 'Layout Admin' : 'Resident Member'}
                        </option>
                      ))}
                    </select>
                    {pollForm.internal_officer_contact && (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                        Contact: {pollForm.internal_officer_contact}
                      </p>
                    )}
                  </div>

                  {/* External Polling Officer */}
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-900/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                        🌐 External Polling Officer *
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPollForm((prev) => ({
                            ...prev,
                            external_officer_is_manual: !prev.external_officer_is_manual,
                            external_officer_id: '',
                            external_officer_name: '',
                            external_officer_contact: '',
                            external_officer_org: '',
                          }));
                        }}
                        className="text-[10px] text-amber-700 dark:text-amber-300 hover:underline font-semibold"
                      >
                        {pollForm.external_officer_is_manual ? 'Choose from Members' : 'Enter Outside Person'}
                      </button>
                    </div>

                    {!pollForm.external_officer_is_manual ? (
                      <div>
                        <select
                          value={pollForm.external_officer_id || ''}
                          onChange={(e) => handleExternalOfficerSelect(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                          required={!pollForm.external_officer_is_manual}
                        >
                          <option value="">-- Choose Approved Member --</option>
                          {(allApprovedUsers.length > 0 ? allApprovedUsers : associationMembers).map((m) => (
                            <option
                              key={m.id}
                              value={m.id}
                              disabled={String(m.id) === String(pollForm.internal_officer_id)}
                            >
                              {m.name} {m.door_number ? `(Door ${m.door_number})` : ''} - {m.role === 'admin' ? 'Layout Admin' : 'Resident Member'}
                              {String(m.id) === String(pollForm.internal_officer_id) ? ' (Already Selected as Internal Officer)' : ''}
                            </option>
                          ))}
                        </select>
                        {pollForm.external_officer_name && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 italic mt-1">
                            Selected: {pollForm.external_officer_name} ({pollForm.external_officer_contact})
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          required
                          placeholder="Outside Observer Full Name *"
                          value={pollForm.external_officer_name}
                          onChange={(e) => setPollForm({ ...pollForm, external_officer_name: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-amber-500"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Phone / Contact"
                            value={pollForm.external_officer_contact}
                            onChange={(e) => setPollForm({ ...pollForm, external_officer_contact: e.target.value })}
                            className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-lg"
                          />
                          <input
                            type="text"
                            placeholder="Agency / Designation"
                            value={pollForm.external_officer_org}
                            onChange={(e) => setPollForm({ ...pollForm, external_officer_org: e.target.value })}
                            className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-lg"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Title & Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 mb-1">
              Poll Title *
            </label>
            <input
              type="text"
              required
              placeholder={
                pollForm.poll_type === 'election'
                  ? 'e.g. Annual Executive Committee General Election 2026-2027'
                  : pollForm.poll_type === 'vendor_selection'
                  ? 'e.g. Layout Overhead Tank & Motor Plumbing Contractor Selection'
                  : 'e.g. Installation of Boom Barrier & 24/7 Security Gate at 1st Cross Road'
              }
              value={pollForm.title}
              onChange={(e) => setPollForm({ ...pollForm, title: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 mb-1">
              Description / Proposal Details
            </label>
            <textarea
              rows={3}
              placeholder="Provide background, quotation summaries, cost sharing, and guidelines for voters..."
              value={pollForm.description}
              onChange={(e) => setPollForm({ ...pollForm, description: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {/* Target Audience / Voter Eligibility */}
          {pollForm.poll_type === 'election' ? (
            <div className="bg-amber-50/70 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-950 dark:text-amber-200">
                  Voter Eligibility (This Association Only)
                </label>
                <span className="text-[10px] bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200 font-extrabold px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                  Current Layout Only
                </span>
              </div>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                <HiCheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                All Approved Resident Members of This Layout ({associationMembers.length} Members)
              </p>
              <p className="text-[11px] text-gray-600 dark:text-gray-400">
                Franchise is restricted strictly to approved residents of this community layout. External or other associations cannot view or vote.
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                  Voter Eligibility & Target Audience (This Layout Only) *
                </label>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                  Restricted to this layout
                </span>
              </div>

              {/* Modern User-Friendly Interactive Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. All Residents */}
                <div
                  onClick={() => setPollForm({ ...pollForm, target_audience: 'all' })}
                  className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between select-none ${
                    pollForm.target_audience === 'all'
                      ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/80 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      pollForm.target_audience === 'all'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                    }`}>
                      <HiUsers className="w-4 h-4" />
                    </div>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                      pollForm.target_audience === 'all'
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-gray-300 dark:border-slate-600'
                    }`}>
                      {pollForm.target_audience === 'all' && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <h5 className={`text-xs font-bold leading-tight ${
                      pollForm.target_audience === 'all'
                        ? 'text-emerald-950 dark:text-white'
                        : 'text-gray-800 dark:text-gray-100'
                    }`}>
                      All Residents
                    </h5>
                    <p className={`text-[11px] mt-0.5 leading-snug ${
                      pollForm.target_audience === 'all'
                        ? 'text-emerald-800 dark:text-emerald-200 font-medium'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      Full layout franchise ({associationMembers.length} members)
                    </p>
                  </div>
                </div>

                {/* 2. Specific Street / Block */}
                <div
                  onClick={() => setPollForm({ ...pollForm, target_audience: 'street' })}
                  className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between select-none ${
                    pollForm.target_audience === 'street'
                      ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/80 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      pollForm.target_audience === 'street'
                        ? 'bg-blue-500 text-white'
                        : 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300'
                    }`}>
                      <HiMapPin className="w-4 h-4" />
                    </div>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                      pollForm.target_audience === 'street'
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300 dark:border-slate-600'
                    }`}>
                      {pollForm.target_audience === 'street' && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <h5 className={`text-xs font-bold leading-tight ${
                      pollForm.target_audience === 'street'
                        ? 'text-blue-950 dark:text-white'
                        : 'text-gray-800 dark:text-gray-100'
                    }`}>
                      Specific Street / Block
                    </h5>
                    <p className={`text-[11px] mt-0.5 leading-snug ${
                      pollForm.target_audience === 'street'
                        ? 'text-blue-800 dark:text-blue-200 font-medium'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      Restrict to a designated lane, cross, or sector
                    </p>
                  </div>
                </div>

                {/* 3. Designated Committee */}
                <div
                  onClick={() => setPollForm({ ...pollForm, target_audience: 'selected' })}
                  className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between select-none ${
                    pollForm.target_audience === 'selected'
                      ? 'border-purple-500 bg-purple-50/80 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 ring-2 ring-purple-500/20 shadow-xs'
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/80 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      pollForm.target_audience === 'selected'
                        ? 'bg-purple-500 text-white'
                        : 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300'
                    }`}>
                      <HiUserGroup className="w-4 h-4" />
                    </div>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                      pollForm.target_audience === 'selected'
                        ? 'border-purple-600 bg-purple-600 text-white'
                        : 'border-gray-300 dark:border-slate-600'
                    }`}>
                      {pollForm.target_audience === 'selected' && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <h5 className={`text-xs font-bold leading-tight ${
                      pollForm.target_audience === 'selected'
                        ? 'text-purple-950 dark:text-white'
                        : 'text-gray-800 dark:text-gray-100'
                    }`}>
                      Designated Committee
                    </h5>
                    <p className={`text-[11px] mt-0.5 leading-snug ${
                      pollForm.target_audience === 'selected'
                        ? 'text-purple-800 dark:text-purple-200 font-medium'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      Hand-pick committee members
                    </p>
                  </div>
                </div>
              </div>

              {/* Conditional: Street Input */}
              {pollForm.target_audience === 'street' && (
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/60 space-y-1.5">
                  <label className="block text-[11px] font-bold text-blue-900 dark:text-blue-200">
                    Specify Target Street / Block Name (e.g. 1st Cross Street, Main Avenue):
                  </label>
                  <div className="relative">
                    <HiMapPin className="w-4 h-4 text-blue-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1st Cross Street, Block B"
                      value={pollForm.target_street}
                      onChange={(e) => setPollForm({ ...pollForm, target_street: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-blue-300 dark:border-blue-800 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Conditional: Selected Committee Members */}
              {pollForm.target_audience === 'selected' && (
                <div className="p-3.5 bg-purple-50/60 dark:bg-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-900/60 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="block text-xs font-bold text-purple-950 dark:text-purple-200">
                        Select Committee Members Allowed to Vote:
                      </label>
                      <p className="text-[11px] text-purple-800/80 dark:text-purple-300">
                        Only checked members will have access to vote on this ballot.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] bg-purple-200 dark:bg-purple-900/80 text-purple-950 dark:text-purple-200 font-bold px-2.5 py-0.5 rounded-full">
                        {(pollForm.target_user_ids || []).length} / {associationMembers.length} Selected
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const allIds = associationMembers.map((m) => m.id);
                          const isAllSelected = (pollForm.target_user_ids || []).length === allIds.length;
                          setPollForm({
                            ...pollForm,
                            target_user_ids: isAllSelected ? [] : allIds,
                          });
                        }}
                        className="text-[11px] text-purple-700 dark:text-purple-300 hover:underline font-bold cursor-pointer"
                      >
                        {(pollForm.target_user_ids || []).length === associationMembers.length ? 'Clear All' : 'Select All'}
                      </button>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-purple-200 dark:border-slate-700 rounded-xl p-2 space-y-1 bg-white dark:bg-slate-800 divide-y divide-gray-100 dark:divide-slate-750">
                    {associationMembers.length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500 p-3 text-center">No approved members found in this layout.</p>
                    ) : (
                      associationMembers.map((m) => {
                        const isChecked = (pollForm.target_user_ids || []).includes(m.id);
                        return (
                          <label
                            key={m.id}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition ${
                              isChecked
                                ? 'bg-purple-50/70 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200'
                                : 'hover:bg-gray-50 dark:hover:bg-slate-700/60 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setPollForm({
                                      ...pollForm,
                                      target_user_ids: [...(pollForm.target_user_ids || []), m.id],
                                    });
                                  } else {
                                    setPollForm({
                                      ...pollForm,
                                      target_user_ids: (pollForm.target_user_ids || []).filter((id) => id !== m.id),
                                    });
                                  }
                                }}
                                className="rounded border-gray-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
                              />
                              <div>
                                <span className="font-bold text-gray-900 dark:text-white block">{m.name}</span>
                                <span className="text-[11px] text-gray-400 dark:text-gray-500 block">
                                  {m.email} {m.phone ? `• ${m.phone}` : ''}
                                </span>
                              </div>
                            </div>
                            {m.door_number && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                                Door {m.door_number}
                              </span>
                            )}
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Vendors Input (Only for Service Vendor Selection) */}
          {pollForm.poll_type === 'vendor_selection' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                  Vendor Candidates / Options ({pollForm.vendors.length})
                </label>
                <button
                  type="button"
                  onClick={handleAddVendorOption}
                  className="text-xs font-bold text-primary-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <HiPlus className="w-3.5 h-3.5" /> Add Another Vendor Option
                </button>
              </div>

              {pollForm.vendors.map((vendor, vIdx) => (
                <div
                  key={vIdx}
                  className="p-3 bg-gray-50 dark:bg-slate-800/70 border border-gray-200 dark:border-slate-700 rounded-xl space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-primary-800 dark:text-cyan-300">
                      Option #{vIdx + 1}
                    </span>
                    {pollForm.vendors.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveVendorOption(vIdx)}
                        className="text-gray-400 hover:text-red-600 p-1 cursor-pointer"
                        title="Remove Option"
                      >
                        <HiTrash className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Vendor / Agency Name *"
                      value={vendor.name}
                      onChange={(e) => handleVendorFieldChange(vIdx, 'name', e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-lg placeholder-gray-400 dark:placeholder-gray-500"
                    />
                    <input
                      type="number"
                      placeholder="Quotation (₹)"
                      value={vendor.quotation}
                      onChange={(e) => handleVendorFieldChange(vIdx, 'quotation', e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-lg placeholder-gray-400 dark:placeholder-gray-500"
                    />
                    <input
                      type="text"
                      placeholder="Contact / Phone"
                      value={vendor.contact}
                      onChange={(e) => handleVendorFieldChange(vIdx, 'contact', e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-lg placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Short proposal notes or terms (optional)"
                    value={vendor.notes}
                    onChange={(e) => handleVendorFieldChange(vIdx, 'notes', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-lg placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              ))}
            </div>
          ) : pollForm.poll_type === 'resolution_passing' ? (
            /* Resolution passing Yes/No note */
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-900/50 flex items-center justify-between text-xs text-purple-900 dark:text-purple-200">
              <span className="font-semibold">Automatic Ballot Options:</span>
              <div className="flex gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold">
                  ✓ Yes (In Favor / Approve)
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 font-bold">
                  ✗ No (Against / Reject)
                </span>
              </div>
            </div>
          ) : (
            /* Election Contesting Roles & Candidates Builder */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                    Executive Committee Roles & Candidates ({pollForm.election_roles_builder.length} {pollForm.election_roles_builder.length === 1 ? 'Role' : 'Roles'}) *
                  </label>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Role #1 is mandatory. If you want to elect multiple roles, click "+ Add Another Role" to configure more posts.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddElectionRole}
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 dark:text-amber-100 hover:text-amber-950 bg-amber-200/90 dark:bg-amber-800/60 hover:bg-amber-300 px-3 py-1.5 rounded-lg border border-amber-400 dark:border-amber-700 transition cursor-pointer shadow-xs active:scale-95"
                >
                  <HiPlus className="w-3.5 h-3.5" />
                  <span>+ Add Another Role</span>
                </button>
              </div>

              {pollForm.election_roles_builder.map((roleObj, rIdx) => (
                <div
                  key={rIdx}
                  className="p-4 bg-amber-50/40 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-amber-500 text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                        #{rIdx + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                            Role #{rIdx + 1} Post Name * {rIdx === 0 ? <span className="text-red-600 dark:text-red-400 font-bold">(Mandatory Role)</span> : <span className="text-amber-700 dark:text-amber-300 font-medium">(Additional Role)</span>}
                          </label>
                        </div>
                        <input
                          type="text"
                          required
                          placeholder={rIdx === 0 ? "e.g. President" : rIdx === 1 ? "e.g. Secretary" : rIdx === 2 ? "e.g. Treasurer" : "e.g. Vice President"}
                          value={roleObj.role_name}
                          onChange={(e) => handleRoleNameChange(rIdx, e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 font-bold text-gray-900 dark:text-white border border-amber-300 dark:border-amber-700 rounded-lg focus:ring-2 focus:ring-amber-500 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                      </div>
                    </div>

                    {rIdx > 0 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveElectionRole(rIdx)}
                        className="text-gray-400 hover:text-red-600 p-1.5 self-end mb-1 cursor-pointer transition rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                        title="Remove this role"
                      >
                        <HiTrash className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Contesting Candidates under this role */}
                  <div className="space-y-2 pt-2 border-t border-amber-200/50 dark:border-amber-900/40">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-amber-950 dark:text-amber-200 uppercase tracking-wide">
                        🏛️ {roleObj.role_name ? `${roleObj.role_name} Election` : 'Role'} — Contesting Members ({(roleObj.candidates || []).length})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddCandidateToRole(rIdx)}
                        className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <HiPlus className="w-3 h-3" /> Add Candidate
                      </button>
                    </div>

                    {(roleObj.candidates || []).map((cand, cIdx) => (
                      <div
                        key={cIdx}
                        className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                            Candidate #{cIdx + 1}
                          </span>
                          {roleObj.candidates.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCandidateFromRole(rIdx, cIdx)}
                              className="text-gray-400 hover:text-red-600 p-0.5 cursor-pointer"
                              title="Remove Candidate"
                            >
                              <HiTrash className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Candidate Full Name *"
                            value={cand.name}
                            onChange={(e) => handleCandidateFieldChange(rIdx, cIdx, 'name', e.target.value)}
                            className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-lg placeholder-gray-400 dark:placeholder-gray-500"
                          />
                          <input
                            type="text"
                            placeholder="Door / Contact / Flat Details"
                            value={cand.contact}
                            onChange={(e) => handleCandidateFieldChange(rIdx, cIdx, 'contact', e.target.value)}
                            className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-lg placeholder-gray-400 dark:placeholder-gray-500"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Candidate manifesto or note (optional)"
                          value={cand.notes}
                          onChange={(e) => handleCandidateFieldChange(rIdx, cIdx, 'notes', e.target.value)}
                          className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-lg placeholder-gray-400 dark:placeholder-gray-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Scheduling Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 mb-1">
                Start Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={pollForm.start_date}
                onChange={(e) => setPollForm({ ...pollForm, start_date: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 mb-1">
                End Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={pollForm.end_date}
                onChange={(e) => setPollForm({ ...pollForm, end_date: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Anonymous Ballot Checkbox */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={pollForm.is_anonymous}
                onChange={(e) => setPollForm({ ...pollForm, is_anonymous: e.target.checked })}
                className="rounded text-primary-600 focus:ring-primary-500"
              />
              <span>Keep ballot anonymous (resident identities hidden in results)</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsCreatePollOpen(false)}
              className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm disabled:opacity-50 transition cursor-pointer"
            >
              {submitting ? 'Creating Poll...' : 'Start Scheduled Poll'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ADD VENDOR OPTION TO EXISTING POLL */}
      <Modal
        isOpen={isAddVendorOpen}
        onClose={() => setIsAddVendorOpen(false)}
        title={`Add Option — ${selectedPoll?.title || ''}`}
        size="md"
      >
        <form onSubmit={handleAddVendor} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 mb-1">
              Vendor / Option Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Master Plumbing Services"
              value={vendorForm.name}
              onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 mb-1">
                Company / Agency
              </label>
              <input
                type="text"
                placeholder="e.g. Master Enterprises"
                value={vendorForm.company}
                onChange={(e) => setVendorForm({ ...vendorForm, company: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-lg placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 mb-1">
                Contact Person / Phone
              </label>
              <input
                type="text"
                placeholder="e.g. 9876543210"
                value={vendorForm.contact}
                onChange={(e) => setVendorForm({ ...vendorForm, contact: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-lg placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 mb-1">
              Quotation (INR ₹)
            </label>
            <input
              type="number"
              placeholder="e.g. 45000"
              value={vendorForm.quotation}
              onChange={(e) => setVendorForm({ ...vendorForm, quotation: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-lg placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 mb-1">
              Proposal Notes
            </label>
            <textarea
              rows={2}
              placeholder="Warranty terms, completion timeline, etc."
              value={vendorForm.notes}
              onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-lg placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsAddVendorOpen(false)}
              className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm disabled:opacity-50 transition cursor-pointer"
            >
              {submitting ? 'Adding...' : 'Add Proposal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDeletePoll}
        title={checkHasVotes(pollToDelete) ? "Delete Poll (Super Admin Override)" : "Delete Voting Poll"}
        message={
          checkHasVotes(pollToDelete)
            ? `Are you sure you want to delete "${pollToDelete?.title}"? WARNING: Votes have already been recorded on this poll. As Super Admin, proceeding will permanently remove this poll and delete all recorded ballot votes.`
            : `Are you sure you want to delete "${pollToDelete?.title}"?`
        }
        confirmText={checkHasVotes(pollToDelete) ? "Delete Poll & All Votes" : "Delete Poll"}
        isDestructive
        loading={submitting}
      />
    </div>
  );
}
