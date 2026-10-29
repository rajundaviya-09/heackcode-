import { Router } from 'express';
import {
  db,
  formatBookingRow,
  formatResourceRow,
  createAuditEntry,
  createNotification,
} from '../db.ts';
import {
  authenticateToken,
  type AuthenticatedRequest,
} from '../auth.ts';

const router = Router();

// GET /api/v1/bookings
router.get('/', authenticateToken, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const { status, resourceId, seekerId } = req.query;

  let query = 'SELECT * FROM bookings WHERE 1=1';
  const params: any[] = [];

  // Role-based visibility
  const userRole = user.role.toUpperCase();
  if (userRole === 'RESOURCE_SEEKER') {
    query += ' AND seeker_id = ?';
    params.push(user.id);
  } else if (userRole === 'RESOURCE_OWNER') {
    query += ' AND (owner_id = ? OR seeker_id = ?)';
    params.push(user.id, user.id);
  } else if (userRole === 'INSTITUTION_MANAGER') {
    query += ' AND (institution_id = ? OR seeker_institution_id = ? OR seeker_id = ?)';
    params.push(user.institutionId, user.institutionId, user.id);
  } // ADMIN sees all

  if (resourceId) {
    query += ' AND resource_id = ?';
    params.push(resourceId);
  }

  if (seekerId && userRole === 'ADMIN') {
    query += ' AND seeker_id = ?';
    params.push(seekerId);
  }

  if (status) {
    const statuses = String(status).split(',');
    const placeholders = statuses.map(() => '?').join(',');
    query += ` AND status IN (${placeholders})`;
    params.push(...statuses);
  }

  query += ' ORDER BY created_at DESC';

  const rows = db.prepare(query).all(...params) as Record<string, any>[];
  const bookings = rows.map((r) => formatBookingRow(r));

  res.json({
    success: true,
    bookings,
  });
});

// GET /api/v1/bookings/:id
router.get('/:id', authenticateToken, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) as Record<string, any> | undefined;

  if (!row) {
    res.status(404).json({
      success: false,
      error: 'BOOKING_NOT_FOUND',
      message: `Booking '${req.params.id}' was not found.`,
    });
    return;
  }

  const booking = formatBookingRow(row);
  const userRole = user.role.toUpperCase();

  // Scoped authorization check
  const isBorrower = booking.seekerId === user.id;
  const isOwner = booking.ownerId === user.id;
  const isInstMgr = userRole === 'INSTITUTION_MANAGER' && (booking.institutionId === user.institutionId || booking.seekerInstitutionId === user.institutionId);
  const isAdmin = userRole === 'ADMIN';

  if (!isBorrower && !isOwner && !isInstMgr && !isAdmin) {
    res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'You are not authorized to view this booking record.',
    });
    return;
  }

  res.json({
    success: true,
    booking,
  });
});

