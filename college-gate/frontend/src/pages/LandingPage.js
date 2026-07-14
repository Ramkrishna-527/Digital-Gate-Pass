import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ROLE_LABELS = {
  student: 'Student',
  visitor: 'Visitor',
  hod: 'HOD',
  gatekeeper: 'Gate Keeper'
};

export default function LandingPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('home'); // home | login | register
  const [userType, setUserType] = useState(null); // 'user' | 'admin'
  const [role, setRole] = useState(null);

  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = { ...form, role };
      const { data } = await axios.post(endpoint, payload);
      if (mode === 'login') {
        login(data);
        navigate(`/${data.role}`);
      } else {
        setSuccess('Registration successful! Please login.');
        setMode('login');
        setForm({});
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setMode('home'); setUserType(null); setRole(null); setForm({}); setError(''); setSuccess(''); };

  // ----- Render Home -----
  if (mode === 'home') {
    return (
      <div className="landing-root">
        <style>{landingStyles}</style>
        <div className="landing-left">
          <div className="college-brand">
            <div className="college-icon">🎓</div>
            <h1>College Gate<br /><span>Management System</span></h1>
            <p>Smart entry & exit tracking for students, visitors, and staff.</p>
          </div>
          <div className="college-features">
            <div className="feature"><span>🔒</span><div><b>Role-Based Access</b><p>Student, Visitor, HOD & Gate Keeper</p></div></div>
            <div className="feature"><span>📲</span><div><b>QR Code Passes</b><p>Instant digital entry/exit passes</p></div></div>
            <div className="feature"><span>📋</span><div><b>Full History</b><p>Complete entry/exit audit trail</p></div></div>
          </div>
        </div>

        <div className="landing-right">
          <div className="landing-card">
            <h2>Welcome</h2>
            <p className="sub">Select who you are to continue</p>

            <div className="user-type-grid">
              <button className="user-type-btn" onClick={() => { setUserType('user'); setMode('choose-role'); }}>
                <span className="utype-icon">👤</span>
                <span className="utype-label">User</span>
                <span className="utype-sub">Student / Visitor</span>
              </button>
              <button className="user-type-btn admin" onClick={() => { setUserType('admin'); setMode('choose-role'); }}>
                <span className="utype-icon">🛡️</span>
                <span className="utype-label">Admin</span>
                <span className="utype-sub">HOD / Gate Keeper</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----- Choose Role -----
  if (mode === 'choose-role') {
    const roles = userType === 'user' ? ['student', 'visitor'] : ['hod', 'gatekeeper'];
    const icons = { student: '🎓', visitor: '🧑', hod: '👨‍🏫', gatekeeper: '🚧' };
    return (
      <div className="landing-root">
        <style>{landingStyles}</style>
        <div className="landing-left">
          <div className="college-brand">
            <div className="college-icon">🎓</div>
            <h1>College Gate<br /><span>Management System</span></h1>
          </div>
        </div>
        <div className="landing-right">
          <div className="landing-card fade-in">
            <button className="back-btn" onClick={reset}>← Back</button>
            <h2>I am a...</h2>
            <div className="role-grid">
              {roles.map(r => (
                <button key={r} className={`role-btn ${role === r ? 'selected' : ''}`}
                  onClick={() => setRole(r)}>
                  <span className="role-icon">{icons[r]}</span>
                  <span className="role-name">{ROLE_LABELS[r]}</span>
                </button>
              ))}
            </div>
            {role && (
              <div className="auth-actions fade-in">
                <button className="btn btn-primary btn-lg" style={{ width: '100%', marginBottom: 12 }}
                  onClick={() => setMode('login')}>Login as {ROLE_LABELS[role]}</button>
                <button className="btn btn-ghost btn-lg" style={{ width: '100%' }}
                  onClick={() => setMode('register')}>Register as {ROLE_LABELS[role]}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----- Login / Register Form -----
  const isLogin = mode === 'login';

  return (
    <div className="landing-root">
      <style>{landingStyles}</style>
      <div className="landing-left">
        <div className="college-brand">
          <div className="college-icon">🎓</div>
          <h1>College Gate<br /><span>Management System</span></h1>
        </div>
      </div>
      <div className="landing-right">
        <div className="landing-card fade-in" style={{ maxWidth: 480, width: '100%' }}>
          <button className="back-btn" onClick={() => { setMode('choose-role'); setError(''); setSuccess(''); }}>← Back</button>
          <h2>{isLogin ? 'Login' : 'Register'}</h2>
          <p className="sub">{ROLE_LABELS[role]} {isLogin ? 'Account' : 'Registration'}</p>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {/* Common fields */}
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-control" placeholder="Enter full name"
                value={form.name || ''} onChange={e => set('name', e.target.value)} />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Phone Number *</label>
            <input className="form-control" placeholder="10-digit phone number" type="tel"
              value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
          </div>

          {/* HOD email */}
          {!isLogin && role === 'hod' && (
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-control" placeholder="Official email" type="email"
                value={form.email || ''} onChange={e => set('email', e.target.value)} />
            </div>
          )}

          {/* Student fields */}
          {!isLogin && role === 'student' && <>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Course Name *</label>
                <input className="form-control" placeholder="e.g. B.Tech" value={form.courseName || ''} onChange={e => set('courseName', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Department *</label>
                <input className="form-control" placeholder="e.g. CSE" value={form.department || ''} onChange={e => set('department', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Section *</label>
                <input className="form-control" placeholder="e.g. A" value={form.section || ''} onChange={e => set('section', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Roll Number *</label>
                <input className="form-control" placeholder="e.g. 21CSE001" value={form.rollNumber || ''} onChange={e => set('rollNumber', e.target.value)} />
              </div>
            </div>
          </>}

          {/* HOD department */}
          {!isLogin && role === 'hod' && (
            <div className="form-group">
              <label className="form-label">Department *</label>
              <input className="form-control" placeholder="e.g. CSE" value={form.department || ''} onChange={e => set('department', e.target.value)} />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input className="form-control" type="password" placeholder="Enter password"
              value={form.password || ''} onChange={e => set('password', e.target.value)} />
          </div>

          <button className="btn btn-primary btn-lg" style={{ width: '100%' }}
            onClick={handleSubmit} disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
          </button>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.875rem', color: '#64748b' }}>
            {isLogin ? "Don't have an account?" : "Already registered?"}{' '}
            <button style={{ background: 'none', border: 'none', color: '#1a56db', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              onClick={() => { setMode(isLogin ? 'register' : 'login'); setError(''); setSuccess(''); }}>
              {isLogin ? 'Register here' : 'Login here'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

const landingStyles = `
.landing-root {
  min-height: 100vh;
  display: flex;
}
.landing-left {
  flex: 1;
  background: linear-gradient(145deg, #0b1437 0%, #1a237e 60%, #1a56db 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 60px 56px;
  position: relative;
  overflow: hidden;
}
.landing-left::before {
  content: '';
  position: absolute;
  top: -80px; right: -80px;
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%);
  border-radius: 50%;
}
.college-icon { font-size: 3.5rem; margin-bottom: 20px; }
.college-brand h1 {
  font-size: 2.4rem;
  font-weight: 800;
  color: #fff;
  line-height: 1.15;
  margin-bottom: 16px;
}
.college-brand h1 span { color: #f59e0b; }
.college-brand > p { color: rgba(255,255,255,0.65); font-size: 1rem; margin-bottom: 48px; max-width: 380px; }
.college-features { display: flex; flex-direction: column; gap: 20px; }
.feature {
  display: flex; align-items: flex-start; gap: 16px;
  background: rgba(255,255,255,0.07);
  padding: 16px 20px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.1);
  max-width: 400px;
}
.feature > span { font-size: 1.5rem; flex-shrink: 0; }
.feature b { display: block; color: #fff; font-size: 0.9rem; margin-bottom: 2px; }
.feature p { color: rgba(255,255,255,0.55); font-size: 0.8rem; }

.landing-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  background: #f0f4ff;
}
.landing-card {
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 8px 40px rgba(11,20,55,0.14);
  padding: 40px 36px;
  width: 100%;
  max-width: 420px;
}
.landing-card h2 { font-size: 1.75rem; font-weight: 800; color: #0b1437; margin-bottom: 6px; }
.landing-card .sub { color: #64748b; font-size: 0.9rem; margin-bottom: 28px; }

.user-type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 8px; }
.user-type-btn {
  border: 2px solid #dde5ff;
  border-radius: 16px;
  background: #f8faff;
  padding: 24px 16px;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
  font-family: 'Sora', sans-serif;
}
.user-type-btn:hover { border-color: #1a56db; background: #eef4ff; transform: translateY(-2px); }
.user-type-btn.admin:hover { border-color: #f59e0b; background: #fffbeb; }
.utype-icon { font-size: 2.5rem; display: block; margin-bottom: 10px; }
.utype-label { display: block; font-size: 1rem; font-weight: 700; color: #0b1437; }
.utype-sub { display: block; font-size: 0.75rem; color: #94a3b8; margin-top: 4px; }

.role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; }
.role-btn {
  border: 2px solid #dde5ff;
  border-radius: 14px;
  background: #f8faff;
  padding: 20px 12px;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
  font-family: 'Sora', sans-serif;
}
.role-btn:hover, .role-btn.selected { border-color: #1a56db; background: #eef4ff; }
.role-icon { font-size: 2rem; display: block; margin-bottom: 8px; }
.role-name { font-size: 0.9rem; font-weight: 700; color: #0b1437; }

.auth-actions { margin-top: 8px; }
.back-btn {
  background: none; border: none;
  color: #64748b;
  font-size: 0.85rem;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  margin-bottom: 16px;
  padding: 0;
  font-weight: 500;
}
.back-btn:hover { color: #1a56db; }

@media (max-width: 860px) {
  .landing-root { flex-direction: column; }
  .landing-left { padding: 40px 28px; flex: none; }
  .college-brand h1 { font-size: 1.8rem; }
  .college-features { display: none; }
}
`;
