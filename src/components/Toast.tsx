import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'error' | 'success' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  addToast: (type: ToastType, title: string, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

export const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, title: string, message: string, duration = 4000) => {
    const id = Date.now().toString();
    const newToast: Toast = { id, type, title, message, duration };
    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'error':
        return <AlertCircle size={20} className="text-red-500" />;
      case 'success':
        return <CheckCircle2 size={20} className="text-green-500" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-yellow-500" />;
      case 'info':
        return <Info size={20} className="text-blue-500" />;
    }
  };

  const getBgColor = (type: ToastType) => {
    switch (type) {
      case 'error':
        return 'bg-red-500/10 border-red-500/30';
      case 'success':
        return 'bg-green-500/10 border-green-500/30';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 'info':
        return 'bg-blue-500/10 border-blue-500/30';
    }
  };

  return (
    <div className="fixed top-6 left-6 right-6 z-[999] flex flex-col gap-3 pointer-events-none max-w-md mx-auto">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`${getBgColor(toast.type)} border rounded-2xl p-4 pointer-events-auto flex gap-3 items-start`}
          >
            <div className="pt-0.5">{getIcon(toast.type)}</div>
            <div className="flex-1">
              <h4 className="font-bold text-sm text-zinc-100">{toast.title}</h4>
              <p className="text-xs text-zinc-400 mt-0.5">{toast.message}</p>
            </div>
            <button
              onClick={() => onRemove(toast.id)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
            >
              <X size={16} className="text-zinc-400" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
