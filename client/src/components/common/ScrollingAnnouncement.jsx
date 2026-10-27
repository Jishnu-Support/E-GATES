import React, { useState, useEffect, useMemo } from 'react';
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

  // Sync if preview props change (used in Admin Panel preview)
  useEffect(() => {
    if (previewMode) {
      if (previewText !== null) setRawText(previewText);
      if (previewActive !== null) setIsActive(previewActive);
    }
  }, [previewMode, previewText, previewActive]);

  // Fetch announcement from backend if not in preview mode
  useEffect(() => {
    if (previewMode) return;
    let isMounted = true;

    const fetchAnnouncement = async () => {
      try {
        const res = await api.get('/news/scrolling-announcement');
        if (isMounted && res.data?.data) {
          setRawText(res.data.data.scrolling_announcement || '');
          setIsActive(Boolean(res.data.data.is_scrolling_active));
        }
      } catch (err) {
        // Silently catch
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

  // USER ONLY: Do NOT render for admins or super admins unless previewMode is active
  if (!previewMode && user?.role !== 'member') {
    return null;
  }

  // If inactive or no messages, do not display
  if (!isActive || messages.length === 0) {
    if (previewMode) {
      return (
        <div className="py-2 px-3 text-center text-xs text-gray-400 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-gray-200 dark:border-slate-700">
          Scrolling announcement is currently inactive or empty. Enter text below and submit to activate.
        </div>
      );
    }
    return null;
  }

  // Repeat messages multiple times so the continuous loop never has empty gaps on wide displays
  const repeatedItems = [...messages, ...messages, ...messages, ...messages];

  return (
    <div
      className={`ticker-container relative w-full overflow-hidden bg-[#1f3d27] dark:bg-[#152e1c] text-white select-none transition-colors duration-200 border-b border-[#16301d] ${className}`}
      title="Live community announcement (Hover to pause)"
    >
      <div className="flex items-center h-7 sm:h-8 px-2 sm:px-4 overflow-hidden">
        <div className="relative flex-1 overflow-hidden h-full flex items-center">
          <div className="animate-ticker items-center flex">
            {repeatedItems.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center text-xs sm:text-[13px] font-medium text-white/95 tracking-wide select-none whitespace-nowrap"
              >
                <span className="hover:text-[#f8d7ab] transition-colors cursor-default">
                  {item}
                </span>
                <span className="inline-block text-[#dfa063] font-light mx-6 sm:mx-8 text-sm select-none">
                  ✶
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
