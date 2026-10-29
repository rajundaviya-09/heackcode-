import express from 'express';
import cors from 'cors';
import { seedDatabase } from './db.ts';

import authRouter from './routes/auth.ts';
import resourcesRouter from './routes/resources.ts';
import bookingsRouter from './routes/bookings.ts';
import approvalsRouter from './routes/approvals.ts';
import notificationsRouter from './routes/notifications.ts';
import incidentsRouter from './routes/incidents.ts';
import auditRouter from './routes/audit.ts';
import institutionsRouter from './routes/institutions.ts';
import adminRouter from './routes/admin.ts';
import matchingRouter from './routes/matching.ts';
import analyticsRouter from './routes/analytics.ts';
import conditionReportsRouter from './routes/conditionReports.ts';
import waitingListRouter from './routes/waitingList.ts';
import maintenanceRouter from './routes/maintenance.ts';
import openapiRouter from './routes/openapi.ts';
import geminiRouter from './routes/gemini.ts';

export const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Initialize Database Seed Data
seedDatabase();

// Mount API routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/resources', resourcesRouter);
app.use('/api/v1/bookings', bookingsRouter);
app.use('/api/v1/bookings', conditionReportsRouter);
app.use('/api/v1/approvals', approvalsRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/incidents', incidentsRouter);
app.use('/api/v1/audit-logs', auditRouter);
app.use('/api/v1/institutions', institutionsRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/matching', matchingRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1', waitingListRouter);
app.use('/api/v1/maintenance', maintenanceRouter);
app.use('/api/v1', openapiRouter);
app.use('/api/v1/gemini', geminiRouter);
app.use('/api', openapiRouter);
app.use('/docs', openapiRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ShareSphere AI Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Start listener if executed directly
if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ShareSphere AI Server] Listening on http://localhost:${PORT}`);
    console.log(`[ShareSphere AI API Docs] Interactive documentation available at http://localhost:${PORT}/api/docs`);
  });
}
