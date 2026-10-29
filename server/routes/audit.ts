import { Router } from 'express';
import { db } from '../db.ts';

const router = Router();

// GET /api/v1/audit-logs
router.get('/', (_req, res): void => {
  const rows = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC').all() as Record<string, any>[];
  const auditLogs = rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    actionType: r.action_type,
    resourceId: r.resource_id || undefined,
    resourceTitle: r.resource_title || undefined,
    bookingId: r.booking_id || undefined,
    actorName: r.actor_name,
    actorRole: r.actor_role,
    actorId: r.actor_id || undefined,
    detail: r.detail,
    hash: r.hash,
  }));

  res.json({
    success: true,
    auditLogs,
  });
});

export default router;
