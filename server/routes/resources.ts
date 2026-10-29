import { Router } from 'express';
import {
  db,
  formatResourceRow,
  formatAccessoryRow,
  formatMaintenanceRow,
  formatConditionReportRow,
  createAuditEntry,
} from '../db.ts';
import {
  authenticateToken,
  optionalAuth,
  requireRoles,
  type AuthenticatedRequest,
} from '../auth.ts';

const router = Router();

// GET /api/v1/resources
// Supports pagination, search, category, department, institution, location, status, price, and eligibility filters
router.get('/', optionalAuth, (req: AuthenticatedRequest, res): void => {
  const {
    q,
    category,
    department,
    institutionId,
    location,
    status,
    minSafetyLevel,
    maxSafetyLevel,
    maxPrice,
    externalAllowed,
    page = '1',
    limit = '20',
  } = req.query;

  let baseQuery = 'FROM resources WHERE 1=1';
  const params: any[] = [];

  // Search keyword across title, description, category, department, location, specifications
  if (q && String(q).trim()) {
    const term = `%${String(q).trim()}%`;
    baseQuery += ` AND (title LIKE ? OR description LIKE ? OR category LIKE ? OR department LIKE ? OR location LIKE ? OR specifications LIKE ?)`;
    params.push(term, term, term, term, term, term);
  }

  if (category && category !== 'All') {
    baseQuery += ' AND category = ?';
    params.push(String(category));
  }

  if (department && department !== 'All Departments') {
    baseQuery += ' AND department = ?';
    params.push(String(department));
  }

  if (institutionId) {
    baseQuery += ' AND institution_id = ?';
    params.push(String(institutionId));
  }

  if (location) {
    baseQuery += ' AND location LIKE ?';
    params.push(`%${String(location)}%`);
  }

  if (status && status !== 'All') {
    baseQuery += ' AND status = ?';
    params.push(String(status));
  }

  if (minSafetyLevel) {
    baseQuery += ' AND safety_level_required >= ?';
    params.push(Number(minSafetyLevel));
  }

  if (maxSafetyLevel) {
    baseQuery += ' AND safety_level_required <= ?';
    params.push(Number(maxSafetyLevel));
  }

  if (maxPrice) {
    baseQuery += ' AND hourly_rate_credits <= ?';
    params.push(Number(maxPrice));
  }

  if (externalAllowed !== undefined) {
    const allowExt = externalAllowed === 'true' || externalAllowed === '1';
    baseQuery += ' AND allow_external_users = ?';
    params.push(allowExt ? 1 : 0);
  }

  // Count total matches for pagination
  const countRow = db.prepare(`SELECT COUNT(*) as total ${baseQuery}`).get(...params) as { total: number };
  const total = countRow.total;

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const rows = db.prepare(`SELECT * ${baseQuery} ORDER BY title ASC LIMIT ? OFFSET ?`).all(...params, limitNum, offset) as Record<string, any>[];
  const resources = rows.map((r) => formatResourceRow(r));

  res.json({
    success: true,
    resources,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// GET /api/v1/resources/:id
// Returns complete resource specifications, accessories, and active reservation schedule
router.get('/:id', (req, res): void => {
  const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id) as Record<string, any> | undefined;
  if (!row) {
    res.status(404).json({
      success: false,
      error: 'RESOURCE_NOT_FOUND',
      message: `Resource with id '${req.params.id}' was not found.`,
    });
    return;
  }

  const resource = formatResourceRow(row);

  // Fetch accessories from resource_accessories table
  const accRows = db.prepare('SELECT * FROM resource_accessories WHERE resource_id = ?').all(resource.id) as Record<string, any>[];
  const accessoryItems = accRows.map((a) => formatAccessoryRow(a));

  // Fetch active bookings (for schedule awareness)
  const activeBookings = db.prepare(`
    SELECT id, start_date, end_date, status, seeker_name
    FROM bookings
    WHERE resource_id = ? AND status IN ('APPROVED', 'CHECKED_OUT', 'in_use', 'approved')
    ORDER BY start_date ASC
  `).all(resource.id) as Record<string, any>[];

  res.json({
    success: true,
    resource: {
      ...resource,
      accessoryItems,
      activeBookings: activeBookings.map((b) => ({
        id: b.id,
        startDate: b.start_date,
        endDate: b.end_date,
        status: b.status,
        seekerName: b.seeker_name,
      })),
    },
  });
});

// POST /api/v1/resources
// Create a new resource (Resource Owner, Institution Manager, or Admin only)
router.post(
  '/',
  authenticateToken,
  requireRoles(['RESOURCE_OWNER', 'INSTITUTION_MANAGER', 'ADMIN']),
  (req: AuthenticatedRequest, res): void => {
    const user = req.user!;
    const {
      title,
      category,
      department,
      location,
      description,
      specifications = {},
      safetyLevelRequired = 1,
      requiresCertification = 'General Lab Safety L1',
      hourlyRateCredits = 10,
      accessories = [],
      maintenanceSchedule = 'Regular monthly inspection',
      approvalMode = 'MODE_B_OWNER',
      allowExternalUsers = true,
      maxDurationHours = 8,
      advanceBookingDays = 30,
      imageUrl = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    } = req.body;

    if (!title || !category || !department || !location || !description) {
      res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'Title, category, department, location, and description are required.',
      });
      return;
    }

    const resourceId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const specsJson = typeof specifications === 'string' ? specifications : JSON.stringify(specifications);
    const accJson = Array.isArray(accessories) ? JSON.stringify(accessories) : '[]';

    db.prepare(`
      INSERT INTO resources (
        id, title, category, department, location, owner_id, owner_name, owner_role,
        institution_id, institution_name, description, specifications, safety_level_required,
        requires_certification, condition_score, condition_status, status, image_url,
        hourly_rate_credits, accessories, maintenance_schedule, total_bookings_count,
        approval_mode, allow_external_users, max_duration_hours, advance_booking_days
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      resourceId,
      String(title).trim(),
      category,
      department,
      location,
      user.id,
      user.name,
      user.title || user.role,
      user.institutionId,
      user.institutionName,
      String(description).trim(),
      specsJson,
      Number(safetyLevelRequired) || 1,
      requiresCertification,
      100,
      'Pristine',
      'Available',
      imageUrl,
      Number(hourlyRateCredits) || 10,
      accJson,
      maintenanceSchedule,
      0,
      approvalMode,
      allowExternalUsers ? 1 : 0,
      Number(maxDurationHours) || 8,
      Number(advanceBookingDays) || 30
    );

    createAuditEntry({
      actionType: 'RESOURCE_CREATED',
      resourceId,
      resourceTitle: title,
      actorName: user.name,
      actorRole: user.role,
      actorId: user.id,
      detail: `Created resource "${title}" under ${user.institutionName}.`,
    });

    const created = db.prepare('SELECT * FROM resources WHERE id = ?').get(resourceId) as Record<string, any>;
    res.status(201).json({
      success: true,
      message: 'Resource published successfully.',
      resource: formatResourceRow(created),
    });
  }
);

// PATCH /api/v1/resources/:id
// Update resource (Authorized Owner, Manager of same institution, or Admin)
router.patch('/:id', authenticateToken, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id) as Record<string, any> | undefined;

  if (!row) {
    res.status(404).json({
      success: false,
      error: 'RESOURCE_NOT_FOUND',
      message: `Resource '${req.params.id}' not found.`,
    });
    return;
  }

  const userRole = user.role.toUpperCase();
  const isOwner = row.owner_id === user.id;
  const isInstitutionManager = userRole === 'INSTITUTION_MANAGER' && user.institutionId === row.institution_id;
  const isAdmin = userRole === 'ADMIN';

  if (!isOwner && !isInstitutionManager && !isAdmin) {
    res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Only the resource custodian, institutional manager, or platform administrator can update this resource.',
    });
    return;
  }

  const allowedUpdates = [
    'title', 'description', 'category', 'department', 'location',
    'status', 'hourly_rate_credits', 'max_duration_hours', 'advance_booking_days',
    'allow_external_users', 'safety_level_required', 'maintenance_schedule', 'approval_mode'
  ];

  const updates: string[] = [];
  const params: any[] = [];

  for (const field of allowedUpdates) {
    const camel = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    if (req.body[camel] !== undefined) {
      updates.push(`${field} = ?`);
      let val = req.body[camel];
      if (typeof val === 'boolean') val = val ? 1 : 0;
      params.push(val);
    } else if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      let val = req.body[field];
      if (typeof val === 'boolean') val = val ? 1 : 0;
      params.push(val);
    }
  }

  if (updates.length === 0) {
    res.status(400).json({
      success: false,
      error: 'NO_UPDATES',
      message: 'No valid update fields provided.',
    });
    return;
  }

  params.push(req.params.id);
  db.prepare(`UPDATE resources SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  createAuditEntry({
    actionType: 'RESOURCE_UPDATED',
    resourceId: row.id,
    resourceTitle: row.title,
    actorName: user.name,
    actorRole: user.role,
    actorId: user.id,
    detail: `Updated properties on "${row.title}".`,
  });

  const updated = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id) as Record<string, any>;
  res.json({
    success: true,
    message: 'Resource updated successfully.',
    resource: formatResourceRow(updated),
  });
});

// POST /api/v1/resources/:id/archive
router.post('/:id/archive', authenticateToken, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id) as Record<string, any> | undefined;

  if (!row) {
    res.status(404).json({ success: false, error: 'RESOURCE_NOT_FOUND', message: 'Resource not found.' });
    return;
  }

  const userRole = user.role.toUpperCase();
  if (row.owner_id !== user.id && userRole !== 'ADMIN' && !(userRole === 'INSTITUTION_MANAGER' && user.institutionId === row.institution_id)) {
    res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Unauthorized to archive this resource.' });
    return;
  }

  db.prepare("UPDATE resources SET status = 'Retired' WHERE id = ?").run(req.params.id);
  res.json({ success: true, message: `Resource "${row.title}" has been retired/archived.` });
});

