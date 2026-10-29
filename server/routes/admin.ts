import { Router } from 'express';
import { seedDatabase, createAuditEntry } from '../db.ts';
import { optionalAuth, type AuthenticatedRequest } from '../auth.ts';

const router = Router();

// POST /api/v1/admin/reset
router.post('/reset', optionalAuth, (req: AuthenticatedRequest, res): void => {
  seedDatabase(true);

  const actorName = req.user?.name || 'System / Sandbox Administrator';
  const actorRole = req.user?.role || 'ADMIN';
  const actorId = req.user?.id || 'usr_admin_elena';

  createAuditEntry({
    actionType: 'SYSTEM_RESET',
    actorName,
    actorRole,
    actorId,
    detail: 'Institutional demo sandbox database restored to factory default seed state.',
  });

  res.json({
    success: true,
    message: 'Institutional sandbox and SQLite database reset to factory defaults.',
  });
});

export default router;
