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
        <label htmlFor={selectId} className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`block w-full rounded-xl bg-white dark:bg-slate-800 border ${
          error
            ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500'
            : 'border-slate-200 dark:border-slate-700 focus:ring-sky-500 focus:border-sky-500'
        } px-3.5 py-2.5 text-sm text-slate-900 dark:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-20 shadow-xs ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-rose-600 font-medium mt-1">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{helperText}</p>}
    </div>
  );
}
