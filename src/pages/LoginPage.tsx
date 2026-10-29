import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkles,
  Compass,
  ShieldCheck,
  ArrowRight,
  Mail,
  Lock,
  ArrowLeft,
  User
} from 'lucide-react';

interface LoginPageProps {
  onGuestContinue?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = () => {
  const { login, setCurrentPage } = useApp();

  // Active Category: null (shows small icon tiles), 'booking', or 'approvals'
  const [activeCategory, setActiveCategory] = useState<'booking' | 'approvals' | null>(null);

  // Category 1: Booking State
  const [seekerName, setSeekerName] = useState('');
  const [seekerEmail, setSeekerEmail] = useState('');
  const [seekerPassword, setSeekerPassword] = useState('Password@123');
  const [seekerLoading, setSeekerLoading] = useState(false);
  const [seekerError, setSeekerError] = useState('');

  // Category 2: Approvals State
  const [approverName, setApproverName] = useState('');
  const [approverEmail, setApproverEmail] = useState('');
  const [approverPassword, setApproverPassword] = useState('Password@123');
  const [approverLoading, setApproverLoading] = useState(false);
  const [approverError, setApproverError] = useState('');

  // Handle Category 1 Login
  const handleSeekerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seekerEmail.trim()) {
      setSeekerError('Email required');
      return;
    }
    setSeekerError('');
    setSeekerLoading(true);

    const res = await login(seekerEmail.trim(), seekerPassword, seekerName.trim() || undefined, 'seeker');
    setSeekerLoading(false);

