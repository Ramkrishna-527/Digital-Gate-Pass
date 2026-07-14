import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function HodPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [loadingHist, setLoadingHist] = useState(false);
  const [processing, setProcessing] = useState({});
  const [error, setError] = useState('');

  // History filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoadingReqs(true);
    try {
      const { data } = await axios.get('/api/requests/pending');
      setRequests(data);
    } catch (err) {
      setError('Failed to load requests');
    }
    setLoadingReqs(false);
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoadingHist(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterType) params.type = filterType;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const { data } = await axios.get('/api/history', { params });
      setHistory(data);
    } catch {}
    setLoadingHist(false);
  }, [search, filterType, startDate, endDate]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  useEffect(() => { if (tab === 'history') fetchHistory(); }, [tab, fetchHistory]);

  const handleApprove = async (id) => {
    setProcessing(p => ({ ...p, [id]: 'approving' }));
    try {
      await axios.put(`/api/requests/${id}/approve`);
      setRequests(r => r.filter(req => req._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve');
    }
    setProcessing(p => ({ ...p, [id]: null }));
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this request?')) return;
    setProcessing(p => ({ ...p, [id]: 'rejecting' }));
    try {
      await axios.put(`/api/requests/${id}/reject`);
      setRequests(r => r.filter(req => req._id !== id));
    } catch {}
    setProcessing(p => ({ ...p, [id]: null }));
  };

  const roleIcon = { student: '🎓', visitor: '🧑' };

  return (
    <div className="page-wrapper">
      <nav className="top-nav">
        <div className="nav-brand">
          <span>👨‍🏫</span> College Gate
          <span className="badge">HOD</span>
        </div>
        <div className="nav-user">
          <span>📚 {user?.department} Dept.</span>
          <span style={{ color: '#94a3b8' }}>|</span>
          <span>{user?.name}</span>
          <button className="btn-logout" onClick={() => { logout(); navigate('/'); }}>Logout</button>
        </div>
      </nav>

      <div className="main-content">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="tabs">
          <button className={`tab ${tab === 'requests' ? 'active' : ''}`} onClick={() => setTab('requests')}>
            Pending Requests {requests.length > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', padding: '1px 7px', fontSize: '0.7rem', marginLeft: 6 }}>{requests.length}</span>}
          </button>
          <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
            Entry / Exit History
          </button>
        </div>

        {tab === 'requests' && (
          <div className="fade-in">
            {loadingReqs
              ? <div className="card"><div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading requests...</div></div>
              : requests.length === 0
                ? <div className="card"><div className="empty-state"><div className="icon">✅</div><p>No pending requests. All clear!</p></div></div>
                : requests.map(req => (
                  <div key={req._id} className="request-card fade-in">
                    <div className="request-card-header">
                      <div>
                        <div className="request-name">
                          {roleIcon[req.requesterRole] || '👤'} {req.requesterName}
                          <span className={`tag tag-${req.type}`} style={{ marginLeft: 10 }}>{req.type.toUpperCase()}</span>
                        </div>
                        <div className="request-meta">
                          {req.requesterRole === 'student' && (
                            <span>🎓 {req.requesterDept} · Roll: {req.requesterRoll} &nbsp;·&nbsp;</span>
                          )}
                          📱 {req.requesterPhone}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'right' }}>
                        {new Date(req.requestedAt).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div style={{
                      background: '#f8faff',
                      border: '1px solid #dde5ff',
                      borderRadius: 10,
                      padding: '12px 16px',
                      marginBottom: 4
                    }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Reason</div>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{req.cause}</div>
                      {req.customCause && <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 4 }}>{req.customCause}</div>}
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 6 }}>⏱ Duration: {req.duration}</div>
                    </div>

                    <div className="request-actions">
                      <button className="btn btn-success"
                        onClick={() => handleApprove(req._id)}
                        disabled={!!processing[req._id]}>
                        {processing[req._id] === 'approving' ? '⏳ Approving...' : '✅ Approve'}
                      </button>
                      <button className="btn btn-danger"
                        onClick={() => handleReject(req._id)}
                        disabled={!!processing[req._id]}>
                        {processing[req._id] === 'rejecting' ? '⏳ Rejecting...' : '❌ Reject'}
                      </button>
                    </div>
                  </div>
                ))
            }
          </div>
        )}

        {tab === 'history' && (
          <div className="fade-in">
            <div className="card">
              <div className="card-title">🔍 Search & Filter</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Search by Name / Roll</label>
                  <input className="form-control" placeholder="Search..."
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Type</label>
                  <select className="form-control" value={filterType} onChange={e => setFilterType(e.target.value)}>
                    <option value="">All</option>
                    <option value="entry">Entry</option>
                    <option value="exit">Exit</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">From Date</label>
                  <input className="form-control" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">To Date</label>
                  <input className="form-control" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" onClick={fetchHistory}>🔍 Search</button>
                <button className="btn btn-ghost" onClick={() => { setSearch(''); setFilterType(''); setStartDate(''); setEndDate(''); setTimeout(fetchHistory, 100); }}>Clear</button>
              </div>
            </div>

            <div className="card">
              <div className="card-title">📊 Entry / Exit History</div>
              {loadingHist
                ? <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>Loading...</div>
                : history.length === 0
                  ? <div className="empty-state"><div className="icon">📭</div><p>No history found</p></div>
                  : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="history-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Dept / Roll</th>
                            <th>Type</th>
                            <th>Cause</th>
                            <th>Result</th>
                            <th>Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map(h => (
                            <tr key={h._id}>
                              <td style={{ fontWeight: 600, color: '#0b1437' }}>{h.userName}</td>
                              <td><span style={{ textTransform: 'capitalize' }}>{h.userRole}</span></td>
                              <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                                {h.userDept && <span>{h.userDept}</span>}
                                {h.userRoll && <span> · {h.userRoll}</span>}
                              </td>
                              <td><span className={`tag tag-${h.type || 'entry'}`}>{(h.type || '-').toUpperCase()}</span></td>
                              <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.cause || '-'}</td>
                              <td>
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                                  background: h.scanResult === 'eligible' ? '#d1fae5' : h.scanResult === 'expired' ? '#fef3c7' : '#fee2e2',
                                  color: h.scanResult === 'eligible' ? '#065f46' : h.scanResult === 'expired' ? '#92400e' : '#991b1b'
                                }}>
                                  {h.scanResult === 'eligible' ? '✅' : h.scanResult === 'expired' ? '⏰' : '❌'}
                                  {h.scanResult}
                                </span>
                              </td>
                              <td style={{ color: '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                {new Date(h.scannedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