// POST /api/v1/bookings
router.post('/', authenticateToken, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const {
    resourceId,
    startDate,
    endDate,
    purpose,
    courseCode,
    priority,
    certifiedAgreement,
    asWaitlist,
  } = req.body;

  // 1. Validate required fields
  if (!resourceId || !startDate || !endDate) {
    res.status(400).json({
      success: false,
      error: 'MISSING_FIELDS',
      message: 'Resource ID, start date, and end date are required.',
    });
    return;
  }

  if (!purpose || String(purpose).trim().length < 5) {
    res.status(400).json({
      success: false,
      error: 'INVALID_PURPOSE',
      message: 'Please provide a valid project purpose (minimum 5 characters).',
    });
    return;
  }

  if (!certifiedAgreement) {
    res.status(400).json({
      success: false,
      error: 'CERTIFICATION_REQUIRED',
      message: 'Safety compliance and lab protocol acknowledgement is mandatory.',
    });
    return;
  }

  // 2. Fetch current resource
  const resRow = db.prepare('SELECT * FROM resources WHERE id = ?').get(resourceId) as Record<string, any> | undefined;
  if (!resRow) {
    res.status(404).json({
      success: false,
      error: 'RESOURCE_NOT_FOUND',
      message: `Resource '${resourceId}' was not found.`,
    });
    return;
  }

  const resource = formatResourceRow(resRow);

  // 3. Check resource status (not Maintenance)
  if (resource.status === 'Maintenance') {
    res.status(400).json({
      success: false,
      error: 'RESOURCE_IN_MAINTENANCE',
      message: `Resource '${resource.title}' is currently undergoing scheduled maintenance or recalibration and cannot be booked.`,
    });
    return;
  }

  // 4. Validate date range
  const startTs = new Date(startDate).getTime();
  const endTs = new Date(endDate).getTime();

  if (isNaN(startTs) || isNaN(endTs)) {
    res.status(400).json({
      success: false,
      error: 'INVALID_DATES',
      message: 'Invalid date/time format provided.',
    });
    return;
  }

  if (endTs <= startTs) {
    res.status(400).json({
      success: false,
      error: 'INVALID_TIME_RANGE',
      message: 'Requested end date/time must be strictly after the start date/time.',
    });
    return;
  }

  // 5. Max duration check
  const durationHours = (endTs - startTs) / (1000 * 60 * 60);
  if (resource.maxDurationHours > 0 && durationHours > resource.maxDurationHours) {
    res.status(400).json({
      success: false,
      error: 'DURATION_LIMIT_EXCEEDED',
      message: `Requested duration of ${durationHours.toFixed(1)} hours exceeds the maximum limit of ${resource.maxDurationHours} hours.`,
    });
    return;
  }

  // 6. Advance booking limit check
  const nowTs = Date.now();
  const daysInAdvance = (startTs - nowTs) / (1000 * 60 * 60 * 24);
  if (resource.advanceBookingDays > 0 && daysInAdvance > resource.advanceBookingDays) {
    res.status(400).json({
      success: false,
      error: 'ADVANCE_BOOKING_EXCEEDED',
      message: `Bookings can only be scheduled up to ${resource.advanceBookingDays} days in advance.`,
    });
    return;
  }

  // 7. Check external user policy
  const isExternalUser = Boolean(user.isExternal || user.institutionId !== resource.institutionId);
  if (!resource.allowExternalUsers && isExternalUser) {
    res.status(403).json({
      success: false,
      error: 'EXTERNAL_ACCESS_PROHIBITED',
      message: `Institutional policy restriction: '${resource.title}' is strictly reserved for verified affiliates of ${resource.institutionName}. External access is not permitted.`,
    });
    return;
  }

  // 8. Check user eligibility & safety clearance
  if (user.safetyLevel < resource.safetyLevelRequired) {
    res.status(403).json({
      success: false,
      error: 'SAFETY_LEVEL_UNMET',
      message: `Safety clearance requirement unmet: Requires Safety Level ${resource.safetyLevelRequired} (${resource.requiresCertification}). Your current clearance is Level ${user.safetyLevel}.`,
    });
    return;
  }

  // 9. Availability & Conflict Overlap Check
  // Conflict formula: (StartA < EndB) AND (EndA > StartB)
  const conflictQuery = `
    SELECT * FROM bookings
    WHERE resource_id = ?
      AND status IN ('APPROVED', 'CHECKED_OUT', 'in_use', 'approved')
      AND (? < end_date AND ? > start_date)
  `;
  const conflictingBookings = db.prepare(conflictQuery).all(resource.id, startDate, endDate) as Record<string, any>[];
  const hasConflict = conflictingBookings.length > 0;

  if (hasConflict && !asWaitlist) {
    res.status(409).json({
      success: false,
      error: 'BOOKING_CONFLICT',
      conflict: true,
      message: `This time window conflicts with an existing confirmed reservation on '${resource.title}'. You may join the waiting list.`,
    });
    return;
  }

  // 10. Determine waitlist position or initial status based on approval mode
  let status: string;
  let waitlistPosition: number | null = null;
  const timestamp = new Date().toISOString();
  const bookingId = `bkg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const timeline: any[] = [];

  if (hasConflict && asWaitlist) {
    status = 'WAITLISTED';
    const waitlistCountRow = db.prepare(`
      SELECT COUNT(*) as count FROM bookings WHERE resource_id = ? AND status = 'WAITLISTED'
    `).get(resource.id) as { count: number };
    waitlistPosition = (waitlistCountRow?.count || 0) + 1;

    timeline.push({
      id: `tl_${Date.now()}_1`,
      title: `Added to Waiting List (Queue #${waitlistPosition})`,
      description: `Requested slot overlaps with active reservation; queued at position #${waitlistPosition}.`,
      timestamp,
      actor: user.name,
      statusBadge: 'Waitlisted',
    });
  } else {
    // Determine status from Approval Mode
    if (resource.approvalMode === 'MODE_A_AUTO') {
      status = 'APPROVED';
      timeline.push(
        {
          id: `tl_${Date.now()}_1`,
          title: 'Booking Request Submitted',
          description: `Requested by ${user.name} for ${new Date(startDate).toLocaleString()} to ${new Date(endDate).toLocaleString()}`,
          timestamp,
          actor: user.name,
          statusBadge: 'Submitted',
        },
        {
          id: `tl_${Date.now()}_2`,
          title: 'Instant Policy Approval (Mode A)',
          description: 'Instant reservation cleared under Mode A automated institutional policy. Ready for check-in.',
          timestamp,
          actor: 'System Auto-Engine',
          statusBadge: 'Approved',
        }
      );
    } else if (resource.approvalMode === 'MODE_C_INSTITUTION') {
      status = 'PENDING_INSTITUTION_APPROVAL';
      timeline.push({
        id: `tl_${Date.now()}_1`,
        title: 'Booking Request Submitted',
        description: `Requested by ${user.name}. Escalated to ${resource.institutionName} Manager sign-off.`,
        timestamp,
        actor: user.name,
        statusBadge: 'Pending Institution Sign-off',
      });
    } else {
      // MODE_B_OWNER or MODE_D_MULTI_STAGE: Starts at Owner Approval
      status = 'PENDING_OWNER_APPROVAL';
      timeline.push({
        id: `tl_${Date.now()}_1`,
        title: 'Booking Request Submitted',
        description: resource.approvalMode === 'MODE_D_MULTI_STAGE'
          ? `Stage 1 of 2: Awaiting Resource Custodian (${resource.ownerName}) review before Dean sign-off.`
          : `Awaiting Resource Custodian (${resource.ownerName}) review.`,
        timestamp,
        actor: user.name,
        statusBadge: 'Pending Owner Review',
      });
    }
  }

  // 11. Transactional insertion into SQLite
  db.prepare(`
    INSERT INTO bookings (
      id, resource_id, resource_title, resource_category, institution_id, institution_name,
      seeker_id, seeker_name, seeker_email, seeker_institution_id, seeker_institution_name,
      seeker_department, is_external_seeker, owner_id, start_date, end_date, purpose,
      course_code, priority, certified_agreement, status, approval_mode, owner_approval,
      institution_approval, info_request, waitlist_position, rejection_reason, created_at,
      approved_at, approved_by, check_in, return_checkout, timeline
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    bookingId,
    resource.id,
    resource.title,
    resource.category,
    resource.institutionId,
    resource.institutionName,
    user.id,
    user.name,
    user.email,
    user.institutionId,
    user.institutionName,
    user.department,
    isExternalUser ? 1 : 0,
    resource.ownerId,
    startDate,
    endDate,
    purpose.trim(),
    courseCode || 'GENERAL',
    priority || 'routine',
    1,
    status,
    resource.approvalMode,
    null,
    null,
    null,
    waitlistPosition,
    null,
    timestamp,
    status === 'APPROVED' ? timestamp : null,
    status === 'APPROVED' ? 'System Policy Engine' : null,
    null,
    null,
    JSON.stringify(timeline)
  );

  // 12. Tamper-evident Audit Log
  createAuditEntry({
    actionType: status === 'WAITLISTED' ? 'WAITLIST_JOINED' : 'BOOKING_REQUESTED',
    resourceId: resource.id,
    resourceTitle: resource.title,
    bookingId,
    actorName: user.name,
    actorRole: user.role,
    actorId: user.id,
    detail: status === 'WAITLISTED'
      ? `Joined waitlist for ${resource.title} at Queue Position #${waitlistPosition}.`
      : status === 'APPROVED'
      ? `Automated booking confirmed for ${resource.title} (${startDate} to ${endDate}) under Mode A policy.`
      : `Reservation requested for ${resource.title} (${resource.approvalMode}).`,
  });

  // 13. Create in-app notifications
  if (status === 'APPROVED') {
    createNotification({
      userId: user.id,
      title: 'Booking Confirmed!',
      message: `Your reservation for ${resource.title} has been automatically approved. Ready for check-in on scheduled date.`,
      type: 'success',
      linkPage: 'bookings',
      bookingId,
    });
  } else if (status === 'WAITLISTED') {
    createNotification({
      userId: user.id,
      title: 'Waitlist Confirmed',
      message: `You are queued at position #${waitlistPosition} for ${resource.title}.`,
      type: 'info',
      linkPage: 'bookings',
      bookingId,
    });
  } else if (status === 'PENDING_INSTITUTION_APPROVAL') {
    // Notify the Custodian who possesses the item
    createNotification({
      userId: resource.ownerId,
      title: `📦 Equipment Request: ${resource.title}`,
      message: `${user.name} (${user.department}) requested ${resource.title} in your possession: "${purpose.trim()}"`,
      type: 'info',
      linkPage: 'approvals',
      bookingId,
    });

    // Notify Seeker
    createNotification({
      userId: user.id,
      title: 'Request Dispatched to Possessor',
      message: `Your request was routed directly to ${resource.ownerName} (the custodian possessing ${resource.title}).`,
      type: 'success',
      linkPage: 'bookings',
      bookingId,
    });
  } else {
    // Notify Custodian who possesses the item
    createNotification({
      userId: resource.ownerId,
      title: `📦 Equipment Request: ${resource.title}`,
      message: `${user.name} (${user.department}) requested ${resource.title} in your possession: "${purpose.trim()}"`,
      type: 'info',
      linkPage: 'approvals',
      bookingId,
    });

    // Notify Seeker
    createNotification({
      userId: user.id,
      title: 'Request Dispatched to Possessor',
      message: `Your request was routed directly to ${resource.ownerName} (the custodian possessing ${resource.title}).`,
      type: 'success',
      linkPage: 'bookings',
      bookingId,
    });
  }

  const createdRow = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as Record<string, any>;
  res.status(201).json({
    success: true,
    message: status === 'WAITLISTED'
      ? `Joined waitlist at position #${waitlistPosition}.`
      : status === 'APPROVED'
      ? 'Booking confirmed instantly by automated policy.'
      : 'Booking request submitted successfully.',
    booking: formatBookingRow(createdRow),
  });
});

