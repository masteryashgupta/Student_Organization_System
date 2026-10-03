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
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-150 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0 active:scale-[0.99]';

  const variants = {
    primary: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm hover:shadow border border-sky-600',
    brand: 'bg-[#714B67] hover:bg-[#5B3B52] text-white shadow-sm hover:shadow border border-[#714B67]',
    secondary: 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-sm hover:border-slate-300 dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700',
    outline: 'bg-transparent hover:bg-slate-100/80 text-slate-700 border border-slate-300 hover:border-slate-400 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800',
    accent: 'bg-sky-500 hover:bg-sky-600 text-white shadow-sm border border-sky-500',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm border border-rose-600',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
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
