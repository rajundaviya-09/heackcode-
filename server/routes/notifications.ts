import { Router } from 'express';
import { db } from '../db.ts';
import { authenticateToken, type AuthenticatedRequest } from '../auth.ts';

const router = Router();

// GET /api/v1/notifications
router.get('/', authenticateToken, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const rows = db.prepare(`
    SELECT * FROM notifications WHERE user_id = ? ORDER BY timestamp DESC
  `).all(user.id) as Record<string, any>[];

  const notifications = rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    title: r.title,
    message: r.message,
    type: r.type,
    timestamp: r.timestamp,
    read: Boolean(r.read),
    linkPage: r.link_page || undefined,
    bookingId: r.booking_id || undefined,
  }));

  res.json({
    success: true,
    notifications,
  });
});

// PATCH /api/v1/notifications/:id/read
router.patch('/:id/read', authenticateToken, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  db.prepare(`
    UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?
  `).run(req.params.id, user.id);

  res.json({
    success: true,
    message: 'Notification marked as read.',
  });
});

// POST /api/v1/notifications/read-all
router.post('/read-all', authenticateToken, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  db.prepare(`
    UPDATE notifications SET read = 1 WHERE user_id = ?
  `).run(user.id);

  res.json({
    success: true,
    message: 'All notifications marked as read.',
  });
});

export default router;