// POST /api/v1/bookings/:id/cancel
router.post('/:id/cancel', authenticateToken, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) as Record<string, any> | undefined;

  if (!row) {
    res.status(404).json({
      success: false,
      error: 'BOOKING_NOT_FOUND',
      message: `Booking '${req.params.id}' was not found.`,
    });
    return;
  }

  const booking = formatBookingRow(row);
  const userRole = user.role.toUpperCase();

  // Only requester or Admin can cancel
  if (booking.seekerId !== user.id && userRole !== 'ADMIN') {
    res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'You can only cancel your own booking requests.',
    });
    return;
  }

  // Cannot cancel if checked out or completed
  if (booking.status === 'CHECKED_OUT' || booking.status === 'RETURNED' || booking.status === 'in_use' || booking.status === 'completed') {
    res.status(400).json({
      success: false,
      error: 'CANNOT_CANCEL',
      message: 'Active or completed check-in sessions cannot be cancelled. Please execute the return protocol.',
    });
    return;
  }

  const timestamp = new Date().toISOString();
  const timeline = [...booking.timeline, {
    id: `tl_${Date.now()}_cancel`,
    title: 'Booking Cancelled',
    description: `Cancelled by ${user.name} (${user.role}).`,
    timestamp,
    actor: user.name,
    statusBadge: 'Cancelled',
  }];

  db.prepare(`
    UPDATE bookings SET status = 'CANCELLED', timeline = ? WHERE id = ?
  `).run(JSON.stringify(timeline), booking.id);

  createAuditEntry({
    actionType: 'BOOKING_CANCELLED',
    resourceId: booking.resourceId,
    resourceTitle: booking.resourceTitle,
    bookingId: booking.id,
    actorName: user.name,
    actorRole: user.role,
    actorId: user.id,
    detail: `Booking ${booking.id} cancelled by ${user.name}.`,
  });

  // Promote top waitlisted booking if one exists for this resource
  const topWaitlist = db.prepare(`
    SELECT * FROM bookings
    WHERE resource_id = ? AND status = 'WAITLISTED'
    ORDER BY waitlist_position ASC LIMIT 1
  `).get(booking.resourceId) as Record<string, any> | undefined;

  if (topWaitlist) {
    const promoTimeline = JSON.parse(topWaitlist.timeline || '[]');
    promoTimeline.push({
      id: `tl_${Date.now()}_promo`,
      title: 'Promoted from Waiting List',
      description: 'A reservation slot opened up due to cancellation. Promoted to active review status.',
      timestamp: new Date().toISOString(),
      actor: 'System Automated Scheduler',
      statusBadge: 'Promoted',
    });

    const newStatus = topWaitlist.approval_mode === 'MODE_C_INSTITUTION' ? 'PENDING_INSTITUTION_APPROVAL' : 'PENDING_OWNER_APPROVAL';

    db.prepare(`
      UPDATE bookings
      SET status = ?, waitlist_position = NULL, timeline = ?
      WHERE id = ?
    `).run(newStatus, JSON.stringify(promoTimeline), topWaitlist.id);

    // Decrement waitlist positions for remaining waitlisted bookings
    db.prepare(`
      UPDATE bookings
      SET waitlist_position = MAX(1, waitlist_position - 1)
      WHERE resource_id = ? AND status = 'WAITLISTED' AND id != ?
    `).run(booking.resourceId, topWaitlist.id);

    // Notify promoted applicant
    createNotification({
      userId: topWaitlist.seeker_id,
      title: 'Waitlist Promotion!',
      message: `A slot opened for ${topWaitlist.resource_title}! Your reservation has been escalated for approval.`,
      type: 'success',
      linkPage: 'bookings',
      bookingId: topWaitlist.id,
    });
  }

  // Notify owner
  createNotification({
    userId: booking.ownerId,
    title: 'Booking Cancelled',
    message: `${user.name} cancelled reservation for ${booking.resourceTitle}.`,
    type: 'warning',
    linkPage: 'approvals',
    bookingId: booking.id,
  });

  res.json({
    success: true,
    message: 'Booking cancelled successfully.',
  });
});

