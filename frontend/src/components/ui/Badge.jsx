import React from 'react';

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full border transition-colors';

  const variants = {
    neutral: 'bg-[#F4F3F1] text-[#4F4C52] border-[#E3E1DE]',
    primary: 'bg-accent-50 text-accent-700 border-accent-200',
    accent: 'bg-brand-50 text-brand-700 border-brand-200',
    brand: 'bg-brand-50 text-brand-700 border-brand-200',
    success: 'bg-[#EAF7EE] text-[#147D3B] border-[#C8EAD2]',
    warning: 'bg-[#FEF6E7] text-[#9A6208] border-[#FCE1B3]',
    danger: 'bg-[#FDF0EE] text-[#B82C1D] border-[#FACBC5]',
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
