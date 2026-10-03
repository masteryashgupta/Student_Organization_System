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
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="relative rounded-2xl">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <input
          id={inputId}
          className={`block w-full rounded-2xl bg-white/80 dark:bg-slate-900/70 backdrop-blur-md border ${
            error
              ? 'border-rose-500/80 focus:ring-rose-500 focus:border-rose-500 text-rose-900 dark:text-rose-200'
              : 'border-slate-200/80 dark:border-white/10 focus:ring-brand-500/30 dark:focus:ring-brand-400/30 focus:border-brand-500 dark:focus:border-brand-400 text-slate-900 dark:text-white'
          } ${
            Icon ? 'pl-10' : 'pl-4'
          } pr-4 py-2.5 text-sm placeholder-slate-400 dark:placeholder-slate-500 transition-all duration-200 focus:outline-none focus:ring-4 shadow-xs hover:border-slate-300 dark:hover:border-white/20 ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-1">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{helperText}</p>}
    </div>
  );
}

