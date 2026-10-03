import React, { createContext, useContext, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (msgOrOptions, type = 'info', duration = 4000) => {
    let message = '';
    let title = '';
    let toastType = type;
    let toastDuration = duration;

    if (typeof msgOrOptions === 'object' && msgOrOptions !== null) {
      message = msgOrOptions.message || msgOrOptions.text || '';
      title = msgOrOptions.title || '';
      toastType = msgOrOptions.type || 'info';
      toastDuration = msgOrOptions.duration || 4000;
    } else {
      message = String(msgOrOptions || '');
    }

    if (toastType === 'error') {
      toastType = 'danger';
    }

    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, title, message, type: toastType }]);
    setTimeout(() => {
      removeToast(id);
    }, toastDuration);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toast = {
    addToast,
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'danger', duration),
    warning: (msg, duration) => addToast(msg, 'warning', duration),
    info: (msg, duration) => addToast(msg, 'info', duration),
  };

  const typeStyles = {
    success: 'bg-emerald-950/90 text-emerald-200 border-emerald-700/60',
    danger: 'bg-rose-950/90 text-rose-200 border-rose-700/60',
    warning: 'bg-amber-950/90 text-amber-200 border-amber-700/60',
    info: 'bg-slate-900/90 text-brand-200 border-brand-700/60',
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 transform translate-y-0 text-sm font-medium flex items-start justify-between ${
              typeStyles[t.type] || typeStyles.info
            }`}
          >
            <div className="flex flex-col space-y-0.5 pr-2">
              {t.title && <span className="font-semibold text-white text-xs uppercase tracking-wider">{t.title}</span>}
              <span>{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="ml-3 text-slate-400 hover:text-white flex-shrink-0"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