// GET /api/v1/resources/:id/availability
// Authoritative availability intervals calculation
router.get('/:id/availability', (req, res): void => {
  const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id) as Record<string, any> | undefined;
  if (!row) {
    res.status(404).json({ success: false, error: 'RESOURCE_NOT_FOUND', message: 'Resource not found.' });
    return;
  }

  const activeBookings = db.prepare(`
    SELECT id, start_date, end_date, status, seeker_name
    FROM bookings
    WHERE resource_id = ? AND status IN ('APPROVED', 'CHECKED_OUT', 'in_use', 'approved')
    ORDER BY start_date ASC
  `).all(req.params.id) as Record<string, any>[];

  const maintenanceBlocks = db.prepare(`
    SELECT id, scheduled_at, completed_at, status, description
    FROM maintenance_records
    WHERE resource_id = ? AND status IN ('SCHEDULED', 'IN_PROGRESS')
  `).all(req.params.id) as Record<string, any>[];

  const now = new Date().toISOString();
  const isCurrentlyInUse = activeBookings.some((b) => now >= b.start_date && now <= b.end_date);
  const isUnderMaintenance = row.status === 'Maintenance' || maintenanceBlocks.some((m) => m.status === 'IN_PROGRESS');

  res.json({
    success: true,
    resourceId: row.id,
    resourceTitle: row.title,
    currentStatus: row.status,
    operatingHours: '08:00 - 20:00 (Mon - Fri)',
    isAvailableNow: !isCurrentlyInUse && !isUnderMaintenance && row.status === 'Available',
    activeBookings: activeBookings.map((b) => ({
      bookingId: b.id,
      startAt: b.start_date,
      endAt: b.end_date,
      status: b.status,
    })),
    maintenanceBlocks: maintenanceBlocks.map((m) => ({
      id: m.id,
      scheduledAt: m.scheduled_at,
      status: m.status,
      description: m.description,
    })),
  });
});

