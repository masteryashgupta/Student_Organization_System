import React from 'react';

export function Table({ children, className = '', ...props }) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-700/60">
      <table className={`w-full text-left text-sm text-slate-200 ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className = '', ...props }) {
  return (
    <thead className={`bg-surface-900 text-xs uppercase text-slate-400 font-semibold tracking-wider border-b border-slate-700/60 ${className}`} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className = '', ...props }) {
  return (
    <tbody className={`divide-y divide-slate-800/80 bg-surface-800/40 ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className = '', ...props }) {
  return (
    <tr className={`hover:bg-slate-800/60 transition-colors ${className}`} {...props}>
      {children}
    </tr>
  );
}

export function TableHead({ children, className = '', ...props }) {
  return (
    <th className={`px-4 py-3.5 ${className}`} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ children, className = '', ...props }) {
  return (
    <td className={`px-4 py-3.5 whitespace-nowrap ${className}`} {...props}>
      {children}
    </td>
  );
}
