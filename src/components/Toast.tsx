import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 size={20} className="text-emerald" style={{ color: '#34d399', flexShrink: 0 }} />,
          warning: <AlertTriangle size={20} style={{ color: '#fbbf24', flexShrink: 0 }} />,
          error: <AlertCircle size={20} style={{ color: '#fb7185', flexShrink: 0 }} />,
          info: <Info size={20} style={{ color: '#38bdf8', flexShrink: 0 }} />,
        };

        return (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {icons[toast.type]}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#F2E8DC', marginBottom: 2 }}>
                {toast.title}
              </div>
              <div style={{ fontSize: '12.5px', color: 'rgba(242, 232, 220, 0.85)', lineHeight: 1.4 }}>
                {toast.message}
              </div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#F2E8DC',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                borderRadius: 4,
              }}
              aria-label="Dismiss toast"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
