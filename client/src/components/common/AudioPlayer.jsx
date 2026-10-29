import React, { useState, useRef, useEffect } from 'react';
import { HiPlay, HiPause, HiSpeakerWave, HiSpeakerXMark, HiArrowPath, HiArrowDownTray } from 'react-icons/hi2';
import { getFileUrl } from '../../services/api';

export default function AudioPlayer({ src, title = 'Voice Message', initialDuration = 0, className = '' }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState(false);

  // Sync initial duration if passed
  useEffect(() => {
    if (initialDuration && initialDuration > 0) {
      setDuration(initialDuration);
    }
  }, [initialDuration]);

  // Adjust URL if relative to backend uploads or full path
  const audioUrl = getFileUrl(src);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setIsPlaying(false);
    setCurrentTime(0);
    setError(false);
    audio.volume = 1.0;
    audio.muted = isMuted;

    try {
      audio.load();
    } catch {
      // Ignore load invocation issues
    }

    const handleLoadedMetadata = () => {
      audio.volume = 1.0;
      if (audio.duration && audio.duration !== Infinity && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      } else if (initialDuration && initialDuration > 0) {
        setDuration(initialDuration);
      }
      setError(false);
    };

    const handleDurationChange = () => {
      if (audio.duration && audio.duration !== Infinity && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      const cur = audio.currentTime || 0;
      setCurrentTime(cur);

      let totalDur = duration;
      if (audio.duration && audio.duration !== Infinity && !isNaN(audio.duration)) {
        totalDur = audio.duration;
        setDuration(totalDur);
      } else {
        totalDur = Math.max(duration || 0, cur, initialDuration || 0);
        setDuration(totalDur);
      }

      // Auto-detect when audio reaches the end (prevents player getting stuck on WebM streams)
      const endThreshold = totalDur > 0 ? totalDur - 0.15 : 0;
      if (endThreshold > 0 && cur >= endThreshold) {
        setIsPlaying(false);
        setCurrentTime(0);
        if (audio) {
          audio.currentTime = 0;
        }
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (audio) {
        audio.currentTime = 0;
      }
    };

    const handleError = () => {
      console.warn('Audio element error for url:', audioUrl);
      if (!audioUrl) {
        setError(true);
      }
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl, initialDuration, isMuted]);

  const effectiveDuration = duration > 0 ? duration : (initialDuration > 0 ? initialDuration : (currentTime > 0 ? currentTime : 0));
  const percent = effectiveDuration > 0 ? Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100)) : 0;

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.volume = 1.0;
      audio.muted = isMuted;

      // If at end or near end, rewind to start before playing
      const isAtEnd =
        audio.ended ||
        (audio.duration && !isNaN(audio.duration) && audio.currentTime >= audio.duration - 0.15) ||
        (effectiveDuration > 0 && currentTime >= effectiveDuration - 0.15);

      if (isAtEnd) {
        audio.currentTime = 0;
        setCurrentTime(0);
      }

      setError(false);
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setError(false);
            if (audio.duration && audio.duration !== Infinity && !isNaN(audio.duration)) {
              setDuration(audio.duration);
            }
          })
          .catch((err) => {
            console.warn('Audio playback error:', err);
            setIsPlaying(false);
          });
      }
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const seekTime = Number(e.target.value);
    setCurrentTime(seekTime);
    try {
      audio.currentTime = seekTime;
    } catch {
      // Seek catch for unbuffered streams
    }
  };

  const handleReplay = () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
    audio.volume = 1.0;
    audio.muted = isMuted;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          setError(false);
        })
        .catch((err) => {
          console.warn('Replay error:', err);
          setIsPlaying(false);
        });
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    audioRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || timeInSeconds === Infinity || timeInSeconds <= 0) return '0:00';
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800/90 rounded-xl border border-gray-200 dark:border-slate-700 w-full shadow-2xs ${className}`}>
      <audio
        key={audioUrl}
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        playsInline
        crossOrigin="anonymous"
      />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={!audioUrl}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className="shrink-0 w-10 h-10 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center focus:outline-none transition shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
      >
        {isPlaying ? <HiPause className="w-5 h-5" /> : <HiPlay className="w-5 h-5 ml-0.5" />}
      </button>

      {/* Progress & Time */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
          <span className="font-semibold truncate text-gray-800 dark:text-gray-200">{title}</span>
          <span className="font-mono text-[11px] text-gray-600 dark:text-gray-400 font-medium shrink-0 ml-2">
            {formatTime(currentTime)} / {formatTime(effectiveDuration)}
          </span>
        </div>

        {/* High-Contrast Interactive Progress Bar */}
        <div className="relative w-full h-3 flex items-center group cursor-pointer">
          {/* Visible Track with boundary in both Light and Dark modes */}
          <div className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden border border-gray-300/40 dark:border-slate-600/40">
            <div
              className="h-full bg-primary-600 dark:bg-primary-500 rounded-full transition-all duration-75"
              style={{ width: `${percent}%` }}
            />
          </div>

          {/* Scrubber thumb circle */}
          <div
            className="absolute h-3.5 w-3.5 rounded-full bg-white dark:bg-primary-400 border-2 border-primary-600 dark:border-white shadow-sm pointer-events-none -translate-x-1/2 transition-all duration-75"
            style={{ left: `${percent}%` }}
          />

          {/* Transparent Input Range Overlay for seamless dragging & seeking */}
          <input
            type="range"
            min="0"
            max={effectiveDuration > 0 ? effectiveDuration : 100}
            step="0.05"
            value={currentTime}
            onChange={handleSeek}
            disabled={!audioUrl}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            aria-label="Seek voice playback"
          />
        </div>
      </div>

      {/* Replay from Start Button */}
      <button
        type="button"
        onClick={handleReplay}
        disabled={!audioUrl}
        title="Replay from start"
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-40"
      >
        <HiArrowPath className="w-4 h-4" />
      </button>

      {/* Direct Download/Test File Button */}
      {audioUrl && (
        <a
          href={audioUrl}
          download
          target="_blank"
          rel="noopener noreferrer"
          title="Download audio file"
          className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer"
        >
          <HiArrowDownTray className="w-4 h-4" />
        </a>
      )}

      {/* Mute button */}
      <button
        type="button"
        onClick={toggleMute}
        disabled={!audioUrl}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-40"
      >
        {isMuted ? <HiSpeakerXMark className="w-4 h-4 text-red-500" /> : <HiSpeakerWave className="w-4 h-4" />}
      </button>
    </div>
  );
}
