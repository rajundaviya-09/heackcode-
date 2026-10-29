import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { AuditLogEntry } from '../types';
import {
  Search,
  Lock
} from 'lucide-react';

export const AuditLogPage: React.FC = () => {
  const { auditLogs } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');

  const filteredLogs = auditLogs.filter((log) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      log.actorName.toLowerCase().includes(q) ||
      (log.resourceTitle && log.resourceTitle.toLowerCase().includes(q)) ||
      log.detail.toLowerCase().includes(q) ||
      log.hash.toLowerCase().includes(q);

    const matchesAction = selectedAction === 'ALL' || log.actionType === selectedAction;

    return matchesSearch && matchesAction;
  });

  const actionBadgeColors: Record<AuditLogEntry['actionType'], { bg: string; text: string; border: string }> = {
    USER_REGISTERED: { bg: 'rgba(48, 21, 30, 0.08)', text: '#30151E', border: 'rgba(48, 21, 30, 0.2)' },
    USER_LOGGED_IN: { bg: 'rgba(74, 30, 46, 0.1)', text: '#4A1E2E', border: 'rgba(74, 30, 46, 0.25)' },
    BOOKING_REQUESTED: { bg: 'rgba(48, 21, 30, 0.08)', text: '#30151E', border: 'rgba(48, 21, 30, 0.2)' },
    OWNER_APPROVED: { bg: 'rgba(28, 107, 70, 0.12)', text: '#15803d', border: 'rgba(22, 101, 52, 0.25)' },
    INSTITUTION_APPROVED: { bg: 'rgba(180, 83, 9, 0.12)', text: '#92400e', border: 'rgba(180, 83, 9, 0.25)' },
    BOOKING_APPROVED: { bg: 'rgba(28, 107, 70, 0.12)', text: '#15803d', border: 'rgba(22, 101, 52, 0.25)' },
    BOOKING_REJECTED: { bg: 'rgba(225, 29, 72, 0.12)', text: '#9f1239', border: 'rgba(225, 29, 72, 0.25)' },
    INFO_REQUESTED: { bg: 'rgba(180, 83, 9, 0.12)', text: '#92400e', border: 'rgba(180, 83, 9, 0.25)' },
    INFO_RESPONDED: { bg: 'rgba(48, 21, 30, 0.08)', text: '#30151E', border: 'rgba(48, 21, 30, 0.2)' },
    BOOKING_CANCELLED: { bg: 'rgba(225, 29, 72, 0.12)', text: '#9f1239', border: 'rgba(225, 29, 72, 0.25)' },
    CHECK_IN_COMPLETED: { bg: 'rgba(48, 21, 30, 0.08)', text: '#30151E', border: 'rgba(48, 21, 30, 0.2)' },
    RETURN_COMPLETED: { bg: 'rgba(28, 107, 70, 0.12)', text: '#15803d', border: 'rgba(22, 101, 52, 0.25)' },
    INCIDENT_FILED: { bg: 'rgba(225, 29, 72, 0.12)', text: '#9f1239', border: 'rgba(225, 29, 72, 0.25)' },
    SYSTEM_RESET: { bg: 'rgba(48, 21, 30, 0.06)', text: '#5C3240', border: 'rgba(48, 21, 30, 0.15)' },
  };

  return (
    <div className="page-wrapper" id="audit-log-view">
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
            <span className="badge badge-available">
              <Lock size={12} />
              Cryptographic Integrity Active
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {auditLogs.length} Immutable Ledger Blocks
            </span>
          </div>
          <h1 style={{ fontSize: '30px', fontWeight: 800, marginBottom: '8px' }}>
            Institutional Audit & Provenance Ledger
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '680px' }}>
            Every allocation request, owner approval, physical check-in rating, returned condition report, and anomaly event is appended with a cryptographic block seal.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="glass-card"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '38px', height: '40px', fontSize: '13.5px' }}
            placeholder="Search by actor, instrument, detail, or block hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="audit-search-input"
          />
        </div>

        <div style={{ flex: '0 1 220px' }}>
          <select
            className="form-select"
            style={{ height: '40px', fontSize: '13.5px' }}
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            id="audit-action-filter"
          >
            <option value="ALL">All Event Types</option>
            <option value="BOOKING_REQUESTED">Booking Requests</option>
            <option value="BOOKING_APPROVED">Approvals</option>
            <option value="BOOKING_REJECTED">Declined Requests</option>
            <option value="CHECK_IN_COMPLETED">Physical Check-Ins</option>
            <option value="RETURN_COMPLETED">Return Check-Outs</option>
            <option value="INCIDENT_FILED">Incidents Logged</option>
            <option value="SYSTEM_RESET">System Resets</option>
          </select>
        </div>
      </div>

      {/* Ledger Table / List */}
      <div className="glass-card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '760px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-medium)', background: 'rgba(48, 21, 30, 0.04)' }}>
              <th style={{ padding: '14px 18px', fontSize: '11.5px', color: '#30151E', fontWeight: 800, textTransform: 'uppercase' }}>
                TIMESTAMP / BLOCK
              </th>
              <th style={{ padding: '14px 18px', fontSize: '11.5px', color: '#30151E', fontWeight: 800, textTransform: 'uppercase' }}>
                EVENT TYPE
              </th>
              <th style={{ padding: '14px 18px', fontSize: '11.5px', color: '#30151E', fontWeight: 800, textTransform: 'uppercase' }}>
                TARGET INSTRUMENT
              </th>
              <th style={{ padding: '14px 18px', fontSize: '11.5px', color: '#30151E', fontWeight: 800, textTransform: 'uppercase' }}>
                ACTOR & ROLE
              </th>
              <th style={{ padding: '14px 18px', fontSize: '11.5px', color: '#30151E', fontWeight: 800, textTransform: 'uppercase' }}>
                AUDIT DETAIL PAYLOAD
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((entry) => {
              const badge = actionBadgeColors[entry.actionType] || {
                bg: 'rgba(255,255,255,0.05)',
                text: '#fff',
                border: 'transparent',
              };

              return (
                <tr
                  key={entry.id}
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  className="interactive-row"
                  id={`audit-entry-${entry.id}`}
                >
                  <td style={{ padding: '16px 18px', verticalAlign: 'top', minWidth: '160px' }}>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(entry.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        color: 'var(--cyan-primary)',
                        marginTop: '4px',
                        letterSpacing: '0.02em',
                      }}
                      title={entry.hash}
                    >
                      {entry.hash.substring(0, 14)}...
                    </div>
                  </td>

                  <td style={{ padding: '16px 18px', verticalAlign: 'top' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        background: badge.bg,
                        color: badge.text,
                        border: `1px solid ${badge.border}`,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {entry.actionType.replace(/_/g, ' ')}
                    </span>
                  </td>

                  <td style={{ padding: '16px 18px', verticalAlign: 'top', fontSize: '13px', fontWeight: 700, color: '#30151E' }}>
                    {entry.resourceTitle || 'Global System'}
                  </td>

                  <td style={{ padding: '16px 18px', verticalAlign: 'top' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#30151E' }}>
                      {entry.actorName}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {entry.actorRole}
                    </div>
                  </td>

                  <td style={{ padding: '16px 18px', verticalAlign: 'top', fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {entry.detail}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
