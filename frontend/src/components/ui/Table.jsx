import React from 'react';

export function Table({ children, className = '', ...props }) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border bg-white shadow-odoo-card">
      <table className={`w-full text-left text-sm text-ink ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className = '', ...props }) {
  return (
    <thead className={`bg-[#FAF9F7] text-xs uppercase text-ink-muted font-semibold tracking-wider border-b border-border ${className}`} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className = '', ...props }) {
  return (
    <tbody className={`divide-y divide-border bg-white ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className = '', ...props }) {
  return (
    <tr className={`hover:bg-[#FAF9F7] transition-colors ${className}`} {...props}>
      {children}
    </tr>
  );
}

export function TableHead({ children, className = '', ...props }) {
  return (
    <th className={`px-5 py-3.5 text-xs font-semibold text-ink-muted ${className}`} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ children, className = '', ...props }) {
  return (
    <td className={`px-5 py-4 whitespace-nowrap text-sm text-ink ${className}`} {...props}>
      {children}
    </td>
  );
}
