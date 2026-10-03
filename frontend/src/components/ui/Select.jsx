import React from 'react';

export function Select({
  label,
  options = [],
  error,
  helperText,
  className = '',
  id,
  ...props
}) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`block w-full rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border ${
          error
            ? 'border-rose-500/80 focus:ring-rose-500 focus:border-rose-500 text-rose-900 dark:text-rose-200'
            : 'border-slate-200/80 dark:border-white/10 focus:ring-[#714B67]/30 dark:focus:ring-[#A97B9F]/30 focus:border-[#714B67] dark:focus:border-[#A97B9F] text-slate-900 dark:text-white'
        } px-4 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-4 shadow-xs hover:border-slate-300 dark:hover:border-white/20 ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-1">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{helperText}</p>}
    </div>
  );
}

