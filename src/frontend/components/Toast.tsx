import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => string;
  hideToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => {
      // Remove previous loading toasts if we are adding a new loading toast
      const filtered = type === 'loading' ? prev.filter(t => t.type !== 'loading') : prev;
      return [...filtered, { id, type, message, duration: type === 'loading' ? 0 : duration }];
    });

    if (type !== 'loading' && duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }

    return id;
  }, [hideToast]);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast, clearToasts }}>
      {children}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const { id, type, message, duration } = toast;

  // Custom icon SVGs
  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'loading':
        return (
          <svg className="w-5 h-5 text-[#df6a45] animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        );
    }
  };

  const getStyle = () => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50/90 border-emerald-200/80 shadow-emerald-100/30';
      case 'error':
        return 'bg-rose-50/90 border-rose-200/80 shadow-rose-100/30';
      case 'warning':
        return 'bg-amber-50/90 border-amber-200/80 shadow-amber-100/30';
      case 'info':
        return 'bg-violet-50/90 border-violet-200/80 shadow-violet-100/30';
      case 'loading':
        return 'bg-[#fffaf8]/95 border-[#ffedd5] shadow-[#df6a45]/5';
    }
  };

  return (
    <div className={`pointer-events-auto flex flex-col w-full rounded-xl border backdrop-blur-md shadow-lg transition-all duration-300 animate-slide-in overflow-hidden ${getStyle()}`}>
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 text-sm font-medium text-[#3d332d] leading-relaxed break-words">
          {message}
        </div>
        {type !== 'loading' && (
          <button
            onClick={() => onClose(id)}
            className="flex-shrink-0 text-[#8c827a] hover:text-[#362724] transition-colors p-0.5 rounded hover:bg-black/5 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Toast progress bar indicator for auto-closing toasts */}
      {type !== 'loading' && duration && duration > 0 ? (
        <div className="h-0.5 bg-black/5 w-full">
          <div 
            className={`h-full opacity-60 ${
              type === 'success' ? 'bg-emerald-500' :
              type === 'error' ? 'bg-rose-500' :
              type === 'warning' ? 'bg-amber-500' : 'bg-violet-500'
            }`}
            style={{
              animation: `shrinkWidth ${duration}ms linear forwards`
            }}
          />
        </div>
      ) : null}
    </div>
  );
};
