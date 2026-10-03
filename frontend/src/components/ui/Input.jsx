import React from 'react';

export function Input({
  label,
  error,
  helperText,
  icon: Icon,
  className = '',
  id,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-ink dark:text-slate-200">
          {label}
        </label>
      )}
      <div className="relative rounded-xl">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted dark:text-slate-400">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <input
          id={inputId}
          className={`block w-full rounded-xl bg-white dark:bg-slate-800 border ${
            error
              ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500'
              : 'border-border dark:border-slate-700 focus:ring-accent focus:border-accent'
          } ${
            Icon ? 'pl-10' : 'pl-3.5'
          } pr-3.5 py-2.5 text-sm text-ink dark:text-white placeholder-ink-subtle dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-20 shadow-2sm ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-danger-500 font-medium mt-1">{error}</p>}
      {helperText && !error && <p className="text-xs text-ink-muted dark:text-slate-400 mt-1">{helperText}</p>}
    </div>
  );
}
