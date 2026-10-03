import React, { createContext, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

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

  const typeConfig = {
    success: {
      style: 'bg-emerald-950/90 text-emerald-200 border-emerald-500/30 shadow-emerald-950/50',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
    },
    danger: {
      style: 'bg-rose-950/90 text-rose-200 border-rose-500/30 shadow-rose-950/50',
      icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />,
    },
    warning: {
      style: 'bg-amber-950/90 text-amber-200 border-amber-500/30 shadow-amber-950/50',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
    },
    info: {
      style: 'bg-slate-900/90 text-violet-200 border-violet-500/30 shadow-slate-950/50',
      icon: <Info className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />,
    },
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          const cfg = typeConfig[t.type] || typeConfig.info;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto p-4 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 transform translate-y-0 text-sm font-medium flex items-start gap-3 animate-fade-in ${
                cfg.style
              }`}
            >
              {cfg.icon}
              <div className="flex-1 flex flex-col space-y-0.5 min-w-0">
                {t.title && <span className="font-bold text-white text-xs uppercase tracking-wider">{t.title}</span>}
                <span className="text-xs leading-relaxed break-words">{t.message}</span>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
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
