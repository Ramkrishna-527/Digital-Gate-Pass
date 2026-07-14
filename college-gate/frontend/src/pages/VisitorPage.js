import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function QRTimer({ expiresAt }) {
  const [remaining, setRemaining] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const tick = () => {
      const diff = new Date(expiresAt) - new Date();
      if (diff <= 0) {
        setRemaining('00:00:00');
        setExpired(true);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <div style={{ textAlign: 'center', marginBottom: 8 }}>
      <div className="qr-timer" style={{ color: expired ? '#ef4444' : '#f59e0b' }}>
        {remaining}
      </div>
      <div className="qr-timer-label">{expired ? 'PASS EXPIRED' : 'Time Remaining'}</div>
    </div>
  );
}

export default function VisitorPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [cause, setCause] = useState('');
  const [durationValue, setDurationValue] = useState('');
  const [durationUnit, setDurationUnit] = useState('hours');
  const [duration, setDuration] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');

  const [tab, setTab] = useState('new');
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchMyRequests = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/requests/mine');
      setMyRequests(data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchMyRequests();
  }, [fetchMyRequests]);

  // Automatically compute duration string and durationMinutes from value + unit
  const handleDurationChange = (value, unit) => {
    setDurationValue(value);
    setDurationUnit(unit);
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      const mins =
        unit === 'hours' ? Math.round(num * 60) : Math.round(num);
      const label =
        unit === 'hours'
          ? `${value} hour${num !== 1 ? 's' : ''}`
          : `${value} minute${num !== 1 ? 's' : ''}`;
      setDuration(label);
      setDurationMinutes(String(mins));
    } else {
      setDuration('');
      setDurationMinutes('');
    }
  };

  const handleSubmit = async () => {
    if (!cause.trim()) return setError('Please describe the purpose of your visit');
    if (!durationValue || !duration) return setError('Please specify how long you need');
    setError('');
    setLoading(true);
    try {
      await axios.post('/api/requests', {
        type: 'entry',
        cause,
        duration,
        durationMinutes: durationMinutes ? parseInt(durationMinutes) : null,
      });
      setSuccess('Visit request submitted! Awaiting HOD approval.');
      setCause('');
      setDurationValue('');
      setDurationUnit('hours');
      setDuration('');
      setDurationMinutes('');
      fetchMyRequests();
      setTab('my');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  const activePass = myRequests.find(
    (r) =>
      r.status === 'approved' &&
      r.qrCode &&
      new Date(r.qrExpiresAt) > new Date()
  );

  return (
    <div className="page-wrapper">
      <nav className="top-nav">
        <div className="nav-brand">
          <span>🧑</span> College Gate
          <span className="badge">Visitor</span>
        </div>
        <div className="nav-user">
          <span>👤 {user?.name}</span>
          <button
            className="btn-logout"
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="main-content">
        <div
          className="alert alert-info"
          style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}
        >
          <span style={{ fontSize: '1.3rem' }}>🚪</span>
          <div>
            <strong>Entry pass required.</strong>&nbsp; Submit a visit request below. Once the HOD
            approves, you'll receive a QR code to show at the gate. Exit is handled directly by the
            Gate Keeper — no request needed to leave.
          </div>
        </div>

        {activePass && (
          <div className="card fade-in" style={{ borderColor: '#10b981' }}>
            <div className="card-title" style={{ color: '#065f46' }}>
              ✅ Active Visit Pass
            </div>
            <div className="qr-wrapper">
              <div style={{ fontSize: '0.9rem', opacity: 0.75 }}>
                ENTRY — {activePass.cause}
              </div>
              <QRTimer expiresAt={activePass.qrExpiresAt} />
              <img
                src={activePass.qrCode}
                alt="QR Pass"
                style={{ width: 220, height: 220 }}
              />
              <div style={{ fontSize: '0.8rem', opacity: 0.65, marginTop: 8 }}>
                Show this QR to the Gate Keeper at entry
              </div>
            </div>
          </div>
        )}

        <div className="tabs">
          <button
            className={`tab ${tab === 'new' ? 'active' : ''}`}
            onClick={() => setTab('new')}
          >
            🚪 New Visit Request
          </button>
          <button
            className={`tab ${tab === 'my' ? 'active' : ''}`}
            onClick={() => {
              setTab('my');
              fetchMyRequests();
            }}
          >
            📋 My Requests
          </button>
        </div>

        {tab === 'new' && (
          <div className="card fade-in">
            <div className="card-title">🚪 Visit Entry Request</div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: 24 }}>
              Fill in why you are visiting and how long you need. HOD will review your request.
            </p>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="form-group">
              <label className="form-label">Purpose of Visit *</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="e.g. Meeting with Professor, Parent visit, Administrative work..."
                value={cause}
                onChange={(e) => setCause(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Duration *</label>
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  placeholder="e.g. 1"
                  value={durationValue}
                  onChange={(e) => handleDurationChange(e.target.value, durationUnit)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Unit *</label>
                <select
                  className="form-control"
                  value={durationUnit}
                  onChange={(e) => handleDurationChange(durationValue, e.target.value)}
                >
                  <option value="hours">Hours</option>
                  <option value="minutes">Minutes</option>
                </select>
              </div>
            </div>

            {duration && (
              <div
                className="alert alert-info"
                style={{ marginBottom: 16, padding: '8px 14px', fontSize: '0.85rem' }}
              >
                ⏱ Pass will be valid for <strong>{duration}</strong> ({durationMinutes} minutes)
              </div>
            )}

            <button
              className="btn btn-primary btn-lg"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Submitting...' : '📤 Submit Visit Request'}
            </button>
          </div>
        )}

        {tab === 'my' && (
          <div className="card fade-in">
            <div className="card-title">📋 My Visit Requests</div>
            {myRequests.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📭</div>
                <p>No requests yet</p>
              </div>
            ) : (
              myRequests.map((req) => (
                <div key={req._id} className="request-card fade-in">
                  <div className="request-card-header">
                    <div>
                      <div className="request-name">{req.cause}</div>
                      <div className="request-meta">
                        ⏱ {req.duration} ·{' '}
                        {new Date(req.requestedAt).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <span className={`tag tag-${req.status}`}>
                      {req.status.toUpperCase()}
                    </span>
                  </div>

                  {req.status === 'approved' && req.qrCode && (
                    <div style={{ marginTop: 12 }}>
                      {new Date(req.qrExpiresAt) > new Date() ? (
                        <div className="qr-wrapper" style={{ padding: '16px' }}>
                          <QRTimer expiresAt={req.qrExpiresAt} />
                          <img
                            src={req.qrCode}
                            alt="QR"
                            style={{ width: 180, height: 180 }}
                          />
                        </div>
                      ) : (
                        <div
                          className="alert alert-error"
                          style={{ marginTop: 8, marginBottom: 0 }}
                        >
                          ⏰ Pass expired
                        </div>
                      )}
                    </div>
                  )}

                  {req.status === 'pending' && (
                    <div
                      className="alert alert-info"
                      style={{ marginTop: 8, marginBottom: 0 }}
                    >
                      ⏳ Awaiting HOD approval
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
