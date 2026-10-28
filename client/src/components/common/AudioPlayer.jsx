import React, { useState, useRef, useEffect } from 'react';
import { HiPlay, HiPause, HiSpeakerWave, HiSpeakerXMark } from 'react-icons/hi2';
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

    const handleLoadedMetadata = () => {
      if (audio.duration && audio.duration !== Infinity && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      } else if (audio.duration === Infinity) {
        // Chromium WebM blob duration fix: seek to far end to force metadata parse
        const tempCurrent = audio.currentTime;
        audio.currentTime = 1e8;
        const fixHandler = () => {
          audio.removeEventListener('timeupdate', fixHandler);
          if (audio.duration && audio.duration !== Infinity && !isNaN(audio.duration)) {
            setDuration(audio.duration);
          }
          audio.currentTime = tempCurrent;
        };
        audio.addEventListener('timeupdate', fixHandler);
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
      if (audio.duration && audio.duration !== Infinity && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      } else if (cur > duration) {
        // Fallback: duration tracks at least the highest playback position reached
        setDuration(cur);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      console.warn('Audio element error for url:', audioUrl);
      setError(true);
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
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current || error) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setError(false);
        if (audioRef.current.duration && audioRef.current.duration !== Infinity) {
          setDuration(audioRef.current.duration);
        }
      }).catch((err) => {
        console.warn('Playback error:', err);
        setError(true);
      });
    }
  };

  const handleSeek = (e) => {
    if (!audioRef.current || error) return;
    const seekTime = Number(e.target.value);
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || timeInSeconds === Infinity || timeInSeconds <= 0) return '0:00';
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const effectiveDuration = duration > 0 ? duration : (initialDuration > 0 ? initialDuration : (currentTime > 0 ? currentTime : 0));

  return (
    <div className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800/80 rounded-xl border border-gray-200 dark:border-slate-700 w-full ${className}`}>
      <audio ref={audioRef} src={audioUrl} preload="auto" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={error || !audioUrl}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className="flex-shrink-0 w-9 h-9 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center focus:outline-none transition shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
      >
        {isPlaying ? <HiPause className="w-4 h-4" /> : <HiPlay className="w-4 h-4 ml-0.5" />}
      </button>

      {/* Progress & Time */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span className="font-semibold truncate text-gray-800 dark:text-gray-200">{title}</span>
          <span className="font-mono text-[11px] text-gray-600 dark:text-gray-400 font-medium">
            {formatTime(currentTime)} / {formatTime(effectiveDuration)}
          </span>
        </div>

        <input
          type="range"
          min="0"
          max={effectiveDuration > 0 ? effectiveDuration : 100}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          disabled={error || !effectiveDuration}
          className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-600 disabled:opacity-50"
        />
      </div>

      {/* Mute button */}
      <button
        type="button"
        onClick={toggleMute}
        disabled={error}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded transition"
      >
        {isMuted ? <HiSpeakerXMark className="w-4 h-4 text-red-500" /> : <HiSpeakerWave className="w-4 h-4" />}
      </button>
    </div>
  );
}
