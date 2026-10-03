import React from 'react';

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) {
  const baseStyles = 'inline-flex items-center font-semibold rounded-full border backdrop-blur-md transition-all select-none';

  const variants = {
    neutral: 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/10',
    primary: 'bg-[#FAF5F9]/90 dark:bg-[#714B67]/20 text-[#714B67] dark:text-[#F3EAF2] border-[#D4BFD2]/80 dark:border-[#714B67]/40 shadow-xs',
    accent: 'bg-sky-50/80 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/40',
    brand: 'bg-[#FAF5F9]/90 dark:bg-[#714B67]/20 text-[#714B67] dark:text-[#F3EAF2] border-[#D4BFD2]/80 dark:border-[#714B67]/40',
    success: 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/40',
    warning: 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/40',
    danger: 'bg-rose-50/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/40',
  };

  const sizes = {
    sm: 'text-[11px] px-2.5 py-0.5 font-medium tracking-wide',
    md: 'text-xs px-3 py-1 font-semibold',
    lg: 'text-xs px-3.5 py-1.5 font-bold',
  };

  return (
    <span className={`${baseStyles} ${variants[variant] || variants.neutral} ${sizes[size] || sizes.md} ${className}`}>
      {children}
    </span>
  );
}

