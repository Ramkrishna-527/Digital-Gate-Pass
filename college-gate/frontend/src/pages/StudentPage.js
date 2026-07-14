import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const CAUSES = {
  class_over: { label: '🏫 Class Over', minutes: null, description: 'Till 5:00 PM', tillFive: true },
  lunch: { label: '🍱 Lunch Break', minutes: 60, description: '1 hour' },
  medical: { label: '🏥 Medical / Health', minutes: null, description: 'Entire day' },
  personal: { label: '🧑 Personal Work', minutes: 120, description: '2 hours' },
  family: { label: '👨‍👩‍👧 Family Emergency', minutes: null, description: 'Entire day' },
  sports: { label: '⚽ Sports / Event', minutes: 180, description: '3 hours' },
  library: { label: '📚 Library / Study', minutes: 90, description: '1.5 hours' },
  bank: { label: '🏦 Bank / ATM', minutes: 60, description: '1 hour' },
  custom: { label: '✏️ Custom Reason', minutes: null, description: 'Set hours manually' }
};

function QRTimer({ expiresAt }) {
  const [remaining, setRemaining] = useState('');
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    const tick = () => {
      const diff = new Date(expiresAt) - new Date();
      if (diff <= 0) { setRemaining('00:00:00'); setExpired(true); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return (
    <div style={{ textAlign: 'center', marginBottom: 8 }}>
      <div className="qr-timer" style={{ color: expired ? '#ef4444' : '#f59e0b' }}>{remaining}</div>
      <div className="qr-timer-label">{expired ? 'PASS EXPIRED' : 'Time Remaining'}</div>
    </div>
  );
}

export default function StudentPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('new');
  const [cause, setCause] = useState('');
  const [customCause, setCustomCause] = useState('');
  const [customHours, setCustomHours] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [myRequests, setMyRequests] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(false);

  const fetchMyRequests = useCallback(async () => {
    setLoadingReqs(true);
    try {
      const { data } = await axios.get('/api/requests/mine');
      setMyRequests(data);
    } catch {}
    setLoadingReqs(false);
  }, []);

  useEffect(() => { fetchMyRequests(); }, [fetchMyRequests]);

  const handleSubmit = async () => {
    if (!cause) return setError('Please select a reason for exit');
    if (cause === 'custom' && !customCause) return setError('Please describe your reason');
    setError(''); setLoading(true);

    const causeData = CAUSES[cause];
    let duration, durationMinutes;

    if (cause === 'class_over') {
      duration = 'Till 5:00 PM';
      durationMinutes = null;
    } else if (cause === 'custom') {
      const hrs = parseFloat(customHours);
      if (customHours && !isNaN(hrs) && hrs > 0) {
        durationMinutes = Math.round(hrs * 60);
        duration = `${customHours} hour${hrs !== 1 ? 's' : ''}`;
      } else {
        durationMinutes = null;
        duration = 'As needed';
      }
    } else {
      duration = causeData.description;
      durationMinutes = causeData.minutes;
    }

    try {
      await axios.post('/api/requests', {
        type: 'exit',
        cause: cause === 'custom' ? customCause : causeData.label,
        customCause: cause === 'custom' ? customCause : null,
        duration,
        durationMinutes,
        tillFivepm: cause === 'class_over'
      });
      setSuccess('Exit request submitted! Awaiting HOD approval.');
      setCause(''); setCustomCause(''); setCustomHours('');
      fetchMyRequests();
      setTab('my');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const approvedWithQR = myRequests.find(r =>
    r.status === 'approved' && r.qrCode && new Date(r.qrExpiresAt) > new Date()
  );

  return (
    <div className="page-wrapper">
      <nav className="top-nav">
        <div className="nav-brand">
          <span>🎓</span> College Gate
          <span className="badge">Student</span>
        </div>
        <div className="nav-user">
          <span>👤 {user?.name}</span>
          <span style={{ color: '#94a3b8' }}>|</span>
          <span>{user?.rollNumber} · {user?.department}</span>
          <button className="btn-logout" onClick={() => { logout(); navigate('/'); }}>Logout</button>
        </div>
      </nav>

      <div className="main-content">
        <div className="alert alert-info" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: '1.3rem' }}>🚪</span>
          <div>
            <strong>Entry is handled by the Gate Keeper.</strong>&nbsp;
            Show your college ID card at the gate in the morning. Use this page only to request an exit pass during college hours.
          </div>
        </div>

        {approvedWithQR && (
          <div className="card fade-in" style={{ borderColor: '#10b981' }}>
            <div className="card-title" style={{ color: '#065f46' }}>✅ Active Exit Pass</div>
            <div className="qr-wrapper">
              <div style={{ fontSize: '0.9rem', opacity: 0.75, marginBottom: 4 }}>
                EXIT — {approvedWithQR.cause}
              </div>
              <QRTimer expiresAt={approvedWithQR.qrExpiresAt} />
              <img src={approvedWithQR.qrCode} alt="QR Pass" style={{ width: 220, height: 220 }} />
              <div style={{ fontSize: '0.8rem', opacity: 0.65, marginTop: 8 }}>
                Show this QR to the Gate Keeper when exiting
              </div>
            </div>
          </div>
        )}

        <div className="tabs">
          <button className={`tab ${tab === 'new' ? 'active' : ''}`} onClick={() => setTab('new')}>🚶 New Exit Request</button>
          <button className={`tab ${tab === 'my' ? 'active' : ''}`} onClick={() => { setTab('my'); fetchMyRequests(); }}>📋 My Requests</button>
        </div>

        {tab === 'new' && (
          <div className="card fade-in">
            <div className="card-title">🚶 Submit Exit Request</div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: 20 }}>
              Select your reason. HOD will approve and generate your QR exit pass.
            </p>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <label className="form-label">Reason for Exit</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 20 }}>
              {Object.entries(CAUSES).map(([key, val]) => (
                <button key={key} onClick={() => setCause(key)}
                  style={{
                    padding: '12px 14px',
                    border: `2px solid ${cause === key ? '#1a56db' : (key === 'class_over' ? '#f59e0b' : '#dde5ff')}`,
                    borderRadius: 12,
                    background: cause === key ? '#eef4ff' : (key === 'class_over' ? '#fffbeb' : '#fff'),
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'Sora, sans-serif',
                    transition: 'all 0.15s'
                  }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0b1437' }}>{val.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>⏱ {val.description}</div>
                </button>
              ))}
            </div>

            {cause === 'custom' && (
              <div className="fade-in">
                <div className="form-group">
                  <label className="form-label">Describe your reason *</label>
                  <input className="form-control" placeholder="Enter reason for exit..."
                    value={customCause} onChange={e => setCustomCause(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration in Hours (e.g. 1 = 1 hr, 1.5 = 90 min)</label>
                  <input className="form-control" type="number" step="0.5" min="0.5" placeholder="e.g. 1.5"
                    value={customHours} onChange={e => setCustomHours(e.target.value)} />
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 5 }}>
                    Leave blank if you need the entire remaining day
                  </div>
                </div>
              </div>
            )}

            {cause && (
              <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading} style={{ marginTop: 8 }}>
                {loading ? 'Submitting...' : '📤 Submit Exit Request'}
              </button>
            )}
          </div>
        )}

        {tab === 'my' && (
          <div className="card fade-in">
            <div className="card-title">📋 My Exit Requests</div>
            {loadingReqs
              ? <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>Loading...</div>
              : myRequests.length === 0
                ? <div className="empty-state"><div className="icon">📭</div><p>No requests yet</p></div>
                : myRequests.map(req => (
                  <div key={req._id} className="request-card fade-in">
                    <div className="request-card-header">
                      <div>
                        <div className="request-name">
                          <span className="tag tag-exit" style={{ marginRight: 8 }}>EXIT</span>
                          {req.cause}
                        </div>
                        <div className="request-meta">⏱ {req.duration} · {new Date(req.requestedAt).toLocaleString('en-IN')}</div>
                      </div>
                      <span className={`tag tag-${req.status}`}>{req.status.toUpperCase()}</span>
                    </div>
                    {req.status === 'approved' && req.qrCode && (
                      <div style={{ marginTop: 14 }}>
                        {new Date(req.qrExpiresAt) > new Date() ? (
                          <div className="qr-wrapper" style={{ padding: '20px 16px' }}>
                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Your Exit Pass QR Code</div>
                            <QRTimer expiresAt={req.qrExpiresAt} />
                            <img src={req.qrCode} alt="QR" style={{ width: 180, height: 180 }} />
                          </div>
                        ) : (
                          <div className="alert alert-error" style={{ marginTop: 8, marginBottom: 0 }}>
                            ⏰ Pass expired at {new Date(req.qrExpiresAt).toLocaleTimeString('en-IN')}
                          </div>
                        )}
                      </div>
                    )}
                    {req.status === 'rejected' && (
                      <div className="alert alert-error" style={{ marginTop: 8, marginBottom: 0 }}>❌ Request rejected by HOD</div>
                    )}
                    {req.status === 'pending' && (
                      <div className="alert alert-info" style={{ marginTop: 8, marginBottom: 0 }}>⏳ Awaiting HOD approval</div>
                    )}
                  </div>
                ))
            }
          </div>
        )}
      </div>
    </div>
  );
}
