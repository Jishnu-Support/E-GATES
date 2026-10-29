import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  HiNewspaper,
  HiPlus,
  HiPencilSquare,
  HiTrash,
  HiArrowPath,
  HiPaperClip,
  HiPhoto,
  HiMicrophone,
  HiStop,
  HiPlay,
  HiSpeakerWave,
  HiBookmark,
  HiEye,
  HiArrowTopRightOnSquare,
  HiArrowDownTray,
  HiCheckCircle,
} from 'react-icons/hi2';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api, { getFileUrl } from '../../services/api';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import AudioPlayer from '../../components/common/AudioPlayer';
import ScrollingAnnouncement from '../../components/common/ScrollingAnnouncement';
import { useAuth } from '../../hooks/useAuth';

export default function AdminNewsManage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [selectedPost, setSelectedPost] = useState(null);
  const [postToDelete, setPostToDelete] = useState(null);

  // File Preview Modal
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    type: null,
    url: '',
    title: '',
  });

  const handleOpenPreview = (fileUrl, title, forceType = null) => {
    if (!fileUrl) return;
    const fullUrl = resolveFileUrl(fileUrl);
    const cleanUrl = fileUrl.split('?')[0].toLowerCase();
    const isImage =
      forceType === 'image' ||
      cleanUrl.endsWith('.jpg') ||
      cleanUrl.endsWith('.jpeg') ||
      cleanUrl.endsWith('.png') ||
      cleanUrl.endsWith('.gif') ||
      cleanUrl.endsWith('.webp') ||
      cleanUrl.endsWith('.svg');
    const isPdf = forceType === 'pdf' || cleanUrl.endsWith('.pdf');

    setPreviewModal({
      isOpen: true,
      type: isImage ? 'image' : isPdf ? 'pdf' : 'doc',
      url: fullUrl,
      title: title || 'Attachment Preview',
    });
  };

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'General',
    is_pinned: false,
    imageFile: null,
    attachmentFile: null,
    audioBlob: null,
  });

  // Voice recording & preview state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [removeExistingVoice, setRemoveExistingVoice] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const recordingDurationRef = useRef(0);
  const recordingStartTimeRef = useRef(null);
  const audioFileInputRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/news');
      const raw = res.data?.data || res.data || [];
      setPosts(Array.isArray(raw) ? raw : []);
    } catch (err) {
      console.error('Failed to load news:', err);
      toast.error('Failed to load news announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  // Scrolling Announcement state (Admin-controlled live ticker for residents)
  const [scrollingText, setScrollingText] = useState('');
  const [isScrollingActive, setIsScrollingActive] = useState(true);
  const [savingScrolling, setSavingScrolling] = useState(false);

  const fetchScrollingAnnouncement = useCallback(async () => {
    try {
      const res = await api.get('/news/scrolling-announcement', {
        params: user?.association_id ? { association_id: user.association_id } : {},
      });
      if (res.data?.data) {
        setScrollingText(res.data.data.scrolling_announcement || '');
        setIsScrollingActive(Boolean(res.data.data.is_scrolling_active));
      }
    } catch (err) {
      console.warn('Could not load scrolling announcement:', err.message);
    }
  }, [user?.association_id]);

  const handleSaveScrolling = async (e) => {
    if (e) e.preventDefault();
    try {
      setSavingScrolling(true);
      await api.put('/news/scrolling-announcement', {
        association_id: user?.association_id,
        scrolling_announcement: scrollingText,
        is_scrolling_active: isScrollingActive,
      });
      toast.success(`Scrolling announcement updated for ${user?.association_name || 'your association'}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update scrolling announcement');
    } finally {
      setSavingScrolling(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchScrollingAnnouncement();
  }, [fetchPosts, fetchScrollingAnnouncement]);

  // Clean recording timer & audio context on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {
          // ignore
        }
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const resolveFileUrl = (filePath) => getFileUrl(filePath);

  const getSupportedMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav'
    ];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) {
        return c;
      }
    }
    return '';
  };

  const stopAnalyser = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  };

  // Start voice recorder with noise suppression, echo cancellation, auto gain & live level analyser
  const startRecording = async () => {
    try {
      stopAnalyser();

      if (recordedAudioUrl && recordedAudioUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(recordedAudioUrl);
        } catch {
          // ignore
        }
        setRecordedAudioUrl(null);
      }

      // 1. Get raw microphone stream without aggressive echo-cancellation voice filtering
      let rawStream;
      try {
        rawStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: true,
          },
        });
      } catch (err) {
        console.warn('Raw getUserMedia fallback:', err);
        rawStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      // 2. Active Web Audio amplification pipeline (boosts quiet mics & guarantees un-suspended clock)
      let recordStream = rawStream;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }

          const source = ctx.createMediaStreamSource(rawStream);

          // Boost microphone input by 2.5x so voice is loud, full, and clear
          const gainNode = ctx.createGain();
          gainNode.gain.value = 2.5;

          const destination = ctx.createMediaStreamDestination();
          source.connect(gainNode);
          gainNode.connect(destination);

          // Connect to analyser for live level feedback
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          gainNode.connect(analyser);

          audioContextRef.current = ctx;
          analyserRef.current = analyser;

          if (destination && destination.stream && destination.stream.getAudioTracks().length > 0) {
            recordStream = destination.stream;
          }

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkLevel = () => {
            if (analyserRef.current) {
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
              const avg = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.round((avg / 64) * 100)));
              animFrameRef.current = requestAnimationFrame(checkLevel);
            }
          };
          checkLevel();
        }
      } catch (analyserErr) {
        console.warn('Live audio analyser/gain unavailable:', analyserErr);
      }

      const mimeType = getSupportedMimeType();
      const options = {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 128000,
      };

      const mediaRecorder = new MediaRecorder(recordStream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const type = mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type });
        const audioUrl = URL.createObjectURL(audioBlob);
        const elapsedSecs = recordingStartTimeRef.current
          ? Math.max(1, Math.round((Date.now() - recordingStartTimeRef.current) / 1000))
          : (recordingDurationRef.current || 1);
        setRecordedAudioUrl(audioUrl);
        setRecordedDuration(elapsedSecs);
        setFormData((prev) => ({ ...prev, audioBlob }));
        setRemoveExistingVoice(false);
        rawStream.getTracks().forEach((track) => track.stop());
        if (recordStream !== rawStream) {
          recordStream.getTracks().forEach((track) => track.stop());
        }
        stopAnalyser();
      };

      // Start recording with 1-second chunks for clean cluster framing
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingDurationRef.current = 0;
      recordingStartTimeRef.current = Date.now();

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const next = prev + 1;
          recordingDurationRef.current = next;
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      stopAnalyser();
      toast.error('Microphone permission denied or microphone not found.');
    }
  };

  // Stop voice recorder
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    stopAnalyser();
    setIsRecording(false);
  };

  // Discard recording
  const discardRecording = () => {
    stopRecording();
    stopAnalyser();
    if (recordedAudioUrl && recordedAudioUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(recordedAudioUrl);
      } catch {
        // ignore
      }
    }
    setRecordedAudioUrl(null);
    setRecordingDuration(0);
    setRecordedDuration(0);
    setFormData((prev) => ({ ...prev, audioBlob: null }));
    setRemoveExistingVoice(true);
    if (audioFileInputRef.current) audioFileInputRef.current.value = '';
  };

  // Upload existing audio file
  const handleAudioFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|aac|ogg|webm)$/i)) {
      toast.error('Please upload a valid audio file (MP3, WAV, M4A, etc.)');
      return;
    }
    if (recordedAudioUrl && recordedAudioUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(recordedAudioUrl);
      } catch {
        // ignore
      }
    }
    const audioUrl = URL.createObjectURL(file);
    setRecordedAudioUrl(audioUrl);
    setRecordedDuration(0);
    setFormData((prev) => ({ ...prev, audioBlob: file }));
    setRemoveExistingVoice(false);

    // Extract file duration if possible
    const tempAudio = new Audio();
    tempAudio.src = audioUrl;
    tempAudio.onloadedmetadata = () => {
      if (tempAudio.duration && !isNaN(tempAudio.duration) && tempAudio.duration !== Infinity) {
        setRecordedDuration(Math.round(tempAudio.duration));
      }
    };

    toast.success('Audio file loaded for preview!');
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData({
      title: '',
      content: '',
      category: 'General',
      is_pinned: false,
      imageFile: null,
      attachmentFile: null,
      audioBlob: null,
    });
    setRecordedAudioUrl(null);
    setRecordingDuration(0);
    setRecordedDuration(0);
    setRemoveExistingVoice(false);
    if (audioFileInputRef.current) audioFileInputRef.current.value = '';
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (post) => {
    setSelectedPost(post);
    setFormData({
      title: post.title || '',
      content: post.content || '',
      category: post.category || 'General',
      is_pinned: Boolean(post.is_pinned),
      imageFile: null,
      attachmentFile: null,
      audioBlob: null,
    });
    setRecordedAudioUrl(post.voice_message ? resolveFileUrl(post.voice_message) : null);
    setRecordingDuration(0);
    setRecordedDuration(0);
    setRemoveExistingVoice(false);
    if (audioFileInputRef.current) audioFileInputRef.current.value = '';
    setIsEditModalOpen(true);
  };

  // Submit Create
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append('title', formData.title.trim());
      data.append('content', formData.content.trim());
      data.append('category', formData.category);
      data.append('is_pinned', formData.is_pinned ? 'true' : 'false');

      if (formData.imageFile) {
        data.append('image', formData.imageFile);
      }
      if (formData.attachmentFile) {
        data.append('attachment', formData.attachmentFile);
      }
      if (formData.audioBlob) {
        let ext = '.webm';
        if (formData.audioBlob.type) {
          if (formData.audioBlob.type.includes('mp4')) ext = '.mp4';
          else if (formData.audioBlob.type.includes('wav')) ext = '.wav';
          else if (formData.audioBlob.type.includes('ogg')) ext = '.ogg';
          else if (formData.audioBlob.type.includes('mpeg')) ext = '.mp3';
        }
        const defaultFilename = `voice_circular_${Date.now()}${ext}`;
        data.append('voice_message', formData.audioBlob, formData.audioBlob.name || defaultFilename);
      }

      await api.post('/news', data);
      toast.success('News announcement published!');
      setIsCreateModalOpen(false);
      fetchPosts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish post');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit
  const handleEditPost = async (e) => {
    e.preventDefault();
    if (!selectedPost) return;

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append('title', formData.title.trim());
      data.append('content', formData.content.trim());
      data.append('category', formData.category);
      data.append('is_pinned', formData.is_pinned ? 'true' : 'false');

      if (formData.imageFile) {
        data.append('image', formData.imageFile);
      }
      if (formData.attachmentFile) {
        data.append('attachment', formData.attachmentFile);
      }
      if (formData.audioBlob) {
        let ext = '.webm';
        if (formData.audioBlob.type) {
          if (formData.audioBlob.type.includes('mp4')) ext = '.mp4';
          else if (formData.audioBlob.type.includes('wav')) ext = '.wav';
          else if (formData.audioBlob.type.includes('ogg')) ext = '.ogg';
          else if (formData.audioBlob.type.includes('mpeg')) ext = '.mp3';
        }
        const defaultFilename = `voice_circular_${Date.now()}${ext}`;
        data.append('voice_message', formData.audioBlob, formData.audioBlob.name || defaultFilename);
      } else if (removeExistingVoice) {
        data.append('remove_voice_message', 'true');
      }

      await api.put(`/news/${selectedPost.id}`, data);
      toast.success('News announcement updated!');
      setIsEditModalOpen(false);
      fetchPosts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update news');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Pin
  const handleTogglePin = async (post) => {
    try {
      await api.put(`/news/${post.id}/pin`);
      toast.success(post.is_pinned ? 'Unpinned' : 'Pinned to top of resident feed');
      fetchPosts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update pin');
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    try {
      setSubmitting(true);
      await api.delete(`/news/${postToDelete.id}`);
      toast.success('News post deleted');
      setIsDeleteConfirmOpen(false);
      fetchPosts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete post');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered & Sorted (Pinned first, then date)
  const filteredPosts = useMemo(() => {
    return posts
      .filter((p) => {
        if (categoryFilter === 'all') return true;
        return p.category === categoryFilter;
      })
      .sort((a, b) => {
        if (a.is_pinned === b.is_pinned) {
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        }
        return a.is_pinned ? -1 : 1;
      });
  }, [posts, categoryFilter]);

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'Urgent':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200">Urgent</span>;
      case 'Meeting':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Meeting</span>;
      case 'Maintenance':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Maintenance</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">General</span>;
    }
  };

  const renderVoiceSection = () => (
    <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
          <HiSpeakerWave className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          Audio Voice Broadcast (Tamil / English)
        </span>
        {recordedAudioUrl && (
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-700/50">
            Voice Attached
          </span>
        )}
      </div>

      {isRecording ? (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
              </span>
              <span>Recording Voice Circular... ({recordingDuration}s)</span>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
            >
              <HiStop className="w-4 h-4" />
              <span>Stop Recording</span>
            </button>
          </div>

          {/* Real-Time Microphone Audio Wave Visualizer */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-end gap-1 h-6 shrink-0">
              {[0.3, 0.7, 1.0, 0.8, 0.4, 0.9, 0.6].map((scale, i) => {
                const heightPct = Math.max(15, Math.min(100, (audioLevel || 10) * scale * 1.5));
                return (
                  <span
                    key={i}
                    className="w-1.5 bg-rose-500 rounded-full transition-all duration-75"
                    style={{ height: `${heightPct}%` }}
                  />
                );
              })}
            </div>
            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
              {audioLevel > 5 ? '🎙️ Voice detected — microphone is recording clearly' : '🎙️ Speak clearly into your microphone...'}
            </span>
          </div>
        </div>
      ) : !recordedAudioUrl ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={startRecording}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
          >
            <HiMicrophone className="w-4 h-4" />
            <span>Record Voice Message</span>
          </button>

          <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg border border-gray-300 dark:border-slate-600 shadow-xs transition cursor-pointer">
            <HiPaperClip className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Upload Audio File (MP3 / WAV)</span>
            <input
              ref={audioFileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.webm"
              onChange={handleAudioFileUpload}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900/70 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                <HiSpeakerWave className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                  {formData.audioBlob?.name || 'Voice Circular Attached'}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <HiCheckCircle className="w-3.5 h-3.5" />
                  <span>Ready to broadcast{recordedDuration ? ` (${recordedDuration}s)` : ''}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={startRecording}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-primary-600 dark:text-cyan-400 hover:bg-primary-50 dark:hover:bg-slate-800 rounded-lg font-semibold transition cursor-pointer"
              >
                <HiArrowPath className="w-3.5 h-3.5" />
                <span>Re-record</span>
              </button>
              <button
                type="button"
                onClick={discardRecording}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg font-semibold transition cursor-pointer"
              >
                <HiTrash className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>

          {/* Embedded Full Audio Player for Instant Sound Preview */}
          <AudioPlayer
            src={recordedAudioUrl}
            title="Voice Announcement Preview"
            initialDuration={recordedDuration}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <HiNewspaper className="w-7 h-7 text-primary-600" />
            News & Announcements Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Publish circulars, emergency bulletins, audio voice messages, and media documents to residents.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <HiPlus className="w-4 h-4" />
            <span>Publish Announcement</span>
          </button>
        </div>
      </div>

      {/* Scrolling Announcement Management (Admin-controlled, live ticker for residents) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base">
                📢
              </span>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                Scrolling Announcement
              </h2>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                  isScrollingActive && scrollingText.trim()
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300'
                }`}
              >
                {isScrollingActive && scrollingText.trim() ? 'Live on Resident Portal' : 'Inactive'}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              One message per line, up to six messages. The text scrolls continuously across the header specifically for residents of <strong className="text-emerald-700 dark:text-emerald-400">{user?.association_name || 'your association'}</strong>. Other associations will not see this.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={isScrollingActive}
                onChange={(e) => setIsScrollingActive(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
              <span>Enable for Residents</span>
            </label>
            <button
              type="button"
              onClick={handleSaveScrolling}
              disabled={savingScrolling}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
            >
              {savingScrolling ? (
                <>
                  <HiArrowPath className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <HiCheckCircle className="w-3.5 h-3.5" />
                  <span>Submit Announcement</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Preview Bar */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <HiEye className="w-3.5 h-3.5 text-emerald-600" />
            Live Preview (How residents see it)
          </span>
          <ScrollingAnnouncement
            previewMode={true}
            previewText={scrollingText}
            previewActive={isScrollingActive}
          />
        </div>

        {/* Textarea Input */}
        <div>
          <textarea
            rows={3}
            value={scrollingText}
            onChange={(e) => setScrollingText(e.target.value)}
            placeholder={"Jishnu Infotech\nJishnu Learning Labs\nAnnual General Body meeting scheduled for Sunday 10 AM"}
            className="w-full text-xs sm:text-sm p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition font-mono leading-relaxed"
          />
          <div className="flex justify-between items-center text-[11px] text-gray-400 mt-1">
            <span>Separate announcements by pressing Enter (one message per line).</span>
            <span className="font-semibold text-gray-500 dark:text-gray-400">
              {scrollingText.split('\n').filter((l) => l.trim()).length} / 6 messages
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
        {['all', 'Urgent', 'Meeting', 'Maintenance', 'General'].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              categoryFilter === cat
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {cat === 'all' ? `All Announcements (${posts.length})` : cat}
          </button>
        ))}
      </div>

      {/* Posts Cards Grid */}
      {loading ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-gray-100">
          <HiArrowPath className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500">Loading announcements...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-300">
          <HiNewspaper className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-700">No announcements found</p>
          <p className="text-xs text-gray-400 mt-1">Publish an update to notify layout members.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className={`bg-white rounded-2xl border shadow-sm flex flex-col justify-between overflow-hidden transition hover:shadow-md ${
                post.is_pinned ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-200'
              }`}
            >
              <div>
                {/* Optional Top Image */}
                {post.image && (
                  <div
                    className="h-44 w-full bg-gray-100 overflow-hidden relative group cursor-pointer"
                    onClick={() => handleOpenPreview(post.image, post.title, 'image')}
                    title="Click to view image"
                  >
                    <img
                      src={resolveFileUrl(post.image)}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                      <span className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-xs text-xs font-bold flex items-center gap-1.5 shadow-lg border border-white/20">
                        <HiEye className="w-4 h-4" />
                        View Image
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-5 space-y-3">
                  {/* Category & Pin & Date */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {getCategoryBadge(post.category)}
                      {post.is_pinned && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          📌 PINNED
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400">
                      {post.created_at ? format(new Date(post.created_at), 'dd MMM yyyy') : ''}
                    </span>
                  </div>

                  {/* Title & Content */}
                  <div>
                    <h3 className="text-base font-bold text-gray-900 line-clamp-2">{post.title}</h3>
                    <p className="text-xs text-gray-600 line-clamp-3 mt-1.5 whitespace-pre-wrap">
                      {post.content}
                    </p>
                  </div>

                  {/* Audio Player if present */}
                  {post.voice_message && (
                    <div className="pt-1">
                      <AudioPlayer
                        src={resolveFileUrl(post.voice_message)}
                        title="Official Voice Circular"
                      />
                    </div>
                  )}

                  {/* Document Attachment Actions: View & Download */}
                  {post.attachment && (
                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(post.attachment, `${post.title} - Attachment`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg text-xs font-bold border border-primary-200 transition shadow-2xs"
                        title="View attachment document / PDF"
                      >
                        <HiEye className="w-4 h-4 text-primary-600" />
                        <span>View Document</span>
                      </button>

                      <a
                        href={resolveFileUrl(post.attachment)}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold border border-gray-200 dark:border-slate-700 transition shadow-2xs"
                        title="Download file to device"
                      >
                        <HiPaperClip className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                        <span>Download</span>
                        <HiArrowDownTray className="w-3.5 h-3.5 text-gray-400" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions Toolbar */}
              <div className="p-4 bg-gray-50/70 dark:bg-slate-800/60 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => handleTogglePin(post)}
                  className={`text-xs font-semibold flex items-center gap-1 px-2 py-1 rounded transition ${
                    post.is_pinned
                      ? 'text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <HiBookmark className="w-3.5 h-3.5" />
                  <span>{post.is_pinned ? 'Unpin' : 'Pin to Top'}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(post)}
                    title="Edit Announcement"
                    className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <HiPencilSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setPostToDelete(post);
                      setIsDeleteConfirmOpen(true);
                    }}
                    title="Delete Announcement"
                    className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Announcement */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Publish News Announcement"
        size="lg"
      >
        <form onSubmit={handleCreatePost} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Announcement Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Layout Annual General Meeting & Maintenance Notice"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                <option value="General">General</option>
                <option value="Urgent">Urgent Notice</option>
                <option value="Meeting">Community Meeting</option>
                <option value="Maintenance">Infrastructure Maintenance</option>
              </select>
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.is_pinned}
                  onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-gray-800">Pin Announcement at the Top</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Content / Details
            </label>
            <textarea
              rows={4}
              placeholder="Detailed description or agenda for the residents..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          {/* Voice Broadcast & Preview Section */}
          {renderVoiceSection()}

          {/* Media Attachments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Upload Banner Image
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={(e) => setFormData({ ...formData, imageFile: e.target.files[0] || null })}
                className="w-full text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Upload Document (PDF / DOC)
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) =>
                  setFormData({ ...formData, attachmentFile: e.target.files[0] || null })
                }
                className="w-full text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-750"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isRecording}
              className="px-5 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm disabled:opacity-50 transition"
            >
              {submitting ? 'Publishing...' : 'Publish Announcement'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Announcement */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit News Announcement"
        size="lg"
      >
        <form onSubmit={handleEditPost} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                <option value="General">General</option>
                <option value="Urgent">Urgent</option>
                <option value="Meeting">Meeting</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.is_pinned}
                  onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-gray-800">Pin to Top</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Content
            </label>
            <textarea
              rows={4}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          {/* Voice Broadcast & Preview Section */}
          {renderVoiceSection()}

          {/* Media Attachments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Replace Banner Image
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={(e) => setFormData({ ...formData, imageFile: e.target.files[0] || null })}
                className="w-full text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Replace Document
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) =>
                  setFormData({ ...formData, attachmentFile: e.target.files[0] || null })
                }
                className="w-full text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-750"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm disabled:opacity-50 transition"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        isLoading={submitting}
        title="Delete News Announcement"
        message={`Are you sure you want to delete "${postToDelete?.title}"? This cannot be undone.`}
        confirmText="Yes, Delete Post"
        isDanger={true}
      />

      {/* Modal for PDF and Image Viewing */}
      <Modal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, type: null, url: '', title: '' })}
        title={previewModal.title || 'Official Document & Attachment Viewer'}
        size="xl"
        footer={
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
            <a
              href={previewModal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary-600 hover:underline font-semibold"
            >
              <HiArrowTopRightOnSquare className="w-4 h-4" />
              <span>Open in New Tab</span>
            </a>

            <div className="flex items-center gap-2">
              <a
                href={previewModal.url}
                download
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
              >
                <HiArrowDownTray className="w-3.5 h-3.5" />
                <span>Download Attachment</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewModal({ isOpen: false, type: null, url: '', title: '' })}
                className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col items-center justify-center p-2 min-h-[350px]">
          {previewModal.type === 'image' ? (
            <div className="w-full flex justify-center bg-gray-900/5 p-2 rounded-xl">
              <img
                src={previewModal.url}
                alt={previewModal.title}
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-lg shadow-md"
              />
            </div>
          ) : previewModal.type === 'pdf' ? (
            <div className="w-full h-[72vh] rounded-xl overflow-hidden border border-gray-200 bg-slate-900">
              <iframe
                src={`${previewModal.url}#toolbar=1&navpanes=0`}
                title={previewModal.title}
                className="w-full h-full border-0"
              />
            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary-50 text-primary-600 mx-auto flex items-center justify-center text-2xl shadow-sm">
                📄
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">
                  {previewModal.title}
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  This document format cannot be embedded directly in the viewer frame. You can open it in a new tab or download it directly to view.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <a
                  href={previewModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  <HiArrowTopRightOnSquare className="w-4 h-4" />
                  <span>Open in Browser</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
