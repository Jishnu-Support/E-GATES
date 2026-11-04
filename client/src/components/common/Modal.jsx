import React, { useEffect } from 'react';
import { HiXMark } from 'react-icons/hi2';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOutsideClick = true,
  showCloseButton = true,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
    full: 'sm:max-w-5xl',
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && closeOnOutsideClick) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-200"
      aria-modal="true"
      role="dialog"
    >
      {/* Mobile: slides from bottom; Tablet+: centered */}
      <div
        className={`w-full ${sizeClasses[size] || sizeClasses.md}
          bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100
          rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden
          transform transition-all duration-300
          max-h-[92vh] sm:max-h-[90vh]
          flex flex-col
          animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300`}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 dark:bg-slate-600 rounded-full" />
        </div>

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-5 py-3 sm:px-6 sm:py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/60 flex-shrink-0">
            {title ? (
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white leading-tight pr-2">
                {title}
              </h3>
            ) : (
              <div />
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 transition focus:outline-none flex-shrink-0"
                aria-label="Close modal"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Body — scrollable */}
        <div className="px-5 py-4 sm:px-6 sm:py-4 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-5 py-3.5 sm:px-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/80 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
