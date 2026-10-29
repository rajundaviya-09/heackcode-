import { Router } from 'express';
import {
  db,
  formatWaitingListRow,
  createAuditEntry,
  createNotification,
} from '../db.ts';
import { authenticateToken, type AuthenticatedRequest } from '../auth.ts';

const router = Router();

// GET /api/v1/resources/:id/waiting-list
router.get('/resources/:resourceId/waiting-list', (req, res): void => {
  const resourceId = req.params.resourceId;
  const rows = db.prepare(`
    SELECT * FROM waiting_list
    WHERE resource_id = ? AND status = 'WAITING'
    ORDER BY position ASC, created_at ASC
  `).all(resourceId) as Record<string, any>[];

  res.json({
    success: true,
    resourceId,
    totalWaiting: rows.length,
    waitingList: rows.map((r) => formatWaitingListRow(r)),
  });
});

// POST /api/v1/resources/:id/waiting-list
// Enrolls authenticated user onto the waitlist for an unavailable or in-demand resource
router.post('/resources/:resourceId/waiting-list', authenticateToken, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const resourceId = req.params.resourceId;
  const { requestedStartDate, requestedEndDate, purpose } = req.body;

  if (!requestedStartDate || !requestedEndDate || !purpose) {
    res.status(400).json({
      success: false,
      error: 'MISSING_FIELDS',
      message: 'Start date, end date, and purpose are required to join the waiting list.',
    });
    return;
  }

  // 1. Verify resource exists and is active
  const resRow = db.prepare('SELECT * FROM resources WHERE id = ?').get(resourceId) as Record<string, any> | undefined;
  if (!resRow) {
    res.status(404).json({
      success: false,
      error: 'RESOURCE_NOT_FOUND',
      message: 'Target resource does not exist.',
    });
    return;
  }

  // 2. Eligibility & safety clearance check
  if (user.safetyLevel < resRow.safety_level_required) {
    res.status(403).json({
      success: false,
      error: 'INSUFFICIENT_SAFETY_CLEARANCE',
      message: `Resource requires Safety Level ${resRow.safety_level_required}. Your account has Safety Level ${user.safetyLevel}.`,
    });
    return;
  }

  if (!resRow.allow_external_users && user.institutionId !== resRow.institution_id) {
    res.status(403).json({
      success: false,
      error: 'INSTITUTION_RESTRICTED',
      message: `This resource is restricted to researchers affiliated with ${resRow.institution_name}.`,
    });
    return;
  }

  // 3. Check for existing active waiting list entry for this user and resource
  const existingWait = db.prepare(`
    SELECT * FROM waiting_list
    WHERE resource_id = ? AND user_id = ? AND status = 'WAITING'
  `).get(resourceId, user.id);

  if (existingWait) {
    res.status(409).json({
      success: false,
      error: 'DUPLICATE_WAITLIST_ENTRY',
      message: 'You already hold an active waitlist queue position for this resource.',
    });
    return;
  }

  // 4. Calculate next queue position
  const maxPosRow = db.prepare(`
    SELECT COALESCE(MAX(position), 0) as max_pos
    FROM waiting_list
    WHERE resource_id = ? AND status = 'WAITING'
  `).get(resourceId) as { max_pos: number };

  const nextPosition = maxPosRow.max_pos + 1;
  const waitlistId = `wait_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO waiting_list (id, resource_id, user_id, requested_start_date, requested_end_date, purpose, status, position, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    waitlistId,
    resourceId,
    user.id,
    requestedStartDate,
    requestedEndDate,
    String(purpose).trim(),
    'WAITING',
    nextPosition,
    now
  );

  createAuditEntry({
    actionType: 'WAITLIST_JOINED',
    resourceId: resRow.id,
    resourceTitle: resRow.title,
    actorName: user.name,
    actorRole: user.role,
    actorId: user.id,
    detail: `Joined waiting list at queue position #${nextPosition} for "${purpose}".`,
  });

  createNotification({
    userId: user.id,
    title: 'Waitlist Position Confirmed',
    message: `You are queue position #${nextPosition} for ${resRow.title}. You will be notified when a slot opens.`,
    type: 'info',
    linkPage: 'resources',
  });

  const created = db.prepare('SELECT * FROM waiting_list WHERE id = ?').get(waitlistId) as Record<string, any>;

  res.status(201).json({
    success: true,
    message: `Enrolled on waiting list at position #${nextPosition}.`,
    entry: formatWaitingListRow(created),
  });
});

// DELETE /api/v1/waiting-list/:id
// Cancels waitlist entry and recalculates positions of remaining queue members
router.delete('/waiting-list/:id', authenticateToken, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const waitlistId = req.params.id;

  const entry = db.prepare('SELECT * FROM waiting_list WHERE id = ?').get(waitlistId) as Record<string, any> | undefined;
  if (!entry) {
    res.status(404).json({
      success: false,
      error: 'ENTRY_NOT_FOUND',
      message: 'Waitlist entry not found.',
    });
    return;
  }

  // Authorization: must be owner of entry, manager, or admin
  const isOwner = user.id === entry.user_id;
  const isManagerOrAdmin = user.role === 'INSTITUTION_MANAGER' || user.role === 'ADMIN';

  if (!isOwner && !isManagerOrAdmin) {
    res.status(403).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'You are not authorized to cancel this waitlist entry.',
    });
    return;
  }

  const cancelledPos = entry.position;
  const resourceId = entry.resource_id;

  // Mark status as CANCELLED
  db.prepare("UPDATE waiting_list SET status = 'CANCELLED' WHERE id = ?").run(waitlistId);

  // Shift remaining positions down transactionally
  db.prepare(`
    UPDATE waiting_list
    SET position = position - 1
    WHERE resource_id = ? AND status = 'WAITING' AND position > ?
  `).run(resourceId, cancelledPos);

  createAuditEntry({
    actionType: 'WAITLIST_CANCELLED',
    resourceId,
    actorName: user.name,
    actorRole: user.role,
    actorId: user.id,
    detail: `Cancelled waitlist position #${cancelledPos} for entry ${waitlistId}.`,
  });

  res.json({
    success: true,
    message: 'Waitlist reservation cancelled and queue positions updated.',
  });
});

export default router;
