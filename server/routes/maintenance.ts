import { Router } from 'express';
import {
  db,
  formatMaintenanceRow,
  createAuditEntry,
  createNotification,
} from '../db.ts';
import {
  authenticateToken,
  requireRoles,
  type AuthenticatedRequest,
} from '../auth.ts';

const router = Router();

// GET /api/v1/maintenance/:id
router.get('/:id', (req, res): void => {
  const row = db.prepare('SELECT * FROM maintenance_records WHERE id = ?').get(req.params.id) as Record<string, any> | undefined;
  if (!row) {
    res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Maintenance record not found.' });
    return;
  }
  res.json({ success: true, record: formatMaintenanceRow(row) });
});

// PATCH /api/v1/maintenance/:id
// Complete or update maintenance status (Section 11)
router.patch(
  '/:id',
  authenticateToken,
  requireRoles(['RESOURCE_OWNER', 'INSTITUTION_MANAGER', 'ADMIN']),
  (req: AuthenticatedRequest, res): void => {
    const user = req.user!;
    const row = db.prepare('SELECT * FROM maintenance_records WHERE id = ?').get(req.params.id) as Record<string, any> | undefined;
    if (!row) {
      res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Maintenance record not found.' });
      return;
    }

    const { status, notes, completedAt } = req.body;
    const currentStatus = row.status;
    const newStatus = status ? String(status).toUpperCase() : currentStatus;
    const updatedNotes = notes !== undefined ? String(notes).trim() : row.notes;
    const completionTimestamp = newStatus === 'COMPLETED' ? (completedAt || new Date().toISOString()) : row.completed_at;

    db.prepare(`
      UPDATE maintenance_records
      SET status = ?, notes = ?, completed_at = ?
      WHERE id = ?
    `).run(newStatus, updatedNotes, completionTimestamp, req.params.id);

    // If marked COMPLETED, check if resource should be returned to Available
    if (newStatus === 'COMPLETED') {
      const activePendingMaint = db.prepare(`
        SELECT COUNT(*) as count FROM maintenance_records
        WHERE resource_id = ? AND id != ? AND status IN ('SCHEDULED', 'IN_PROGRESS')
      `).get(row.resource_id, row.id) as { count: number };

      if (activePendingMaint.count === 0) {
        db.prepare(`
          UPDATE resources
          SET status = 'Available', condition_status = 'Calibrated', condition_score = 100
          WHERE id = ?
        `).run(row.resource_id);
      }
    }

    createAuditEntry({
      actionType: 'MAINTENANCE_UPDATED',
      resourceId: row.resource_id,
      actorName: user.name,
      actorRole: user.role,
      actorId: user.id,
      detail: `Maintenance record ${row.id} transitioned from ${currentStatus} to ${newStatus}. Notes: ${updatedNotes || 'None'}`,
    });

    const updated = db.prepare('SELECT * FROM maintenance_records WHERE id = ?').get(req.params.id) as Record<string, any>;
    res.json({
      success: true,
      message: `Maintenance status updated to ${newStatus}.`,
      record: formatMaintenanceRow(updated),
    });
  }
);

export default router;
