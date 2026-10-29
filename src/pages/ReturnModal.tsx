import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Booking } from '../types';
import { fireCelebrationConfetti } from '../components/Confetti';
import {
  X,
  PackageCheck,
  Star,
  FileSignature,
  AlertTriangle
} from 'lucide-react';

interface ReturnModalProps {
  booking: Booking;
  onClose: () => void;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({ booking, onClose }) => {
  const { returnBooking, fileIncident, currentUser } = useApp();

  const [conditionRating, setConditionRating] = useState<number>(5);
  const [conditionText, setConditionText] = useState<'Pristine' | 'Good' | 'Fair' | 'Damaged'>('Pristine');
  const [checklist, setChecklist] = useState({
    cleaned: true,
    accessoriesIntact: true,
    poweredDown: true,
  });
  const [notes, setNotes] = useState('Experiment concluded successfully. Instrument wiped clean and returned to Maxwell 402B.');
  const [signature, setSignature] = useState(currentUser.name);
  const [fileIncidentReport, setFileIncidentReport] = useState(false);
  const [incidentDescription, setIncidentDescription] = useState('');
  const [error, setError] = useState('');

  const allChecked = checklist.cleaned && checklist.accessoriesIntact && checklist.poweredDown;

  const handleConditionSelect = (rating: number, text: 'Pristine' | 'Good' | 'Fair' | 'Damaged') => {
    setConditionRating(rating);
    setConditionText(text);
    if (text === 'Damaged') {
      setFileIncidentReport(true);
    }
  };

  const handleConfirmReturn = () => {
    if (!allChecked) {
      setError('Please certify all 3 return checklist requirements.');
      return;
    }

    if (!signature.trim()) {
      setError('Please provide your digital return sign-off.');
      return;
    }

    returnBooking(booking.id, {
      timestamp: new Date().toISOString(),
      actor: currentUser.name,
      condition: conditionText,
      rating: conditionRating,
      checklist,
      notes: notes.trim(),
      signature: signature.trim(),
    });

    // If damaged or user toggled incident
    if (fileIncidentReport && incidentDescription.trim()) {
      fileIncident({
        resourceId: booking.resourceId,
        title: `Return Discrepancy: ${booking.resourceTitle}`,
        description: incidentDescription.trim(),
        severity: conditionRating <= 2 ? 'High' : 'Medium',
        bookingId: booking.id,
      });
    }

    fireCelebrationConfetti();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        id="return-equipment-modal"
      >
        <div className="modal-header">
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#F2E8DC', fontWeight: 800 }}>
              Asset Check-Out & Return Finalization
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#F2E8DC' }}>
              Return: {booking.resourceTitle}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#F2E8DC', cursor: 'pointer' }}
            id="close-return-modal-btn"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Step 1: Return Inspection Checklist */}
          <div style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ marginBottom: '10px' }}>
              <span>1. RETURN DE-STAGING PROTOCOL</span>
              <span style={{ fontSize: '11px', color: allChecked ? '#10b981' : '#f43f5e' }}>
                {Object.values(checklist).filter(Boolean).length}/3 Completed
              </span>
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                <input
                  type="checkbox"
                  className="checkbox-input"
                  checked={checklist.cleaned}
                  onChange={(e) => setChecklist({ ...checklist, cleaned: e.target.checked })}
                  id="return-chk-clean"
                />
                <span>Sanitized, dust-free, and wiped down with laboratory optics wipe</span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                <input
                  type="checkbox"
                  className="checkbox-input"
                  checked={checklist.accessoriesIntact}
                  onChange={(e) => setChecklist({ ...checklist, accessoriesIntact: e.target.checked })}
                  id="return-chk-accessories"
                />
                <span>All cables, passive probes, power brick, and transit case accounted for</span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                <input
                  type="checkbox"
                  className="checkbox-input"
                  checked={checklist.poweredDown}
                  onChange={(e) => setChecklist({ ...checklist, poweredDown: e.target.checked })}
                  id="return-chk-power"
                />
                <span>Gracefully zeroed, test channels decoupled, and safely powered down</span>
              </label>
            </div>
          </div>

          {/* Step 2: Final condition grade */}
          <div style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ marginBottom: '8px' }}>
              <span>2. FINAL POST-USE CONDITION GRADE</span>
              <span style={{ color: 'var(--emerald-primary)', fontWeight: 700 }}>
                {conditionText} ({conditionRating}/5)
              </span>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[
                { r: 5, label: 'Pristine' as const, desc: 'Zero Wear' },
                { r: 4, label: 'Good' as const, desc: 'Minor Cosmetic' },
                { r: 3, label: 'Fair' as const, desc: 'Acceptable' },
                { r: 1, label: 'Damaged' as const, desc: 'Report Issue' },
              ].map((item) => {
                const isSelected = conditionRating === item.r;
                const isDamage = item.label === 'Damaged';
                return (
                  <button
                    key={item.r}
                    type="button"
                    onClick={() => handleConditionSelect(item.r, item.label)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid',
                      borderColor: isSelected
                        ? isDamage
                          ? '#f43f5e'
                          : 'var(--emerald-primary)'
                        : 'var(--border-subtle)',
                      background: isSelected
                        ? isDamage
                          ? 'rgba(244, 63, 94, 0.15)'
                          : 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(255, 255, 255, 0.02)',
                      color: isSelected ? (isDamage ? '#fb7185' : '#34d399') : 'var(--text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                    id={`return-condition-rate-${item.r}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginBottom: '4px' }}>
                      {[...Array(item.r)].map((_, i) => (
                        <Star key={i} size={12} fill={isSelected ? (isDamage ? '#fb7185' : '#34d399') : '#64748b'} color="none" />
                      ))}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700 }}>{item.label}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Incident filing accordion if damaged */}
          {(conditionText === 'Damaged' || fileIncidentReport) && (
            <div
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(244, 63, 94, 0.08)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                marginBottom: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fb7185', fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
                <AlertTriangle size={16} />
                <span>Immediate Lab Safety & Incident Logging</span>
              </div>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Describe any damage, probe failure, or unusual sensor readings during usage..."
                value={incidentDescription}
                onChange={(e) => setIncidentDescription(e.target.value)}
                id="return-incident-desc"
              />
            </div>
          )}

          {/* Step 3: Return notes */}
          <div className="form-group">
            <label className="form-label" htmlFor="return-notes">
              Return Verification Notes
            </label>
            <input
              type="text"
              id="return-notes"
              className="form-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Step 4: Digital Signature */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="return-signature">
              <span>Relinquishing Researcher Signature</span>
              <FileSignature size={14} color="var(--cyan-primary)" />
            </label>
            <input
              type="text"
              id="return-signature"
              className="form-input"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
            />
          </div>

          {error && (
            <div className="form-error" style={{ marginTop: '12px' }} id="return-error-msg">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmReturn}
            className="btn btn-primary btn-sm"
            id="confirm-return-btn"
          >
            <PackageCheck size={16} />
            Finalize Return & Re-Stage Equipment
          </button>
        </div>
      </div>
    </div>
  );
};
