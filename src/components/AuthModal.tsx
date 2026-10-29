import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Lock,
  User,
  Mail,
  Shield,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { login, register, pendingBookingContext } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password@123');

  // Register Fields
  const [name, setName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [institutionId, setInstitutionId] = useState('INST_ENG');
  const [department, setDepartment] = useState('Electrical Engineering');
  const [safetyLevel, setSafetyLevel] = useState<number>(2);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your academic or institutional email address.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    const res = await login(email.trim(), password);
    setLoading(false);
    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.message || 'Invalid email or password.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !regEmail.trim() || !regPassword) {
      setErrorMsg('All fields are required.');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    const instNames: Record<string, string> = {
      INST_ENG: 'College of Engineering & Applied Sciences',
      INST_MED: 'School of Medicine & Bio-Innovations',
      INST_COMP: 'Turing Institute for Advanced Computing',
      INST_EXTERNAL: 'National Science Alliance (External)',
    };

    const res = await register({
      name: name.trim(),
      email: regEmail.trim(),
      password: regPassword,
      institutionId,
      institutionName: instNames[institutionId] || 'University Partner',
      department: department.trim() || 'General Research',
      title: 'Researcher',
      safetyLevel,
    });

    setLoading(false);
    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.message || 'Registration failed.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px', width: '92%' }}
        id="auth-modal"
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#F2E8DC', fontWeight: 800 }}>
              Institutional Identity Provider
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#F2E8DC' }}>
              {mode === 'login' ? 'Sign In to ShareSphere AI' : 'Create Academic Researcher Account'}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#F2E8DC', cursor: 'pointer', padding: '6px' }}
            id="close-auth-modal-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Pending Booking Notice */}
        {pendingBookingContext && (
          <div
            style={{
              padding: '12px 18px',
              background: 'rgba(48, 21, 30, 0.08)',
              borderBottom: '1px solid rgba(48, 21, 30, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Sparkles size={16} color="#30151E" />
            <span style={{ fontSize: '12.5px', color: '#30151E', fontWeight: 600 }}>
              Sign in to immediately resume your pending reservation request.
            </span>
          </div>
        )}

        <div className="modal-body">
          {/* Mode Switcher Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid rgba(48, 21, 30, 0.12)',
              marginBottom: '20px',
            }}
          >
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); }}
              style={{
                flex: 1,
                padding: '10px',
                background: 'none',
                border: 'none',
                borderBottom: mode === 'login' ? '2.5px solid #30151E' : '2.5px solid transparent',
                color: mode === 'login' ? '#30151E' : 'var(--text-muted)',
                fontWeight: 800,
                fontSize: '13.5px',
                cursor: 'pointer',
              }}
              id="tab-sign-in"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setErrorMsg(''); }}
              style={{
                flex: 1,
                padding: '10px',
                background: 'none',
                border: 'none',
                borderBottom: mode === 'register' ? '2.5px solid #30151E' : '2.5px solid transparent',
                color: mode === 'register' ? '#30151E' : 'var(--text-muted)',
                fontWeight: 800,
                fontSize: '13.5px',
                cursor: 'pointer',
              }}
              id="tab-create-account"
            >
              Register New Account
            </button>
          </div>

          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.35)',
                color: '#fb7185',
                fontSize: '13px',
                marginBottom: '16px',
              }}
              id="auth-error-banner"
            >
              {errorMsg}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label" htmlFor="login-email">
                  Institutional Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  <input
                    type="email"
                    id="login-email"
                    className="form-input"
                    style={{ paddingLeft: '38px' }}
                    placeholder="e.g. alex@institution.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="login-password">
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  <input
                    type="password"
                    id="login-password"
                    className="form-input"
                    style={{ paddingLeft: '38px' }}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Default password for demo accounts: <code>Password@123</code>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '8px' }}
                disabled={loading}
                id="submit-login-btn"
              >
                {loading ? 'Authenticating...' : 'Sign In to Platform'}
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label" htmlFor="reg-name">
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  <input
                    type="text"
                    id="reg-name"
                    className="form-input"
                    style={{ paddingLeft: '38px' }}
                    placeholder="e.g. Jordan Lee"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="reg-email">
                  Institutional Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  <input
                    type="email"
                    id="reg-email"
                    className="form-input"
                    style={{ paddingLeft: '38px' }}
                    placeholder="jordan.lee@test.edu"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="reg-password">
                  Password (min 6 characters)
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  <input
                    type="password"
                    id="reg-password"
                    className="form-input"
                    style={{ paddingLeft: '38px' }}
                    placeholder="Create a strong password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" htmlFor="reg-institution">
                    Owning Institution
                  </label>
                  <select
                    id="reg-institution"
                    className="form-select"
                    value={institutionId}
                    onChange={(e) => setInstitutionId(e.target.value)}
                  >
                    <option value="INST_ENG">College of Engineering (COE)</option>
                    <option value="INST_MED">School of Medicine (SOM)</option>
                    <option value="INST_COMP">Turing Institute (TIAC)</option>
                    <option value="INST_EXTERNAL">External Affiliate (NSA)</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" htmlFor="reg-safety">
                    Certified Safety Clearance
                  </label>
                  <select
                    id="reg-safety"
                    className="form-select"
                    value={safetyLevel}
                    onChange={(e) => setSafetyLevel(Number(e.target.value))}
                  >
                    <option value={1}>Level 1: General Lab Protocol</option>
                    <option value={2}>Level 2: High-Voltage / Precision</option>
                    <option value={3}>Level 3: Master Hazmat / Laser</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="reg-department">
                  Department / Lab Group
                </label>
                <input
                  type="text"
                  id="reg-department"
                  className="form-input"
                  placeholder="e.g. Electrical Engineering"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>

              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                <Shield size={12} style={{ display: 'inline', marginRight: '4px' }} />
                New accounts receive <strong>RESOURCE_SEEKER</strong> privileges by default. Administrative access is granted by institutional sign-off.
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '6px' }}
                disabled={loading}
                id="submit-register-btn"
              >
                {loading ? 'Creating Account...' : 'Complete Academic Registration'}
                <ArrowRight size={16} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
