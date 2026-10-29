import { Router } from 'express';
import {
  db,
  formatConditionReportRow,
  createAuditEntry,
  createNotification,
} from '../db.ts';
import { authenticateToken, type AuthenticatedRequest } from '../auth.ts';

const router = Router({ mergeParams: true });

// GET /api/v1/bookings/:id/condition-reports
router.get('/:bookingId/condition-reports', (req, res): void => {
  const bookingId = req.params.bookingId;
  const rows = db.prepare(`
    SELECT * FROM condition_reports
    WHERE booking_id = ?
    ORDER BY created_at ASC
  `).all(bookingId) as Record<string, any>[];

  res.json({
    success: true,
    bookingId,
    total: rows.length,
    reports: rows.map((r) => formatConditionReportRow(r)),
  });
});

// POST /api/v1/bookings/:id/condition-reports
router.post('/:bookingId/condition-reports', authenticateToken, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const bookingId = req.params.bookingId;
  const {
    reportType = 'CHECK_IN',
    rating = 5,
    conditionSummary,
    checklist = {},
    notes,
    signature,
    evidenceReferences = [],
  } = req.body;

  if (!conditionSummary || !String(conditionSummary).trim()) {
    res.status(400).json({
      success: false,
      error: 'MISSING_SUMMARY',
      message: 'A descriptive condition summary is required.',
    });
    return;
  }

  // Verify booking exists
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as Record<string, any> | undefined;
  if (!booking) {
    res.status(404).json({
      success: false,
      error: 'BOOKING_NOT_FOUND',
      message: `Booking '${bookingId}' not found.`,
    });
    return;
  }

  // Authorization check: User must be seeker, owner, manager, or admin
  const isSeeker = user.id === booking.seeker_id;
  const isOwner = user.id === booking.owner_id;
  const isManagerOrAdmin = user.role === 'INSTITUTION_MANAGER' || user.role === 'ADMIN';

  if (!isSeeker && !isOwner && !isManagerOrAdmin) {
    res.status(403).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'You are not authorized to submit condition reports for this reservation.',
    });
    return;
  }

  const reportId = `cr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const cleanRating = Math.max(1, Math.min(5, Number(rating) || 5));
  const validReportType = ['CHECK_IN', 'CHECK_OUT', 'INSPECTION'].includes(String(reportType).toUpperCase())
    ? String(reportType).toUpperCase()
    : 'CHECK_IN';

  const checklistJson = JSON.stringify(checklist);
  const evidenceJson = JSON.stringify(Array.isArray(evidenceReferences) ? evidenceReferences : []);

  db.prepare(`
    INSERT INTO condition_reports (
      id, resource_id, booking_id, report_type, rating, condition_summary,
      checklist, notes, signature, evidence_references, submitted_by,
      reviewed_by, review_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    reportId,
    booking.resource_id,
    booking.id,
    validReportType,
    cleanRating,
    String(conditionSummary).trim(),
    checklistJson,
    notes ? String(notes).trim() : null,
    signature ? String(signature).trim() : user.name,
    evidenceJson,
    user.name,
    null,
    'SUBMITTED'
  );

  // If rating is below 3 or checkout reports damage, update resource condition score
  if (cleanRating <= 2) {
    const penaltyScore = cleanRating === 1 ? 50 : 75;
    db.prepare(`
      UPDATE resources
      SET condition_score = MIN(condition_score, ?),
          condition_status = 'Under Inspection'
      WHERE id = ?
    `).run(penaltyScore, booking.resource_id);
  }

  // Create audit entry
  createAuditEntry({
    actionType: 'CONDITION_REPORTED',
    resourceId: booking.resource_id,
    resourceTitle: booking.resource_title,
    bookingId: booking.id,
    actorName: user.name,
    actorRole: user.role,
    actorId: user.id,
    detail: `Submitted ${validReportType} condition report (${cleanRating}/5 stars): "${conditionSummary}".`,
  });

  // Notify resource owner if submitted by seeker
  if (isSeeker && user.id !== booking.owner_id) {
    createNotification({
      userId: booking.owner_id,
      title: `Condition Report Filed: ${booking.resource_title}`,
      message: `${user.name} filed a ${validReportType} condition certification (${cleanRating}/5).`,
      type: cleanRating <= 2 ? 'alert' : 'info',
      linkPage: 'resources',
      bookingId: booking.id,
    });
  }

  const created = db.prepare('SELECT * FROM condition_reports WHERE id = ?').get(reportId) as Record<string, any>;

  res.status(201).json({
    success: true,
    message: 'Condition report recorded successfully.',
    report: formatConditionReportRow(created),
  });
});

export default router;
