import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from './DiscoveryPage';
import { BookingModal } from './BookingModal';
import { getEquipmentFallbackImage } from '../utils/imageFallback';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Shield,
  MapPin,
  CheckCircle2,
  FileCheck,
  Sparkles,
  History,
  GitBranch,
  Users,
  Building,
  X
} from 'lucide-react';

export const ResourceDetailPage: React.FC = () => {
  const {
    resources,
    selectedResourceId,
    setSelectedResourceId,
    setCurrentPage,
    bookings,
    currentUser,
    isAuthenticated,
    setAuthModalOpen,
  } = useApp();

  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'memory' | 'alternatives' | 'waitlist'>('overview');

  // History state
  const [historyTimeline, setHistoryTimeline] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Alternatives state
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);

  // Waitlist state
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [loadingWaitlist, setLoadingWaitlist] = useState(false);
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  const [waitlistPurpose, setWaitlistPurpose] = useState('Critical research trial queue reservation');
  const [waitlistStart, setWaitlistStart] = useState('2026-11-15T09:00');
  const [waitlistEnd, setWaitlistEnd] = useState('2026-11-15T17:00');
  const [waitlistMsg, setWaitlistMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Find the selected resource or default to first
  const resource = resources.find((r) => r.id === selectedResourceId) || resources[0];

  // Bookings specifically for this resource
  const resourceBookings = bookings.filter(
    (b) =>
      b.resourceId === resource.id &&
      (b.status === 'approved' || b.status === 'in_use' || b.status === 'APPROVED' || b.status === 'CHECKED_OUT')
  );

  const hasSafetyClearance = currentUser.safetyLevel >= resource.safetyLevelRequired;
  const isInternalAffiliate = currentUser.institutionId === resource.institutionId;
  const isAccessAllowed = resource.allowExternalUsers || isInternalAffiliate;

  // Load history when tab is clicked
  useEffect(() => {
    if (activeTab === 'memory') {
      setLoadingHistory(true);
      fetch(`/api/v1/resources/${resource.id}/history`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setHistoryTimeline(data.timeline || []);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingHistory(false));
    }
  }, [activeTab, resource.id]);

  // Load alternatives when tab is clicked
  useEffect(() => {
    if (activeTab === 'alternatives') {
      setLoadingAlternatives(true);
      fetch(`/api/v1/resources/${resource.id}/alternatives`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setAlternatives(data.alternatives || []);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingAlternatives(false));
    }
  }, [activeTab, resource.id]);

  // Load waitlist when tab is clicked
  useEffect(() => {
    if (activeTab === 'waitlist') {
      setLoadingWaitlist(true);
      fetch(`/api/v1/resources/${resource.id}/waiting-list`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setWaitlist(data.waitingList || []);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingWaitlist(false));
    }
  }, [activeTab, resource.id]);

  const handleJoinWaitlist = async () => {
    setWaitlistMsg(null);
    try {
      const res = await fetch(`/api/v1/resources/${resource.id}/waiting-list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          requestedStartDate: new Date(waitlistStart).toISOString(),
          requestedEndDate: new Date(waitlistEnd).toISOString(),
          purpose: waitlistPurpose,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setWaitlistMsg({ type: 'success', text: `Enrolled on waiting list at Queue Position #${data.entry.position}!` });
        setWaitlist((prev) => [...prev, data.entry]);
        setTimeout(() => setWaitlistModalOpen(false), 1600);
      } else {
        setWaitlistMsg({ type: 'error', text: data.message || 'Could not join waiting list.' });
      }
    } catch {
      setWaitlistMsg({ type: 'error', text: 'Network connection error.' });
    }
  };

  const getApprovalBadge = () => {
    switch (resource.approvalMode) {
      case 'MODE_A_AUTO':
        return { label: '⚡ Mode A: Instant Auto-Approval', bg: 'rgba(28, 107, 70, 0.12)', color: '#15803d', border: 'rgba(22, 101, 52, 0.25)' };
      case 'MODE_B_OWNER':
        return { label: '🛡️ Mode B: Custodian Review Required', bg: 'rgba(48, 21, 30, 0.08)', color: '#30151E', border: 'rgba(48, 21, 30, 0.22)' };
      case 'MODE_C_INSTITUTION':
        return { label: '🏛️ Mode C: Institutional Dean Review', bg: 'rgba(180, 83, 9, 0.12)', color: '#92400e', border: 'rgba(180, 83, 9, 0.25)' };
      case 'MODE_D_MULTI_STAGE':
        return { label: '📋 Mode D: Multi-Stage (Custodian + Dean)', bg: 'rgba(90, 30, 49, 0.12)', color: '#5A1E31', border: 'rgba(90, 30, 49, 0.25)' };
      default:
        return { label: '🛡️ Mode B: Custodian Review', bg: 'rgba(48, 21, 30, 0.08)', color: '#30151E', border: 'rgba(48, 21, 30, 0.22)' };
    }
  };

  const approvalBadge = getApprovalBadge();

  return (
    <div className="page-wrapper" id="resource-details-view">
      {/* Back button & Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => setCurrentPage('discovery')}
          className="btn btn-secondary btn-sm"
          id="back-to-discovery-btn"
        >
          <ArrowLeft size={16} />
          Back to Discovery
        </button>
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{resource.category}</span>
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
          {resource.title}
        </span>
      </div>

      {/* Main Header / Hero Card */}
      <div
        className="glass-card"
        style={{
          padding: '28px',
          marginBottom: '28px',
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 420px) 1fr',
          gap: '32px',
          alignItems: 'start',
        }}
      >
        {/* Left: Image with Condition and status overlay */}
        <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <img
            src={resource.imageUrl}
            alt={resource.title}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = getEquipmentFallbackImage(resource.title);
            }}
            style={{ width: '100%', height: '320px', objectFit: 'cover' }}
            id="detail-resource-image"
          />
          <div
            style={{
              position: 'absolute',
              top: '14px',
              left: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <StatusBadge status={resource.status} />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                background: approvalBadge.bg,
                border: `1px solid ${approvalBadge.border}`,
                color: approvalBadge.color,
                backdropFilter: 'blur(8px)',
              }}
            >
              {approvalBadge.label}
            </span>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: '14px',
              right: '14px',
              background: 'rgba(9, 13, 22, 0.9)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--cyan-primary)',
              backdropFilter: 'blur(8px)',
            }}
          >
            Condition: {resource.conditionScore}/100 ({resource.conditionStatus})
          </div>
        </div>

        {/* Right: Info, Ownership, Rules, Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--burgundy-primary)', marginBottom: '4px' }}>
              {resource.category} • {resource.department}
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#30151E', marginBottom: '12px' }}>
              {resource.title}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
              {resource.description}
            </p>
          </div>

          {/* Institutional Sharing & Governance Card */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(48, 21, 30, 0.03)',
              border: '1.5px solid rgba(48, 21, 30, 0.12)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Institution Ownership</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#30151E', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Building size={14} color="#30151E" />
                {resource.institutionName}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Location / Facility</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#30151E', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MapPin size={14} color="#30151E" />
                {resource.location}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Access Policy</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: resource.allowExternalUsers ? '#34d399' : '#fbbf24' }}>
                {resource.allowExternalUsers ? 'Cross-Institution Access' : 'Internal Department Only'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hourly Credit Tariff</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--cyan-primary)' }}>
                {resource.hourlyRateCredits || 10} credits/hr
              </div>
            </div>
          </div>

          {/* Safety & Eligibility Banner */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: hasSafetyClearance && isAccessAllowed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
              border: `1px solid ${hasSafetyClearance && isAccessAllowed ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <Shield size={18} color={hasSafetyClearance && isAccessAllowed ? '#10b981' : '#f43f5e'} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: hasSafetyClearance && isAccessAllowed ? '#34d399' : '#fb7185' }}>
                {hasSafetyClearance && isAccessAllowed ? 'Clearance & Eligibility Verified' : 'Access Prerequisite Required'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Required: {resource.requiresCertification} (Level {resource.safetyLevelRequired}).
                Your profile: Level {currentUser.safetyLevel}. {!isAccessAllowed && 'Cross-institution access is restricted.'}
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div style={{ marginTop: 'auto', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  setAuthModalOpen(true);
                } else {
                  setBookingModalOpen(true);
                }
              }}
              className="btn btn-primary btn-lg"
              id="request-booking-btn"
              style={{ flex: '1 1 240px' }}
            >
              <Calendar size={18} />
              {isAuthenticated ? 'Submit Booking Request' : 'Sign In to Request Booking'}
            </button>

            <button
              onClick={() => {
                if (!isAuthenticated) {
                  setAuthModalOpen(true);
                } else {
                  setWaitlistModalOpen(true);
                }
              }}
              className="btn btn-secondary btn-lg"
              id="join-waitlist-btn"
            >
              <Users size={16} />
              Join Waiting List
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '28px',
          paddingBottom: '2px',
        }}
      >
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            border: 'none',
            background: activeTab === 'overview' ? 'rgba(48, 21, 30, 0.08)' : 'transparent',
            borderBottom: activeTab === 'overview' ? '2.5px solid #30151E' : '2.5px solid transparent',
            color: activeTab === 'overview' ? '#30151E' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          id="tab-overview"
        >
          <FileCheck size={16} />
          Specifications & Schedule
        </button>

        <button
          onClick={() => setActiveTab('memory')}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            border: 'none',
            background: activeTab === 'memory' ? 'rgba(48, 21, 30, 0.08)' : 'transparent',
            borderBottom: activeTab === 'memory' ? '2.5px solid #30151E' : '2.5px solid transparent',
            color: activeTab === 'memory' ? '#30151E' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          id="tab-memory"
        >
          <History size={16} />
          Equipment Memory & Timeline
        </button>

        <button
          onClick={() => setActiveTab('alternatives')}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            border: 'none',
            background: activeTab === 'alternatives' ? 'rgba(48, 21, 30, 0.08)' : 'transparent',
            borderBottom: activeTab === 'alternatives' ? '2.5px solid #30151E' : '2.5px solid transparent',
            color: activeTab === 'alternatives' ? '#30151E' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          id="tab-alternatives"
        >
          <GitBranch size={16} />
          Smart Alternatives & Substitution
        </button>

        <button
          onClick={() => setActiveTab('waitlist')}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            border: 'none',
            background: activeTab === 'waitlist' ? 'rgba(48, 21, 30, 0.08)' : 'transparent',
            borderBottom: activeTab === 'waitlist' ? '2.5px solid #30151E' : '2.5px solid transparent',
            color: activeTab === 'waitlist' ? '#30151E' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          id="tab-waitlist"
        >
          <Users size={16} />
          Fair Access Queue
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          {/* Specifications */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCheck size={18} color="var(--cyan-primary)" />
              Calibrated Technical Specifications
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(resource.specifications || {}).map(([key, val]) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(48, 21, 30, 0.04)',
                    fontSize: '13px',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>{key}</span>
                  <span style={{ fontWeight: 700, color: '#30151E', textAlign: 'right' }}>{val}</span>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: '17px', fontWeight: 800, marginTop: '24px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#30151E' }}>
              <Sparkles size={18} color="#30151E" />
              Standard Case Accessories Included
            </h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(resource.accessories || []).map((acc, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <CheckCircle2 size={15} color="#15803d" />
                  <span>{acc}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Schedule */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: '#30151E' }}>
              <Clock size={18} color="#b45309" />
              Approved Schedule & Conflict Awareness
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Real-time allocation prevents overlapping bookings. Selecting an occupied interval routes to the fair-access waiting list.
            </p>

            {resourceBookings.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(28, 107, 70, 0.08)', border: '1px dashed rgba(22, 101, 52, 0.3)', borderRadius: 'var(--radius-md)', color: '#15803d', fontSize: '13px', fontWeight: 600 }}>
                No active reservations currently scheduled. All time slots are open!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {resourceBookings.map((b) => (
                  <div key={b.id} style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'rgba(180, 83, 9, 0.08)', border: '1.5px solid rgba(180, 83, 9, 0.25)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#92400e' }}>Occupied Window</span>
                      <span className="badge badge-reserved">Reserved</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#30151E' }}>
                      {new Date(b.startDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {new Date(b.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(b.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Equipment Memory & Timeline */}
      {activeTab === 'memory' && (
        <div className="glass-card" style={{ padding: '28px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#30151E', marginBottom: '6px' }}>
              Chronological Equipment Memory
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Unified timeline aggregating physical check-ins, return condition certifications, preventative maintenance calibrations, and reported anomalies.
            </p>
          </div>

          {loadingHistory ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading equipment memory timeline...
            </div>
          ) : historyTimeline.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No operational events recorded yet for this instrument.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
              {historyTimeline.map((ev, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '16px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    display: 'grid',
                    gridTemplateColumns: '140px 1fr auto',
                    gap: '16px',
                    alignItems: 'start',
                  }}
                >
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    <div>{new Date(ev.timestamp).toLocaleDateString()}</div>
                    <div style={{ fontSize: '11px' }}>{new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: ev.type.includes('MAINTENANCE') ? 'rgba(48, 21, 30, 0.08)' : ev.type.includes('INCIDENT') ? 'rgba(225, 29, 72, 0.12)' : 'rgba(28, 107, 70, 0.12)',
                          color: ev.type.includes('MAINTENANCE') ? '#30151E' : ev.type.includes('INCIDENT') ? '#9f1239' : '#15803d',
                        }}
                      >
                        {ev.type}
                      </span>
                      <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#30151E' }}>
                        {ev.title}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      {ev.detail}
                    </div>

                    {ev.notes && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Note: "{ev.notes}"
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
                    By: <strong>{ev.actor}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Smart Alternatives & Substitution */}
      {activeTab === 'alternatives' && (
        <div className="glass-card" style={{ padding: '28px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#30151E', marginBottom: '6px' }}>
              Smart Resource Substitution Analysis
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Candidate alternatives ranked by domain compatibility, specification overlap, and active availability. No two devices are claimed interchangeable without verified parameter matching.
            </p>
          </div>

          {loadingAlternatives ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Evaluating catalog alternatives and specification differences...
            </div>
          ) : alternatives.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No alternative instruments currently cataloged.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {alternatives.map((alt) => {
                const cRes = alt.resource;
                const isSuitable = alt.classification === 'SUITABLE_ALTERNATIVE';

                return (
                  <div
                    key={cRes.id}
                    style={{
                      padding: '20px',
                      borderRadius: 'var(--radius-md)',
                      background: isSuitable ? 'rgba(28, 107, 70, 0.04)' : '#FFFFFF',
                      border: `1.5px solid ${isSuitable ? 'rgba(22, 101, 52, 0.3)' : 'rgba(48, 21, 30, 0.12)'}`,
                      display: 'grid',
                      gridTemplateColumns: 'minmax(200px, 240px) 1fr auto',
                      gap: '20px',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <img
                        src={cRes.imageUrl}
                        alt={cRes.title}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getEquipmentFallbackImage(cRes.title);
                        }}
                        style={{ width: '70px', height: '70px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#30151E' }}>
                          {cRes.title}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {cRes.category} • {cRes.hourlyRateCredits} cr/hr
                        </div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: isSuitable ? 'rgba(28, 107, 70, 0.12)' : 'rgba(180, 83, 9, 0.12)',
                            color: isSuitable ? '#15803d' : '#92400e',
                          }}
                        >
                          {alt.classification}
                        </span>
                        <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                          {alt.explanation}
                        </span>
                      </div>

                      {/* Spec Differences */}
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span>Rate Variance: {alt.hourlyRateVariance >= 0 ? `+${alt.hourlyRateVariance}` : alt.hourlyRateVariance} credits/hr</span>
                        <span>•</span>
                        <span>Location: {cRes.location} ({cRes.institutionName})</span>
                      </div>
                    </div>

                    <div>
                      <button
                        onClick={() => setSelectedResourceId(cRes.id)}
                        className="btn btn-secondary btn-sm"
                      >
                        Switch to Unit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Fair Access & Waiting List */}
      {activeTab === 'waitlist' && (
        <div className="glass-card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#30151E', marginBottom: '6px' }}>
                Fair Access Queue & Waiting List
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Deterministic FIFO ordering by request timestamp. When an active slot is cancelled, the head of the queue is automatically promoted.
              </p>
            </div>
            <button
              onClick={() => {
                if (!isAuthenticated) setAuthModalOpen(true);
                else setWaitlistModalOpen(true);
              }}
              className="btn btn-primary btn-sm"
            >
              <Users size={15} />
              Join Fair Access Queue
            </button>
          </div>

          {loadingWaitlist ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading queue telemetry...
            </div>
          ) : waitlist.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#15803d', background: 'rgba(28, 107, 70, 0.08)', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>
              No researchers currently waiting. Queue is clear!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {waitlist.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    background: '#FFFFFF',
                    border: '1.5px solid rgba(48, 21, 30, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'rgba(48, 21, 30, 0.1)',
                        color: '#30151E',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '12px',
                      }}
                    >
                      #{entry.position}
                    </span>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#30151E' }}>
                        {entry.purpose}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Requested: {new Date(entry.requestedStartDate).toLocaleDateString()} — {new Date(entry.requestedEndDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <span className="badge badge-waiting">Queue Position #{entry.position}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Join Waitlist Modal */}
      {waitlistModalOpen && (
        <div className="modal-overlay" onClick={() => setWaitlistModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#F2E8DC' }}>
                Join Waiting List: {resource.title}
              </h2>
              <button onClick={() => setWaitlistModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                  Research Purpose / Experiment Summary
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={waitlistPurpose}
                  onChange={(e) => setWaitlistPurpose(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                  Target Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={waitlistStart}
                  onChange={(e) => setWaitlistStart(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                  Target End Date & Time
                </label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={waitlistEnd}
                  onChange={(e) => setWaitlistEnd(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              {waitlistMsg && (
                <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '12.5px', background: waitlistMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)', color: waitlistMsg.type === 'success' ? '#34d399' : '#fb7185' }}>
                  {waitlistMsg.text}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setWaitlistModalOpen(false)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
              <button onClick={handleJoinWaitlist} className="btn btn-primary btn-sm">
                Confirm Enrollment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {bookingModalOpen && (
        <BookingModal resource={resource} onClose={() => setBookingModalOpen(false)} />
      )}
    </div>
  );
};

export default ResourceDetailPage;