// POST /api/v1/bookings/:id/check-in
router.post('/:id/check-in', authenticateToken, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const { condition, rating, checklist, notes, signature } = req.body;

  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) as Record<string, any> | undefined;
  if (!row) {
    res.status(404).json({
      success: false,
      error: 'BOOKING_NOT_FOUND',
      message: `Booking '${req.params.id}' was not found.`,
    });
    return;
  }

  const booking = formatBookingRow(row);
  const userRole = user.role.toUpperCase();

  // Validate state
  if (booking.status !== 'APPROVED' && booking.status !== 'approved') {
    res.status(400).json({
      success: false,
      error: 'INVALID_STATUS_FOR_CHECKIN',
      message: `Only confirmed/approved reservations can be checked in. Current status: ${booking.status}`,
    });
    return;
  }

  // Guard against duplicate check-in
  if (booking.checkIn) {
    res.status(400).json({
      success: false,
      error: 'ALREADY_CHECKED_IN',
      message: 'This booking has already completed initial check-in.',
    });
    return;
  }

  // Validate actor
  const isBorrower = booking.seekerId === user.id;
  const isOwner = booking.ownerId === user.id;
  const isAdmin = userRole === 'ADMIN';

  if (!isBorrower && !isOwner && !isAdmin) {
    res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Only the authorized borrower, custodian, or administrator can execute check-in.',
    });
    return;
  }

  if (!signature || !String(signature).trim()) {
    res.status(400).json({
      success: false,
      error: 'SIGNATURE_REQUIRED',
      message: 'Digital verification signature is mandatory for custody handover.',
    });
    return;
  }

  const timestamp = new Date().toISOString();
  const checkInDetails = {
    timestamp,
    actor: user.name,
    condition: condition || 'Pristine',
    rating: Number(rating) || 5,
    checklist: checklist || { powerCord: true, probesOrCables: true, calibrationIntact: true, screenClean: true },
    notes: notes ? String(notes).trim() : 'Pre-use condition inspected and approved.',
    signature: String(signature).trim(),
  };

  const timeline = [...booking.timeline, {
    id: `tl_${Date.now()}_checkin`,
    title: 'Check-In & Initial Condition Verified',
    description: `Initial condition certified as '${checkInDetails.condition}' (${checkInDetails.rating}/5). Signed by ${checkInDetails.signature}.`,
    timestamp,
    actor: user.name,
    statusBadge: 'Checked In',
  }];

  db.prepare(`
    UPDATE bookings
    SET status = 'CHECKED_OUT', check_in = ?, timeline = ?
    WHERE id = ?
  `).run(JSON.stringify(checkInDetails), JSON.stringify(timeline), booking.id);

  // Update resource status to In Use
  db.prepare(`
    UPDATE resources
    SET status = 'In Use', total_bookings_count = total_bookings_count + 1
    WHERE id = ?
  `).run(booking.resourceId);

  createAuditEntry({
    actionType: 'CHECK_IN_COMPLETED',
    resourceId: booking.resourceId,
    resourceTitle: booking.resourceTitle,
    bookingId: booking.id,
    actorName: user.name,
    actorRole: user.role,
    actorId: user.id,
    detail: `Check-in completed. Condition recorded as ${checkInDetails.condition} (${checkInDetails.rating}/5). Digital sign: ${checkInDetails.signature}.`,
  });

  createNotification({
    userId: booking.ownerId,
    title: 'Equipment In Use',
    message: `${user.name} checked in ${booking.resourceTitle}. Condition reported: ${checkInDetails.condition}.`,
    type: 'info',
    linkPage: 'approvals',
    bookingId: booking.id,
  });

  const updatedRow = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id) as Record<string, any>;
  res.json({
    success: true,
    message: 'Check-in completed successfully. Asset is now in active loan.',
    booking: formatBookingRow(updatedRow),
  });
});

