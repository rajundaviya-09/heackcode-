import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'sharesphere-secure-hackathon-jwt-secret-2026';
const JWT_EXPIRES_IN = '7d';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string;
  institutionId: string;
  institutionName: string;
  department: string;
  avatar?: string;
  safetyLevel: number;
  certifications: string[];
  trustScore: number;
  isExternal: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      institutionId: user.institutionId,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function getUserById(id: string): AuthUser | null {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, any> | undefined;
  if (!row) return null;
  return formatUserRow(row);
}

export function getUserByEmail(email: string): (AuthUser & { passwordHash: string }) | null {
  const row = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email) as Record<string, any> | undefined;
  if (!row) return null;
  const user = formatUserRow(row);
  return {
    ...user,
    passwordHash: row.password_hash,
  };
}

export function formatUserRow(row: Record<string, any>): AuthUser {
  let certs: string[] = [];
  try {
    certs = typeof row.certifications === 'string' ? JSON.parse(row.certifications) : row.certifications || [];
  } catch {
    certs = [];
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    title: row.title,
    institutionId: row.institution_id,
    institutionName: row.institution_name,
    department: row.department,
    avatar: row.avatar || '',
    safetyLevel: Number(row.safety_level) || 1,
    certifications: certs,
    trustScore: Number(row.trust_score) || 100,
    isExternal: Boolean(row.is_external),
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication token is required for this action.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = getUserById(decoded.id);

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'INVALID_USER',
        message: 'The user account associated with this token no longer exists.',
      });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Session has expired or token is invalid. Please sign in again.',
    });
  }
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = getUserById(decoded.id);
    if (user) {
      req.user = user;
    }
  } catch {
    // Ignore invalid optional token
  }
  next();
}

export function requireRoles(...rolesOrArray: (string | string[])[]) {
  const allowedRoles = rolesOrArray.flat().map((r) => String(r).toUpperCase());
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
      return;
    }

    const userRole = req.user.role.toUpperCase();
    const hasRole = allowedRoles.some((r) => r === userRole || userRole === 'ADMIN');

    if (!hasRole) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`,
      });
      return;
    }

    next();
  };
}

export function hashPassword(plainText: string): string {
  return bcrypt.hashSync(plainText, 10);
}

export function comparePassword(plainText: string, hash: string): boolean {
  return bcrypt.compareSync(plainText, hash);
}
