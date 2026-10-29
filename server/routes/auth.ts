import { Router } from 'express';
import { db, createAuditEntry } from '../db.ts';
import {
  authenticateToken,
  comparePassword,
  formatUserRow,
  generateToken,
  getUserByEmail,
  getUserById,
  hashPassword,
  type AuthenticatedRequest,
} from '../auth.ts';

const router = Router();

function extractNameFromEmail(email: string): string {
  const local = email.split('@')[0] || 'Researcher';
  const clean = local.replace(/[0-9]+/g, ' ').replace(/[._\-+]+/g, ' ').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Academic Researcher';
  return parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ');
}

// POST /api/v1/auth/register
router.post('/register', (req, res): void => {
  const {
    name,
    email,
    password,
    institutionId,
    institutionName,
    department,
    title,
    safetyLevel,
  } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({
      success: false,
      error: 'MISSING_FIELDS',
      message: 'Name, email, and password are required.',
    });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (password.length < 6) {
    res.status(400).json({
      success: false,
      error: 'WEAK_PASSWORD',
      message: 'Password must be at least 6 characters.',
    });
    return;
  }

  // Check email uniqueness
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(normalizedEmail);
  if (existing) {
    res.status(409).json({
      success: false,
      error: 'EMAIL_EXISTS',
      message: 'An account with this email address already exists.',
    });
    return;
  }

  // Enforce role policy: Self-registration is strictly RESOURCE_SEEKER.
  // Privileged roles (ADMIN, INSTITUTION_MANAGER) cannot be self-assigned.
  const assignedRole = 'RESOURCE_SEEKER';

  const userId = `usr_reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const passwordHash = hashPassword(password);
  const instId = institutionId || 'INST_ENG';
  const instName = institutionName || 'College of Engineering & Applied Sciences';
  const userDept = department || 'General Science';
  const userTitle = title || 'Student / Researcher';
  const userSafetyLevel = typeof safetyLevel === 'number' ? Math.min(Math.max(1, safetyLevel), 3) : 1;
  const isExternal = instId === 'INST_EXTERNAL' || instId.toLowerCase().includes('external') ? 1 : 0;
  const avatar = `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80`;

  db.prepare(`
    INSERT INTO users (
      id, name, email, password_hash, role, title, institution_id, institution_name,
      department, avatar, safety_level, certifications, trust_score, is_external
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    name.trim(),
    normalizedEmail,
    passwordHash,
    assignedRole,
    userTitle,
    instId,
    instName,
    userDept,
    avatar,
    userSafetyLevel,
    JSON.stringify(['Basic Lab Safety L1']),
    95,
    isExternal
  );

  const newUser = getUserById(userId)!;
  const token = generateToken(newUser);

  createAuditEntry({
    actionType: 'USER_REGISTERED',
    actorName: newUser.name,
    actorRole: newUser.role,
    actorId: newUser.id,
    detail: `User registered: ${newUser.name} (${newUser.email}) at ${newUser.institutionName}.`,
  });

  res.status(201).json({
    success: true,
    message: 'Registration successful.',
    user: newUser,
    token,
  });
});

// POST /api/v1/auth/login
router.post('/login', (req, res): void => {
  const { email, password, name, role } = req.body;

  if (!email || !password) {
    res.status(400).json({
      success: false,
      error: 'MISSING_CREDENTIALS',
      message: 'Email and password are required.',
    });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  let userRecord = getUserByEmail(normalizedEmail);

  if (!userRecord) {
    // Real email on-the-fly registration: enable any valid email to sign in
    const cleanName = (typeof name === 'string' && name.trim()) || extractNameFromEmail(normalizedEmail);
    const userId = `usr_auto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const passwordHash = hashPassword(password);

    const domain = normalizedEmail.split('@')[1] || '';
    let instName = 'College of Engineering & Applied Sciences';
    let instId = 'INST_ENG';
    let isExternal = 0;

    if (domain.includes('gmail') || domain.includes('yahoo') || domain.includes('outlook') || domain.includes('hotmail') || domain.includes('icloud')) {
      instName = 'Independent Research Network';
      instId = 'INST_RESEARCH';
      isExternal = 0;
    } else if (domain.includes('stanford') || domain.includes('mit') || domain.includes('harvard') || domain.includes('berkeley')) {
      const org = domain.split('.')[0].toUpperCase();
      instName = `${org} University Laboratory`;
      instId = `INST_${org}`;
      isExternal = 0;
    } else if (domain.endsWith('.edu') || domain.endsWith('.ac.in')) {
      const org = domain.split('.')[0].toUpperCase();
      instName = `${org} Institute of Technology`;
      instId = `INST_${org}`;
      isExternal = 0;
    }

    const assignedRole = role === 'owner' || role === 'RESOURCE_OWNER' ? 'RESOURCE_OWNER' : 'RESOURCE_SEEKER';
    const assignedTitle = assignedRole === 'RESOURCE_OWNER' ? 'Resource Custodian' : 'Academic Researcher';
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=30151E&textColor=F2E8DC`;

    db.prepare(`
      INSERT INTO users (
        id, name, email, password_hash, role, title, institution_id, institution_name,
        department, avatar, safety_level, certifications, trust_score, is_external
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      cleanName,
      normalizedEmail,
      passwordHash,
      assignedRole,
      assignedTitle,
      instId,
      instName,
      'Applied Sciences',
      avatar,
      2,
      JSON.stringify(['Basic Lab Safety L1', 'Advanced Instrumentation L2']),
      98,
      isExternal
    );

    userRecord = getUserByEmail(normalizedEmail);
  } else {
    const passwordMatch = comparePassword(password, userRecord.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
      return;
    }
  }

  const { passwordHash: _, ...user } = userRecord!;
  const token = generateToken(user);

  createAuditEntry({
    actionType: 'USER_LOGGED_IN',
    actorName: user.name,
    actorRole: user.role,
    actorId: user.id,
    detail: `User signed in: ${user.name} (${user.email}) as ${user.role}.`,
  });

  res.json({
    success: true,
    message: 'Login successful.',
    user,
    token,
  });
});

// POST /api/v1/auth/logout
router.post('/logout', authenticateToken, (req: AuthenticatedRequest, res): void => {
  res.json({
    success: true,
    message: 'Logged out successfully.',
  });
});

// GET /api/v1/auth/me
router.get('/me', authenticateToken, (req: AuthenticatedRequest, res): void => {
  res.json({
    success: true,
    user: req.user,
  });
});

// GET /api/v1/auth/personas (Demo convenience endpoint for switching personas)
router.get('/personas', (_req, res): void => {
  const rows = db.prepare('SELECT * FROM users ORDER BY safety_level DESC').all() as Record<string, any>[];
  const personas = rows.map((r) => formatUserRow(r));
  res.json({
    success: true,
    personas,
  });
});

export default router;
