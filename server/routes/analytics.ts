import { Router } from 'express';
import { db, formatResourceRow } from '../db.ts';
import { optionalAuth, type AuthenticatedRequest } from '../auth.ts';

const router = Router();

// GET /api/v1/analytics/resource-utilization
// Idle resource utilization analytics (Section 13)
// Utilization (%) = (Booked hours / Eligible available hours) * 100
router.get('/resource-utilization', optionalAuth, (req: AuthenticatedRequest, res): void => {
  const {
    institutionId,
    category,
    resourceId,
    periodDays = '30',
  } = req.query;

  const days = Math.max(1, Math.min(365, parseInt(String(periodDays), 10) || 30));
  const now = new Date();
  const windowEnd = now.getTime();
  const windowStart = windowEnd - days * 24 * 3600 * 1000;
  const windowStartISO = new Date(windowStart).toISOString();
  const windowEndISO = now.toISOString();

  // 1. Build base query for resources
  let query = 'SELECT * FROM resources WHERE 1=1';
  const params: any[] = [];

  if (resourceId) {
    query += ' AND id = ?';
    params.push(String(resourceId));
  }
  if (institutionId) {
    query += ' AND institution_id = ?';
    params.push(String(institutionId));
  }
  if (category && category !== 'All') {
    query += ' AND category = ?';
    params.push(String(category));
  }

  const resourceRows = db.prepare(query).all(...params) as Record<string, any>[];

  let aggregateEligibleHours = 0;
  let aggregateBookedHours = 0;
  let aggregateTotalBookings = 0;
  let aggregateCancellations = 0;
  let aggregateWaitlistDemand = 0;
  let aggregateMaintenanceHours = 0;

  const recommendations: {
    resourceId?: string;
    resourceTitle?: string;
    category: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    type: 'VISIBILITY' | 'CAPACITY' | 'CANCELLATION' | 'MAINTENANCE';
    recommendation: string;
    evidence: string;
  }[] = [];

  const resourceMetrics = resourceRows.map((rRow) => {
    const resource = formatResourceRow(rRow);

    // Maintenance hours in this period
    const maintRows = db.prepare(`
      SELECT * FROM maintenance_records
      WHERE resource_id = ?
        AND scheduled_at >= ? AND scheduled_at <= ?
    `).all(resource.id, windowStartISO, windowEndISO) as Record<string, any>[];

    let maintHours = 0;
    for (const m of maintRows) {
      // Default to 8 hours per scheduled maintenance event if duration not recorded
      maintHours += 8;
    }

    // Eligible available hours = total period hours minus maintenance blocks
    const totalPeriodHours = days * 24;
    const eligibleAvailableHours = Math.max(0, totalPeriodHours - maintHours);

    // Bookings overlapping with window
    const bookingRows = db.prepare(`
      SELECT * FROM bookings
      WHERE resource_id = ?
        AND start_date < ? AND end_date > ?
    `).all(resource.id, windowEndISO, windowStartISO) as Record<string, any>[];

    let bookedHours = 0;
    let completedCount = 0;
    let activeOrApprovedCount = 0;
    let cancelledCount = 0;

    for (const b of bookingRows) {
      const bStatus = String(b.status).toUpperCase();
      if (bStatus === 'CANCELLED' || bStatus === 'REJECTED') {
        if (bStatus === 'CANCELLED') cancelledCount++;
        continue; // Exclude cancelled and rejected bookings from booked hours
      }

      const bStart = Math.max(windowStart, new Date(b.start_date).getTime());
      const bEnd = Math.min(windowEnd, new Date(b.end_date).getTime());
      const durationHours = Math.max(0, (bEnd - bStart) / (3600 * 1000));

      bookedHours += durationHours;
      if (bStatus === 'RETURNED' || bStatus === 'COMPLETED') {
        completedCount++;
      } else {
        activeOrApprovedCount++;
      }
    }

    bookedHours = Math.round(bookedHours * 10) / 10;
    const totalBookingsCount = completedCount + activeOrApprovedCount + cancelledCount;

    // Utilization calculation: (Booked hours / Eligible available hours) * 100
    let utilizationPercentage = 0;
    if (eligibleAvailableHours > 0) {
      utilizationPercentage = Math.min(100, Math.round((bookedHours / eligibleAvailableHours) * 1000) / 10);
    }

    // Waiting list demand
    const waitlistCountRow = db.prepare(`
      SELECT COUNT(*) as count FROM waiting_list
      WHERE resource_id = ? AND status = 'WAITING'
    `).get(resource.id) as { count: number };
    const waitlistDemand = waitlistCountRow.count;

    // Aggregate tallies
    aggregateEligibleHours += eligibleAvailableHours;
    aggregateBookedHours += bookedHours;
    aggregateTotalBookings += totalBookingsCount;
    aggregateCancellations += cancelledCount;
    aggregateWaitlistDemand += waitlistDemand;
    aggregateMaintenanceHours += maintHours;

    // Evidence-based recommendations per resource
    if (utilizationPercentage < 15 && totalBookingsCount <= 2) {
      recommendations.push({
        resourceId: resource.id,
        resourceTitle: resource.title,
        category: resource.category,
        priority: 'MEDIUM',
        type: 'VISIBILITY',
        recommendation: 'Increase inter-departmental visibility or lower hourly credits threshold.',
        evidence: `Utilization is only ${utilizationPercentage}% with ${totalBookingsCount} bookings across the last ${days} days.`,
      });
    }

    if (utilizationPercentage > 75 || waitlistDemand >= 2) {
      recommendations.push({
        resourceId: resource.id,
        resourceTitle: resource.title,
        category: resource.category,
        priority: 'HIGH',
        type: 'CAPACITY',
        recommendation: 'Expand operational access hours or acquire supplementary hardware accessories.',
        evidence: `High utilization (${utilizationPercentage}%) with ${waitlistDemand} pending waitlist requests.`,
      });
    }

    if (totalBookingsCount > 3 && (cancelledCount / totalBookingsCount) >= 0.3) {
      recommendations.push({
        resourceId: resource.id,
        resourceTitle: resource.title,
        category: resource.category,
        priority: 'HIGH',
        type: 'CANCELLATION',
        recommendation: 'Implement shorter advance booking windows or mandatory reservation confirmation checkpoints.',
        evidence: `${cancelledCount} of ${totalBookingsCount} bookings (${Math.round((cancelledCount / totalBookingsCount) * 100)}%) were cancelled.`,
      });
    }

    if (maintHours > 0 || resource.status === 'Maintenance') {
      recommendations.push({
        resourceId: resource.id,
        resourceTitle: resource.title,
        category: resource.category,
        priority: 'MEDIUM',
        type: 'MAINTENANCE',
        recommendation: 'Review maintenance logs and verify calibration certification prior to inventory release.',
        evidence: `${maintHours} hours of maintenance recorded in reporting period; current status is ${resource.status}.`,
      });
    }

    return {
      resourceId: resource.id,
      title: resource.title,
      category: resource.category,
      department: resource.department,
      institutionId: resource.institutionId,
      institutionName: resource.institutionName,
      status: resource.status,
      conditionScore: resource.conditionScore,
      eligibleAvailableHours,
      bookedHours,
      utilizationPercentage,
      totalBookings: totalBookingsCount,
      completedBookings: completedCount,
      activeOrApprovedBookings: activeOrApprovedCount,
      cancellations: cancelledCount,
      waitingListDemand: waitlistDemand,
      maintenanceHours: maintHours,
    };
  });

  // Overall aggregate utilization
  let overallUtilization = 0;
  if (aggregateEligibleHours > 0) {
    overallUtilization = Math.min(100, Math.round((aggregateBookedHours / aggregateEligibleHours) * 1000) / 10);
  }

  res.json({
    success: true,
    reportingPeriod: {
      days,
      start: windowStartISO,
      end: windowEndISO,
    },
    formula: 'Utilization (%) = (Booked hours / Eligible available hours) * 100',
    assumptions: [
      'Eligible available hours = Period hours minus scheduled maintenance blocks.',
      'Booked hours sum approved, checked-out, and returned bookings falling within the period window.',
      'Cancelled and rejected bookings are strictly excluded from booked hours calculation.',
      'Zero available hours safely yields 0% utilization.',
    ],
    summary: {
      totalResourcesEvaluated: resourceRows.length,
      aggregateEligibleHours,
      aggregateBookedHours: Math.round(aggregateBookedHours * 10) / 10,
      overallUtilizationPercentage: overallUtilization,
      aggregateTotalBookings,
      aggregateCancellations,
      aggregateWaitlistDemand,
      aggregateMaintenanceHours,
    },
    recommendations,
    resources: resourceMetrics,
  });
});

export default router;
