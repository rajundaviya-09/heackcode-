import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FALLBACK_AVATAR } from '../utils/imageFallback';
import type { Resource } from '../types';
import {
  X,
  Calendar,
  Clock,
  AlertTriangle,
  Layers
} from 'lucide-react';

interface BookingModalProps {
  resource: Resource;
  onClose: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ resource, onClose }) => {
  const { createBooking, checkOverlapConflict, currentUser, isAuthenticated, setCurrentPage } = useApp();

  // Sensible default dates: e.g. tomorrow from 09:00 to 13:00
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(`${tomorrowStr}T09:00`);
  const [endDate, setEndDate] = useState(`${tomorrowStr}T13:00`);
  const [purpose, setPurpose] = useState('');
  const [courseCode, setCourseCode] = useState('EE-702 Advanced Signal Diagnostics');
  const [priority, setPriority] = useState<'routine' | 'thesis' | 'grant' | 'emergency'>('thesis');
  const [certifiedAgreement, setCertifiedAgreement] = useState(false);
  const [joinAsWaitlist, setJoinAsWaitlist] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');

  // Form error state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check collision dynamically
  const isConflicting = checkOverlapConflict(resource.id, startDate, endDate);

  // Dynamic duration and credit calculation
  const startTs = new Date(startDate).getTime();
  const endTs = new Date(endDate).getTime();
  const durationHours = (!isNaN(startTs) && !isNaN(endTs) && endTs > startTs)
    ? Math.round(((endTs - startTs) / (1000 * 60 * 60)) * 10) / 10
    : 0;
  const estimatedCredits = Math.round(durationHours * (resource.hourlyRateCredits || 10));

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!startDate) errs.startDate = 'Start date and time is required';
    if (!endDate) errs.endDate = 'End date and time is required';

    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    if (start && end && end <= start) {
      errs.endDate = 'Return time must be after the check-in time';
    }

    if (durationHours > (resource.maxDurationHours || 24)) {
      errs.endDate = `Requested duration (${durationHours}h) exceeds maximum allowed limit (${resource.maxDurationHours || 24}h).`;
    }

    if (!purpose.trim()) {
      errs.purpose = 'Please provide the research objective or experiment summary';
    } else if (purpose.trim().length < 10) {
      errs.purpose = 'Purpose must be at least 10 characters long';
    }

    if (!courseCode.trim()) {
      errs.courseCode = 'Course or Research Grant ID is required';
    }

    if (!certifiedAgreement) {
      errs.certifiedAgreement = 'You must certify safety protocol compliance';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    setGeneralError('');

    try {
      const result = await createBooking({
        resourceId: resource.id,
        startDate,
        endDate,
        purpose,
        courseCode,
        priority,
        certifiedAgreement,
        asWaitlist: joinAsWaitlist,
      });

      if (result.conflict && !joinAsWaitlist) {
        setErrors((prev) => ({
          ...prev,
          conflict: result.message,
        }));
        setIsSubmitting(false);
        return;
      }

      if (result.success) {
        onClose();
        setCurrentPage('bookings');
      } else {
        if (!isAuthenticated) {
          // Auth modal was opened by AppContext; close this modal so user can sign in
          onClose();
        } else {
          setGeneralError(result.message || 'Booking submission failed. Please check policy compliance.');
        }
      }
    } catch (err: any) {
      setGeneralError(err.message || 'An unexpected network error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        id="booking-request-modal"
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#F2E8DC', fontWeight: 800 }}>
              Institutional Allocation Request
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#F2E8DC' }}>
              Reserve: {resource.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#F2E8DC',
              cursor: 'pointer',
              padding: '6px',
            }}
            id="close-booking-modal-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Institutional Policy & Approval Mode Ribbon */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background:
                  resource.approvalMode === 'MODE_A_AUTO'
                    ? 'rgba(16, 185, 129, 0.08)'
                    : resource.approvalMode === 'MODE_C_INSTITUTION'
                    ? 'rgba(245, 158, 11, 0.08)'
                    : resource.approvalMode === 'MODE_D_MULTI_STAGE'
                    ? 'rgba(168, 85, 247, 0.08)'
                    : 'rgba(56, 189, 248, 0.08)',
                border: `1px solid ${
                  resource.approvalMode === 'MODE_A_AUTO'
                    ? 'rgba(16, 185, 129, 0.25)'
                    : resource.approvalMode === 'MODE_C_INSTITUTION'
                    ? 'rgba(245, 158, 11, 0.25)'
                    : resource.approvalMode === 'MODE_D_MULTI_STAGE'
                    ? 'rgba(168, 85, 247, 0.25)'
                    : 'rgba(56, 189, 248, 0.25)'
                }`,
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background:
                        resource.approvalMode === 'MODE_A_AUTO'
                          ? 'rgba(16, 185, 129, 0.2)'
                          : resource.approvalMode === 'MODE_C_INSTITUTION'
                          ? 'rgba(245, 158, 11, 0.2)'
                          : resource.approvalMode === 'MODE_D_MULTI_STAGE'
                          ? 'rgba(168, 85, 247, 0.2)'
                          : 'rgba(48, 21, 30, 0.08)',
                      color:
                        resource.approvalMode === 'MODE_A_AUTO'
                          ? '#15803d'
                          : resource.approvalMode === 'MODE_C_INSTITUTION'
                          ? '#92400e'
                          : resource.approvalMode === 'MODE_D_MULTI_STAGE'
                          ? '#5A1E31'
                          : '#30151E',
                    }}
                  >
                    {resource.approvalMode === 'MODE_A_AUTO'
                      ? '⚡ Mode A: Instant Auto-Approval'
                      : resource.approvalMode === 'MODE_B_OWNER'
                      ? '🛡️ Mode B: Custodian Review'
                      : resource.approvalMode === 'MODE_C_INSTITUTION'
                      ? '🏛️ Mode C: Institutional Dean Review'
                      : '📋 Mode D: Multi-Stage Approval (Custodian + Dean)'}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {resource.institutionName || 'College of Engineering'}
                  </span>
                </div>

                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: resource.allowExternalUsers ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                    color: resource.allowExternalUsers ? '#34d399' : '#fb7185',
                  }}
                >
                  {resource.allowExternalUsers ? 'External Researchers Permitted' : 'Internal Institution Only'}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Limits: Up to <strong>{resource.maxDurationHours || 24} hours</strong> per reservation • Max advance booking: <strong>{resource.advanceBookingDays || 30} days</strong> • Rate: <strong>{resource.hourlyRateCredits || 10} credits/hr</strong>
              </div>
            </div>

            {/* General Error Alert */}
            {generalError && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(244, 63, 94, 0.12)',
                  border: '1px solid rgba(244, 63, 94, 0.35)',
                  marginBottom: '16px',
                  color: '#fb7185',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                id="booking-general-error"
              >
                <AlertTriangle size={16} />
                <span>{generalError}</span>
              </div>
            )}

            {/* Real-time Conflict Alert Banner */}
            {isConflicting && (
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  marginBottom: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
                id="booking-conflict-banner"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontWeight: 700, fontSize: '13.5px' }}>
                  <AlertTriangle size={18} />
                  <span>Time Slot Collision Detected</span>
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Another research team has an approved reservation overlapping this time window. Standard direct booking is blocked.
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      color: '#30151E',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={joinAsWaitlist}
                      onChange={(e) => setJoinAsWaitlist(e.target.checked)}
                      id="join-waitlist-checkbox"
                    />
                    <span>Join Priority Waiting List for this Slot</span>
                  </label>
                </div>
              </div>
            )}

            {/* Applicant Profile Ribbon */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '18px',
              }}
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FALLBACK_AVATAR;
                }}
                style={{ width: '32px', height: '32px', borderRadius: '50%' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 700 }}>{currentUser.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Clearance: Level {currentUser.safetyLevel} • {currentUser.department} ({currentUser.institutionName})
                </div>
              </div>
              <span className={`badge ${currentUser.safetyLevel >= resource.safetyLevelRequired ? 'badge-available' : 'badge-maintenance'}`}>
                {currentUser.safetyLevel >= resource.safetyLevelRequired ? 'Eligible' : 'Clearance Review Required'}
              </span>
            </div>

            {/* Start and End Date Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="booking-start-date">
                  <span>Start Check-In</span>
                  <Clock size={14} color="var(--cyan-primary)" />
                </label>
                <input
                  type="datetime-local"
                  id="booking-start-date"
                  className={`form-input ${errors.startDate ? 'error' : ''}`}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                {errors.startDate && <div className="form-error">{errors.startDate}</div>}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="booking-end-date">
                  <span>End / Expected Return</span>
                  <Clock size={14} color="#818cf8" />
                </label>
                <input
                  type="datetime-local"
                  id="booking-end-date"
                  className={`form-input ${errors.endDate ? 'error' : ''}`}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                {errors.endDate && <div className="form-error">{errors.endDate}</div>}
              </div>
            </div>

            {/* Calculated Duration & Credits Preview */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'rgba(48, 21, 30, 0.04)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(48, 21, 30, 0.12)',
                marginBottom: '16px',
                fontSize: '12.5px',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Calculated Duration: </span>
                <strong style={{ color: durationHours > (resource.maxDurationHours || 24) ? '#be123c' : '#30151E' }}>
                  {durationHours} hours
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Estimated Cost: </span>
                <strong style={{ color: '#30151E' }}>{estimatedCredits} credits</strong>
              </div>
            </div>

            {/* Course / Project Code & Priority */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="booking-course-code">
                  Course or Grant ID
                </label>
                <input
                  type="text"
                  id="booking-course-code"
                  className={`form-input ${errors.courseCode ? 'error' : ''}`}
                  placeholder="e.g. EE-702 or NSF-GRANT-4091"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                />
                {errors.courseCode && <div className="form-error">{errors.courseCode}</div>}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="booking-priority">
                  Priority Tier
                </label>
                <select
                  id="booking-priority"
                  className="form-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                >
                  <option value="routine">Routine</option>
                  <option value="thesis">Thesis Critical</option>
                  <option value="grant">Grant Sponsored</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
            </div>

            {/* Purpose textarea */}
            <div className="form-group">
              <label className="form-label" htmlFor="booking-purpose">
                <span>Experiment Description & Purpose</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Required</span>
              </label>
              <textarea
                id="booking-purpose"
                className={`form-textarea ${errors.purpose ? 'error' : ''}`}
                rows={3}
                placeholder="State your hypothesis, testing parameters, and reason for requiring this specific instrument..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
              {errors.purpose && <div className="form-error">{errors.purpose}</div>}
            </div>

            {/* Safety & Protocol Certification Agreement */}
            <div
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(48, 21, 30, 0.04)',
                border: `1.5px solid ${errors.certifiedAgreement ? '#be123c' : 'rgba(48, 21, 30, 0.18)'}`,
                marginTop: '10px',
              }}
            >
              <label className="checkbox-group">
                <input
                  type="checkbox"
                  className="checkbox-input"
                  id="safety-agreement-checkbox"
                  checked={certifiedAgreement}
                  onChange={(e) => setCertifiedAgreement(e.target.checked)}
                />
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <strong style={{ color: '#30151E' }}>Compliance & Safety Assurance:</strong> I certify that I have reviewed the operation manual for <em>{resource.title}</em>, will perform physical condition logging at check-in/return, and agree to institutional lab liability guidelines.
                </div>
              </label>
              {errors.certifiedAgreement && (
                <div className="form-error" style={{ marginTop: '8px', marginLeft: '28px' }}>
                  {errors.certifiedAgreement}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              id="cancel-booking-btn"
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className={`btn ${isConflicting && !joinAsWaitlist ? 'btn-secondary' : 'btn-primary'}`}
              id="submit-booking-request-btn"
              disabled={(isConflicting && !joinAsWaitlist) || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Clock size={16} className="animate-spin" />
                  Validating Policies...
                </>
              ) : isConflicting && joinAsWaitlist ? (
                <>
                  <Layers size={16} />
                  Submit Waitlist Entry
                </>
              ) : (
                <>
                  <Calendar size={16} />
                  Submit Reservation Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
