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
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-ink dark:text-slate-200">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`block w-full rounded-xl bg-white dark:bg-slate-800 border ${
          error
            ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500'
            : 'border-border dark:border-slate-700 focus:ring-accent focus:border-accent'
        } px-3.5 py-2.5 text-sm text-ink dark:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-20 shadow-2sm ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-800 text-ink dark:text-white">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-danger-500 font-medium mt-1">{error}</p>}
      {helperText && !error && <p className="text-xs text-ink-muted dark:text-slate-400 mt-1">{helperText}</p>}
    </div>
  );
}
