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
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0';

  const variants = {
    primary: 'bg-[#0F172A] hover:bg-slate-800 text-white shadow-sm hover:shadow active:scale-[0.99] border border-slate-900',
    secondary: 'bg-white hover:bg-slate-50 text-[#0F172A] border border-slate-200 shadow-sm hover:border-slate-300',
    outline: 'bg-white hover:bg-slate-50 text-[#0F172A] border border-slate-200 hover:border-slate-300 shadow-sm',
    accent: 'bg-[#0EA5E9] hover:bg-[#0284C7] text-white shadow-sm',
    brand: 'bg-[#0F172A] hover:bg-slate-800 text-white shadow-sm',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm',
    ghost: 'bg-transparent hover:bg-slate-100 text-[#64748B] hover:text-[#0F172A]',
  };

  const sizes = {
    sm: 'text-xs px-3.5 py-1.5 gap-1.5 font-semibold',
    md: 'text-sm px-5 py-2 gap-2 font-semibold',
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