// GET /api/v1/resources/:id/history
// Equipment memory chronological timeline (bookings, condition reports, maintenance, incidents)
router.get('/:id/history', (req, res): void => {
  const resourceId = req.params.id;
  const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(resourceId) as Record<string, any> | undefined;
  if (!row) {
    res.status(404).json({ success: false, error: 'RESOURCE_NOT_FOUND', message: 'Resource not found.' });
    return;
  }

  const page = parseInt(String(req.query.page || '1'), 10) || 1;
  const limit = parseInt(String(req.query.limit || '30'), 10) || 30;

  // 1. Booking events
  const bookingRows = db.prepare(`
    SELECT id, start_date, end_date, seeker_name, status, purpose, created_at, approved_at, check_in, return_checkout
    FROM bookings
    WHERE resource_id = ?
  `).all(resourceId) as Record<string, any>[];

  const events: any[] = [];

  for (const b of bookingRows) {
    events.push({
      type: 'BOOKING_CREATED',
      timestamp: b.created_at,
      actor: b.seeker_name,
      title: `Reservation Requested by ${b.seeker_name}`,
      detail: `Purpose: ${b.purpose} (Status: ${b.status})`,
      bookingId: b.id,
    });

    if (b.approved_at) {
      events.push({
        type: 'BOOKING_APPROVED',
        timestamp: b.approved_at,
        actor: 'Authorized Reviewer',
        title: `Reservation Confirmed`,
        detail: `Slot: ${b.start_date} to ${b.end_date}`,
        bookingId: b.id,
      });
    }

    if (b.check_in) {
      try {
        const cin = JSON.parse(b.check_in);
        events.push({
          type: 'CHECK_IN_LOG',
          timestamp: cin.timestamp,
          actor: cin.actor,
          title: `Physical Custody Check-In`,
          detail: `Initial condition: ${cin.condition} (${cin.rating}/5). Notes: ${cin.notes}`,
          signature: cin.signature,
          bookingId: b.id,
        });
      } catch {}
    }

    if (b.return_checkout) {
      try {
        const cout = JSON.parse(b.return_checkout);
        events.push({
          type: 'RETURN_LOG',
          timestamp: cout.timestamp,
          actor: cout.actor,
          title: `Physical Custody Returned`,
          detail: `Return condition: ${cout.condition} (${cout.rating}/5). Notes: ${cout.notes}`,
          signature: cout.signature,
          bookingId: b.id,
        });
      } catch {}
    }
  }

  // 2. Condition Reports
  const condRows = db.prepare('SELECT * FROM condition_reports WHERE resource_id = ?').all(resourceId) as Record<string, any>[];
  for (const c of condRows) {
    events.push({
      type: 'CONDITION_REPORT',
      timestamp: c.created_at,
      actor: c.submitted_by,
      title: `${c.report_type} Condition Certification`,
      detail: `${c.condition_summary} (Rating: ${c.rating}/5)`,
      reviewStatus: c.review_status,
      bookingId: c.booking_id,
    });
  }

  // 3. Maintenance Records
  const maintRows = db.prepare('SELECT * FROM maintenance_records WHERE resource_id = ?').all(resourceId) as Record<string, any>[];
  for (const m of maintRows) {
    events.push({
      type: 'MAINTENANCE_EVENT',
      timestamp: m.scheduled_at,
      actor: m.performed_by,
      title: `${m.maintenance_type} Maintenance: ${m.status}`,
      detail: m.description,
      notes: m.notes,
    });
  }

  // 4. Incidents
  const incRows = db.prepare('SELECT * FROM incidents WHERE resource_id = ?').all(resourceId) as Record<string, any>[];
  for (const inc of incRows) {
    events.push({
      type: 'INCIDENT_RECORD',
      timestamp: inc.created_at,
      actor: inc.reported_by,
      title: `Anomaly Reported: ${inc.title} (${inc.severity} Severity)`,
      detail: `${inc.description} - Status: ${inc.status}`,
      resolution: inc.resolution_notes,
    });
  }

  // Sort descending by timestamp
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const total = events.length;
  const pagedEvents = events.slice((page - 1) * limit, page * limit);

  res.json({
    success: true,
    resourceId: row.id,
    resourceTitle: row.title,
    conditionScore: row.condition_score,
    conditionStatus: row.condition_status,
    totalEvents: total,
    page,
    limit,
    timeline: pagedEvents,
  });
});

