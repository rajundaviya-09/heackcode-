import React from 'react';
import { useApp } from '../context/AppContext';
import { FALLBACK_AVATAR } from '../utils/imageFallback';
import {
  Compass,
  CalendarCheck,
  CheckSquare,
  AlertTriangle,
  BarChart3,
  FileText,
  Home,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const {
    currentPage,
    setCurrentPage,
    bookings,
    incidents,
    currentUser,
  } = useApp();

  const pendingApprovalsCount = bookings.filter((b) => b.status === 'pending').length;
  const activeBookingsCount = bookings.filter((b) => b.status === 'approved' || b.status === 'in_use').length;
  const openIncidentsCount = incidents.filter((i) => i.status === 'Open' || i.status === 'Investigating').length;

  const navItems = [
    { id: 'landing', label: 'Platform Home', icon: <Home size={18} /> },
    { id: 'discovery', label: 'Resource Discovery', icon: <Compass size={18} />, highlight: true },
    {
      id: 'ai-planner',
      label: 'AI Equipment Planner',
      icon: <Sparkles size={18} />,
      badge: 'AI',
      badgeColor: '#06b6d4',
    },
    {
      id: 'bookings',
      label: 'My Reservations',
      icon: <CalendarCheck size={18} />,
      badge: activeBookingsCount > 0 ? `${activeBookingsCount}` : undefined,
      badgeColor: '#06b6d4',
    },
    {
      id: 'approvals',
      label: 'Owner Approvals',
      icon: <CheckSquare size={18} />,
      badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount}` : undefined,
      badgeColor: '#818cf8',
    },
    {
      id: 'incidents',
      label: 'Safety & Incidents',
      icon: <AlertTriangle size={18} />,
      badge: openIncidentsCount > 0 ? `${openIncidentsCount}` : undefined,
      badgeColor: '#f43f5e',
    },
    { id: 'analytics', label: 'Telemetry & Analytics', icon: <BarChart3 size={18} /> },
    { id: 'audit', label: 'Tamper-Evident Audit', icon: <FileText size={18} /> },
  ];

  const handleNav = (id: string) => {
    setCurrentPage(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 150,
          }}
        />
      )}

      <aside
        className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}
        style={{
          width: '260px',
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border)',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flexShrink: 0,
          boxShadow: '4px 0 20px rgba(48, 21, 30, 0.2)',
        }}
      >
        <div>
          {/* Section Header */}
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(242, 232, 220, 0.65)',
              padding: '0 12px 12px',
            }}
          >
            Navigation Mesh
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  id={`sidebar-link-${item.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '11px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor: isActive ? '#F2E8DC' : 'transparent',
                    background: isActive ? '#F2E8DC' : 'transparent',
                    color: isActive ? '#30151E' : '#F2E8DC',
                    fontWeight: isActive ? 800 : 500,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all var(--transition-fast)',
                    width: '100%',
                    boxShadow: isActive ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: isActive ? '#30151E' : '#F2E8DC' }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: isActive ? '#30151E' : '#F2E8DC',
                        color: isActive ? '#F2E8DC' : '#30151E',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Active Logged-In User Profile Card */}
        {currentUser && (
          <div
            style={{
              padding: '14px 16px',
              borderTop: '1px solid rgba(242, 232, 220, 0.15)',
              background: 'rgba(0, 0, 0, 0.18)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginTop: 'auto',
            }}
            id="sidebar-user-profile-card"
          >
            <img
              src={currentUser.avatar || FALLBACK_AVATAR}
              alt={currentUser.name}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = FALLBACK_AVATAR;
              }}
              style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #F2E8DC' }}
            />
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '10px', color: 'rgba(242, 232, 220, 0.65)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Logged In
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#F2E8DC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser.name}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(242, 232, 220, 0.75)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser.email}
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
