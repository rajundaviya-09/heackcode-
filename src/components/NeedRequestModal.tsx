import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Send,
  Calendar,
  AlertCircle,
  Package,
  User,
  Clock,
  MapPin,
} from 'lucide-react';
import { fireCelebrationConfetti } from './Confetti';
import { getEquipmentFallbackImage } from '../utils/imageFallback';

interface NeedRequestModalProps {
  initialResourceId?: string | null;
  onClose: () => void;
}

const getPlatformInfo = (r: any): { name: string; emoji: string; desc: string } => {
  if (r.platform === 'SpaceSync' || r.category === 'Classrooms & Spaces') {
    return { name: 'SpaceSync', emoji: '🏢', desc: 'Classrooms, meeting rooms, and study spaces' };
  }
  if (r.platform === 'EquipX' || r.category === 'Computing & AI') {
    return { name: 'EquipX', emoji: '💻', desc: 'Computers, cameras, and electronic devices' };
  }
  if (r.platform === 'ToolConnect' || r.category === 'Testing & Measurement' || r.category === 'Robotics & Prototyping') {
    return { name: 'ToolConnect', emoji: '🔧', desc: 'Expensive tools and technical equipment' };
  }
  if (r.platform === 'ResourceBridge' || r.institutionId === 'INST_EXTERNAL') {
    return { name: 'ResourceBridge', emoji: '🤝', desc: 'Multi-college shared laboratories and specialized equipment' };
  }
  return { name: 'LabShare', emoji: '🧪', desc: 'College laboratories and scientific equipment' };
};

