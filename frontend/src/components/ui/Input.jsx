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
        <label htmlFor={inputId} className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          {label}
        </label>
      )}
      <div className="relative rounded-xl">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <input
          id={inputId}
          className={`block w-full rounded-xl bg-white border ${
            error
              ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500'
              : 'border-slate-200 focus:ring-[#714B67] focus:border-[#714B67]'
          } ${
            Icon ? 'pl-10' : 'pl-3.5'
          } pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-20 shadow-xs ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-rose-600 font-medium mt-1">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}
    </div>
  );
}
