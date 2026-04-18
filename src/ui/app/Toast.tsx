import { useEffect } from 'react';
import { useAppStore } from '../../state/store';
import type { Toast } from '../../state/slices/toastSlice';

export function ToastStack() {
  const toasts = useAppStore((s) => s.toasts);
  const dismissToast = useAppStore((s) => s.dismissToast);

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 1000,
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);
  const bg = toast.severity === 'error' ? '#5b2222' : '#2a3140';
  return (
    <div
      style={{
        padding: '10px 14px',
        background: bg,
        color: 'white',
        borderRadius: 4,
        minWidth: 280,
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
      }}
    >
      <div>{toast.message}</div>
      {toast.cta && (
        <button
          type="button"
          onClick={toast.cta.onClick}
          style={{
            marginTop: 8,
            padding: '4px 10px',
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.3)',
            background: 'transparent',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          {toast.cta.label}
        </button>
      )}
    </div>
  );
}