export const NeedRequestModal: React.FC<NeedRequestModalProps> = ({
  initialResourceId,
  onClose,
}) => {
  const { resources, createBooking, currentUser, addToast } = useApp();

  const sortedResources = [...resources].sort((a, b) => a.title.localeCompare(b.title));

  // Selected resource state
  const [selectedResId, setSelectedResId] = useState<string>(
    initialResourceId || (sortedResources.length > 0 ? sortedResources[0].id : '')
  );

  const selectedResource = resources.find((r) => r.id === selectedResId) || sortedResources[0];

  // Dates: Tomorrow 09:00 to 17:00 default
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(`${tomorrowStr}T09:00`);
  const [endDate, setEndDate] = useState(`${tomorrowStr}T17:00`);
  const [purpose, setPurpose] = useState('');
  const [priority, setPriority] = useState<'routine' | 'thesis' | 'grant' | 'emergency'>('thesis');
  const [certifiedAgreement, setCertifiedAgreement] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResource) return;

    if (!purpose.trim() || purpose.trim().length < 8) {
      setError('Please describe why you need this item (minimum 8 characters).');
      return;
    }

    if (!startDate || !endDate) {
      setError('Please select start and end dates.');
      return;
    }

    if (new Date(endDate).getTime() <= new Date(startDate).getTime()) {
      setError('End date must be after start date.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const result = await createBooking({
        resourceId: selectedResource.id,
        startDate,
        endDate,
        purpose: purpose.trim(),
        courseCode: 'NEED-REQUISITION',
        priority,
        certifiedAgreement,
      });

      if (result.success) {
        fireCelebrationConfetti();
        addToast(
          'success',
          'Request Dispatched!',
          `Message sent ONLY to ${selectedResource.ownerName} (Custodian possessing this item).`
        );
        onClose();
      } else {
        setError(result.message || 'Failed to submit request. Please verify requirements.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while connecting to the server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(48, 21, 30, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      id="need-request-modal-overlay"
    >
      <div
        className="glass-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          border: '1.5px solid rgba(48, 21, 30, 0.2)',
          boxShadow: '0 20px 50px rgba(48, 21, 30, 0.3)',
          padding: '24px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
        id="need-request-modal-dialog"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#30151E',
              color: '#F2E8DC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(48, 21, 30, 0.2)',
            }}
          >
            <Package size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '19px', fontWeight: 900, color: '#30151E', margin: 0 }}>
              Equipment Need Request
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Directly message the custodian who possesses this item
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              marginBottom: '16px',
              color: '#dc2626',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Equipment Selection */}
          <div>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, color: '#30151E', marginBottom: '6px' }}>
              Select Item / Equipment Needed
            </label>
            <select
              className="form-select"
              value={selectedResId}
              onChange={(e) => setSelectedResId(e.target.value)}
              style={{ width: '100%', height: '42px', fontSize: '13px', borderRadius: '8px', border: '1.5px solid rgba(48, 21, 30, 0.22)' }}
              id="need-request-resource-select"
            >
              {sortedResources.map((res) => (
                <option key={res.id} value={res.id}>
                  {res.title} — Custodian: {res.ownerName} ({res.department})
                </option>
              ))}
            </select>
          </div>

          {/* Enriched Selected Equipment Details Card */}
          {selectedResource && (() => {
            const platform = getPlatformInfo(selectedResource);
            return (
              <div
                style={{
                  background: '#FAF7F2',
                  border: '1.5px solid rgba(48, 21, 30, 0.16)',
                  borderRadius: '10px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 2px 8px rgba(48, 21, 30, 0.04)',
                }}
              >
                {/* Platform Tag and Asset Title Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-full)',
                        background: '#30151E',
                        color: '#F2E8DC',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        letterSpacing: '0.02em',
                      }}
                    >
                      <span>{platform.emoji}</span>
                      <span>{platform.name}</span>
                    </span>
                    <span style={{ fontSize: '11px', color: '#85616E', fontWeight: 600 }}>
                      {platform.desc}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(21, 128, 61, 0.12)',
                      color: '#15803d',
                      border: '1px solid rgba(21, 128, 61, 0.25)',
                    }}
                  >
                    {selectedResource.conditionScore}% Health • {selectedResource.status}
                  </span>
                </div>

                {/* Resource Thumbnail & Main Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={selectedResource.imageUrl}
                    alt={selectedResource.title}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getEquipmentFallbackImage(selectedResource.title);
                    }}
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      border: '1px solid rgba(48, 21, 30, 0.15)',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#30151E', lineHeight: 1.3 }}>
                      {selectedResource.title}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#85616E', marginTop: '3px' }}>
                      <MapPin size={13} color="#30151E" />
                      <span>{selectedResource.location}</span>
                      <span>•</span>
                      <span style={{ fontWeight: 700, color: '#30151E' }}>{selectedResource.hourlyRateCredits} credits/hr</span>
                    </div>
                  </div>
                </div>

                {/* Exact Institutional & Clearance Metadata Grid (Aligined with Image 3) */}
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(48, 21, 30, 0.12)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '8px 16px',
                  }}
                >
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ color: '#85616E', fontWeight: 500 }}>Institution: </span>
                    <strong style={{ color: '#30151E', fontWeight: 700 }}>{selectedResource.institutionName}</strong>
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ color: '#85616E', fontWeight: 500 }}>Department: </span>
                    <strong style={{ color: '#30151E', fontWeight: 700 }}>{selectedResource.department}</strong>
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ color: '#85616E', fontWeight: 500 }}>Clearance: </span>
                    <strong style={{ color: '#30151E', fontWeight: 700 }}>Level {selectedResource.safetyLevelRequired}</strong>
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ color: '#85616E', fontWeight: 500 }}>Location: </span>
                    <strong style={{ color: '#30151E', fontWeight: 700 }}>{selectedResource.location}</strong>
                  </div>
                </div>

                {/* Key Technical Specifications preview */}
                {selectedResource.specifications && Object.keys(selectedResource.specifications).length > 0 && (
                  <div
                    style={{
                      background: 'rgba(48, 21, 30, 0.03)',
                      border: '1px solid rgba(48, 21, 30, 0.08)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                    }}
                  >
                    <div style={{ fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 800, color: '#85616E', letterSpacing: '0.04em', marginBottom: '4px' }}>
                      Key Technical Specifications
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '4px 12px' }}>
                      {Object.entries(selectedResource.specifications).slice(0, 3).map(([key, val]) => (
                        <div key={key} style={{ fontSize: '11.5px', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ color: '#85616E' }}>{key}:</span>
                          <span style={{ color: '#30151E', fontWeight: 700 }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Registered Possessor / Custodian (Targeted 1-to-1 Routing) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    paddingTop: '6px',
                    borderTop: '1px solid rgba(48, 21, 30, 0.1)',
                  }}
                >
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      background: '#30151E',
                      color: '#F2E8DC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '13px',
                      flexShrink: 0,
                    }}
                  >
                    {selectedResource.ownerName.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, color: '#85616E', letterSpacing: '0.04em' }}>
                        Registered Possessor / Custodian
                      </span>
                      <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', background: '#30151E', color: '#F2E8DC' }}>
                        1-to-1 Routed
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#30151E' }}>
                      {selectedResource.ownerName}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {selectedResource.ownerRole} • {selectedResource.department}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Requester Information */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '11.5px', marginBottom: '3px' }}>
                Your Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={14} color="#85616E" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                <input
                  type="text"
                  className="form-input"
                  value={currentUser.name}
                  readOnly
                  style={{ paddingLeft: '32px', height: '36px', fontSize: '12.5px', background: 'rgba(48, 21, 30, 0.03)' }}
                />
              </div>
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '11.5px', marginBottom: '3px' }}>
                Your Email
              </label>
              <input
                type="text"
                className="form-input"
                value={currentUser.email}
                readOnly
                style={{ height: '36px', fontSize: '12.5px', background: 'rgba(48, 21, 30, 0.03)' }}
              />
            </div>
          </div>

          {/* Date Range Needed */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '11.5px', marginBottom: '3px' }}>
                Needed From
              </label>
              <div style={{ position: 'relative' }}>
                <Calendar size={14} color="#85616E" style={{ position: 'absolute', left: '10px', top: '11px' }} />
                <input
                  type="datetime-local"
                  className="form-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ paddingLeft: '30px', height: '36px', fontSize: '12px' }}
                  required
                />
              </div>
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '11.5px', marginBottom: '3px' }}>
                Needed Until
              </label>
              <div style={{ position: 'relative' }}>
                <Clock size={14} color="#85616E" style={{ position: 'absolute', left: '10px', top: '11px' }} />
                <input
                  type="datetime-local"
                  className="form-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ paddingLeft: '30px', height: '36px', fontSize: '12px' }}
                  required
                />
              </div>
            </div>
          </div>

          {/* Urgency */}
          <div>
            <label className="form-label" style={{ fontSize: '11.5px', marginBottom: '3px' }}>
              Urgency / Priority
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { id: 'routine', label: 'Routine Research' },
                { id: 'thesis', label: 'Thesis Milestone' },
                { id: 'grant', label: 'Grant Deadline' },
                { id: 'emergency', label: 'Urgent Expedited' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id as any)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: priority === p.id ? '1.5px solid #30151E' : '1px solid var(--border-medium)',
                    background: priority === p.id ? '#30151E' : '#FFFFFF',
                    color: priority === p.id ? '#F2E8DC' : '#30151E',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message / Need Description */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label className="form-label" style={{ fontSize: '11.5px', margin: 0 }}>
                Message to Custodian (Purpose & Project Justification)
              </label>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                {purpose.length}/500 chars
              </span>
            </div>
            <textarea
              className="form-textarea"
              rows={3}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g., We urgently need this oscilloscope to test PWM clock jitter on our dual-layer microcontroller board for our graduation capstone..."
              style={{ fontSize: '12.5px', padding: '10px', resize: 'vertical' }}
              maxLength={500}
              required
              id="need-request-message-textarea"
            />
          </div>

          {/* Compliance Agreement */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <input
              type="checkbox"
              id="need-request-agreement"
              checked={certifiedAgreement}
              onChange={(e) => setCertifiedAgreement(e.target.checked)}
              style={{ marginTop: '2px', accentColor: '#30151E' }}
            />
            <label htmlFor="need-request-agreement" style={{ fontSize: '11.5px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              I certify that this equipment will be used in compliance with institutional laboratory protocol and safety clearances.
            </label>
          </div>

          {/* Submit Action */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ flex: '1', height: '40px', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !certifiedAgreement}
              className="btn btn-primary"
              style={{
                flex: '2',
                height: '40px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              id="submit-need-request-btn"
            >
              <Send size={15} />
              <span>
                {isSubmitting
                  ? 'Dispatching...'
                  : `Send Message to ${selectedResource?.ownerName || 'Custodian'} Only →`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
