import React from 'react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0 active:scale-[0.98] select-none';

  const variants = {
    primary: 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white shadow-md shadow-brand-500/25 hover:shadow-lg hover:shadow-brand-500/35 border border-brand-500/60',
    brand: 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white shadow-md shadow-brand-500/25 hover:shadow-lg hover:shadow-brand-500/35 border border-brand-500/60',
    secondary: 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md hover:bg-brand-50 dark:hover:bg-slate-800 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-white/10 shadow-sm hover:border-brand-400',
    outline: 'bg-white/70 dark:bg-slate-900/60 backdrop-blur-md hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-xs',
    accent: 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-md shadow-cyan-500/20 hover:shadow-lg border border-cyan-500',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 hover:shadow-lg border border-rose-600',
    ghost: 'bg-transparent hover:bg-slate-100/80 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white',
    glass: 'bg-white/60 dark:bg-white/10 backdrop-blur-lg hover:bg-white/80 dark:hover:bg-white/15 text-slate-800 dark:text-white border border-white/60 dark:border-white/10 shadow-sm',
  };

  const sizes = {
    sm: 'text-xs px-3.5 py-1.5 gap-1.5 font-semibold',
    md: 'text-sm px-5 py-2.5 gap-2 font-semibold',
    lg: 'text-base px-6 py-3 gap-2.5 font-bold',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
}

