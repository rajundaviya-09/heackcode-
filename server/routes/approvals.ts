import { Router } from 'express';
import {
  db,
  formatBookingRow,
  createAuditEntry,
  createNotification,
} from '../db.ts';
import {
  authenticateToken,
  type AuthenticatedRequest,
} from '../auth.ts';

const router = Router();

// GET /api/v1/approvals
router.get('/', authenticateToken, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const userRole = user.role.toUpperCase();

  if (userRole === 'RESOURCE_SEEKER') {
    res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Resource Seekers do not have permission to view the approvals queue.',
    });
    return;
  }

  const { tab, institutionId, resourceId } = req.query;

  let query = 'SELECT * FROM bookings WHERE 1=1';
  const params: any[] = [];

  // Reviewer Scoping
  if (userRole === 'RESOURCE_OWNER') {
    query += ' AND owner_id = ?';
    params.push(user.id);
  } else if (userRole === 'INSTITUTION_MANAGER') {
    query += ' AND institution_id = ?';
    params.push(user.institutionId);
  } // ADMIN sees all

  if (resourceId) {
    query += ' AND resource_id = ?';
    params.push(resourceId);
  }

  if (institutionId && userRole === 'ADMIN') {
    query += ' AND institution_id = ?';
    params.push(institutionId);
  }

  if (tab === 'pending') {
    query += ` AND status IN ('PENDING', 'PENDING_OWNER_APPROVAL', 'PENDING_INSTITUTION_APPROVAL')`;
  } else if (tab === 'approved') {
    query += ` AND status IN ('APPROVED', 'CHECKED_OUT', 'RETURNED', 'in_use', 'completed', 'approved')`;
  } else if (tab === 'rejected') {
    query += ` AND status = 'REJECTED'`;
  }

  query += ' ORDER BY created_at DESC';

  const rows = db.prepare(query).all(...params) as Record<string, any>[];
  const bookings = rows.map((r) => formatBookingRow(r));

  res.json({
    success: true,
    bookings,
  });
});

