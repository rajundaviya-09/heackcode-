import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  TrendingUp,
  Activity,
  AlertCircle,
  Clock,
  Users,
  Lightbulb
} from 'lucide-react';

interface UtilizationResource {
  resourceId: string;
  title: string;
  category: string;
  department: string;
  institutionId: string;
  institutionName: string;
  status: string;
  conditionScore: number;
  eligibleAvailableHours: number;
  bookedHours: number;
  utilizationPercentage: number;
  totalBookings: number;
  completedBookings: number;
  activeOrApprovedBookings: number;
  cancellations: number;
  waitingListDemand: number;
  maintenanceHours: number;
}

interface AnalyticsData {
  reportingPeriod: {
    days: number;
    start: string;
    end: string;
  };
  formula: string;
  assumptions: string[];
  summary: {
    totalResourcesEvaluated: number;
    aggregateEligibleHours: number;
    aggregateBookedHours: number;
    overallUtilizationPercentage: number;
    aggregateTotalBookings: number;
    aggregateCancellations: number;
    aggregateWaitlistDemand: number;
    aggregateMaintenanceHours: number;
  };
  recommendations: {
    resourceId?: string;
    resourceTitle?: string;
    category: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    type: 'VISIBILITY' | 'CAPACITY' | 'CANCELLATION' | 'MAINTENANCE';
    recommendation: string;
    evidence: string;
  }[];
  resources: UtilizationResource[];
}