// GET /api/v1/resources/:id/alternatives
// Smart resource substitution service (Section 10)
router.get('/:id/alternatives', optionalAuth, (req: AuthenticatedRequest, res): void => {
  const user = req.user;
  const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id) as Record<string, any> | undefined;
  if (!row) {
    res.status(404).json({ success: false, error: 'RESOURCE_NOT_FOUND', message: 'Target resource not found.' });
    return;
  }

  const target = formatResourceRow(row);
  const { startAt, endAt } = req.query;

  // Retrieve potential alternatives from the catalog
  const candidateRows = db.prepare('SELECT * FROM resources WHERE id != ?').all(target.id) as Record<string, any>[];

  const alternatives = candidateRows.map((cRow) => {
    const candidate = formatResourceRow(cRow);

    // 1. Category and domain compatibility
    const sameCategory = candidate.category === target.category;
    const sameDepartment = candidate.department === target.department;

    // 2. Specification differences
    const specDiffs: Record<string, { targetValue?: string; candidateValue?: string; note: string }> = {};
    const targetSpecs = target.specifications || {};
    const candSpecs = candidate.specifications || {};

    const allKeys = Array.from(new Set([...Object.keys(targetSpecs), ...Object.keys(candSpecs)]));
    let matchingSpecsCount = 0;

    for (const key of allKeys) {
      const tVal = targetSpecs[key];
      const cVal = candSpecs[key];
      if (tVal && cVal) {
        if (tVal.toLowerCase() === cVal.toLowerCase()) {
          matchingSpecsCount++;
        } else {
          specDiffs[key] = {
            targetValue: tVal,
            candidateValue: cVal,
            note: 'Specification parameter variance',
          };
        }
      } else if (tVal && !cVal) {
        specDiffs[key] = { targetValue: tVal, note: 'Candidate specification unlisted' };
      } else if (!tVal && cVal) {
        specDiffs[key] = { candidateValue: cVal, note: 'Additional feature offered on candidate' };
      }
    }

    // 3. Availability check during interval
    let isAvailable = candidate.status === 'Available';
    let availabilityNote = 'Available in general inventory';

    if (startAt && endAt) {
      const sTs = new Date(String(startAt)).getTime();
      const eTs = new Date(String(endAt)).getTime();
      if (!isNaN(sTs) && !isNaN(eTs)) {
        const conflict = db.prepare(`
          SELECT COUNT(*) as count FROM bookings
          WHERE resource_id = ?
            AND status IN ('APPROVED', 'CHECKED_OUT', 'in_use', 'approved')
            AND start_date < ? AND end_date > ?
        `).get(candidate.id, String(endAt), String(startAt)) as { count: number };

        if (conflict.count > 0 || candidate.status === 'Maintenance') {
          isAvailable = false;
          availabilityNote = candidate.status === 'Maintenance' ? 'Under maintenance' : 'Slot occupied by another booking';
        }
      }
    }

    // 4. Eligibility & Training Check
    let isEligible = true;
    let eligibilityNote = 'Eligible for reservation';

    if (user) {
      if (user.safetyLevel < candidate.safetyLevelRequired) {
        isEligible = false;
        eligibilityNote = `Requires Safety Level ${candidate.safetyLevelRequired} (Profile clearance: Level ${user.safetyLevel})`;
      } else if (!candidate.allowExternalUsers && user.institutionId !== candidate.institutionId) {
        isEligible = false;
        eligibilityNote = `Restricted to internal ${candidate.institutionName} researchers`;
      }
    }

    // 5. Classification
    let classification: 'SUITABLE_ALTERNATIVE' | 'PARTIAL_MATCH' | 'COMPATIBILITY_UNVERIFIED' | 'INELIGIBLE' | 'UNAVAILABLE';
    let explanation: string;

    if (!isEligible) {
      classification = 'INELIGIBLE';
      explanation = `Safety clearance or institutional policy prevents immediate booking: ${eligibilityNote}.`;
    } else if (!isAvailable) {
      classification = 'UNAVAILABLE';
      explanation = `Candidate instrument is currently ${availabilityNote}.`;
    } else if (sameCategory && matchingSpecsCount > 0) {
      classification = 'SUITABLE_ALTERNATIVE';
      explanation = `Direct functional alternative in ${candidate.category} with calibrated specifications.`;
    } else if (sameCategory || sameDepartment) {
      classification = 'PARTIAL_MATCH';
      explanation = `Partial domain match (${candidate.department}). Please review specification variance.`;
    } else {
      classification = 'COMPATIBILITY_UNVERIFIED';
      explanation = `Cross-domain instrument; verify experiment protocol before reserving.`;
    }

    return {
      resource: candidate,
      classification,
      isAvailable,
      isEligible,
      explanation,
      matchingSpecsCount,
      specificationDifferences: specDiffs,
      hourlyRateVariance: candidate.hourlyRateCredits - target.hourlyRateCredits,
    };
  });

  // Rank: Suitable Alternatives first, then Partial Matches
  const priorityMap = {
    SUITABLE_ALTERNATIVE: 1,
    PARTIAL_MATCH: 2,
    COMPATIBILITY_UNVERIFIED: 3,
    UNAVAILABLE: 4,
    INELIGIBLE: 5,
  };

  alternatives.sort((a, b) => priorityMap[a.classification] - priorityMap[b.classification]);

  res.json({
    success: true,
    targetResourceId: target.id,
    targetResourceTitle: target.title,
    targetCategory: target.category,
    alternatives,
  });
});

