import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Incident, IncidentSeverity } from '../types';
import {
  AlertTriangle,
  PlusCircle,
  CheckCircle,
  X,
  ShieldAlert,
  Check
} from 'lucide-react';

export const IncidentsPage: React.FC = () => {
  const { incidents, resources, fileIncident, resolveIncident } = useApp();

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [resolveModalIncident, setResolveModalIncident] = useState<Incident | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Form state for new incident
  const [selectedResourceId, setSelectedResourceId] = useState(resources[0]?.id || '');
  const [incidentTitle, setIncidentTitle] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity>('Medium');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');

  const filteredIncidents = incidents.filter((inc) => {
    if (filterStatus === 'ALL') return true;
    return inc.status === filterStatus;
  });

  const openCount = incidents.filter((i) => i.status === 'Open' || i.status === 'Investigating').length;

  const handleCreateIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentTitle.trim() || !description.trim()) {
      setFormError('Please fill in both the issue title and detailed diagnostic description.');
      return;
    }

    fileIncident({
      resourceId: selectedResourceId,
      title: incidentTitle.trim(),
      severity,
      description: description.trim(),
    });

    setReportModalOpen(false);
    setIncidentTitle('');
    setDescription('');
    setFormError('');
  };

  const handleConfirmResolve = () => {
    if (!resolveModalIncident) return;
    resolveIncident(
      resolveModalIncident.id,
      resolutionNotes.trim() || 'Inspected by lab safety officer. Hardware verified nominal.'
    );
    setResolveModalIncident(null);
    setResolutionNotes('');
  };

  const severityColors: Record<IncidentSeverity, { bg: string; text: string; border: string }> = {
    Low: { bg: 'rgba(48, 21, 30, 0.08)', text: '#30151E', border: 'rgba(48, 21, 30, 0.2)' },
    Medium: { bg: 'rgba(180, 83, 9, 0.12)', text: '#92400e', border: 'rgba(180, 83, 9, 0.25)' },
    High: { bg: 'rgba(194, 65, 12, 0.12)', text: '#c2410c', border: 'rgba(194, 65, 12, 0.25)' },
    Critical: { bg: 'rgba(225, 29, 72, 0.12)', text: '#9f1239', border: 'rgba(225, 29, 72, 0.25)' },
  };

  return (
    <div className="page-wrapper" id="incidents-view">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-maintenance">
              <AlertTriangle size={12} />
              Safety & Anomaly Tracking
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: '13px', color: '#fb7185', fontWeight: 700 }}>
              {openCount} Active Anomalies
            </span>
          </div>
          <h1 style={{ fontSize: '30px', fontWeight: 800, marginBottom: '8px' }}>
            Laboratory Incident & Safety Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '680px' }}>
            Log equipment malfunctions, monitor calibration drift, escalate critical defects, and record verified resolutions.
          </p>
        </div>

        <button
          onClick={() => setReportModalOpen(true)}
          className="btn btn-danger btn-sm"
          id="file-incident-btn"
        >
          <PlusCircle size={16} />
          Report Equipment Incident
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '24px',
          paddingBottom: '8px',
        }}
      >
        <button
          onClick={() => setFilterStatus('ALL')}
          className={`btn btn-sm ${filterStatus === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
          id="tab-all-incidents"
        >
          All Incidents ({incidents.length})
        </button>
        <button
          onClick={() => setFilterStatus('Open')}
          className={`btn btn-sm ${filterStatus === 'Open' ? 'btn-primary' : 'btn-ghost'}`}
          id="tab-open-incidents"
        >
          Open
        </button>
        <button
          onClick={() => setFilterStatus('Investigating')}
          className={`btn btn-sm ${filterStatus === 'Investigating' ? 'btn-primary' : 'btn-ghost'}`}
          id="tab-investigating-incidents"
        >
          Investigating
        </button>
        <button
          onClick={() => setFilterStatus('Resolved')}
          className={`btn btn-sm ${filterStatus === 'Resolved' ? 'btn-primary' : 'btn-ghost'}`}
          id="tab-resolved-incidents"
        >
          Resolved
        </button>
      </div>

      {/* Incidents List */}
      {filteredIncidents.length === 0 ? (
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
          id="no-incidents-msg"
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
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Zero Anomalies Reported</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', maxWidth: '400px' }}>
            All instrumentation is currently operating within manufacturer tolerance specs.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {filteredIncidents.map((incident) => {
            const sev = severityColors[incident.severity];

            return (
              <div
                key={incident.id}
                className="glass-card"
                style={{
                  padding: '24px',
                  borderLeft: `4px solid ${
                    incident.status === 'Resolved'
                      ? '#10b981'
                      : incident.severity === 'Critical' || incident.severity === 'High'
                      ? '#f43f5e'
                      : '#f59e0b'
                  }`,
                }}
                id={`incident-card-${incident.id}`}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: sev.bg,
                          color: sev.text,
                          border: `1px solid ${sev.border}`,
                        }}
                      >
                        {incident.severity.toUpperCase()} SEVERITY
                      </span>

                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background:
                            incident.status === 'Resolved'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(245, 158, 11, 0.15)',
                          color: incident.status === 'Resolved' ? '#34d399' : '#fbbf24',
                        }}
                      >
                        {incident.status}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#30151E', marginBottom: '4px' }}>
                      {incident.title}
                    </h3>

                    <div style={{ fontSize: '12.5px', color: '#30151E', fontWeight: 700 }}>
                      Asset: {incident.resourceTitle}
                    </div>
                  </div>

                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textAlign: 'right' }}>
                    <div>Reported by <strong>{incident.reportedBy}</strong></div>
                    <div>{new Date(incident.createdAt).toLocaleString()}</div>
                  </div>
                </div>

                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                  {incident.description}
                </p>

                {incident.resolutionNotes && (
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 14px',
                      marginBottom: '14px',
                      fontSize: '12.5px',
                      color: '#a7f3d0',
                    }}
                  >
                    <strong>Resolution Record:</strong> {incident.resolutionNotes}
                  </div>
                )}

                {incident.status !== 'Resolved' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                    <button
                      onClick={() => {
                        setResolveModalIncident(incident);
                        setResolutionNotes('Inspection completed. Recalibration verified per NIST protocol.');
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                      id={`resolve-incident-btn-${incident.id}`}
                    >
                      <Check size={14} />
                      Resolve & Clear Incident
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* File Incident Modal */}
      {reportModalOpen && (
        <div className="modal-overlay" onClick={() => setReportModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} id="file-incident-modal">
            <div className="modal-header">
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#fb7185', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} />
                Report Equipment Anomaly / Damage
              </h3>
              <button
                onClick={() => setReportModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateIncident}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="incident-resource-select">
                    Target Instrument
                  </label>
                  <select
                    id="incident-resource-select"
                    className="form-select"
                    value={selectedResourceId}
                    onChange={(e) => setSelectedResourceId(e.target.value)}
                  >
                    {resources.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} ({r.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="incident-title-input">
                    Issue Title
                  </label>
                  <input
                    type="text"
                    id="incident-title-input"
                    className="form-input"
                    placeholder="e.g. Channel 1 ground noise fluctuation, calibration drift..."
                    value={incidentTitle}
                    onChange={(e) => setIncidentTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="incident-severity-select">
                    Severity Tier
                  </label>
                  <select
                    id="incident-severity-select"
                    className="form-select"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                  >
                    <option value="Low">Low — Cosmetic / Non-Critical</option>
                    <option value="Medium">Medium — Measurement Inaccuracy</option>
                    <option value="High">High — Safety Hazard / Partial Failure (Locks out booking)</option>
                    <option value="Critical">Critical — Hardware Damaged / Immediate Shutdown</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="incident-desc-input">
                    Diagnostic Details
                  </label>
                  <textarea
                    id="incident-desc-input"
                    className="form-textarea"
                    rows={3}
                    placeholder="Provide details on when the issue occurred, error codes, and symptoms..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {formError && <div className="form-error">{formError}</div>}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger btn-sm" id="submit-incident-report-btn">
                  Submit Safety Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolveModalIncident && (
        <div className="modal-overlay" onClick={() => setResolveModalIncident(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} id="resolve-incident-modal">
            <div className="modal-header">
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} />
                Resolve Equipment Incident
              </h3>
              <button
                onClick={() => setResolveModalIncident(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Record service, recalibration, or replacement notes for <strong>{resolveModalIncident.title}</strong>:
              </p>

              <div className="form-group">
                <label className="form-label" htmlFor="incident-resolution-notes">
                  Resolution Protocol Notes
                </label>
                <textarea
                  id="incident-resolution-notes"
                  className="form-textarea"
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setResolveModalIncident(null)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResolve}
                className="btn btn-success btn-sm"
                id="confirm-resolve-incident-btn"
              >
                Mark as Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
