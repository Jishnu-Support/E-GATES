import React, { useState, useEffect, useMemo } from 'react';
import { HiMegaphone, HiSparkles } from 'react-icons/hi2';
import api from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';

export default function ScrollingAnnouncement({
  previewText = null,
  previewActive = null,
  previewMode = false,
  className = '',
}) {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [rawText, setRawText] = useState(previewText || '');
  const [isActive, setIsActive] = useState(previewActive !== null ? previewActive : true);
  const [loading, setLoading] = useState(!previewMode);

  // Sync if preview props change (used in Admin News & Notices page)
  useEffect(() => {
    if (previewMode) {
      if (previewText !== null) setRawText(previewText);
      if (previewActive !== null) setIsActive(previewActive);
      setLoading(false);
    }
  }, [previewMode, previewText, previewActive]);

  // Fetch announcement from backend if not in preview mode
  useEffect(() => {
    if (previewMode) return;
    let isMounted = true;

    const fetchAnnouncement = async () => {
      try {
        setLoading(true);
        const res = await api.get('/news/scrolling-announcement');
        if (isMounted && res.data?.data) {
          setRawText(res.data.data.scrolling_announcement || '');
          setIsActive(Boolean(res.data.data.is_scrolling_active));
        }
      } catch (err) {
        // Silently catch if not yet initialized
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAnnouncement();

    return () => {
      isMounted = false;
    };
  }, [previewMode]);

  // Real-time socket sync
  useEffect(() => {
    if (!socket || previewMode) return;

    const handleUpdate = (data) => {
      if (data) {
        if (data.scrolling_announcement !== undefined) {
          setRawText(data.scrolling_announcement || '');
        }
        if (data.is_scrolling_active !== undefined) {
          setIsActive(Boolean(data.is_scrolling_active));
        }
      }
    };

    socket.on('news:scrolling_updated', handleUpdate);
    return () => {
      socket.off('news:scrolling_updated', handleUpdate);
    };
  }, [socket, previewMode]);

  // Split lines and sanitize messages (up to 6 lines)
  const messages = useMemo(() => {
    if (!rawText) return [];
    return rawText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .slice(0, 6);
  }, [rawText]);

  // If user only: do not render for admins unless previewMode is active
  if (!previewMode && user?.role !== 'member') {
    return null;
  }

  // If inactive or no messages, do not display
  if (!isActive || messages.length === 0) {
    if (previewMode) {
      return (
        <div className="p-3 text-center text-xs text-gray-400 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
          Scrolling announcement is currently turned off or empty. Enter text below and enable to activate.
        </div>
      );
    }
    return null;
  }

  // Duplicate items for continuous seamless loop
  const repeatedItems = [...messages, ...messages, ...messages, ...messages];

  return (
    <div
      className={`ticker-container relative w-full overflow-hidden rounded-xl sm:rounded-2xl bg-[#133c2a] dark:bg-[#0c261b] text-white border border-emerald-700/60 shadow-sm transition-all duration-300 ${className}`}
      title="Live community announcement (Hover to pause)"
    >
      <div className="flex items-center h-10 sm:h-11 px-2.5 sm:px-4">
        {/* Left Indicator Badge */}
        <div className="flex-shrink-0 flex items-center gap-1.5 bg-emerald-950/80 text-emerald-300 border border-emerald-600/40 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider shadow-inner z-10 mr-2 sm:mr-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
          </span>
          <HiMegaphone className="w-3.5 h-3.5 text-amber-300 hidden sm:inline" />
          <span className="whitespace-nowrap">Notice</span>
        </div>

        {/* Continuous Scrolling Ticker */}
        <div className="relative flex-1 overflow-hidden h-full flex items-center mask-fade-edges">
          <div className="animate-ticker items-center flex">
            {repeatedItems.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center text-xs sm:text-sm font-medium text-emerald-50 tracking-wide select-none"
              >
                <span className="hover:text-amber-200 transition-colors px-1 cursor-default">
                  {item}
                </span>
                <span className="inline-block text-amber-400 font-extrabold mx-4 text-xs sm:text-sm select-none">
                  ★
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
