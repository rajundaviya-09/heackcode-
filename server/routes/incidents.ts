import { Router } from 'express';
import { db, formatIncidentRow, createAuditEntry, createNotification } from '../db.ts';
import { authenticateToken, type AuthenticatedRequest } from '../auth.ts';

const router = Router();

// GET /api/v1/incidents
router.get('/', (_req, res): void => {
  const rows = db.prepare('SELECT * FROM incidents ORDER BY created_at DESC').all() as Record<string, any>[];
  const incidents = rows.map((r) => formatIncidentRow(r));
  res.json({
    success: true,
    incidents,
  });
});

// POST /api/v1/incidents
router.post('/', authenticateToken, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const { resourceId, title, description, severity, bookingId } = req.body;

  if (!resourceId || !title || !description || !severity) {
    res.status(400).json({
      success: false,
      error: 'MISSING_FIELDS',
      message: 'Resource ID, title, description, and severity are required.',
    });
    return;
  }

  const resRow = db.prepare('SELECT * FROM resources WHERE id = ?').get(resourceId) as Record<string, any> | undefined;
  if (!resRow) {
    res.status(404).json({
      success: false,
      error: 'RESOURCE_NOT_FOUND',
      message: `Resource '${resourceId}' not found.`,
    });
    return;
  }

  const incidentId = `inc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const timestamp = new Date().toISOString();

  db.prepare(`
    INSERT INTO incidents (id, resource_id, resource_title, reported_by, reporter_role, booking_id, title, description, severity, status, created_at, resolution_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    incidentId,
    resRow.id,
    resRow.title,
    user.name,
    user.title || user.role,
    bookingId || null,
    String(title).trim(),
    String(description).trim(),
    severity,
    'Open',
    timestamp,
    null
  );

  // If High or Critical, put resource in Maintenance
  if (severity === 'High' || severity === 'Critical') {
    db.prepare(`
      UPDATE resources SET status = 'Maintenance', condition_status = 'Under Inspection' WHERE id = ?
    `).run(resRow.id);
  }

  createAuditEntry({
    actionType: 'INCIDENT_FILED',
    resourceId: resRow.id,
    resourceTitle: resRow.title,
    bookingId: bookingId || undefined,
    actorName: user.name,
    actorRole: user.role,
    actorId: user.id,
    detail: `Incident reported: "${title}" (Severity: ${severity}).`,
  });

  createNotification({
    userId: resRow.owner_id,
    title: `Incident Filed: ${severity} Severity`,
    message: `${user.name} reported "${title}" on ${resRow.title}.`,
    type: 'alert',
    linkPage: 'incidents',
  });

  const created = db.prepare('SELECT * FROM incidents WHERE id = ?').get(incidentId) as Record<string, any>;
  res.status(201).json({
    success: true,
    message: 'Incident reported successfully.',
    incident: formatIncidentRow(created),
  });
});

// GET /api/v1/incidents/:id
router.get('/:id', (req, res): void => {
  const row = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id) as Record<string, any> | undefined;
  if (!row) {
    res.status(404).json({ success: false, error: 'INCIDENT_NOT_FOUND', message: 'Incident not found.' });
    return;
  }
  res.json({ success: true, incident: formatIncidentRow(row) });
});

// POST /api/v1/incidents/:id/review
// Authorized owner/manager/admin reviews and updates incident resolution status
router.post('/:id/review', authenticateToken, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const { status = 'Resolved', resolutionNotes } = req.body;

  const row = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id) as Record<string, any> | undefined;
  if (!row) {
    res.status(404).json({
      success: false,
      error: 'INCIDENT_NOT_FOUND',
      message: 'Incident not found.',
    });
    return;
  }

  const cleanStatus = ['Open', 'Under Review', 'Resolved', 'Dismissed'].includes(String(status))
    ? String(status)
    : 'Resolved';
  const notes = resolutionNotes ? String(resolutionNotes).trim() : `Reviewed and marked as ${cleanStatus}.`;

  db.prepare(`
    UPDATE incidents SET status = ?, resolution_notes = ? WHERE id = ?
  `).run(cleanStatus, notes, req.params.id);

  createAuditEntry({
    actionType: 'INCIDENT_RESOLVED',
    resourceId: row.resource_id,
    resourceTitle: row.resource_title,
    actorName: user.name,
    actorRole: user.role,
    actorId: user.id,
    detail: `Incident ${req.params.id} reviewed by ${user.name}. Status: ${cleanStatus}. Notes: ${notes}`,
  });

  const updated = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id) as Record<string, any>;
  res.json({
    success: true,
    message: `Incident status updated to ${cleanStatus}.`,
    incident: formatIncidentRow(updated),
  });
});

export default router;
