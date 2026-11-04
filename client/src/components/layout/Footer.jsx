import React from 'react';

export default function Footer({ className = '' }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`bg-slate-900 dark:bg-slate-950 text-slate-400 border-t border-slate-800 mt-auto ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-3">
        <p className="text-xs text-center sm:text-left text-slate-500">
          &copy; {currentYear} <span className="text-slate-300 font-semibold">EGATES</span> — Smart Community &amp; Layout Association Management
        </p>
        <p className="text-[11px] text-slate-600 text-center sm:text-right whitespace-nowrap">
          Powered by <span className="text-slate-400 font-semibold">Jishnu Infotech</span>
        </p>
      </div>
    </footer>
  );
}
