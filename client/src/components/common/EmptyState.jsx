import React from 'react';
import { HiOutlineFolderOpen } from 'react-icons/hi2';

export default function EmptyState({
  icon: Icon = HiOutlineFolderOpen,
  title = 'No records found',
  description = 'There are no items to display at this moment.',
  actionLabel = '',
  onAction = null,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-gray-300 dark:border-slate-800 shadow-sm my-4">
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-50 dark:bg-primary-950/60 text-primary-600 dark:text-cyan-400 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-xl shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none transition cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