// POST /api/v1/approvals/:id/approve
router.post('/:id/approve', authenticateToken, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const userRole = user.role.toUpperCase();
  const { notes } = req.body;

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

  // Security Rule 1: A requester cannot approve their own booking request!
  if (booking.seekerId === user.id) {
    res.status(403).json({
      success: false,
      error: 'SELF_APPROVAL_PROHIBITED',
      message: 'Access denied: Requesters cannot approve their own booking requests.',
    });
    return;
  }

  const timestamp = new Date().toISOString();
  let nextStatus = booking.status;
  const timeline = [...booking.timeline];
  let ownerApproval = booking.ownerApproval;
  let institutionApproval = booking.institutionApproval;
  let approvedBy = booking.approvedBy;
  let approvedAt = booking.approvedAt;

  // Check stage and permissions
  if (booking.status === 'PENDING_OWNER_APPROVAL' || booking.status === 'PENDING') {
    // Only designated Resource Owner or Admin
    if (booking.ownerId !== user.id && userRole !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN_STAGE_OWNER',
        message: 'Only the designated Resource Custodian can grant custodian approval for this request.',
      });
      return;
    }

    ownerApproval = {
      status: 'APPROVED',
      decidedBy: user.name,
      decidedAt: timestamp,
      notes: notes ? String(notes).trim() : 'Custodian approval granted after safety verification.',
    };

    if (booking.approvalMode === 'MODE_D_MULTI_STAGE') {
      // Escalates to Stage 2: Institution Approval
      nextStatus = 'PENDING_INSTITUTION_APPROVAL';
      timeline.push({
        id: `tl_${Date.now()}_stage1`,
        title: 'Stage 1 Approved: Resource Custodian',
        description: `Approved by Custodian ${user.name}. Escalated to College Dean / Institution Manager for final sign-off.`,
        timestamp,
        actor: user.name,
        statusBadge: 'Custodian Approved',
      });

      // Notify Institution Managers of that institution
      const instManagers = db.prepare(`
        SELECT id FROM users WHERE role = 'INSTITUTION_MANAGER' AND institution_id = ?
      `).all(booking.institutionId) as { id: string }[];

      for (const mgr of instManagers) {
        createNotification({
          userId: mgr.id,
          title: 'Institutional Approval Required',
          message: `${booking.seekerName}'s request for ${booking.resourceTitle} passed Custodian sign-off and requires Dean review.`,
          type: 'warning',
          linkPage: 'approvals',
          bookingId: booking.id,
        });
      }

      // Notify Seeker of progress
      createNotification({
        userId: booking.seekerId,
        title: 'Stage 1 Approved',
        message: `Your booking for ${booking.resourceTitle} passed Custodian approval. Final College Dean sign-off is pending.`,
        type: 'info',
        linkPage: 'bookings',
        bookingId: booking.id,
      });

      createAuditEntry({
        actionType: 'OWNER_APPROVED',
        resourceId: booking.resourceId,
        resourceTitle: booking.resourceTitle,
        bookingId: booking.id,
        actorName: user.name,
        actorRole: user.role,
        actorId: user.id,
        detail: `Stage 1 Custodian approval granted for ${booking.seekerName} on ${booking.resourceTitle}. Escalated to Institution Manager.`,
      });
    } else {
      // MODE_B_OWNER: Final Approval
      nextStatus = 'APPROVED';
      approvedBy = user.name;
      approvedAt = timestamp;
      timeline.push({
        id: `tl_${Date.now()}_app_owner`,
        title: 'Booking Approved by Custodian',
        description: `Approved by ${user.name} (${user.title || user.role}). Resource cleared for pickup/check-in.`,
        timestamp,
        actor: user.name,
        statusBadge: 'Approved',
      });

      createNotification({
        userId: booking.seekerId,
        title: 'Booking Approved!',
        message: `Your reservation for ${booking.resourceTitle} has been approved by ${user.name}. Ready for check-in.`,
        type: 'success',
        linkPage: 'bookings',
        bookingId: booking.id,
      });

      createAuditEntry({
        actionType: 'BOOKING_APPROVED',
        resourceId: booking.resourceId,
        resourceTitle: booking.resourceTitle,
        bookingId: booking.id,
        actorName: user.name,
        actorRole: user.role,
        actorId: user.id,
        detail: `Final booking approval granted for ${booking.seekerName} on ${booking.resourceTitle}.`,
      });
    }
  } else if (booking.status === 'PENDING_INSTITUTION_APPROVAL') {
    // Only authorized Institution Manager for THIS institution, or Admin
    if (userRole !== 'ADMIN') {
      if (userRole !== 'INSTITUTION_MANAGER') {
        res.status(403).json({
          success: false,
          error: 'FORBIDDEN_INSTITUTION_MANAGER',
          message: 'Only authorized Institution Managers can approve institution-level requests.',
        });
        return;
      }

      if (user.institutionId !== booking.institutionId) {
        res.status(403).json({
          success: false,
          error: 'INSTITUTION_SCOPE_MISMATCH',
          message: `Cross-institution authorization denied. You can only approve requests for your assigned institution (${user.institutionName}).`,
        });
        return;
      }
    }

    institutionApproval = {
      status: 'APPROVED',
      decidedBy: user.name,
      decidedAt: timestamp,
      notes: notes ? String(notes).trim() : 'Institutional facility allocation authorized.',
    };

    nextStatus = 'APPROVED';
    approvedBy = user.name;
    approvedAt = timestamp;

    timeline.push({
      id: `tl_${Date.now()}_app_inst`,
      title: 'Institutional Sign-off Granted',
      description: `Institutional authorization granted by ${user.name} (${user.institutionName}). Ready for check-in.`,
      timestamp,
      actor: user.name,
      statusBadge: 'Approved',
    });

    createNotification({
      userId: booking.seekerId,
      title: 'Institutional Allocation Approved!',
      message: `Your booking for ${booking.resourceTitle} has received final institutional sign-off. Ready for check-in.`,
      type: 'success',
      linkPage: 'bookings',
      bookingId: booking.id,
    });

    createAuditEntry({
      actionType: 'INSTITUTION_APPROVED',
      resourceId: booking.resourceId,
      resourceTitle: booking.resourceTitle,
      bookingId: booking.id,
      actorName: user.name,
      actorRole: user.role,
      actorId: user.id,
      detail: `Institutional sign-off finalized for ${booking.seekerName} on ${booking.resourceTitle} by ${user.name}.`,
    });
  } else {
    res.status(400).json({
      success: false,
      error: 'INVALID_STATUS_FOR_APPROVAL',
      message: `Booking is not currently in a pending approval stage (current status: ${booking.status}).`,
    });
    return;
  }

  // Update SQLite
  db.prepare(`
    UPDATE bookings
    SET status = ?, owner_approval = ?, institution_approval = ?, approved_at = ?, approved_by = ?, timeline = ?
    WHERE id = ?
  `).run(
    nextStatus,
    ownerApproval ? JSON.stringify(ownerApproval) : null,
    institutionApproval ? JSON.stringify(institutionApproval) : null,
    approvedAt || null,
    approvedBy || null,
    JSON.stringify(timeline),
    booking.id
  );

  const updatedRow = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id) as Record<string, any>;
  res.json({
    success: true,
    message: nextStatus === 'PENDING_INSTITUTION_APPROVAL'
      ? 'Stage 1 Custodian approval granted. Escalated to Institution Manager.'
      : 'Booking approval finalized.',
    booking: formatBookingRow(updatedRow),
  });
});

