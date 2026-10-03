import React from 'react';

export function Card({ children, className = '', hover = true, ...props }) {
  return (
    <div
      className={`bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl shadow-sm ${
        hover ? 'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200' : ''
      } overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 ${className}`} {...props}>
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
    <p className={`text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed ${className}`} {...props}>
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
    <div className={`p-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between ${className}`} {...props}>
      {children}
    </div>
  );
}
