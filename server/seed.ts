import { seedDatabase, db } from './db.ts';

console.log('[ShareSphere AI] Starting database seed script...');
seedDatabase(true);

const counts = {
  institutions: (db.prepare('SELECT COUNT(*) as c FROM institutions').get() as { c: number }).c,
  users: (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c,
  resources: (db.prepare('SELECT COUNT(*) as c FROM resources').get() as { c: number }).c,
  bookings: (db.prepare('SELECT COUNT(*) as c FROM bookings').get() as { c: number }).c,
  incidents: (db.prepare('SELECT COUNT(*) as c FROM incidents').get() as { c: number }).c,
  conditionReports: (db.prepare('SELECT COUNT(*) as c FROM condition_reports').get() as { c: number }).c,
  maintenanceRecords: (db.prepare('SELECT COUNT(*) as c FROM maintenance_records').get() as { c: number }).c,
  waitingList: (db.prepare('SELECT COUNT(*) as c FROM waiting_list').get() as { c: number }).c,
  accessories: (db.prepare('SELECT COUNT(*) as c FROM resource_accessories').get() as { c: number }).c,
  auditLogs: (db.prepare('SELECT COUNT(*) as c FROM audit_logs').get() as { c: number }).c,
  notifications: (db.prepare('SELECT COUNT(*) as c FROM notifications').get() as { c: number }).c,
};

console.log('--------------------------------------------------');
console.log('✅ ShareSphere AI Fictional Demo Seed Completed Successfully!');
console.log('--------------------------------------------------');
console.table(counts);
console.log('Default Seed User Credentials (all accounts):');
console.log('  Password: Password@123');
console.log('  Seeker:    alex@institution.edu');
console.log('  Owner:     priya.sharma@institution.edu');
console.log('  Manager:   marcus.vance@institution.edu');
console.log('  Admin:     elena.rostova@institution.edu');
console.log('--------------------------------------------------');
