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
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-accent hover:bg-accent-hover text-white shadow-sm hover:shadow active:scale-[0.99] border border-accent/20 focus:ring-accent',
    secondary: 'bg-[#F6F5F4] hover:bg-[#EAE7E3] text-ink border border-border focus:ring-slate-400',
    outline: 'bg-white hover:bg-muted text-ink border border-border hover:border-[#D1CECA] focus:ring-accent shadow-2sm',
    accent: 'bg-brand hover:bg-brand-hover text-white shadow-sm focus:ring-brand',
    brand: 'bg-brand hover:bg-brand-hover text-white shadow-sm focus:ring-brand',
    danger: 'bg-danger-500 hover:bg-danger-600 text-white shadow-sm focus:ring-danger-500',
    ghost: 'bg-transparent hover:bg-muted text-ink-muted hover:text-ink focus:ring-slate-400',
  };

  const sizes = {
    sm: 'text-xs sm:text-[13px] px-3 py-1.5 gap-1.5 rounded-lg font-medium',
    md: 'text-[15px] px-4 py-2.5 gap-2 font-semibold',
    lg: 'text-[16px] px-6 py-3.5 gap-2.5 font-semibold',
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
