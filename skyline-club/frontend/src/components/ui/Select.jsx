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
        <label htmlFor={selectId} className="block text-sm font-medium text-slate-200">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`block w-full rounded-lg bg-surface-900 border ${
          error
            ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500'
            : 'border-slate-700/80 focus:ring-brand-500 focus:border-brand-500'
        } px-3.5 py-2 text-sm text-slate-100 transition-colors focus:outline-none focus:ring-2 ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-100">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-danger-500 font-medium mt-1">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-400 mt-1">{helperText}</p>}
    </div>
  );
}
