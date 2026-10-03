import React from 'react';

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full border transition-colors';

  const variants = {
    neutral: 'bg-slate-50 text-slate-600 border-slate-200',
    primary: 'bg-[#FAF5F9] text-[#714B67] border-[#D4BFD2]',
    accent: 'bg-[#F3EAF2] text-[#5B3B52] border-[#D4BFD2]',
    brand: 'bg-[#FAF5F9] text-[#714B67] border-[#D4BFD2]',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-800 border-rose-200',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-0.5 font-medium',
    lg: 'text-xs px-3 py-1 font-semibold',
  };

  return (
    <span className={`${baseStyles} ${variants[variant] || variants.neutral} ${sizes[size] || sizes.md} ${className}`}>
      {children}
    </span>
  );
}