    if (res.success) {
      setCurrentPage('discovery');
    } else {
      setSeekerError(res.message || 'Login failed');
    }
  };

  // Handle Category 2 Login
  const handleApproverLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approverEmail.trim()) {
      setApproverError('Email required');
      return;
    }
    setApproverError('');
    setApproverLoading(true);

    const res = await login(approverEmail.trim(), approverPassword, approverName.trim() || undefined, 'owner');
    setApproverLoading(false);

    if (res.success) {
      setCurrentPage('approvals');
    } else {
      setApproverError(res.message || 'Login failed');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        boxSizing: 'border-box',
      }}
      id="portal-login-screen"
    >
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: '#30151E',
              border: '1.5px solid rgba(242, 232, 220, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(48, 21, 30, 0.2)',
            }}
          >
            <Sparkles size={18} color="#F2E8DC" />
          </div>
          <span style={{ fontSize: '22px', fontWeight: 900, color: '#30151E', letterSpacing: '-0.02em' }}>
            ShareSphere <span style={{ color: '#5C3240' }}>AI</span>
          </span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
          {activeCategory === null
            ? 'Select a category below to open sign in'
            : activeCategory === 'booking'
            ? 'Sign in to access Equipment Booking'
            : 'Sign in to access Reviews & Approvals'}
        </p>
      </div>

      {/* ========================================================
          VIEW 1: SMALL CATEGORY ICONS (CLICK TO OPEN LOGIN)
          ======================================================== */}
      {activeCategory === null && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            justifyContent: 'center',
            width: '100%',
            maxWidth: '520px',
          }}
          id="category-icon-selection"
        >
          {/* Small Category 1 Icon Tile (Equipment Booking - Light/Ivory Theme) */}
          <button
            type="button"
            onClick={() => setActiveCategory('booking')}
            className="glass-card"
            style={{
              flex: '1 1 210px',
              maxWidth: '240px',
              padding: '22px 16px',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid rgba(48, 21, 30, 0.25)',
              background: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(48, 21, 30, 0.08)',
              cursor: 'pointer',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.borderColor = '#30151E';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(48, 21, 30, 0.16)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.borderColor = 'rgba(48, 21, 30, 0.25)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(48, 21, 30, 0.08)';
            }}
            id="category-booking-icon-btn"
          >
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                background: '#F2E8DC',
                border: '1.5px solid rgba(48, 21, 30, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(48, 21, 30, 0.1)',
              }}
            >
              <Compass size={26} color="#30151E" />
            </div>

            <div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: '#30151E',
                  letterSpacing: '0.05em',
                  background: '#F2E8DC',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid rgba(48, 21, 30, 0.15)',
                  display: 'inline-block',
                  marginBottom: '4px',
                }}
              >
                Category 1
              </span>
              <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: '#30151E', margin: '3px 0 2px' }}>
                Equipment Booking
              </h3>
              <p style={{ fontSize: '11.5px', color: '#664a54', margin: 0, fontWeight: 500 }}>
                Researchers & Students
              </p>
            </div>

            <div
              style={{
                marginTop: '4px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                background: '#30151E',
                color: '#F2E8DC',
                fontSize: '11.5px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 8px rgba(48, 21, 30, 0.2)',
              }}
            >
              <span>Click to Log In</span>
              <ArrowRight size={13} />
            </div>
          </button>

          {/* Small Category 2 Icon Tile (Reviews & Approvals - Deep Burgundy Theme) */}
          <button
            type="button"
            onClick={() => setActiveCategory('approvals')}
            style={{
              flex: '1 1 210px',
              maxWidth: '240px',
              padding: '22px 16px',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid rgba(242, 232, 220, 0.35)',
              background: '#30151E',
              boxShadow: '0 6px 22px rgba(48, 21, 30, 0.35)',
              cursor: 'pointer',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.borderColor = '#F2E8DC';
              e.currentTarget.style.boxShadow = '0 10px 28px rgba(48, 21, 30, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.borderColor = 'rgba(242, 232, 220, 0.35)';
              e.currentTarget.style.boxShadow = '0 6px 22px rgba(48, 21, 30, 0.35)';
            }}
            id="category-approvals-icon-btn"
          >
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                background: '#F2E8DC',
                border: '1.5px solid rgba(242, 232, 220, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.25)',
              }}
            >
              <ShieldCheck size={26} color="#30151E" />
            </div>

            <div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: '#F2E8DC',
                  letterSpacing: '0.05em',
                  background: 'rgba(242, 232, 220, 0.16)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid rgba(242, 232, 220, 0.3)',
                  display: 'inline-block',
                  marginBottom: '4px',
                }}
              >
                Category 2
              </span>
              <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: '#F2E8DC', margin: '3px 0 2px' }}>
                Reviews & Approvals
              </h3>
              <p style={{ fontSize: '11.5px', color: 'rgba(242, 232, 220, 0.8)', margin: 0, fontWeight: 500 }}>
                Custodians & Deans
              </p>
            </div>

            <div
              style={{
                marginTop: '4px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                background: '#F2E8DC',
                color: '#30151E',
                fontSize: '11.5px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              }}
            >
              <span>Click to Log In</span>
              <ArrowRight size={13} color="#30151E" />
            </div>
          </button>
        </div>
      )}

      {/* ========================================================
          VIEW 2: OPENED LOGIN FORM FOR CATEGORY 1 (BOOKING)
          ======================================================== */}
      {activeCategory === 'booking' && (
        <div
          className="glass-card"
          style={{
            width: '100%',
            maxWidth: '340px',
            padding: '20px 22px',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid rgba(48, 21, 30, 0.25)',
            boxShadow: '0 8px 28px rgba(48, 21, 30, 0.12)',
            background: '#FFFFFF',
            position: 'relative',
            animation: 'fadeIn 0.2s ease-out',
          }}
          id="category-booking-login-card"
        >
          {/* Top accent */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: '#30151E',
              borderTopLeftRadius: 'var(--radius-lg)',
              borderTopRightRadius: 'var(--radius-lg)',
            }}
          />

          {/* Back button & Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <button
              type="button"
              onClick={() => { setActiveCategory(null); setSeekerError(''); }}
              style={{
                background: 'none',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#30151E',
                cursor: 'pointer',
                padding: '2px 0',
              }}
              id="back-to-categories-booking-btn"
            >
              <ArrowLeft size={14} />
              <span>Categories</span>
            </button>

            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: 'var(--radius-full)',
                background: '#F2E8DC',
                color: '#30151E',
                border: '1px solid rgba(48, 21, 30, 0.15)',
              }}
            >
              Category 1
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#F2E8DC',
                border: '1px solid rgba(48, 21, 30, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Compass size={20} color="#30151E" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#30151E', margin: 0 }}>
                Equipment Booking
              </h3>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Researchers & Students</div>
            </div>
          </div>

          {seekerError && (
            <div style={{ fontSize: '11.5px', color: '#9f1239', marginBottom: '10px', textAlign: 'center' }}>
              {seekerError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSeekerLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '11.5px', marginBottom: '3px' }}>
                Your Name (Optional)
              </label>
              <div style={{ position: 'relative' }}>
                <User size={14} color="#85616E" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '32px', height: '34px', fontSize: '12.5px' }}
                  value={seekerName}
                  onChange={(e) => setSeekerName(e.target.value)}
                  placeholder="e.g. Raj Undaviya (auto-detected if blank)"
                  id="seeker-input-name"
                />
              </div>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '11.5px', marginBottom: '3px' }}>
                Researcher Academic / Real Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} color="#85616E" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '32px', height: '34px', fontSize: '12.5px' }}
                  value={seekerEmail}
                  onChange={(e) => setSeekerEmail(e.target.value)}
                  placeholder="e.g. raj@gmail.com or alex@institution.edu"
                  required
                  id="seeker-input-email"
                />
              </div>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '11.5px', marginBottom: '3px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} color="#85616E" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '32px', height: '34px', fontSize: '12.5px' }}
                  value={seekerPassword}
                  onChange={(e) => setSeekerPassword(e.target.value)}
                  placeholder="Password"
                  required
                  id="seeker-input-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={seekerLoading}
              className="btn btn-primary"
              style={{ width: '100%', height: '36px', fontSize: '13px', marginTop: '4px' }}
              id="submit-booking-login-btn"
            >
              {seekerLoading ? 'Signing in...' : 'Sign In to Booking'}
              <ArrowRight size={14} />
            </button>
          </form>
        </div>
      )}

      {/* ========================================================
          VIEW 3: OPENED LOGIN FORM FOR CATEGORY 2 (APPROVALS)
          ======================================================== */}
      {activeCategory === 'approvals' && (
        <div
          className="glass-card"
          style={{
            width: '100%',
            maxWidth: '340px',
            padding: '20px 22px',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid rgba(48, 21, 30, 0.25)',
            boxShadow: '0 8px 28px rgba(48, 21, 30, 0.12)',
            background: '#FFFFFF',
            position: 'relative',
            animation: 'fadeIn 0.2s ease-out',
          }}
          id="category-approvals-login-card"
        >
          {/* Top accent */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: '#5C3240',
              borderTopLeftRadius: 'var(--radius-lg)',
              borderTopRightRadius: 'var(--radius-lg)',
            }}
          />

          {/* Back button & Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <button
              type="button"
              onClick={() => { setActiveCategory(null); setApproverError(''); }}
              style={{
                background: 'none',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#30151E',
                cursor: 'pointer',
                padding: '2px 0',
              }}
              id="back-to-categories-approvals-btn"
            >
              <ArrowLeft size={14} />
              <span>Categories</span>
            </button>

            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: 'var(--radius-full)',
                background: '#30151E',
                color: '#F2E8DC',
              }}
            >
              Category 2
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#30151E',
                border: '1px solid rgba(242, 232, 220, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={20} color="#F2E8DC" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#30151E', margin: 0 }}>
                Reviews & Approvals
              </h3>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Custodians & Deans</div>
            </div>
          </div>

          {approverError && (
            <div style={{ fontSize: '11.5px', color: '#9f1239', marginBottom: '10px', textAlign: 'center' }}>
              {approverError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleApproverLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '11.5px', marginBottom: '3px' }}>
                Your Name (Optional)
              </label>
              <div style={{ position: 'relative' }}>
                <User size={14} color="#85616E" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '32px', height: '34px', fontSize: '12.5px' }}
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  placeholder="e.g. Prof. Marcus Vance (auto-detected if blank)"
                  id="approver-input-name"
                />
              </div>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '11.5px', marginBottom: '3px' }}>
                Custodian / Reviewer Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} color="#85616E" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '32px', height: '34px', fontSize: '12.5px' }}
                  value={approverEmail}
                  onChange={(e) => setApproverEmail(e.target.value)}
                  placeholder="e.g. marcus@institution.edu or reviewer email"
                  required
                  id="approver-input-email"
                />
              </div>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '11.5px', marginBottom: '3px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} color="#85616E" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '32px', height: '34px', fontSize: '12.5px' }}
                  value={approverPassword}
                  onChange={(e) => setApproverPassword(e.target.value)}
                  placeholder="Password"
                  required
                  id="approver-input-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={approverLoading}
              className="btn btn-primary"
              style={{ width: '100%', height: '36px', fontSize: '13px', marginTop: '4px' }}
              id="submit-approvals-login-btn"
            >
              {approverLoading ? 'Signing in...' : 'Sign In to Approvals'}
              <ArrowRight size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};