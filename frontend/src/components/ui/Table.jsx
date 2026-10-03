import React from 'react';

export function Table({ children, className = '', ...props }) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-odoo-card">
      <table className={`w-full text-left text-sm text-ink dark:text-slate-200 ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className = '', ...props }) {
  return (
    <thead className={`bg-[#FAF9F7] dark:bg-slate-800/80 text-xs uppercase text-ink-muted dark:text-slate-400 font-semibold tracking-wider border-b border-border dark:border-slate-700 ${className}`} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className = '', ...props }) {
  return (
    <tbody className={`divide-y divide-border dark:divide-slate-800 bg-white dark:bg-slate-900 ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className = '', ...props }) {
  return (
    <tr className={`hover:bg-[#FAF9F7] dark:hover:bg-slate-800/60 transition-colors ${className}`} {...props}>
      {children}
    </tr>
  );
}

export function TableHead({ children, className = '', ...props }) {
  return (
    <th className={`px-5 py-3.5 text-xs font-semibold text-ink-muted dark:text-slate-400 ${className}`} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ children, className = '', ...props }) {
  return (
    <td className={`px-5 py-4 whitespace-nowrap text-sm text-ink dark:text-slate-200 ${className}`} {...props}>
      {children}
    </td>
  );
}
