import React from 'react';
import { useApp } from '../context/AppContext';
import { RotateCcw, AlertTriangle, X } from 'lucide-react';

interface ResetModalProps {
  onClose: () => void;
}

export const ResetModal: React.FC<ResetModalProps> = ({ onClose }) => {
  const { resetDemoData, setCurrentPage } = useApp();

  const handleConfirmReset = () => {
    resetDemoData();
    onClose();
    setCurrentPage('discovery');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px' }}
        id="reset-demo-modal"
      >
        <div className="modal-header">
          <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#F2E8DC', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RotateCcw size={18} color="#F2E8DC" />
            Reset Sandbox Demo Data
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#F2E8DC', cursor: 'pointer' }}
            id="close-reset-modal-btn"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <AlertTriangle size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              This will restore all equipment, initial reservations, audit blocks, and notification feeds to pristine demo seed defaults.
            </div>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Any new bookings, check-in condition signatures, return notes, or filed incident reports created during this evaluation session will be purged from browser localStorage.
          </p>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Cancel
          </button>
          <button
            onClick={handleConfirmReset}
            className="btn btn-primary btn-sm"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            id="confirm-reset-demo-btn"
          >
            <RotateCcw size={15} />
            Confirm Factory Reset
          </button>
        </div>
      </div>
    </div>
  );
};
