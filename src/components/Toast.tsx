import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle, AlertCircle, Info, X, WifiOff } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'offline';

type Toast = {
  id: number;
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    if (type !== 'offline') {
      setTimeout(() => dismiss(id), 5000);
    }
  }, [dismiss]);

  const icons: Record<ToastType, typeof CheckCircle> = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    offline: WifiOff,
  };

  const styles: Record<ToastType, string> = {
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    error: 'bg-red-500/10 border-red-500/30 text-red-300',
    info: 'bg-slate-700/80 border-slate-600 text-slate-200',
    offline: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm safe-top">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur shadow-lg animate-in slide-in-from-right ${styles[t.type]}`}
            >
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm flex-1 leading-relaxed">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="flex-shrink-0 opacity-60 hover:opacity-100">
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
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
