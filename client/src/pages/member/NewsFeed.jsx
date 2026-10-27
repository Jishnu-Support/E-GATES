import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  HiNewspaper,
  HiBookmark,
  HiPaperClip,
  HiArrowDownTray,
  HiArrowPath,
  HiMagnifyingGlass,
  HiSpeakerWave,
  HiEye,
  HiArrowTopRightOnSquare,
} from 'react-icons/hi2';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api, { getFileUrl } from '../../services/api';
import AudioPlayer from '../../components/common/AudioPlayer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import ScrollingAnnouncement from '../../components/common/ScrollingAnnouncement';

export default function MemberNewsFeed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // File Preview Modal State (for Image & PDF / Doc)
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    type: null, // 'image' | 'pdf' | 'doc'
    url: '',
    title: '',
  });

  const fetchNews = useCallback(async () => {
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

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const resolveFileUrl = (filePath) => getFileUrl(filePath);

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
      title: title || 'Official Announcement Attachment',
    });
  };

  // Filtered & Sorted (Pinned first)
  const filteredPosts = useMemo(() => {
    return posts
      .filter((p) => {
        const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
        let matchSearch = true;
        if (searchTerm.trim()) {
          const lower = searchTerm.toLowerCase();
          matchSearch =
            (p.title && p.title.toLowerCase().includes(lower)) ||
            (p.content && p.content.toLowerCase().includes(lower));
        }
        return matchCat && matchSearch;
      })
      .sort((a, b) => {
        if (a.is_pinned === b.is_pinned) {
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        }
        return a.is_pinned ? -1 : 1;
      });
  }, [posts, categoryFilter, searchTerm]);

  // Paginated
  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage) || 1;
  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPosts.slice(start, start + itemsPerPage);
  }, [filteredPosts, currentPage, itemsPerPage]);

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'Urgent':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800">
            Urgent
          </span>
        );
      case 'Meeting':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            Meeting
          </span>
        );
      case 'Maintenance':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            Maintenance
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-slate-600">
            General
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <HiNewspaper className="w-7 h-7 text-primary-600 dark:text-cyan-400" />
            Association News & Circulars
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Stay updated with official layout notices, meeting minutes, emergency advisories, and voice circulars.
          </p>
        </div>

        <button
          onClick={fetchNews}
          title="Refresh Feed"
          className="p-2 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition self-start sm:self-auto"
        >
          <HiArrowPath className={`w-5 h-5 ${loading ? 'animate-spin text-primary-600 dark:text-cyan-400' : ''}`} />
        </button>
      </div>

      {/* Live Scrolling Announcement Ticker for residents */}
      <ScrollingAnnouncement />

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'Urgent', 'Meeting', 'Maintenance', 'General'].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategoryFilter(cat);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                categoryFilter === cat
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat === 'all' ? `All (${posts.length})` : cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search news..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Feed Content */}
      {loading ? (
        <div className="py-24 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 text-center">
          <LoadingSpinner message="Loading association news feed..." />
        </div>
      ) : filteredPosts.length === 0 ? (
        <EmptyState
          title="No announcements found"
          description="There are no news posts matching your selected category."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedPosts.map((post) => (
            <article
              key={post.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm flex flex-col justify-between overflow-hidden transition hover:shadow-md ${
                post.is_pinned
                  ? 'border-amber-300 dark:border-amber-600 ring-2 ring-amber-100 dark:ring-amber-950/40'
                  : 'border-gray-100 dark:border-slate-800'
              }`}
            >
              <div>
                {/* Image Banner with Click to View Preview */}
                {post.image && (
                  <div
                    className="h-48 w-full bg-gray-100 dark:bg-slate-800 overflow-hidden relative group cursor-pointer"
                    onClick={() => handleOpenPreview(post.image, post.title, 'image')}
                    title="Click to view full image"
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
                  {/* Category, Pin & Timestamp */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {getCategoryBadge(post.category)}
                      {post.is_pinned && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                          <HiBookmark className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          PINNED
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {post.created_at ? format(new Date(post.created_at), 'dd MMM yyyy') : ''}
                    </span>
                  </div>

                  {/* Title & Content */}
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white leading-snug">{post.title}</h2>
                    <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap mt-2 leading-relaxed">
                      {post.content}
                    </p>
                  </div>

                  {/* Audio Player for Voice Message */}
                  {post.voice_message && (
                    <div className="pt-2">
                      <AudioPlayer
                        src={resolveFileUrl(post.voice_message)}
                        title="Voice Circular"
                      />
                    </div>
                  )}

                  {/* Attachment Actions: View Option & Download */}
                  {post.attachment && (
                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(post.attachment, `${post.title} - Attachment`)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary-50 dark:bg-primary-950/50 hover:bg-primary-100 dark:hover:bg-primary-900/60 text-primary-700 dark:text-cyan-300 rounded-lg text-xs font-bold border border-primary-200 dark:border-primary-800 transition shadow-2xs"
                        title="View attachment document / PDF"
                      >
                        <HiEye className="w-4 h-4 text-primary-600 dark:text-cyan-400" />
                        <span>View Document</span>
                      </button>

                      <a
                        href={resolveFileUrl(post.attachment)}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold border border-gray-200 dark:border-slate-700 transition shadow-2xs"
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

              {/* Card Footer */}
              <div className="px-5 py-3 bg-gray-50/60 dark:bg-slate-800/60 border-t border-gray-100 dark:border-slate-800 text-[11px] text-gray-400 dark:text-gray-500 flex items-center justify-between">
                <span>Published by Layout Association Admin</span>
                <span>{post.category || 'General'}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            &larr; Previous
          </button>
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 px-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            Next &rarr;
          </button>
        </div>
      )}

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
              className="inline-flex items-center gap-1.5 text-xs text-primary-600 dark:text-cyan-400 hover:underline font-semibold"
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
                className="px-4 py-1.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col items-center justify-center p-2 min-h-[350px]">
          {previewModal.type === 'image' ? (
            <div className="w-full flex justify-center bg-gray-900/5 dark:bg-black/30 p-2 rounded-xl">
              <img
                src={previewModal.url}
                alt={previewModal.title}
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-lg shadow-md"
              />
            </div>
          ) : previewModal.type === 'pdf' ? (
            <div className="w-full h-[72vh] rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-slate-900">
              <iframe
                src={`${previewModal.url}#toolbar=1&navpanes=0`}
                title={previewModal.title}
                className="w-full h-full border-0"
              />
            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary-50 dark:bg-slate-800 text-primary-600 dark:text-cyan-400 mx-auto flex items-center justify-center text-2xl shadow-sm">
                📄
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  {previewModal.title}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
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
