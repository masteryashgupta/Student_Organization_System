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
        <label htmlFor={selectId} className="block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`block w-full rounded-xl bg-white border ${
          error
            ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500'
            : 'border-border focus:ring-accent focus:border-accent'
        } px-3.5 py-2.5 text-sm text-ink transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-20 shadow-2sm ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white text-ink">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-danger-500 font-medium mt-1">{error}</p>}
      {helperText && !error && <p className="text-xs text-ink-muted mt-1">{helperText}</p>}
    </div>
  );
}