// POST /api/v1/approvals/:id/reject
router.post('/:id/reject', authenticateToken, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const userRole = user.role.toUpperCase();
  const { reason } = req.body;

  if (!reason || !String(reason).trim()) {
    res.status(400).json({
      success: false,
      error: 'REASON_REQUIRED',
      message: 'A specific justification reason is mandatory when declining a booking request.',
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

  if (booking.seekerId === user.id) {
    res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Requesters cannot reject their own requests. Please use cancel.',
    });
    return;
  }

  // Check stage permissions
  if (booking.status === 'PENDING_OWNER_APPROVAL' || booking.status === 'PENDING') {
    if (booking.ownerId !== user.id && userRole !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN_STAGE_OWNER',
        message: 'Only the designated Resource Custodian can decline requests in owner-stage review.',
      });
      return;
    }
  } else if (booking.status === 'PENDING_INSTITUTION_APPROVAL') {
    if (userRole !== 'ADMIN') {
      if (userRole !== 'INSTITUTION_MANAGER' || user.institutionId !== booking.institutionId) {
        res.status(403).json({
          success: false,
          error: 'FORBIDDEN_INSTITUTION_MANAGER',
          message: 'Only the authorized Institution Manager for this facility can decline this request.',
        });
        return;
      }
    }
  } else {
    res.status(400).json({
      success: false,
      error: 'INVALID_STATUS_FOR_REJECTION',
      message: `Booking is not currently in a pending approval stage (current status: ${booking.status}).`,
    });
    return;
  }

  const timestamp = new Date().toISOString();
  const rejectionReason = String(reason).trim();
  const timeline = [...booking.timeline, {
    id: `tl_${Date.now()}_reject`,
    title: 'Booking Request Declined',
    description: `Declined by ${user.name} (${user.role}). Reason: "${rejectionReason}"`,
    timestamp,
    actor: user.name,
    statusBadge: 'Declined',
  }];

  db.prepare(`
    UPDATE bookings
    SET status = 'REJECTED', rejection_reason = ?, timeline = ?
    WHERE id = ?
  `).run(rejectionReason, JSON.stringify(timeline), booking.id);

  createAuditEntry({
    actionType: 'BOOKING_REJECTED',
    resourceId: booking.resourceId,
    resourceTitle: booking.resourceTitle,
    bookingId: booking.id,
    actorName: user.name,
    actorRole: user.role,
    actorId: user.id,
    detail: `Booking request declined by ${user.name}. Reason: "${rejectionReason}".`,
  });

  createNotification({
    userId: booking.seekerId,
    title: 'Booking Request Declined',
    message: `Your request for ${booking.resourceTitle} was declined. Reason: ${rejectionReason}`,
    type: 'alert',
    linkPage: 'bookings',
    bookingId: booking.id,
  });

  // Promote top waitlisted booking if any
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
      description: 'A slot opened following request rejection. Promoted to active review status.',
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

    db.prepare(`
      UPDATE bookings
      SET waitlist_position = MAX(1, waitlist_position - 1)
      WHERE resource_id = ? AND status = 'WAITLISTED' AND id != ?
    `).run(booking.resourceId, topWaitlist.id);

    createNotification({
      userId: topWaitlist.seeker_id,
      title: 'Waitlist Promotion!',
      message: `A slot opened for ${topWaitlist.resource_title}! Your reservation has been escalated for review.`,
      type: 'success',
      linkPage: 'bookings',
      bookingId: topWaitlist.id,
    });
  }

  const updatedRow = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id) as Record<string, any>;
  res.json({
    success: true,
    message: 'Booking request rejected with recorded justification.',
    booking: formatBookingRow(updatedRow),
  });
});

