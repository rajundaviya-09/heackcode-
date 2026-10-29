import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Booking } from '../types';
import { fireCelebrationConfetti } from '../components/Confetti';
import {
  CheckCircle,
  XCircle,
  Shield,
  AlertTriangle,
  Check,
  X,
  HelpCircle,
  ArrowRight,
  MessageSquare,
  Send
} from 'lucide-react';

export const OwnerApprovalsPage: React.FC = () => {
  const {
    bookings,
    approveBooking,
    rejectBooking,
    requestInfo,
    currentUser,
    currentRole,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');
  const [selectedInstFilter, setSelectedInstFilter] = useState<string>('all');

  // Modals state
  const [rejectModalBooking, setRejectModalBooking] = useState<Booking | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  const [infoModalBooking, setInfoModalBooking] = useState<Booking | null>(null);
  const [infoQuestion, setInfoQuestion] = useState('');
  const [infoError, setInfoError] = useState('');

  const [notesModalBooking, setNotesModalBooking] = useState<Booking | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');

  // Normalize roles
  const isOwner = currentRole === 'RESOURCE_OWNER' || currentRole === 'owner';
  const isInstMgr = currentRole === 'INSTITUTION_MANAGER';
  const isAdmin = currentRole === 'ADMIN' || currentRole === 'admin';

  // Filter bookings for current reviewer
  const reviewableBookings = bookings.filter((b) => {
    if (isAdmin) return true;
    if (isOwner) return b.ownerId === currentUser.id;
    if (isInstMgr) return b.institutionId === currentUser.institutionId;
    return true; // Seeker viewing demo
  });

  const displayedBookings = reviewableBookings.filter((b) => {
    const st = String(b.status).toUpperCase();

    // Tab filter
    if (activeTab === 'pending') {
      if (!['PENDING', 'PENDING_OWNER_APPROVAL', 'PENDING_INSTITUTION_APPROVAL'].includes(st)) {
        return false;
      }
    } else if (activeTab === 'approved') {
      if (!['APPROVED', 'CHECKED_OUT', 'RETURNED', 'IN_USE', 'COMPLETED'].includes(st)) {
        return false;
      }
    } else if (activeTab === 'rejected') {
      if (st !== 'REJECTED') return false;
    }

    // Stage filter
    if (selectedStageFilter === 'stage1' && st !== 'PENDING_OWNER_APPROVAL') return false;
    if (selectedStageFilter === 'stage2' && st !== 'PENDING_INSTITUTION_APPROVAL') return false;

    // Institution filter
    if (selectedInstFilter !== 'all' && b.institutionId !== selectedInstFilter) return false;

    return true;
  });

  const pendingCount = reviewableBookings.filter((b) =>
    ['PENDING', 'PENDING_OWNER_APPROVAL', 'PENDING_INSTITUTION_APPROVAL'].includes(String(b.status).toUpperCase())
  ).length;

  const handleOpenApproveNotes = (booking: Booking) => {
    setNotesModalBooking(booking);
    setApprovalNotes('Safety clearance and prerequisite checks verified.');
  };

  const handleConfirmApprove = async () => {
    if (notesModalBooking) {
      await approveBooking(notesModalBooking.id, approvalNotes.trim());
      setNotesModalBooking(null);
      setApprovalNotes('');
      fireCelebrationConfetti();
    }
  };

  const handleOpenReject = (booking: Booking) => {
    setRejectModalBooking(booking);
    setRejectionReason('Lab undergoing calibration during this requested window.');
    setReasonError('');
  };

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      setReasonError('Please provide a specific justification for declining this request.');
      return;
    }
    if (rejectModalBooking) {
      await rejectBooking(rejectModalBooking.id, rejectionReason.trim());
      setRejectModalBooking(null);
      setRejectionReason('');
    }
  };

  const handleOpenInfo = (booking: Booking) => {
    setInfoModalBooking(booking);
    setInfoQuestion('Please provide additional details regarding sample preparation and safety protocol.');
    setInfoError('');
  };

  const handleConfirmInfo = async () => {
    if (!infoQuestion.trim()) {
      setInfoError('Please enter a question or clarification request.');
      return;
    }
    if (infoModalBooking) {
      await requestInfo(infoModalBooking.id, infoQuestion.trim());
      setInfoModalBooking(null);
      setInfoQuestion('');
    }
  };

  return (
    <div className="page-wrapper" id="owner-approvals-view">
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="badge badge-in-use">
            <span className="badge-dot" />
            {isInstMgr ? 'College & Dean Governance Portal' : 'Custodian Approvals Portal'}
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>•</span>
          <span style={{ fontSize: '13px', color: '#fbbf24', fontWeight: 700 }}>
            {pendingCount} Pending Decision
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>•</span>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Authority Scope: <strong>{currentUser.institutionName}</strong>
          </span>
        </div>
        <h1 style={{ fontSize: '30px', fontWeight: 800, marginBottom: '8px' }}>
          Lab Equipment & Facility Allocation Requests
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '720px' }}>
          Execute multi-stage governance sign-offs, verify applicant safety certifications, audit conflict status, request applicant clarifications, and authorize confirmed bookings.
        </p>
      </div>

      {/* Targeted Possessor Notice */}
      <div
        style={{
          background: '#F8F5EE',
          border: '1.5px solid #F2E8DC',
          borderLeft: '4px solid #30151E',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#30151E',
              color: '#F2E8DC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={16} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#30151E' }}>
              Targeted Custodian Queue (Requests & Inquiries for Your Assigned Equipment)
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              Logged in as <strong>{currentUser.name}</strong>. Showing exclusively requests for equipment assigned to your custody.
            </div>
          </div>
        </div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            background: '#30151E',
            color: '#F2E8DC',
          }}
        >
          {reviewableBookings.length} Total Items in Scope
        </span>
      </div>

      {/* Tabs and Filters Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '24px',
          paddingBottom: '10px',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('pending')}
            className={`btn btn-sm ${activeTab === 'pending' ? 'btn-primary' : 'btn-ghost'}`}
            id="tab-pending-approvals"
          >
            Pending Review ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`btn btn-sm ${activeTab === 'approved' ? 'btn-primary' : 'btn-ghost'}`}
            id="tab-approved-approvals"
          >
            Approved & Active
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`btn btn-sm ${activeTab === 'rejected' ? 'btn-primary' : 'btn-ghost'}`}
            id="tab-rejected-approvals"
          >
            Declined
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            id="tab-all-approvals"
          >
            All Requests ({reviewableBookings.length})
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            className="form-select form-select-sm"
            value={selectedStageFilter}
            onChange={(e) => setSelectedStageFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '150px' }}
            id="filter-approval-stage"
          >
            <option value="all">All Approval Stages</option>
            <option value="stage1">Stage 1: Custodian Review</option>
            <option value="stage2">Stage 2: Institutional Sign-off</option>
          </select>

          <select
            className="form-select form-select-sm"
            value={selectedInstFilter}
            onChange={(e) => setSelectedInstFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '160px' }}
            id="filter-institution"
          >
            <option value="all">All Institutions</option>
            <option value="INST_ENG">College of Engineering</option>
            <option value="INST_MED">School of Medicine</option>
            <option value="INST_COMP">Turing Institute</option>
          </select>
        </div>
      </div>

      {/* List of Requests */}
      {displayedBookings.length === 0 ? (
        <div
          className="glass-card"
          style={{
            padding: '60px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
          id="no-approvals-message"
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399',
            }}
          >
            <CheckCircle size={28} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>No Requests in this View</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', maxWidth: '400px' }}>
            All incoming requests within your institutional review scope have been addressed.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {displayedBookings.map((booking) => {
            const st = String(booking.status).toUpperCase();
            const isStage1 = st === 'PENDING_OWNER_APPROVAL' || st === 'PENDING';
            const isStage2 = st === 'PENDING_INSTITUTION_APPROVAL';
            const isPendingDecision = isStage1 || isStage2;

            // Check if current user has authority to act on this stage
            const canActOnCurrentStage =
              isAdmin ||
              (isStage1 && isOwner && booking.ownerId === currentUser.id) ||
              (isStage2 && isInstMgr && booking.institutionId === currentUser.institutionId);

            return (
              <div
                key={booking.id}
                className="glass-card"
                style={{
                  padding: '24px',
                  borderLeft:
                    isPendingDecision
                      ? isStage2
                        ? '4px solid #f59e0b'
                        : '4px solid #818cf8'
                      : st === 'APPROVED'
                      ? '4px solid #10b981'
                      : st === 'REJECTED'
                      ? '4px solid #f43f5e'
                      : '4px solid var(--border-medium)',
                }}
                id={`owner-request-card-${booking.id}`}
              >
                {/* Top Bar: Title, Badges, Schedule */}
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
                    {/* Item in Your Custody Indicator */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#FAF7F2',
                        border: '1px solid rgba(48, 21, 30, 0.2)',
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#30151E',
                        marginBottom: '8px',
                      }}
                    >
                      <span>📦 Item in Your Possession: <strong>{booking.resourceTitle}</strong></span>
                      <span style={{ color: 'var(--text-muted)' }}>•</span>
                      <span style={{ color: '#15803d' }}>Direct message from {booking.seekerName}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#30151E' }}>
                        {booking.resourceTitle}
                      </h3>

                      <span
                        className={`badge ${
                          isStage2
                            ? 'badge-pending'
                            : isStage1
                            ? 'badge-pending'
                            : st === 'APPROVED'
                            ? 'badge-available'
                            : st === 'CHECKED_OUT' || st === 'IN_USE'
                            ? 'badge-in-use'
                            : 'badge-maintenance'
                        }`}
                      >
                        {isStage1
                          ? 'PENDING CUSTODIAN REVIEW'
                          : isStage2
                          ? 'PENDING INSTITUTION DEAN'
                          : st}
                      </span>

                      {/* Approval Mode Pill */}
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(48, 21, 30, 0.08)',
                          color: '#30151E',
                          border: '1px solid rgba(48, 21, 30, 0.2)',
                        }}
                      >
                        {booking.approvalMode === 'MODE_D_MULTI_STAGE'
                          ? 'MULTI-STAGE APPROVAL (OWNER + DEAN)'
                          : booking.approvalMode === 'MODE_C_INSTITUTION'
                          ? 'DEAN / INSTITUTION MODE'
                          : 'CUSTODIAN MODE'}
                      </span>

                      {/* External Applicant Badge */}
                      {booking.isExternalSeeker && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(180, 83, 9, 0.12)',
                            color: '#b45309',
                            border: '1px solid rgba(180, 83, 9, 0.28)',
                          }}
                        >
                          EXTERNAL APPLICANT
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '13px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                      <span>Applicant: <strong style={{ color: '#30151E' }}>{booking.seekerName}</strong></span>
                      <span>•</span>
                      <span>Institution: <strong>{booking.seekerInstitutionName}</strong></span>
                      <span>•</span>
                      <span>Department: <strong>{booking.seekerDepartment}</strong></span>
                      <span>•</span>
                      <span>Course/Grant: <strong>{booking.courseCode}</strong></span>
                    </div>
                  </div>

                  {/* Date & Time Window */}
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
                      Requested Slot
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#30151E' }}>
                      {new Date(booking.startDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {new Date(booking.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(booking.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                {/* Purpose Box */}
                <div
                  style={{
                    background: 'rgba(48, 21, 30, 0.04)',
                    border: '1px solid rgba(48, 21, 30, 0.12)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                    Experiment Purpose / Research Protocol
                  </div>
                  <div style={{ fontSize: '13.5px', color: '#30151E', lineHeight: 1.5 }}>
                    {booking.purpose}
                  </div>
                </div>

                {/* Multi-Stage Stepper Visualization */}
                {booking.approvalMode === 'MODE_D_MULTI_STAGE' && (
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    {/* Stage 1 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: booking.ownerApproval?.status === 'APPROVED' ? '#10b981' : isStage1 ? '#818cf8' : 'rgba(255,255,255,0.1)',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 800,
                        }}
                      >
                        {booking.ownerApproval?.status === 'APPROVED' ? '✓' : '1'}
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#30151E' }}>
                          Stage 1: Resource Custodian
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {booking.ownerApproval?.status === 'APPROVED'
                            ? `Approved by ${booking.ownerApproval.decidedBy}`
                            : 'Awaiting custodian review'}
                        </div>
                      </div>
                    </div>

                    <ArrowRight size={16} color="var(--text-muted)" />

                    {/* Stage 2 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: booking.institutionApproval?.status === 'APPROVED' ? '#15803d' : isStage2 ? '#b45309' : 'rgba(48,21,30,0.1)',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 800,
                        }}
                      >
                        {booking.institutionApproval?.status === 'APPROVED' ? '✓' : '2'}
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#30151E' }}>
                          Stage 2: Institutional Sign-off
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {booking.institutionApproval?.status === 'APPROVED'
                            ? `Approved by ${booking.institutionApproval.decidedBy}`
                            : isStage2
                            ? 'Awaiting College Dean approval'
                            : 'Pending Stage 1 clearance'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Inquiry & Response Thread if present */}
                {booking.infoRequest && (
                  <div
                    style={{
                      background: 'rgba(48, 21, 30, 0.05)',
                      border: '1.5px solid rgba(48, 21, 30, 0.18)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#30151E', marginBottom: '4px' }}>
                      <HelpCircle size={14} />
                      <span>Reviewer Inquiry by {booking.infoRequest.requestedBy}:</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                      "{booking.infoRequest.question}"
                    </div>

                    {booking.infoRequest.response ? (
                      <div
                        style={{
                          background: '#FFFFFF',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          borderLeft: '3px solid #15803d',
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#15803d' }}>
                          Applicant Clarification:
                        </div>
                        <div style={{ fontSize: '12.5px', color: '#30151E' }}>
                          "{booking.infoRequest.response}"
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '11.5px', color: '#fbbf24', fontStyle: 'italic' }}>
                        ⏳ Awaiting response from {booking.seekerName}...
                      </div>
                    )}
                  </div>
                )}

                {/* Rejection Reason Display if rejected */}
                {booking.rejectionReason && (
                  <div
                    style={{
                      background: 'rgba(244, 63, 94, 0.08)',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                    }}
                    id={`rejection-reason-box-${booking.id}`}
                  >
                    <AlertTriangle size={18} color="#fb7185" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#fb7185' }}>
                        Declined by Reviewer: Recorded Reason
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        "{booking.rejectionReason}"
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions Footer */}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <Shield size={14} color="#10b981" />
                    <span>Owning Institution: <strong>{booking.institutionName}</strong></span>
                  </div>

                  {isPendingDecision && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {/* Request Info Button */}
                      <button
                        onClick={() => handleOpenInfo(booking)}
                        className="btn btn-secondary btn-sm"
                        id={`request-info-btn-${booking.id}`}
                      >
                        <MessageSquare size={14} />
                        Request Clarification
                      </button>

                      {/* Decline Button */}
                      <button
                        onClick={() => handleOpenReject(booking)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#fb7185', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                        id={`reject-btn-${booking.id}`}
                      >
                        <X size={14} />
                        Decline with Reason
                      </button>

                      {/* Approve Button */}
                      {canActOnCurrentStage ? (
                        <button
                          onClick={() => handleOpenApproveNotes(booking)}
                          className="btn btn-success btn-sm"
                          id={`approve-btn-${booking.id}`}
                        >
                          <Check size={14} />
                          {isStage2 ? 'Grant Dean Sign-off' : 'Authorize Stage 1'}
                        </button>
                      ) : (
                        <button
                          disabled
                          className="btn btn-secondary btn-sm"
                          style={{ opacity: 0.5, cursor: 'not-allowed' }}
                          title="Requires authorization for current approval stage"
                        >
                          Awaiting {isStage2 ? 'Institution Dean' : 'Resource Custodian'}
                        </button>
                      )}
                    </div>
                  )}

                  {st === 'APPROVED' && (
                    <span style={{ fontSize: '12.5px', color: '#34d399', fontWeight: 600 }}>
                      ✓ Confirmed & Approved by {booking.approvedBy || 'Institutional Reviewer'} — Ready for Check-In
                    </span>
                  )}

                  {st === 'CHECKED_OUT' && (
                    <span style={{ fontSize: '12.5px', color: '#30151E', fontWeight: 700 }}>
                      ● Currently Checked Out / In Physical Custody
                    </span>
                  )}

                  {st === 'RETURNED' && (
                    <span style={{ fontSize: '12.5px', color: '#818cf8', fontWeight: 600 }}>
                      ✓ Equipment Successfully Returned & Verified
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Approve with Notes */}
      {notesModalBooking && (
        <div className="modal-overlay" onClick={() => setNotesModalBooking(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} id="approve-modal">
            <div className="modal-header">
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} />
                Authorize Allocation Request
              </h3>
              <button onClick={() => setNotesModalBooking(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Confirming reservation on <strong>{notesModalBooking.resourceTitle}</strong> for <strong>{notesModalBooking.seekerName}</strong> ({notesModalBooking.seekerInstitutionName}).
              </p>
              <div className="form-group">
                <label className="form-label" htmlFor="approval-notes-input">
                  Decision Compliance Notes (Optional)
                </label>
                <textarea
                  id="approval-notes-input"
                  className="form-textarea"
                  rows={2}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="e.g. Safety credentials and lab calendar verified..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setNotesModalBooking(null)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
              <button onClick={handleConfirmApprove} className="btn btn-success btn-sm" id="confirm-approve-btn">
                Confirm & Grant Sign-off
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rejection Reason */}
      {rejectModalBooking && (
        <div className="modal-overlay" onClick={() => setRejectModalBooking(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} id="rejection-modal">
            <div className="modal-header">
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#fb7185', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <XCircle size={18} />
                Decline Reservation Request
              </h3>
              <button onClick={() => setRejectModalBooking(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                A specific justification is mandatory when declining <strong>{rejectModalBooking.seekerName}</strong>'s request. This reason is immutably recorded in the tamper-evident audit ledger.
              </p>
              <div className="form-group">
                <label className="form-label" htmlFor="rejection-reason-input">
                  Recorded Rejection Reason
                </label>
                <textarea
                  id="rejection-reason-input"
                  className={`form-textarea ${reasonError ? 'error' : ''}`}
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    setReasonError('');
                  }}
                  placeholder="e.g. Lab calibration underway during this requested slot; or institutional schedule conflict..."
                />
                {reasonError && <div className="form-error">{reasonError}</div>}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setRejectModalBooking(null)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
              <button onClick={handleConfirmReject} className="btn btn-danger btn-sm" id="confirm-reject-btn">
                Confirm & Record Reason
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Request Information */}
      {infoModalBooking && (
        <div className="modal-overlay" onClick={() => setInfoModalBooking(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} id="request-info-modal">
            <div className="modal-header">
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#F2E8DC', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={18} />
                Request Applicant Clarification
              </h3>
              <button onClick={() => setInfoModalBooking(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Submit a question or request for supporting documentation to <strong>{infoModalBooking.seekerName}</strong>. The applicant will be notified to respond.
              </p>
              <div className="form-group">
                <label className="form-label" htmlFor="info-question-input">
                  Inquiry / Required Clarification
                </label>
                <textarea
                  id="info-question-input"
                  className={`form-textarea ${infoError ? 'error' : ''}`}
                  rows={3}
                  value={infoQuestion}
                  onChange={(e) => {
                    setInfoQuestion(e.target.value);
                    setInfoError('');
                  }}
                  placeholder="e.g. Please specify the laser wavelength and intended optical intensity..."
                />
                {infoError && <div className="form-error">{infoError}</div>}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setInfoModalBooking(null)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
              <button onClick={handleConfirmInfo} className="btn btn-primary btn-sm" id="confirm-info-btn">
                <Send size={14} />
                Send Inquiry to Applicant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
