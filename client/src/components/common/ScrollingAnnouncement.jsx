import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';

const DEFAULT_ANNOUNCEMENT = 'Jishnu Infotech\nJishnu Learning Labs';

export default function ScrollingAnnouncement({
  previewText = null,
  previewActive = null,
  previewMode = false,
  className = '',
}) {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [rawText, setRawText] = useState(previewText !== null ? previewText : DEFAULT_ANNOUNCEMENT);
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
          const incomingText = res.data.data.scrolling_announcement;
          setRawText(incomingText && incomingText.trim() ? incomingText : DEFAULT_ANNOUNCEMENT);
          setIsActive(Boolean(res.data.data.is_scrolling_active));
        }
      } catch (err) {
        // Silently catch and use default
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
          const newText = data.scrolling_announcement;
          setRawText(newText && newText.trim() ? newText : DEFAULT_ANNOUNCEMENT);
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
    const textToSplit = rawText || DEFAULT_ANNOUNCEMENT;
    return textToSplit
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .slice(0, 6);
  }, [rawText]);

  // If inactive or no messages, do not display in live website
  if (!isActive || messages.length === 0) {
    if (previewMode) {
      return (
        <div className="py-2 px-3 text-center text-xs text-gray-400 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-gray-200 dark:border-slate-700">
          Scrolling announcement is currently inactive. Enter text below and click Submit to activate.
        </div>
      );
    }
    return null;
  }

  // Repeat messages multiple times so the continuous loop never has empty gaps on wide displays
  const repeatedItems = [...messages, ...messages, ...messages, ...messages];

  return (
    <div
      className={`ticker-container relative w-full overflow-hidden bg-[#1f3d27] text-white select-none transition-colors duration-200 border-b border-[#16301d] ${className}`}
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