// POST /api/v1/approvals/:id/request-info
router.post('/:id/request-info', authenticateToken, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const userRole = user.role.toUpperCase();
  const { question } = req.body;

  if (!question || !String(question).trim()) {
    res.status(400).json({
      success: false,
      error: 'QUESTION_REQUIRED',
      message: 'Please provide the question or clarification required.',
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

  const isOwner = booking.ownerId === user.id;
  const isInstMgr = userRole === 'INSTITUTION_MANAGER' && booking.institutionId === user.institutionId;
  const isAdmin = userRole === 'ADMIN';

  if (!isOwner && !isInstMgr && !isAdmin) {
    res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Only the resource custodian or institution manager can request additional information.',
    });
    return;
  }

  const timestamp = new Date().toISOString();
  const cleanQuestion = String(question).trim();
  const infoRequest = {
    question: cleanQuestion,
    requestedBy: user.name,
    requestedAt: timestamp,
  };

  const timeline = [...booking.timeline, {
    id: `tl_${Date.now()}_info_req`,
    title: 'Additional Information Requested',
    description: `Reviewer inquiry from ${user.name}: "${cleanQuestion}"`,
    timestamp,
    actor: user.name,
    statusBadge: 'Info Requested',
  }];

  db.prepare(`
    UPDATE bookings SET info_request = ?, timeline = ? WHERE id = ?
  `).run(JSON.stringify(infoRequest), JSON.stringify(timeline), booking.id);

  createAuditEntry({
    actionType: 'INFO_REQUESTED',
    resourceId: booking.resourceId,
    resourceTitle: booking.resourceTitle,
    bookingId: booking.id,
    actorName: user.name,
    actorRole: user.role,
    actorId: user.id,
    detail: `Reviewer requested information: "${cleanQuestion}".`,
  });

  createNotification({
    userId: booking.seekerId,
    title: 'Action Required: Clarification Requested',
    message: `${user.name} asked for clarification regarding your booking on ${booking.resourceTitle}.`,
    type: 'warning',
    linkPage: 'bookings',
    bookingId: booking.id,
  });

  const updatedRow = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id) as Record<string, any>;
  res.json({
    success: true,
    message: 'Information request sent to applicant.',
    booking: formatBookingRow(updatedRow),
  });
});

export default router;