export const AnalyticsPage: React.FC = () => {
  const { resources, bookings } = useApp();

  const [periodDays, setPeriodDays] = useState<number>(30);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/analytics/resource-utilization?periodDays=${periodDays}${selectedCategory !== 'All' ? `&category=${encodeURIComponent(selectedCategory)}` : ''}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAnalyticsData(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [periodDays, selectedCategory]);

  const summary = analyticsData?.summary || {
    totalResourcesEvaluated: resources.length,
    aggregateEligibleHours: resources.length * periodDays * 24,
    aggregateBookedHours: 0,
    overallUtilizationPercentage: 0,
    aggregateTotalBookings: bookings.length,
    aggregateCancellations: 0,
    aggregateWaitlistDemand: 0,
    aggregateMaintenanceHours: 0,
  };

  const recommendations = analyticsData?.recommendations || [];
  const resourceMetrics = analyticsData?.resources || [];

  return (
    <div className="page-wrapper" id="analytics-view">
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="badge badge-in-use">
            <Activity size={12} />
            Live Institutional Telemetry & Intelligence
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>•</span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {loading ? 'Refreshing Live Telemetry...' : 'Authoritative Utilization Formulas'}
          </span>
        </div>
        <h1 style={{ fontSize: '30px', fontWeight: 800, marginBottom: '8px' }}>
          Idle Resource Utilization & Intelligence
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '780px' }}>
          Mathematical capacity evaluation based on verifiable booking intervals, scheduled maintenance blocks, and demand backlogs. Includes evidence-based operational recommendations.
        </p>
      </div>

      {/* Filters Bar */}
      <div
        style={{
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            className="form-select input-sm"
            value={periodDays}
            onChange={(e) => setPeriodDays(parseInt(e.target.value, 10))}
            style={{ width: '130px' }}
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>

          <select
            className="form-select input-sm"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ width: '160px' }}
          >
            <option value="All">All Categories</option>
            <option value="Testing & Measurement">Testing & Measurement</option>
            <option value="Computing & AI">Computing & AI</option>
            <option value="Robotics & Prototyping">Robotics & Prototyping</option>
            <option value="Lab Equipment">Lab Equipment</option>
            <option value="Bioengineering & Imaging">Bioengineering & Imaging</option>
          </select>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        <div className="glass-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Overall Utilization
            </span>
            <TrendingUp size={18} color="var(--burgundy-primary)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#30151E' }} id="metric-utilization-rate">
            {summary.overallUtilizationPercentage}%
          </div>
          <div style={{ fontSize: '12px', color: '#15803d', marginTop: '4px', fontWeight: 600 }}>
            {summary.aggregateBookedHours} hrs booked / {summary.aggregateEligibleHours} hrs eligible
          </div>
        </div>

        <div className="glass-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Queue Waitlist Demand
            </span>
            <Users size={18} color="var(--burgundy-primary)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#30151E' }}>
            {summary.aggregateWaitlistDemand}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Pending researcher waitlist requests
          </div>
        </div>

        <div className="glass-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Maintenance Outage Hours
            </span>
            <Clock size={18} color="#b45309" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#30151E' }}>
            {summary.aggregateMaintenanceHours}h
          </div>
          <div style={{ fontSize: '12px', color: '#b45309', marginTop: '4px' }}>
            Deducted from available denominator
          </div>
        </div>

        <div className="glass-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Cancellations Recorded
            </span>
            <AlertCircle size={18} color="#be123c" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#30151E' }}>
            {summary.aggregateCancellations}
          </div>
          <div style={{ fontSize: '12px', color: '#be123c', marginTop: '4px' }}>
            Excluded from booked hours
          </div>
        </div>
      </div>

      {/* Evidence-Based Optimization Recommendations */}
      {recommendations.length > 0 && (
        <div className="glass-card" style={{ padding: '28px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#30151E', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lightbulb size={20} color="#b45309" />
            Evidence-Based Operational Recommendations
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Derived automatically from recorded utilization percentages, waiting list backlogs, cancellation rates, and maintenance blocks.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {recommendations.map((rec, i) => {
              const badgeColor = rec.priority === 'HIGH' ? '#be123c' : rec.priority === 'MEDIUM' ? '#b45309' : '#15803d';
              const badgeBg = rec.priority === 'HIGH' ? 'rgba(190, 18, 60, 0.12)' : rec.priority === 'MEDIUM' ? 'rgba(180, 83, 9, 0.12)' : 'rgba(28, 107, 70, 0.12)';

              return (
                <div
                  key={i}
                  style={{
                    padding: '18px',
                    borderRadius: 'var(--radius-md)',
                    background: '#FFFFFF',
                    border: '1.5px solid rgba(48, 21, 30, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(48, 21, 30, 0.04)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: badgeBg, color: badgeColor }}>
                        {rec.priority} PRIORITY • {rec.type}
                      </span>
                      {rec.resourceTitle && (
                        <span style={{ fontSize: '12px', color: '#30151E', fontWeight: 700 }}>
                          {rec.resourceTitle}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#30151E', marginBottom: '8px' }}>
                      {rec.recommendation}
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid rgba(48, 21, 30, 0.08)', paddingTop: '8px', marginTop: '10px' }}>
                    <strong>Evidence:</strong> {rec.evidence}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-Resource Utilization Table */}
      <div className="glass-card" style={{ padding: '28px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#30151E', marginBottom: '6px' }}>
          Hardware Inventory Utilization Telemetry
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Detailed performance breakdown by unit across the selected {periodDays}-day reporting window.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid rgba(48, 21, 30, 0.15)', background: 'rgba(48, 21, 30, 0.04)' }}>
                <th style={{ textAlign: 'left', padding: '12px', color: '#30151E' }}>Resource</th>
                <th style={{ textAlign: 'left', padding: '12px', color: '#30151E' }}>Category & Institution</th>
                <th style={{ textAlign: 'left', padding: '12px', color: '#30151E' }}>Status</th>
                <th style={{ textAlign: 'right', padding: '12px', color: '#30151E' }}>Eligible (h)</th>
                <th style={{ textAlign: 'right', padding: '12px', color: '#30151E' }}>Booked (h)</th>
                <th style={{ textAlign: 'left', padding: '12px 24px', color: '#30151E' }}>Utilization (%)</th>
                <th style={{ textAlign: 'center', padding: '12px', color: '#30151E' }}>Waitlist</th>
              </tr>
            </thead>
            <tbody>
              {resourceMetrics.map((r) => (
                <tr key={r.resourceId} style={{ borderBottom: '1px solid rgba(48, 21, 30, 0.08)' }}>
                  <td style={{ padding: '14px 12px', fontWeight: 700, color: '#30151E' }}>
                    {r.title}
                  </td>
                  <td style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>
                    <div>{r.category}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.institutionName}</div>
                  </td>
                  <td style={{ padding: '14px 12px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: r.status === 'Available' ? 'rgba(28, 107, 70, 0.12)' : r.status === 'Maintenance' ? 'rgba(190, 18, 60, 0.12)' : 'rgba(180, 83, 9, 0.12)',
                        color: r.status === 'Available' ? '#15803d' : r.status === 'Maintenance' ? '#be123c' : '#b45309',
                        fontWeight: 700,
                      }}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 12px', textAlign: 'right', color: '#30151E', fontWeight: 600 }}>
                    {r.eligibleAvailableHours}h
                  </td>
                  <td style={{ padding: '14px 12px', textAlign: 'right', color: '#30151E', fontWeight: 700 }}>
                    {r.bookedHours}h
                  </td>
                  <td style={{ padding: '14px 24px', minWidth: '180px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ flex: 1, height: '8px', background: 'rgba(48, 21, 30, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.max(4, r.utilizationPercentage)}%`,
                            height: '100%',
                            background: r.utilizationPercentage > 50 ? '#15803d' : r.utilizationPercentage > 15 ? '#30151E' : '#b45309',
                            borderRadius: '4px',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#30151E', width: '40px', textAlign: 'right' }}>
                        {r.utilizationPercentage}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                    {r.waitingListDemand > 0 ? (
                      <span className="badge badge-waiting">
                        {r.waitingListDemand} waiting
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
