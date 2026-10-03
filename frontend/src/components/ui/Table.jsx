import React from 'react';

export function Table({ children, className = '', ...props }) {
  return (
    <div className="w-full overflow-x-auto rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
      <table className={`w-full text-left text-sm text-slate-900 dark:text-slate-100 ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className = '', ...props }) {
  return (
    <thead className={`bg-slate-50/70 dark:bg-white/[0.03] text-[11px] uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider border-b border-slate-100 dark:border-white/5 ${className}`} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className = '', ...props }) {
  return (
    <tbody className={`divide-y divide-slate-100/80 dark:divide-white/5 bg-transparent ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className = '', ...props }) {
  return (
    <tr className={`hover:bg-[#FAF5F9]/50 dark:hover:bg-white/[0.04] transition-colors ${className}`} {...props}>
      {children}
    </tr>
  );
}

export function TableHead({ children, className = '', ...props }) {
  return (
    <th className={`px-5 py-4 text-xs font-bold text-slate-600 dark:text-slate-300 ${className}`} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ children, className = '', ...props }) {
  return (
    <td className={`px-5 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200 ${className}`} {...props}>
      {children}
    </td>
  );
}

