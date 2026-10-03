import React from 'react';

export function Card({ children, className = '', hover = true, ...props }) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-border dark:border-slate-800 rounded-2xl shadow-odoo-card ${
        hover ? 'hover:shadow-odoo-card-hover hover:border-[#D1CECA] dark:hover:border-slate-700 transition-all duration-200' : ''
      } overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`p-6 pb-4 border-b border-border/70 dark:border-slate-800 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }) {
  return (
    <h3 className={`text-lg sm:text-xl font-semibold text-ink dark:text-white tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '', ...props }) {
  return (
    <p className={`text-sm text-ink-muted dark:text-slate-400 mt-1 leading-relaxed ${className}`} {...props}>
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
    <div className={`p-6 pt-4 border-t border-border/70 dark:border-slate-800 flex items-center justify-between ${className}`} {...props}>
      {children}
    </div>
  );
}
