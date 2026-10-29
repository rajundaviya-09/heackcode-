export type UserRole =
  | 'RESOURCE_SEEKER'
  | 'RESOURCE_OWNER'
  | 'INSTITUTION_MANAGER'
  | 'ADMIN'
  | 'seeker'
  | 'owner'
  | 'admin';

export interface Institution {
  id: string;
  name: string;
  code: string;
  description: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  institutionId: string;
  institutionName: string;
  department: string;
  avatar: string;
  safetyLevel: number;
  certifications: string[];
  trustScore: number;
  isExternal?: boolean;
}

export type PlatformSection =
  | 'LabShare'
  | 'ToolConnect'
  | 'SpaceSync'
  | 'EquipX'
  | 'ResourceBridge';

export type ResourceCategory =
  | 'Lab Equipment'
  | 'Computing & AI'
  | 'Robotics & Prototyping'
  | 'Audio/Visual'
  | 'Testing & Measurement'
  | 'Classrooms & Spaces'
  | 'Bioengineering & Imaging'
  | 'Cleanroom & Nanofabrication'
  | 'Additive Manufacturing & 3D Printing'
  | 'Thermal & Materials Analysis'
  | 'Optical & Fluorescence Microscopy'
  | 'Audio/Visual & Media Production';

export type ResourceStatus = 'Available' | 'In Use' | 'Reserved' | 'Maintenance';

export type ApprovalMode =
  | 'MODE_A_AUTO'
  | 'MODE_B_OWNER'
  | 'MODE_C_INSTITUTION'
  | 'MODE_D_MULTI_STAGE';

export interface Resource {
  id: string;
  title: string;
  category: ResourceCategory;
  platform?: PlatformSection;
  department: string;
  location: string;
  ownerId: string;
  ownerName: string;
  ownerRole: string;
  institutionId: string;
  institutionName: string;
  description: string;
  specifications: Record<string, string>;
  safetyLevelRequired: number;
  requiresCertification: string;
  conditionScore: number; // 0 - 100
  conditionStatus: 'Pristine' | 'Good' | 'Fair' | 'Under Inspection';
  status: ResourceStatus;
  imageUrl: string;
  hourlyRateCredits: number;
  accessories: string[];
  maintenanceSchedule: string;
  totalBookingsCount: number;
  approvalMode: ApprovalMode;
  allowExternalUsers: boolean;
  maxDurationHours: number;
  advanceBookingDays: number;
}

export type BookingStatus =
  | 'PENDING'
  | 'PENDING_OWNER_APPROVAL'
  | 'PENDING_INSTITUTION_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'CHECKED_OUT'
  | 'RETURNED'
  | 'OVERDUE'
  | 'WAITLISTED'
  | 'pending'
  | 'approved'
  | 'in_use'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'waitlisted';

export interface CheckInDetails {
  timestamp: string;
  actor: string;
  condition: string;
  rating: number;
  checklist: {
    powerCord: boolean;
    probesOrCables: boolean;
    calibrationIntact: boolean;
    screenClean: boolean;
  };
  notes: string;
  signature: string;
}

export interface ReturnDetails {
  timestamp: string;
  actor: string;
  condition: string;
  rating: number;
  checklist: {
    cleaned: boolean;
    accessoriesIntact: boolean;
    poweredDown: boolean;
  };
  notes: string;
  signature: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  actor: string;
  statusBadge: string;
}

export interface ApprovalStageDecision {
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  decidedBy?: string;
  decidedAt?: string;
  notes?: string;
  rejectionReason?: string;
}

export interface InfoRequest {
  question: string;
  requestedBy: string;
  requestedAt: string;
  response?: string;
  respondedAt?: string;
}

export interface Booking {
  id: string;
  resourceId: string;
  resourceTitle: string;
  resourceCategory: ResourceCategory;
  institutionId: string;
  institutionName: string;
  seekerId: string;
  seekerName: string;
  seekerEmail?: string;
  seekerInstitutionId: string;
  seekerInstitutionName: string;
  seekerDepartment: string;
  isExternalSeeker: boolean;
  ownerId: string;
  startDate: string; // ISO
  endDate: string; // ISO
  purpose: string;
  courseCode: string;
  priority: 'routine' | 'thesis' | 'grant' | 'emergency';
  certifiedAgreement: boolean;
  status: BookingStatus;
  approvalMode: ApprovalMode;
  ownerApproval?: ApprovalStageDecision;
  institutionApproval?: ApprovalStageDecision;
  infoRequest?: InfoRequest;
  waitlistPosition?: number;
  rejectionReason?: string;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  checkIn?: CheckInDetails;
  returnCheckOut?: ReturnDetails;
  timeline: TimelineEvent[];
}

export type IncidentSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type IncidentStatus = 'Open' | 'Investigating' | 'Resolved';

export interface Incident {
  id: string;
  resourceId: string;
  resourceTitle: string;
  reportedBy: string;
  reporterRole: string;
  bookingId?: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  createdAt: string;
  resolutionNotes?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actionType:
    | 'USER_REGISTERED'
    | 'USER_LOGGED_IN'
    | 'BOOKING_REQUESTED'
    | 'OWNER_APPROVED'
    | 'INSTITUTION_APPROVED'
    | 'BOOKING_APPROVED'
    | 'BOOKING_REJECTED'
    | 'INFO_REQUESTED'
    | 'INFO_RESPONDED'
    | 'BOOKING_CANCELLED'
    | 'CHECK_IN_COMPLETED'
    | 'RETURN_COMPLETED'
    | 'INCIDENT_FILED'
    | 'SYSTEM_RESET';
  resourceId?: string;
  resourceTitle?: string;
  bookingId?: string;
  actorName: string;
  actorRole: string;
  actorId?: string;
  detail: string;
  hash: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  timestamp: string;
  read: boolean;
  linkPage?: string;
  bookingId?: string;
}
