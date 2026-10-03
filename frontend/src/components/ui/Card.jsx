import React from 'react';

export function Card({ children, className = '', hover = true, glass = true, ...props }) {
  const glassClasses = glass
    ? 'bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)]'
    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm';

  const hoverClasses = hover
    ? 'hover:shadow-xl hover:shadow-[#714B67]/5 dark:hover:shadow-black/60 hover:border-[#D4BFD2] dark:hover:border-white/20 hover:-translate-y-0.5 transition-all duration-300'
    : '';

  return (
    <div
      className={`relative text-slate-900 dark:text-slate-100 rounded-3xl ${glassClasses} ${hoverClasses} overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`p-6 pb-4 border-b border-slate-100/80 dark:border-white/5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }) {
  return (
    <h3 className={`text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '', ...props }) {
  return (
    <p className={`text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }) {
  return (
    <div className={`p-6 pt-4 border-t border-slate-100/80 dark:border-white/5 flex items-center justify-between ${className}`} {...props}>
      {children}
    </div>
  );
}

