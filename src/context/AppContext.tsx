import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  UserProfile,
  UserRole,
  Resource,
  Booking,
  Incident,
  AuditLogEntry,
  AppNotification,
  CheckInDetails,
  ReturnDetails,
  PlatformSection,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_RESOURCES,
  INITIAL_BOOKINGS,
  INITIAL_INCIDENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
} from '../data/initialData';

const TOKEN_KEY = 'sharesphere_auth_token';
const USER_KEY = 'sharesphere_auth_user';

export type AppTheme = 'dual' | 'burgundy' | 'ivory';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

export interface PendingBookingContext {
  resourceId: string;
  startDate: string;
  endDate: string;
  purpose: string;
  courseCode: string;
  priority: 'routine' | 'thesis' | 'grant' | 'emergency';
  certifiedAgreement: boolean;
  asWaitlist?: boolean;
}

interface AppContextType {
  currentUser: UserProfile;
  currentRole: UserRole;
  isAuthenticated: boolean;
  authToken: string | null;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  pendingBookingContext: PendingBookingContext | null;
  setPendingBookingContext: (ctx: PendingBookingContext | null) => void;
  login: (email: string, password?: string, name?: string, role?: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: any) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  switchPersona: (personaKey: string) => Promise<void>;
  setRole: (role: UserRole) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  selectedResourceId: string | null;
  setSelectedResourceId: (id: string | null) => void;
  selectedPlatform: PlatformSection | 'All';
  setSelectedPlatform: (platform: PlatformSection | 'All') => void;
  resources: Resource[];
  bookings: Booking[];
  incidents: Incident[];
  auditLogs: AuditLogEntry[];
  notifications: AppNotification[];
  toasts: ToastMessage[];
  addToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  removeToast: (id: string) => void;
  createBooking: (bookingData: PendingBookingContext) => Promise<{ success: boolean; conflict?: boolean; message: string; bookingId?: string }>;
  checkOverlapConflict: (resourceId: string, startDate: string, endDate: string) => boolean;
  approveBooking: (bookingId: string, notes?: string) => Promise<void>;
  rejectBooking: (bookingId: string, reason: string) => Promise<void>;
  requestInfo: (bookingId: string, question: string) => Promise<void>;
  respondInfo: (bookingId: string, response: string) => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;
  checkInBooking: (bookingId: string, details: CheckInDetails) => Promise<void>;
  returnBooking: (bookingId: string, details: ReturnDetails, incidentData?: { title: string; description: string; severity: Incident['severity'] }) => Promise<void>;
  fileIncident: (data: {
    resourceId: string;
    title: string;
    description: string;
    severity: Incident['severity'];
    bookingId?: string;
  }) => Promise<void>;
  resolveIncident: (incidentId: string, resolutionNotes: string) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  resetDemoData: () => Promise<void>;
  refreshAllData: () => Promise<void>;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication State
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY) || null;
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem(USER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_USERS['seeker'];
  });

  const isAuthenticated = Boolean(authToken);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingBookingContext, setPendingBookingContext] = useState<PendingBookingContext | null>(null);

  // Navigation & Page State
  const [currentPage, setCurrentPage] = useState<string>(() => {
    return localStorage.getItem(TOKEN_KEY) ? 'discovery' : 'login';
  });
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformSection | 'All'>('All');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Theme State: Official Burgundy (#30151E) & Ivory (#F2E8DC) Palette
  const [theme, setThemeState] = useState<AppTheme>('dual');

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    try {
      localStorage.removeItem('sharesphere_theme');
    } catch {}
    document.documentElement.setAttribute('data-theme', 'dual');
  }, []);

  // Application Data States
  const [resources, setResources] = useState<Resource[]>(INITIAL_RESOURCES);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [incidents, setIncidents] = useState<Incident[]>(INITIAL_INCIDENTS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);

  const addToast = useCallback((type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Helper for authenticated fetch
  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers || {});
      if (authToken) {
        headers.set('Authorization', `Bearer ${authToken}`);
      }
      if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
      }
      return fetch(url, { ...options, headers });
    },
    [authToken]
  );

  // Synchronize Live Data from Backend API
  const refreshAllData = useCallback(async () => {
    try {
      // 1. Fetch Resources
      const resRes = await fetch('/api/v1/resources');
      if (resRes.ok) {
        const resData = await resRes.json();
        if (resData.resources) setResources(resData.resources);
      }

      // 2. Fetch Bookings (scoped by auth user if logged in)
      if (authToken) {
        const bkgRes = await authFetch('/api/v1/bookings');
        if (bkgRes.ok) {
          const bkgData = await bkgRes.json();
          if (bkgData.bookings) setBookings(bkgData.bookings);
        }

        // 3. Fetch Notifications
        const notifRes = await authFetch('/api/v1/notifications');
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          if (notifData.notifications) setNotifications(notifData.notifications);
        }
      }

      // 4. Fetch Incidents
      const incRes = await fetch('/api/v1/incidents');
      if (incRes.ok) {
        const incData = await incRes.json();
        if (incData.incidents) setIncidents(incData.incidents);
      }

      // 5. Fetch Audit Logs
      const auditRes = await fetch('/api/v1/audit-logs');
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        if (auditData.auditLogs) setAuditLogs(auditData.auditLogs);
      }
    } catch {
      // Offline fallback: keep state intact
    }
  }, [authToken, authFetch]);

  // Initial load & token validation
  useEffect(() => {
    const initializeAuth = async () => {
      if (authToken) {
        try {
          const res = await authFetch('/api/v1/auth/me');
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              setCurrentUser(data.user);
              localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            }
          } else {
            // Token expired or invalid
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            setAuthToken(null);
          }
        } catch {
          // Keep current user in offline mode
        }
      }
      refreshAllData();
    };

    initializeAuth();
  }, []); // Run on mount

  // Refresh data when auth token changes
  useEffect(() => {
    if (authToken) {
      refreshAllData();
    }
  }, [authToken, refreshAllData]);

  // Login handler (Supports real email login with automatic profile creation)
  const login = async (email: string, password = 'Password@123', name?: string, role?: string) => {
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, name: name?.trim(), role }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        addToast('error', 'Authentication Failed', data.message || 'Invalid email or password.');
        return { success: false, message: data.message };
      }

      setAuthToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));

      addToast('success', 'Welcome Back', `Authenticated as ${data.user.name} (${data.user.title || data.user.role}).`);
      setAuthModalOpen(false);

      // If there is pending booking context, resume it!
      return { success: true };
    } catch {
      // Offline fallback: if server is unreachable, create an offline user profile for this real email
      const cleanEmail = email.trim().toLowerCase();
      const derivedName = name?.trim() || cleanEmail.split('@')[0].replace(/[0-9]+/g, ' ').replace(/[._\-+]+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase()) || 'Academic Researcher';
      const offlineUser: UserProfile = {
        id: `usr_offline_${Date.now()}`,
        name: derivedName,
        email: cleanEmail,
        role: (role === 'owner' ? 'RESOURCE_OWNER' : 'RESOURCE_SEEKER') as UserRole,
        title: role === 'owner' ? 'Resource Custodian' : 'Academic Researcher',
        institutionId: 'INST_ENG',
        institutionName: 'College of Engineering & Applied Sciences',
        department: 'Applied Sciences',
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(derivedName)}&backgroundColor=30151E&textColor=F2E8DC`,
        safetyLevel: 2,
        certifications: ['Basic Lab Safety L1', 'Advanced Instrumentation L2'],
        trustScore: 98,
        isExternal: false,
      };
      const offlineToken = `token_offline_${Date.now()}`;
      setAuthToken(offlineToken);
      setCurrentUser(offlineUser);
      localStorage.setItem(TOKEN_KEY, offlineToken);
      localStorage.setItem(USER_KEY, JSON.stringify(offlineUser));
      addToast('success', 'Welcome', `Signed in as ${offlineUser.name} (${cleanEmail}).`);
      return { success: true };
    }
  };

  // Register handler
  const register = async (formData: any) => {
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        addToast('error', 'Registration Failed', data.message || 'Failed to create account.');
        return { success: false, message: data.message };
      }

      setAuthToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));

      addToast('success', 'Account Created', `Welcome to ShareSphere AI, ${data.user.name}!`);
      setAuthModalOpen(false);

      return { success: true };
    } catch (err: any) {
      addToast('error', 'Network Error', err.message || 'Failed to register.');
      return { success: false, message: 'Server unreachable.' };
    }
  };

  // Logout handler
  const logout = () => {
    if (authToken) {
      authFetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {});
    }
    setAuthToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setCurrentUser(INITIAL_USERS['seeker']);
    setCurrentPage('login');
    addToast('info', 'Signed Out', 'You have been safely signed out.');
  };

  // Switch Persona (1-Click demo authentication with real backend login)
  const switchPersona = async (personaKey: string) => {
    const target = INITIAL_USERS[personaKey];
    if (!target) return;

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target.email, password: 'Password@123' }),
      });

      if (res.ok) {
        const data = await res.json();
        setAuthToken(data.token);
        setCurrentUser(data.user);
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));

        addToast(
          'info',
          'Switched Operational Persona',
          `Active profile: ${data.user.name} (${data.user.title}) • ${data.user.institutionName}`
        );
      } else {
        // Fallback for UI if server is initializing
        setCurrentUser(target);
        addToast('info', 'Persona Switched (Demo)', `Viewing as ${target.name} (${target.title})`);
      }
    } catch {
      setCurrentUser(target);
    }
  };

  const setRole = (role: UserRole) => {
    // Map role string to a matching persona
    const roleKey = role === 'owner' ? 'owner' : role === 'admin' ? 'admin' : role === 'INSTITUTION_MANAGER' ? 'manager_eng' : 'seeker';
    switchPersona(roleKey);
  };

  // Conflict overlap checker
  const checkOverlapConflict = (resourceId: string, startStr: string, endStr: string): boolean => {
    const reqStart = new Date(startStr).getTime();
    const reqEnd = new Date(endStr).getTime();

    if (isNaN(reqStart) || isNaN(reqEnd) || reqEnd <= reqStart) return false;

    return bookings.some((b) => {
      if (b.resourceId !== resourceId) return false;
      const st = String(b.status).toUpperCase();
      if (st !== 'APPROVED' && st !== 'CHECKED_OUT' && st !== 'IN_USE') return false;

      const bStart = new Date(b.startDate).getTime();
      const bEnd = new Date(b.endDate).getTime();

      return reqStart < bEnd && reqEnd > bStart;
    });
  };

  // Create Booking
  const createBooking = async (bookingData: PendingBookingContext) => {
    // If not authenticated, open login modal and preserve context
    if (!isAuthenticated) {
      setPendingBookingContext(bookingData);
      setAuthModalOpen(true);
      addToast('warning', 'Authentication Required', 'Please sign in or select a demo persona to submit your reservation.');
      return { success: false, message: 'Authentication required. Please sign in.' };
    }

    try {
      const res = await authFetch('/api/v1/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.conflict) {
          return {
            success: false,
            conflict: true,
            message: data.message,
          };
        }

        addToast('error', 'Reservation Request Failed', data.message || 'Unable to submit reservation.');
        return { success: false, message: data.message || 'Validation failed' };
      }

      // Succeeded! Add to local state & refresh
      if (data.booking) {
        setBookings((prev) => [data.booking, ...prev.filter((b) => b.id !== data.booking.id)]);
      }

      setPendingBookingContext(null);
      refreshAllData();

      if (data.booking.status === 'WAITLISTED') {
        addToast('info', 'Waitlist Position Confirmed', `Queued at position #${data.booking.waitlistPosition}.`);
      } else if (data.booking.status === 'APPROVED') {
        addToast('success', 'Instant Reservation Confirmed!', `Mode A instant institutional approval granted.`);
      } else {
        addToast('success', 'Booking Request Submitted', `Submitted to ${data.booking.institutionName} review queue.`);
      }

      return {
        success: true,
        bookingId: data.booking.id,
        message: data.message,
      };
    } catch (err: any) {
      addToast('error', 'Connection Error', 'Failed to communicate with booking engine.');
      return { success: false, message: 'Network error.' };
    }
  };

  // Approve Booking
  const approveBooking = async (bookingId: string, notes?: string) => {
    try {
      const res = await authFetch(`/api/v1/approvals/${bookingId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      });

      const data = await res.json();
      if (!res.ok) {
        addToast('error', 'Approval Action Denied', data.message || 'Unable to approve booking.');
        return;
      }

      if (data.booking) {
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? data.booking : b)));
      }

      refreshAllData();
      addToast('success', 'Approval Granted', data.message || 'Decision recorded in institutional ledger.');
    } catch (err: any) {
      addToast('error', 'Server Error', 'Failed to submit approval decision.');
    }
  };

  // Reject Booking
  const rejectBooking = async (bookingId: string, reason: string) => {
    try {
      const res = await authFetch(`/api/v1/approvals/${bookingId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });

      const data = await res.json();
      if (!res.ok) {
        addToast('error', 'Rejection Action Failed', data.message || 'Unable to decline booking.');
        return;
      }

      if (data.booking) {
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? data.booking : b)));
      }

      refreshAllData();
      addToast('warning', 'Booking Declined', 'Rejection reason documented and applicant notified.');
    } catch (err: any) {
      addToast('error', 'Server Error', 'Failed to decline booking.');
    }
  };

  // Request Information
  const requestInfo = async (bookingId: string, question: string) => {
    try {
      const res = await authFetch(`/api/v1/approvals/${bookingId}/request-info`, {
        method: 'POST',
        body: JSON.stringify({ question }),
      });

      const data = await res.json();
      if (!res.ok) {
        addToast('error', 'Request Failed', data.message || 'Unable to submit information inquiry.');
        return;
      }

      if (data.booking) {
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? data.booking : b)));
      }

      refreshAllData();
      addToast('info', 'Inquiry Sent', 'Applicant notified to provide requested details.');
    } catch (err: any) {
      addToast('error', 'Server Error', 'Failed to send inquiry.');
    }
  };

  // Respond to Information Request
  const respondInfo = async (bookingId: string, response: string) => {
    try {
      const res = await authFetch(`/api/v1/bookings/${bookingId}/respond-info`, {
        method: 'POST',
        body: JSON.stringify({ response }),
      });

      const data = await res.json();
      if (!res.ok) {
        addToast('error', 'Response Failed', data.message || 'Unable to submit response.');
        return;
      }

      if (data.booking) {
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? data.booking : b)));
      }

      refreshAllData();
      addToast('success', 'Response Recorded', 'Reviewer notified of your response.');
    } catch (err: any) {
      addToast('error', 'Server Error', 'Failed to submit response.');
    }
  };

  // Cancel Booking
  const cancelBooking = async (bookingId: string) => {
    try {
      const res = await authFetch(`/api/v1/bookings/${bookingId}/cancel`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        addToast('error', 'Cancellation Failed', data.message || 'Unable to cancel booking.');
        return;
      }

      refreshAllData();
      addToast('info', 'Reservation Cancelled', 'Booking cancelled and waitlist queue updated.');
    } catch (err: any) {
      addToast('error', 'Server Error', 'Failed to cancel booking.');
    }
  };

  // Check In Booking
  const checkInBooking = async (bookingId: string, details: CheckInDetails) => {
    try {
      const res = await authFetch(`/api/v1/bookings/${bookingId}/check-in`, {
        method: 'POST',
        body: JSON.stringify(details),
      });

      const data = await res.json();
      if (!res.ok) {
        addToast('error', 'Check-In Failed', data.message || 'Unable to complete check-in.');
        return;
      }

      refreshAllData();
      addToast('success', 'Check-In Complete', `Initial condition certified as ${details.condition}. Asset in active loan.`);
    } catch (err: any) {
      addToast('error', 'Server Error', 'Failed to submit check-in verification.');
    }
  };

  // Return Booking
  const returnBooking = async (
    bookingId: string,
    details: ReturnDetails,
    incidentData?: { title: string; description: string; severity: Incident['severity'] }
  ) => {
    try {
      const payload: any = { ...details };
      if (incidentData) {
        payload.fileIncidentReport = true;
        payload.incidentDescription = incidentData.description;
      }

      const res = await authFetch(`/api/v1/bookings/${bookingId}/return`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        addToast('error', 'Return Failed', data.message || 'Unable to finalize return.');
        return;
      }

      refreshAllData();
      addToast('success', 'Return Completed', `Final condition recorded as ${details.condition}. Custody concluded.`);
    } catch (err: any) {
      addToast('error', 'Server Error', 'Failed to complete return protocol.');
    }
  };

  // File Incident
  const fileIncident = async (data: {
    resourceId: string;
    title: string;
    description: string;
    severity: Incident['severity'];
    bookingId?: string;
  }) => {
    try {
      const res = await authFetch('/api/v1/incidents', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok) {
        addToast('error', 'Incident Report Failed', resData.message || 'Unable to file incident.');
        return;
      }

      refreshAllData();
      addToast('warning', 'Incident Filed', `Logged with ${data.severity} severity. Safety office alerted.`);
    } catch (err: any) {
      addToast('error', 'Server Error', 'Failed to file incident report.');
    }
  };

  // Resolve Incident
  const resolveIncident = async (incidentId: string, resolutionNotes: string) => {
    try {
      const res = await authFetch(`/api/v1/incidents/${incidentId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolutionNotes }),
      });

      if (!res.ok) {
        addToast('error', 'Resolution Failed', 'Could not resolve incident.');
        return;
      }

      refreshAllData();
      addToast('success', 'Incident Resolved', 'Marked as resolved with compliance notes.');
    } catch (err: any) {
      addToast('error', 'Server Error', 'Failed to resolve incident.');
    }
  };

  // Notification actions
  const markNotificationAsRead = async (id: string) => {
    try {
      await authFetch(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {}
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await authFetch('/api/v1/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      addToast('info', 'Notifications Cleared', 'All notifications marked as read.');
    } catch {}
  };

  // Reset Demo Data
  const resetDemoData = async () => {
    try {
      const res = await authFetch('/api/v1/admin/reset', { method: 'POST' });
      if (res.ok) {
        await refreshAllData();
        addToast('success', 'Sandbox Reset Complete', 'Database restored to pristine factory seed state.');
      }
    } catch {
      addToast('error', 'Reset Error', 'Failed to reset database.');
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        currentRole: currentUser.role,
        isAuthenticated,
        authToken,
        authModalOpen,
        setAuthModalOpen,
        pendingBookingContext,
        setPendingBookingContext,
        login,
        register,
        logout,
        switchPersona,
        setRole,
        currentPage,
        setCurrentPage,
        selectedResourceId,
        setSelectedResourceId,
        selectedPlatform,
        setSelectedPlatform,
        resources,
        bookings,
        incidents,
        auditLogs,
        notifications,
        toasts,
        addToast,
        removeToast,
        createBooking,
        checkOverlapConflict,
        approveBooking,
        rejectBooking,
        requestInfo,
        respondInfo,
        cancelBooking,
        checkInBooking,
        returnBooking,
        fileIncident,
        resolveIncident,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        resetDemoData,
        refreshAllData,
        theme,
        setTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
