import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import styles from './Toast.module.css';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

function ToastMessage({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const Icon = toast.type === 'success' ? CheckCircle : toast.type === 'error' ? XCircle : Info;

  return (
    <div className={`${styles.toast} ${styles[toast.type]}`}>
      <Icon size={15} className={styles.icon} />
      <span className={styles.message}>{toast.message}</span>
      <button className={styles.close} onClick={() => onRemove(toast.id)}>
        <X size={13} />
      </button>
    </div>
  );
}

export default function Toast({ toasts, onRemove }: ToastProps) {
  if (toasts.length === 0) return null;
  return (
    <div className={styles.container}>
      {toasts.map(t => (
        <ToastMessage key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}
