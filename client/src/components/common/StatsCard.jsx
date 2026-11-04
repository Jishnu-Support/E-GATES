import React from 'react';
import { HiArrowTrendingUp, HiArrowTrendingDown } from 'react-icons/hi2';

export default function StatsCard({
  title,
  value,
  icon: Icon,
  change,
  changeType = 'increase', // 'increase' | 'decrease'
  variant = 'blue', // 'blue' | 'green' | 'red' | 'yellow' | 'purple'
  subtitle = '',
  onClick,
}) {
  const colorSchemes = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950/60',
      text: 'text-blue-600 dark:text-cyan-400',
      border: 'border-blue-100 dark:border-blue-900/60',
      badge: 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200',
    },
    green: {
      bg: 'bg-green-50 dark:bg-emerald-950/60',
      text: 'text-green-600 dark:text-emerald-400',
      border: 'border-green-100 dark:border-emerald-900/60',
      badge: 'bg-green-100 dark:bg-emerald-900/60 text-green-800 dark:text-emerald-200',
    },
    red: {
      bg: 'bg-red-50 dark:bg-rose-950/60',
      text: 'text-red-600 dark:text-rose-400',
      border: 'border-red-100 dark:border-rose-900/60',
      badge: 'bg-red-100 dark:bg-rose-900/60 text-red-800 dark:text-rose-200',
    },
    yellow: {
      bg: 'bg-yellow-50 dark:bg-amber-950/60',
      text: 'text-yellow-600 dark:text-amber-400',
      border: 'border-yellow-100 dark:border-amber-900/60',
      badge: 'bg-yellow-100 dark:bg-amber-900/60 text-yellow-800 dark:text-amber-200',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-950/60',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-100 dark:border-purple-900/60',
      badge: 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200',
    },
  };

  const scheme = colorSchemes[variant] || colorSchemes.blue;

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-primary-300 hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</span>
        {Icon && (
          <div className={`w-12 h-12 rounded-xl ${scheme.bg} ${scheme.text} flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</h3>

        {change !== undefined && change !== null && (
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
              changeType === 'increase'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {changeType === 'increase' ? (
              <HiArrowTrendingUp className="w-3.5 h-3.5" />
            ) : (
              <HiArrowTrendingDown className="w-3.5 h-3.5" />
            )}
            <span>{change}</span>
          </div>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>}
    </div>
  );
}