// POST /api/v1/bookings/:id/return
router.post('/:id/return', authenticateToken, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const { condition, rating, checklist, notes, signature, fileIncidentReport, incidentDescription } = req.body;

  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) as Record<string, any> | undefined;
  if (!row) {
    res.status(404).json({
      success: false,
      error: 'BOOKING_NOT_FOUND',
      message: `Booking '${req.params.id}' was not found.`,
    });
    return;
  }

  const booking = formatBookingRow(row);
  const userRole = user.role.toUpperCase();

  // Validate state
  if (booking.status !== 'CHECKED_OUT' && booking.status !== 'in_use') {
    res.status(400).json({
      success: false,
      error: 'INVALID_STATUS_FOR_RETURN',
      message: `Only actively checked-out loans can be returned. Current status: ${booking.status}`,
    });
    return;
  }

  // Guard against duplicate return
  if (booking.returnCheckOut) {
    res.status(400).json({
      success: false,
      error: 'ALREADY_RETURNED',
      message: 'This booking has already been returned and finalized.',
    });
    return;
  }

  const isBorrower = booking.seekerId === user.id;
  const isOwner = booking.ownerId === user.id;
  const isAdmin = userRole === 'ADMIN';

  if (!isBorrower && !isOwner && !isAdmin) {
    res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Only the borrower, custodian, or administrator can execute return.',
    });
    return;
  }

  if (!signature || !String(signature).trim()) {
    res.status(400).json({
      success: false,
      error: 'SIGNATURE_REQUIRED',
      message: 'Digital return sign-off is mandatory.',
    });
    return;
  }

  const timestamp = new Date().toISOString();
  const numRating = Number(rating) || 5;
  const condText = condition || 'Pristine';
  const isDamaged = numRating <= 2 || condText.toLowerCase().includes('damaged') || Boolean(fileIncidentReport);

  const returnDetails = {
    timestamp,
    actor: user.name,
    condition: condText,
    rating: numRating,
    checklist: checklist || { cleaned: true, accessoriesIntact: true, poweredDown: true },
    notes: notes ? String(notes).trim() : 'Loan concluded, instrument returned.',
    signature: String(signature).trim(),
  };

  const timeline = [...booking.timeline, {
    id: `tl_${Date.now()}_return`,
    title: 'Equipment Returned & Final Condition Verified',
    description: `Final return certified as '${returnDetails.condition}' (${returnDetails.rating}/5). Signed: ${returnDetails.signature}.`,
    timestamp,
    actor: user.name,
    statusBadge: 'Completed',
  }];

  db.prepare(`
    UPDATE bookings
    SET status = 'RETURNED', return_checkout = ?, timeline = ?
    WHERE id = ?
  `).run(JSON.stringify(returnDetails), JSON.stringify(timeline), booking.id);

  // Update resource status
  const newResStatus = isDamaged ? 'Maintenance' : 'Available';
  const newCondStatus = isDamaged ? 'Under Inspection' : 'Pristine';

  db.prepare(`
    UPDATE resources
    SET status = ?, condition_status = ?
    WHERE id = ?
  `).run(newResStatus, newCondStatus, booking.resourceId);

  // File incident if damage reported
  if (isDamaged && incidentDescription) {
    const incId = `inc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO incidents (id, resource_id, resource_title, reported_by, reporter_role, booking_id, title, description, severity, status, created_at, resolution_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      incId,
      booking.resourceId,
      booking.resourceTitle,
      user.name,
      user.title || user.role,
      booking.id,
      `Return Discrepancy: ${booking.resourceTitle}`,
      String(incidentDescription).trim(),
      numRating <= 1 ? 'Critical' : 'High',
      'Open',
      timestamp,
      null
    );

    createAuditEntry({
      actionType: 'INCIDENT_FILED',
      resourceId: booking.resourceId,
      resourceTitle: booking.resourceTitle,
      bookingId: booking.id,
      actorName: user.name,
      actorRole: user.role,
      actorId: user.id,
      detail: `Incident filed on return: Discrepancy reported (${condText}, ${numRating}/5).`,
    });
  }

  createAuditEntry({
    actionType: 'RETURN_COMPLETED',
    resourceId: booking.resourceId,
    resourceTitle: booking.resourceTitle,
    bookingId: booking.id,
    actorName: user.name,
    actorRole: user.role,
    actorId: user.id,
    detail: `Return completed. Condition: ${condText} (${numRating}/5). Resource status set to ${newResStatus}.`,
  });

  createNotification({
    userId: booking.ownerId,
    title: 'Equipment Returned',
    message: `${user.name} returned ${booking.resourceTitle}. Condition: ${condText}.`,
    type: isDamaged ? 'warning' : 'success',
    linkPage: 'approvals',
    bookingId: booking.id,
  });

  const updatedRow = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id) as Record<string, any>;
  res.json({
    success: true,
    message: 'Equipment return completed and verified.',
    booking: formatBookingRow(updatedRow),
  });
});

// POST /api/v1/bookings/:id/respond-info
router.post('/:id/respond-info', authenticateToken, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const { response } = req.body;

  if (!response || !String(response).trim()) {
    res.status(400).json({
      success: false,
      error: 'RESPONSE_REQUIRED',
      message: 'Please provide a response to the information inquiry.',
    });
    return;
  }

  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) as Record<string, any> | undefined;
  if (!row) {
    res.status(404).json({
      success: false,
      error: 'BOOKING_NOT_FOUND',
      message: `Booking '${req.params.id}' was not found.`,
    });
    return;
  }

  const booking = formatBookingRow(row);
  if (booking.seekerId !== user.id && user.role.toUpperCase() !== 'ADMIN') {
    res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Only the applicant can respond to this inquiry.',
    });
    return;
  }

  if (!booking.infoRequest) {
    res.status(400).json({
      success: false,
      error: 'NO_OPEN_INQUIRY',
      message: 'There is no pending information request on this booking.',
    });
    return;
  }

  const timestamp = new Date().toISOString();
  const updatedInfoRequest = {
    ...booking.infoRequest,
    response: String(response).trim(),
    respondedAt: timestamp,
  };

  const timeline = [...booking.timeline, {
    id: `tl_${Date.now()}_info_resp`,
    title: 'Information Provided by Applicant',
    description: `Response: "${String(response).trim()}"`,
    timestamp,
    actor: user.name,
    statusBadge: 'Info Responded',
  }];

  db.prepare(`
    UPDATE bookings SET info_request = ?, timeline = ? WHERE id = ?
  `).run(JSON.stringify(updatedInfoRequest), JSON.stringify(timeline), booking.id);

  createAuditEntry({
    actionType: 'INFO_RESPONDED',
    resourceId: booking.resourceId,
    resourceTitle: booking.resourceTitle,
    bookingId: booking.id,
    actorName: user.name,
    actorRole: user.role,
    actorId: user.id,
    detail: `Applicant provided clarification: "${String(response).trim()}".`,
  });

  createNotification({
    userId: booking.ownerId,
    title: 'Information Response Received',
    message: `${user.name} answered your inquiry on ${booking.resourceTitle}.`,
    type: 'info',
    linkPage: 'approvals',
    bookingId: booking.id,
  });

  const updatedRow = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id) as Record<string, any>;
  res.json({
    success: true,
    message: 'Response recorded successfully.',
    booking: formatBookingRow(updatedRow),
  });
});

export default router;
