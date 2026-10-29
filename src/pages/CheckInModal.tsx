import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Booking } from '../types';
import { fireCelebrationConfetti } from '../components/Confetti';
import {
  X,
  Star,
  CheckCircle2,
  FileSignature,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface CheckInModalProps {
  booking: Booking;
  onClose: () => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({ booking, onClose }) => {
  const { checkInBooking, currentUser } = useApp();

  const [conditionRating, setConditionRating] = useState<number>(5);
  const [conditionText, setConditionText] = useState<'Pristine' | 'Good' | 'Fair' | 'Minor Wear'>('Pristine');
  const [checklist, setChecklist] = useState({
    powerCord: true,
    probesOrCables: true,
    calibrationIntact: true,
    screenClean: true,
  });
  const [notes, setNotes] = useState('Pristine condition observed upon pickup. Calibration warranty seals intact.');
  const [signature, setSignature] = useState(currentUser.name);
  const [error, setError] = useState('');

  const allChecked =
    checklist.powerCord &&
    checklist.probesOrCables &&
    checklist.calibrationIntact &&
    checklist.screenClean;

  const handleConditionSelect = (rating: number, text: 'Pristine' | 'Good' | 'Fair' | 'Minor Wear') => {
    setConditionRating(rating);
    setConditionText(text);
  };

  const handleConfirmCheckIn = () => {
    if (!allChecked) {
      setError('You must complete all 4 mandatory physical inspection items before checking in.');
      return;
    }

    if (!signature.trim()) {
      setError('Please provide your digital verification signature.');
      return;
    }

    checkInBooking(booking.id, {
      timestamp: new Date().toISOString(),
      actor: currentUser.name,
      condition: conditionText,
      rating: conditionRating,
      checklist,
      notes: notes.trim(),
      signature: signature.trim(),
    });

    fireCelebrationConfetti();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        id="checkin-modal"
      >
        <div className="modal-header">
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#F2E8DC', fontWeight: 800 }}>
              Physical Custody Handover
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#F2E8DC' }}>
              Check-In: {booking.resourceTitle}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#F2E8DC', cursor: 'pointer' }}
            id="close-checkin-modal-btn"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Instructions banner */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <ShieldCheck size={20} color="#10b981" />
            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Inspect the instrument before turning it on. Verifying baseline state prevents liability for prior wear.
            </div>
          </div>

          {/* Step 1: Pre-use inspection checklist */}
          <div style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ marginBottom: '10px' }}>
              <span>1. MANDATORY 4-POINT PHYSICAL INSPECTION</span>
              <span style={{ fontSize: '11px', color: allChecked ? '#10b981' : '#f43f5e' }}>
                {Object.values(checklist).filter(Boolean).length}/4 Verified
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
                  checked={checklist.powerCord}
                  onChange={(e) => setChecklist({ ...checklist, powerCord: e.target.checked })}
                  id="checkin-chk-power"
                />
                <span>Power cord, grounding prong, and transformer chassis free of fraying or damage</span>
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
                  checked={checklist.probesOrCables}
                  onChange={(e) => setChecklist({ ...checklist, probesOrCables: e.target.checked })}
                  id="checkin-chk-probes"
                />
                <span>All probes, BNC connectors, and factory test leads accounted for in travel pouch</span>
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
                  checked={checklist.calibrationIntact}
                  onChange={(e) => setChecklist({ ...checklist, calibrationIntact: e.target.checked })}
                  id="checkin-chk-calibration"
                />
                <span>NIST calibration warranty tamper seal intact and valid</span>
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
                  checked={checklist.screenClean}
                  onChange={(e) => setChecklist({ ...checklist, screenClean: e.target.checked })}
                  id="checkin-chk-screen"
                />
                <span>Digital display, rotary encoders, and mechanical buttons cleanly operational</span>
              </label>
            </div>
          </div>

          {/* Step 2: Initial Condition Rating */}
          <div style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ marginBottom: '8px' }}>
              <span>2. INITIAL CONDITION GRADE</span>
              <span style={{ color: 'var(--cyan-primary)', fontWeight: 700 }}>
                {conditionText} ({conditionRating}/5)
              </span>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[
                { r: 5, label: 'Pristine' as const, desc: 'Factory Flawless' },
                { r: 4, label: 'Good' as const, desc: 'Minor Cosmetic' },
                { r: 3, label: 'Fair' as const, desc: 'Standard Wear' },
                { r: 2, label: 'Minor Wear' as const, desc: 'Marked Wear' },
              ].map((item) => {
                const isSelected = conditionRating === item.r;
                return (
                  <button
                    key={item.r}
                    type="button"
                    onClick={() => handleConditionSelect(item.r, item.label)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--burgundy-primary)' : 'var(--border-subtle)',
                      background: isSelected ? 'rgba(48, 21, 30, 0.08)' : '#FFFFFF',
                      color: isSelected ? '#30151E' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                    id={`condition-rate-${item.r}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginBottom: '4px' }}>
                      {[...Array(item.r)].map((_, i) => (
                        <Star key={i} size={12} fill={isSelected ? '#30151E' : '#85616E'} color="none" />
                      ))}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700 }}>{item.label}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Condition notes */}
          <div className="form-group">
            <label className="form-label" htmlFor="checkin-notes">
              Physical Observations & Notes
            </label>
            <input
              type="text"
              id="checkin-notes"
              className="form-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record any cosmetic blemishes or serial code observations..."
            />
          </div>

          {/* Step 4: Digital Signature */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="checkin-signature">
              <span>Researcher Digital Sign-Off</span>
              <FileSignature size={14} color="var(--cyan-primary)" />
            </label>
            <input
              type="text"
              id="checkin-signature"
              className="form-input"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
            />
          </div>

          {error && (
            <div className="form-error" style={{ marginTop: '12px' }} id="checkin-error-msg">
              <AlertCircle size={14} />
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
            onClick={handleConfirmCheckIn}
            className="btn btn-success btn-sm"
            id="confirm-checkin-btn"
          >
            <CheckCircle2 size={16} />
            Confirm Physical Check-In
          </button>
        </div>
      </div>
    </div>
  );
};