// GET /api/v1/resources/:id/maintenance
router.get('/:id/maintenance', (req, res): void => {
  const rows = db.prepare('SELECT * FROM maintenance_records WHERE resource_id = ? ORDER BY scheduled_at DESC').all(req.params.id) as Record<string, any>[];
  res.json({
    success: true,
    resourceId: req.params.id,
    records: rows.map((r) => formatMaintenanceRow(r)),
  });
});

// POST /api/v1/resources/:id/maintenance
router.post(
  '/:id/maintenance',
  authenticateToken,
  requireRoles(['RESOURCE_OWNER', 'INSTITUTION_MANAGER', 'ADMIN']),
  (req: AuthenticatedRequest, res): void => {
    const user = req.user!;
    const { maintenanceType, description, scheduledAt, performedBy, notes } = req.body;

    const resRow = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id) as Record<string, any> | undefined;
    if (!resRow) {
      res.status(404).json({ success: false, error: 'RESOURCE_NOT_FOUND', message: 'Resource not found.' });
      return;
    }

    if (!maintenanceType || !description || !scheduledAt) {
      res.status(400).json({ success: false, error: 'MISSING_FIELDS', message: 'Type, description, and scheduled date required.' });
      return;
    }

    const maintId = `maint_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO maintenance_records (id, resource_id, maintenance_type, description, scheduled_at, completed_at, performed_by, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      maintId,
      resRow.id,
      maintenanceType,
      String(description).trim(),
      scheduledAt,
      null,
      performedBy ? String(performedBy).trim() : user.name,
      'SCHEDULED',
      notes ? String(notes).trim() : null,
      new Date().toISOString()
    );

    // If scheduled date is in the immediate window, mark resource as Maintenance
    const schedDate = new Date(scheduledAt).getTime();
    if (schedDate <= Date.now() + 24 * 3600 * 1000) {
      db.prepare("UPDATE resources SET status = 'Maintenance', condition_status = 'Under Inspection' WHERE id = ?").run(resRow.id);
    }

    createAuditEntry({
      actionType: 'MAINTENANCE_SCHEDULED',
      resourceId: resRow.id,
      resourceTitle: resRow.title,
      actorName: user.name,
      actorRole: user.role,
      actorId: user.id,
      detail: `Scheduled ${maintenanceType} maintenance: "${description}".`,
    });

    const created = db.prepare('SELECT * FROM maintenance_records WHERE id = ?').get(maintId) as Record<string, any>;
    res.status(201).json({
      success: true,
      message: 'Maintenance scheduled successfully.',
      record: formatMaintenanceRow(created),
    });
  }
);

export default router;
