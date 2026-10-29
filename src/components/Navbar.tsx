import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FALLBACK_AVATAR } from '../utils/imageFallback';

import {
  Sparkles,
  Bell,
  Menu,
  X,
  ChevronDown,
  LogOut
} from 'lucide-react';

interface NavbarProps {
  onOpenResetModal?: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const {
    currentUser,
    currentRole,
    isAuthenticated,
    logout,
    setCurrentPage,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useApp();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--navbar-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--navbar-border)',
        height: '70px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        boxShadow: '0 4px 20px rgba(48, 21, 30, 0.35)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '1440px',
          margin: '0 auto',
        }}
      >
        {/* Left: Brand Logo & Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button
            onClick={() => setCurrentPage('landing')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textAlign: 'left',
              padding: '4px',
            }}
            id="nav-logo-btn"
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: '#F2E8DC',
                border: '1.5px solid rgba(48, 21, 30, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 14px rgba(242, 232, 220, 0.35)',
              }}
            >
              <Sparkles size={22} color="#30151E" />
            </div>
            <div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: '#F2E8DC',
                }}
              >
                ShareSphere <span style={{ color: '#E8D5C4', fontWeight: 900 }}>AI</span>
              </div>
              <div
                style={{
                  fontSize: '10.5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'rgba(242, 232, 220, 0.75)',
                  fontWeight: 600,
                }}
              >
                Institutional Asset Mesh
              </div>
            </div>
          </button>
        </div>

        {/* Center / Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* User Account / Profile Menu */}
          {isAuthenticated ? (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      borderRadius: 'var(--radius-full)',
                      padding: '6px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background:
                        currentRole === 'RESOURCE_OWNER' || currentRole === 'owner'
                          ? 'rgba(99, 102, 241, 0.12)'
                          : currentRole === 'ADMIN' || currentRole === 'admin'
                            ? 'rgba(244, 63, 94, 0.12)'
                            : currentRole === 'INSTITUTION_MANAGER'
                              ? 'rgba(245, 158, 11, 0.12)'
                              : 'rgba(6, 182, 212, 0.12)',
                      borderColor:
                        currentRole === 'RESOURCE_OWNER' || currentRole === 'owner'
                          ? 'rgba(99, 102, 241, 0.35)'
                          : currentRole === 'ADMIN' || currentRole === 'admin'
                            ? 'rgba(244, 63, 94, 0.35)'
                            : currentRole === 'INSTITUTION_MANAGER'
                              ? 'rgba(245, 158, 11, 0.35)'
                              : 'rgba(6, 182, 212, 0.35)',
                    }}
                    id="user-account-toggle"
                    aria-label="User Account"
                  >
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = FALLBACK_AVATAR;
                      }}
                      style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          color:
                            currentRole === 'RESOURCE_OWNER' || currentRole === 'owner'
                              ? '#818cf8'
                              : currentRole === 'ADMIN' || currentRole === 'admin'
                                ? '#fb7185'
                                : currentRole === 'INSTITUTION_MANAGER'
                                  ? '#fbbf24'
                                  : '#38bdf8',
                        }}
                      >
                        {currentRole === 'RESOURCE_OWNER' || currentRole === 'owner'
                          ? 'Resource Custodian'
                          : currentRole === 'ADMIN' || currentRole === 'admin'
                            ? 'Safety Admin'
                            : currentRole === 'INSTITUTION_MANAGER'
                              ? 'Institution Dean / Mgr'
                              : currentUser.isExternal
                                ? 'External Seeker'
                                : 'Resource Seeker'}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 800, display: 'block', color: '#F2E8DC' }}>
                        {currentUser.name}
                      </span>
                    </div>
                    <ChevronDown size={14} color="#F2E8DC" style={{ opacity: 0.8 }} />
                  </button>

                  {userMenuOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '115%',
                        right: 0,
                        width: '280px',
                        background: 'var(--bg-card)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-lg)',
                        padding: '14px',
                        zIndex: 200,
                        animation: 'slideUp 0.18s ease-out',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <img
                          src={currentUser.avatar}
                          alt={currentUser.name}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = FALLBACK_AVATAR;
                          }}
                          style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 800, fontSize: '14px', color: '#30151E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {currentUser.name}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {currentUser.email}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => { logout(); setUserMenuOpen(false); }}
                        className="btn btn-secondary btn-sm"
                        style={{ width: '100%', color: 'var(--rose-primary)', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '6px' }}
                        id="logout-nav-btn"
                      >
                        <LogOut size={14} />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setCurrentPage('login')}
                  className="btn btn-primary btn-sm"
                  id="nav-sign-in-btn"
                >
                  Sign In / Select Portal
                </button>
              )}

              {/* Notification Bell */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="btn btn-secondary btn-sm"
                  style={{
                    width: '38px',
                    height: '38px',
                    padding: 0,
                    borderRadius: '50%',
                    position: 'relative',
                  }}
                  id="notifications-bell-btn"
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        background: '#f43f5e',
                        color: '#fff',
                        fontSize: '10.5px',
                        fontWeight: 800,
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 10px rgba(244, 63, 94, 0.7)',
                      }}
                      id="unread-notifications-badge"
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '120%',
                      right: 0,
                      width: '340px',
                      background: 'var(--bg-modal)',
                      backdropFilter: 'blur(24px)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: 'var(--shadow-lg)',
                      padding: '12px',
                      zIndex: 200,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingBottom: '8px',
                        borderBottom: '1px solid var(--border-subtle)',
                        marginBottom: '8px',
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllNotificationsAsRead}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--cyan-primary)',
                            fontSize: '11px',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                          id="mark-all-read-btn"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                          No notifications yet
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => {
                              markNotificationAsRead(notif.id);
                              if (notif.linkPage) setCurrentPage(notif.linkPage);
                              setNotificationsOpen(false);
                            }}
                            style={{
                              padding: '10px 12px',
                              borderRadius: 'var(--radius-md)',
                              background: notif.read ? 'transparent' : 'rgba(48, 21, 30, 0.05)',
                              border: notif.read ? '1px solid transparent' : '1px solid rgba(48, 21, 30, 0.12)',
                              cursor: 'pointer',
                              transition: 'background var(--transition-fast)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 800, fontSize: '12.5px', color: notif.read ? 'var(--text-secondary)' : '#30151E' }}>
                                {notif.title}
                              </span>
                              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                              {notif.message}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="btn btn-secondary btn-sm"
                style={{ display: 'none', padding: '8px' }}
                id="mobile-nav-toggle"
                aria-label="Toggle navigation drawer"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
        </div>
    </header>
  );
};
