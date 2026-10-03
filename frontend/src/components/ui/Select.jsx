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
        <label htmlFor={selectId} className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`block w-full rounded-xl bg-white border ${
          error
            ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500'
            : 'border-slate-200 focus:ring-[#714B67] focus:border-[#714B67]'
        } px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-20 shadow-xs ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white text-slate-900">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-rose-600 font-medium mt-1">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}
    </div>
  );
}
