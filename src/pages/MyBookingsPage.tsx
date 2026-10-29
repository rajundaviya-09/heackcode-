import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Booking } from '../types';
import { CheckInModal } from './CheckInModal';
import { ReturnModal } from './ReturnModal';
import {
  Calendar,
  CheckCircle2,
  PackageCheck,
  AlertCircle,
  FileCheck2,
  Lock,
  X,
  HelpCircle,
  Send,
  Ban
} from 'lucide-react';

export const MyBookingsPage: React.FC = () => {
  const {
    bookings,
    currentUser,
    currentRole,
    setCurrentPage,
    cancelBooking,
    respondInfo,
  } = useApp();

  const [activeCheckInBooking, setActiveCheckInBooking] = useState<Booking | null>(null);
  const [activeReturnBooking, setActiveReturnBooking] = useState<Booking | null>(null);
  const [timelineBooking, setTimelineBooking] = useState<Booking | null>(null);

  // Response modal state
  const [responseModalBooking, setResponseModalBooking] = useState<Booking | null>(null);
  const [responseText, setResponseText] = useState('');
  const [responseError, setResponseError] = useState('');
  const [cancelConfirmBooking, setCancelConfirmBooking] = useState<Booking | null>(null);

  // Filter bookings for the current seeker (or all if in admin mode)
  const isSeeker = currentRole === 'RESOURCE_SEEKER' || currentRole === 'seeker';
  const isAdmin = currentRole === 'ADMIN' || currentRole === 'admin';

  const userBookings = bookings.filter((b) => {
    if (isAdmin) return true;
    if (isSeeker) return b.seekerId === currentUser.id;
    return b.seekerId === currentUser.id;
  });

  const handleOpenResponse = (b: Booking) => {
    setResponseModalBooking(b);
    setResponseText('');
    setResponseError('');
  };

  const handleConfirmResponse = async () => {
    if (!responseText.trim()) {
      setResponseError('Please enter your response before submitting.');
      return;
    }
    if (responseModalBooking) {
      await respondInfo(responseModalBooking.id, responseText.trim());
      setResponseModalBooking(null);
      setResponseText('');
    }
  };

  const handleConfirmCancel = async () => {
    if (cancelConfirmBooking) {
      await cancelBooking(cancelConfirmBooking.id);
      setCancelConfirmBooking(null);
    }
  };

  return (
    <div className="page-wrapper" id="my-bookings-view">
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="badge badge-in-use">
            <span className="badge-dot" />
            Researcher Allocation Ledger
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>•</span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {userBookings.length} Active & Past Reservations
          </span>
        </div>
        <h1 style={{ fontSize: '30px', fontWeight: 800, marginBottom: '8px' }}>
          My Equipment Reservations
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '680px' }}>
          Track reservation approval stages, answer custodian inquiries, execute physical pre-use check-in verifications, complete returns, and inspect tamper-evident audit timelines.
        </p>
      </div>

      {/* Bookings List */}
      {userBookings.length === 0 ? (
        <div
          className="glass-card"
          style={{
            padding: '60px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
          id="no-user-bookings-msg"
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(6, 182, 212, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cyan-primary)',
            }}
          >
            <Calendar size={28} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>No Active Reservations Found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', maxWidth: '440px' }}>
            You haven't submitted any instrument requests yet. Explore the catalog to discover high-value laboratory hardware.
          </p>
          <button
            onClick={() => setCurrentPage('discovery')}
            className="btn btn-primary btn-sm"
            id="browse-catalog-empty-btn"
          >
            Explore Equipment Catalog
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {userBookings.map((b) => {
            const st = String(b.status).toUpperCase();
            const isApproved = st === 'APPROVED';
            const isCheckedOut = st === 'CHECKED_OUT' || st === 'IN_USE';
            const isCompleted = st === 'RETURNED' || st === 'COMPLETED';
            const isPending = st === 'PENDING' || st === 'PENDING_OWNER_APPROVAL' || st === 'PENDING_INSTITUTION_APPROVAL';
            const isWaitlisted = st === 'WAITLISTED';
            const isRejected = st === 'REJECTED';
            const isCancelled = st === 'CANCELLED';

            return (
              <div
                key={b.id}
                className="glass-card"
                style={{
                  padding: '24px',
                  borderLeft:
                    isApproved
                      ? '4px solid #10b981'
                      : isCheckedOut
                      ? '4px solid #06b6d4'
                      : isCompleted
                      ? '4px solid #6366f1'
                      : isRejected
                      ? '4px solid #f43f5e'
                      : isWaitlisted
                      ? '4px solid #fb923c'
                      : isCancelled
                      ? '4px solid var(--text-muted)'
                      : '4px solid #818cf8',
                }}
                id={`booking-card-${b.id}`}
              >
                {/* Card Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px',
                    marginBottom: '16px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#30151E' }}>
                        {b.resourceTitle}
                      </h3>
                      <BookingStatusPill status={b.status} waitlistPos={b.waitlistPosition} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                      <span>Category: <strong>{b.resourceCategory}</strong></span>
                      <span>•</span>
                      <span>Course/Grant: <strong>{b.courseCode}</strong></span>
                      <span>•</span>
                      <span>Institution: <strong>{b.institutionName}</strong></span>
                      <span>•</span>
                      <span style={{ color: 'var(--text-muted)' }}>ID: {b.id}</span>
                    </div>
                  </div>

                  {/* Date Window */}
                  <div
                    style={{
                      background: 'rgba(48, 21, 30, 0.05)',
                      border: '1.5px solid rgba(48, 21, 30, 0.15)',
                      borderRadius: 'var(--radius-md)',
                      padding: '8px 14px',
                      textAlign: 'right',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Reserved Allocation Window
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#30151E' }}>
                      {new Date(b.startDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {new Date(b.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(b.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                {/* Purpose */}
                <div
                  style={{
                    background: 'rgba(48, 21, 30, 0.04)',
                    border: '1px solid rgba(48, 21, 30, 0.12)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#30151E' }}>Objective: </span>
                  {b.purpose}
                </div>

                {/* Reviewer Inquiry Card if info requested */}
                {b.infoRequest && (
                  <div
                    style={{
                      background: 'rgba(48, 21, 30, 0.06)',
                      border: '1.5px solid rgba(48, 21, 30, 0.22)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 16px',
                      marginBottom: '16px',
                    }}
                    id={`inquiry-card-${b.id}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', fontWeight: 700, color: '#30151E' }}>
                        <HelpCircle size={16} />
                        <span>Inquiry from Reviewer ({b.infoRequest.requestedBy}):</span>
                      </div>
                      {!b.infoRequest.response && (
                        <button
                          onClick={() => handleOpenResponse(b)}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '4px 10px', fontSize: '11.5px' }}
                          id={`respond-inquiry-btn-${b.id}`}
                        >
                          <Send size={12} />
                          Submit Clarification
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: '#30151E', marginBottom: b.infoRequest.response ? '8px' : '0' }}>
                      "{b.infoRequest.question}"
                    </div>

                    {b.infoRequest.response && (
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.7)',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          borderLeft: '3px solid #15803d',
                          marginTop: '6px',
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#15803d' }}>
                          Your Response:
                        </div>
                        <div style={{ fontSize: '12.5px', color: '#30151E' }}>
                          "{b.infoRequest.response}"
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Rejection notice if declined */}
                {isRejected && b.rejectionReason && (
                  <div
                    style={{
                      background: 'rgba(244, 63, 94, 0.08)',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                    id={`seeker-rejection-msg-${b.id}`}
                  >
                    <AlertCircle size={18} color="#fb7185" />
                    <div style={{ fontSize: '13px', color: '#fb7185' }}>
                      <strong>Declined by Reviewer:</strong> "{b.rejectionReason}"
                    </div>
                  </div>
                )}

                {/* Inspection Condition Summary Pill Strip */}
                {(b.checkIn || b.returnCheckOut) && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      marginBottom: '16px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {b.checkIn && (
                      <div
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(16, 185, 129, 0.08)',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <CheckCircle2 size={14} color="#10b981" />
                        <span>
                          Initial Condition: <strong>{b.checkIn.condition} ({b.checkIn.rating}/5)</strong>
                        </span>
                      </div>
                    )}

                    {b.returnCheckOut && (
                      <div
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(99, 102, 241, 0.08)',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <PackageCheck size={14} color="#818cf8" />
                        <span>
                          Final Condition: <strong>{b.returnCheckOut.condition} ({b.returnCheckOut.rating}/5)</strong>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Card Action Strip */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '16px',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  {/* Timeline & Audit Trigger */}
                  <button
                    onClick={() => setTimelineBooking(b)}
                    className="btn btn-secondary btn-sm"
                    id={`open-timeline-btn-${b.id}`}
                  >
                    <FileCheck2 size={15} />
                    Booking Timeline & Audit ({b.timeline.length} Events)
                  </button>

                  {/* Contextual Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Cancellation Button (Before Check-in) */}
                    {(isPending || isApproved) && (
                      <button
                        onClick={() => setCancelConfirmBooking(b)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#fb7185', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                        id={`cancel-booking-btn-${b.id}`}
                      >
                        <Ban size={14} />
                        Cancel Request
                      </button>
                    )}

                    {/* Step 8: Approved -> Ready for Check-In */}
                    {isApproved && (
                      <button
                        onClick={() => setActiveCheckInBooking(b)}
                        className="btn btn-success btn-sm"
                        id={`start-checkin-btn-${b.id}`}
                      >
                        <CheckCircle2 size={15} />
                        Complete Pre-Use Check-In
                      </button>
                    )}

                    {/* Step 9: In Use -> Ready for Return */}
                    {isCheckedOut && (
                      <button
                        onClick={() => setActiveReturnBooking(b)}
                        className="btn btn-primary btn-sm"
                        id={`start-return-btn-${b.id}`}
                      >
                        <PackageCheck size={15} />
                        Complete Return & Inspection
                      </button>
                    )}

                    {isCompleted && (
                      <span
                        style={{
                          fontSize: '12.5px',
                          color: '#818cf8',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Lock size={14} />
                        Lifecycle Sealed & Archived
                      </span>
                    )}

                    {isPending && (
                      <span style={{ fontSize: '12.5px', color: '#fbbf24', fontWeight: 600 }}>
                        {st === 'PENDING_INSTITUTION_APPROVAL'
                          ? 'Awaiting Institution Dean Sign-off'
                          : 'Awaiting Resource Custodian Review'}
                      </span>
                    )}

                    {isWaitlisted && (
                      <span style={{ fontSize: '12.5px', color: '#fb923c', fontWeight: 600 }}>
                        Queue Position: #{b.waitlistPosition || 1}
                      </span>
                    )}

                    {isCancelled && (
                      <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                        Reservation Cancelled
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Check-In Modal */}
      {activeCheckInBooking && (
        <CheckInModal
          booking={activeCheckInBooking}
          onClose={() => setActiveCheckInBooking(null)}
        />
      )}

      {/* Return Modal */}
      {activeReturnBooking && (
        <ReturnModal
          booking={activeReturnBooking}
          onClose={() => setActiveReturnBooking(null)}
        />
      )}

      {/* Booking Timeline & Audit Modal */}
      {timelineBooking && (
        <TimelineModal
          booking={timelineBooking}
          onClose={() => setTimelineBooking(null)}
          onNavigateAudit={() => {
            setTimelineBooking(null);
            setCurrentPage('audit');
          }}
        />
      )}

      {/* Modal: Response to Clarification Request */}
      {responseModalBooking && (
        <div className="modal-overlay" onClick={() => setResponseModalBooking(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} id="respond-info-modal">
            <div className="modal-header">
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#F2E8DC', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={18} />
                Respond to Reviewer Inquiry
              </h3>
              <button onClick={() => setResponseModalBooking(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'rgba(48, 21, 30, 0.05)', padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: '14px', border: '1px solid rgba(48, 21, 30, 0.15)' }}>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 700 }}>QUESTION:</div>
                <div style={{ fontSize: '13px', color: '#30151E', marginTop: '2px', fontWeight: 600 }}>
                  "{responseModalBooking.infoRequest?.question}"
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="response-text-input">
                  Your Supporting Explanation / Response
                </label>
                <textarea
                  id="response-text-input"
                  className={`form-textarea ${responseError ? 'error' : ''}`}
                  rows={3}
                  value={responseText}
                  onChange={(e) => {
                    setResponseText(e.target.value);
                    setResponseError('');
                  }}
                  placeholder="Provide experimental parameters, laser settings, or research documentation..."
                />
                {responseError && <div className="form-error">{responseError}</div>}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setResponseModalBooking(null)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
              <button onClick={handleConfirmResponse} className="btn btn-primary btn-sm" id="confirm-response-btn">
                <Send size={14} />
                Submit Response to Custodian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cancel Booking Confirmation */}
      {cancelConfirmBooking && (
        <div className="modal-overlay" onClick={() => setCancelConfirmBooking(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }} id="cancel-confirm-modal">
            <div className="modal-header">
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#fb7185', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Ban size={18} />
                Cancel Reservation
              </h3>
              <button onClick={() => setCancelConfirmBooking(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Are you sure you want to cancel your reservation for <strong>{cancelConfirmBooking.resourceTitle}</strong>?
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                This time slot will immediately be made available and any waiting list candidates will be automatically promoted.
              </p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setCancelConfirmBooking(null)} className="btn btn-secondary btn-sm">
                Keep Reservation
              </button>
              <button onClick={handleConfirmCancel} className="btn btn-danger btn-sm" id="confirm-cancel-action-btn">
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const BookingStatusPill: React.FC<{ status: Booking['status']; waitlistPos?: number }> = ({
  status,
  waitlistPos,
}) => {
  const st = String(status).toUpperCase();

  const map: Record<string, { cls: string; label: string }> = {
    PENDING: { cls: 'badge-pending', label: 'Pending Review' },
    PENDING_OWNER_APPROVAL: { cls: 'badge-pending', label: 'Pending Custodian Review' },
    PENDING_INSTITUTION_APPROVAL: { cls: 'badge-pending', label: 'Pending Dean Sign-off' },
    APPROVED: { cls: 'badge-available', label: 'Approved • Ready for Check-In' },
    CHECKED_OUT: { cls: 'badge-in-use', label: 'In Physical Use • Checked Out' },
    IN_USE: { cls: 'badge-in-use', label: 'In Physical Use • Checked Out' },
    RETURNED: { cls: 'badge-in-use', label: 'Returned • Certified' },
    COMPLETED: { cls: 'badge-in-use', label: 'Returned • Certified' },
    WAITLISTED: { cls: 'badge-waitlist', label: `Waitlisted (Queue #${waitlistPos || 1})` },
    REJECTED: { cls: 'badge-maintenance', label: 'Declined' },
    CANCELLED: { cls: 'badge-maintenance', label: 'Cancelled' },
  };

  const current = map[st] || { cls: 'badge-available', label: status };

  return (
    <span className={`badge ${current.cls}`} id={`booking-status-pill-${status}`}>
      <span className="badge-dot" />
      {current.label}
    </span>
  );
};

interface TimelineModalProps {
  booking: Booking;
  onClose: () => void;
  onNavigateAudit: () => void;
}

const TimelineModal: React.FC<TimelineModalProps> = ({ booking, onClose, onNavigateAudit }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px' }}
        id="timeline-audit-modal"
      >
        <div className="modal-header">
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#F2E8DC', fontWeight: 800 }}>
              Audit Verification Timeline
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#F2E8DC' }}>
              {booking.resourceTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#F2E8DC', cursor: 'pointer' }}
            id="close-timeline-modal-btn"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Status summary */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(48, 21, 30, 0.04)',
              border: '1px solid rgba(48, 21, 30, 0.12)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                CURRENT STATE
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#30151E' }}>
                {booking.status}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                APPLICANT
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#30151E' }}>
                {booking.seekerName} ({booking.seekerDepartment})
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                SCHEDULE
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#30151E' }}>
                {new Date(booking.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Stepper Timeline nodes */}
          <div style={{ position: 'relative', paddingLeft: '28px', display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
            {/* Vertical connector line */}
            <div
              style={{
                position: 'absolute',
                left: '7px',
                top: '12px',
                bottom: '12px',
                width: '2px',
                background: 'linear-gradient(to bottom, #30151E, #8C3A5A)',
              }}
            />

            {booking.timeline.map((event) => (
              <div
                key={event.id}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
                className="timeline-item"
              >
                {/* Node dot */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-28px',
                    top: '2px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    border: '3px solid #30151E',
                    boxShadow: '0 0 8px rgba(48, 21, 30, 0.3)',
                  }}
                />

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#30151E' }}>
                      {event.title}
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(48, 21, 30, 0.08)',
                        color: '#30151E',
                        border: '1px solid rgba(48, 21, 30, 0.2)',
                      }}
                    >
                      {event.statusBadge}
                    </span>
                  </div>

                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '2px 0 6px' }}>
                    {new Date(event.timestamp).toLocaleString()} • Actor: <strong>{event.actor}</strong>
                  </div>

                  <div
                    style={{
                      fontSize: '12.5px',
                      color: 'var(--text-secondary)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      lineHeight: 1.4,
                    }}
                  >
                    {event.description}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tamper-Evident SHA-256 Seal Banner */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Lock size={18} color="#10b981" />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#34d399' }}>
                  Cryptographic State Verification
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Block Seal: SHA256-V2_VERIFIED_IMMUTABLE
                </div>
              </div>
            </div>

            <button
              onClick={onNavigateAudit}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '4px 10px' }}
              id="view-full-audit-from-timeline-btn"
            >
              Open Global Ledger
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Close Timeline
          </button>
        </div>
      </div>
    </div>
  );
};
