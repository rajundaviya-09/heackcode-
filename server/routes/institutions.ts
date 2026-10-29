import { Router } from 'express';
import { db } from '../db.ts';

const router = Router();

// GET /api/v1/institutions
router.get('/', (_req, res): void => {
  const rows = db.prepare('SELECT * FROM institutions ORDER BY name ASC').all() as Record<string, any>[];
  const institutions = rows.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    description: r.description,
  }));

  res.json({
    success: true,
    institutions,
  });
});

export default router;
