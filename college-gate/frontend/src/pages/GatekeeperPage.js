import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import jsQR from 'jsqr';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// ─── QR Scanner ───────────────────────────────────────────────────────────────
function QRScanner({ onResult, onClose }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef    = useRef(null);
  const doneRef   = useRef(false);

  const [camError, setCamError] = useState('');
  const [ready, setReady]       = useState(false); // ✅ FIX 1: gate scan loop on video readiness

  // ── Start camera ─────────────────────────────────────────────────────────
  useEffect(() => {
    doneRef.current = false; // ✅ FIX 2: reset every time scanner opens

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: 'environment',
          width:  { ideal: 1280 },
          height: { ideal: 720  },
        },
      })
      .then((stream) => {
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.play();
          // ✅ FIX 3: only mark ready once video data is actually available
          video.onloadeddata = () => setReady(true);
        }
      })
      .catch(() =>
        setCamError('Camera access denied. Allow camera permission and try again.')
      );

    return () => {
      doneRef.current = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Scan loop — only starts once video is ready ───────────────────────────
  useEffect(() => {
    if (!ready) return; // ✅ FIX 4: do not run until video fires onloadeddata

    const scan = () => {
      if (doneRef.current) return;

      const video  = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === 4) {
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // ✅ FIX 5: guard against jsQR resolving to undefined (CJS/ESM mismatch)
        const jsQRFn = typeof jsQR === 'function' ? jsQR : jsQR?.default;
        if (!jsQRFn) {
          console.error('jsQR failed to load. Run: npm install jsqr');
          setCamError('QR library failed to load. Please refresh the page.');
          return;
        }

        const code = jsQRFn(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code?.data) {
          doneRef.current = true;
          streamRef.current?.getTracks().forEach((t) => t.stop());
          cancelAnimationFrame(rafRef.current);
          onResult(code.data);
          return;
        }
      }

      rafRef.current = requestAnimationFrame(scan);
    };

    rafRef.current = requestAnimationFrame(scan);

    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, onResult]); // ✅ FIX 6: correctly depends on `ready`

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(11,20,55,0.93)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0b1437' }}>📷 Scan QR Code</span>
          <button
            onClick={onClose}
            style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: '1rem' }}
          >✕</button>
        </div>

        {/* Camera error */}
        {camError ? (
          <div style={{
            background: '#fee2e2', color: '#991b1b', borderRadius: 10,
            padding: 16, textAlign: 'center', fontSize: '0.875rem',
          }}>
            {camError}
          </div>
        ) : (
          <>
            {/* Video viewport */}
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', aspectRatio: '1' }}>
              <video
                ref={videoRef}
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />

              {/* Aim overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <div style={{
                  width: 190, height: 190,
                  border: '3px solid #f59e0b',
                  borderRadius: 14,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                }} />
              </div>

              {/* Status indicator */}
              <div style={{
                position: 'absolute', bottom: 12, left: 0, right: 0,
                textAlign: 'center', color: '#f59e0b',
                fontSize: '0.75rem', fontWeight: 700, letterSpacing: 1,
              }}>
                {ready ? '● SCANNING' : '⏳ STARTING CAMERA…'}
              </div>
            </div>

            {/* Hidden canvas for jsQR processing */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </>
        )}

        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem', marginTop: 12 }}>
          Point camera at the QR code — result shows automatically
        </p>

        <button
          onClick={onClose}
          style={{
            width: '100%', marginTop: 12, padding: '10px',
            border: '1.5px solid #dde5ff', borderRadius: 10,
            background: '#fff', fontFamily: 'Sora, sans-serif',
            fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', color: '#64748b',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Scan Result Modal ────────────────────────────────────────────────────────
function ScanResultModal({ result, onClose }) {
  const cfg = {
    eligible:     { bg: 'linear-gradient(135deg,#065f46,#059669)', icon: '✅', label: 'ELIGIBLE'      },
    expired:      { bg: 'linear-gradient(135deg,#92400e,#d97706)', icon: '⏰', label: 'PASS EXPIRED'  },
    not_eligible: { bg: 'linear-gradient(135deg,#7f1d1d,#ef4444)', icon: '❌', label: 'NOT ELIGIBLE'  },
  }[result.result] ?? { bg: 'linear-gradient(135deg,#7f1d1d,#ef4444)', icon: '❌', label: 'NOT ELIGIBLE' };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(11,20,55,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Result card */}
        <div style={{
          background: cfg.bg, borderRadius: 20,
          padding: '36px 28px', textAlign: 'center',
          color: '#fff', marginBottom: 14,
        }}>
          <div style={{ fontSize: '4rem', marginBottom: 10 }}>{cfg.icon}</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, marginBottom: 8 }}>{cfg.label}</div>
          <div style={{ fontSize: '1rem', fontWeight: 600, opacity: 0.95, marginBottom: 14 }}>{result.message}</div>

          {result.name && (
            <div style={{ background: 'rgba(255,255,255,0.17)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{result.name}</div>
              <div style={{ opacity: 0.8, fontSize: '0.85rem', marginTop: 4 }}>
                {result.role && result.role.charAt(0).toUpperCase() + result.role.slice(1)}
                {result.type  && ` · ${result.type.toUpperCase()}`}
                {result.cause && ` · ${result.cause}`}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '14px', borderRadius: 12,
            border: 'none', background: '#fff',
            fontFamily: 'Sora, sans-serif', fontSize: '0.95rem',
            fontWeight: 700, cursor: 'pointer', color: '#0b1437',
          }}
        >
          ↩ Close
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GatekeeperPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [persons,      setPersons]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [showScanner,  setShowScanner]  = useState(false);
  const [scanResult,   setScanResult]   = useState(null);
  const [actionStatus, setActionStatus] = useState({});

  // ── Fetch all registered persons ─────────────────────────────────────────
  const fetchPersons = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/auth/users');
      setPersons(data);
    } catch {
      alert('Failed to load persons list');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPersons(); }, [fetchPersons]);

  // ── QR scanned → call API, show result ───────────────────────────────────
  const handleQRScanned = useCallback(async (qrData) => {
    setShowScanner(false);
    try {
      const { data } = await axios.post('/api/qr/scan', { qrData });
      setScanResult(data);
    } catch {
      setScanResult({ result: 'not_eligible', message: 'Server error. Try again.' });
    }
  }, []);

  // ── Manual entry / exit log ───────────────────────────────────────────────
  const logAction = async (person, type) => {
    setActionStatus((s) => ({ ...s, [person._id]: 'loading' }));
    try {
      await axios.post('/api/qr/manual-log', {
        userId: person._id,
        type,
        cause: type === 'entry' ? 'College Entry (Gate Keeper)' : 'College Exit (Gate Keeper)',
      });
      setActionStatus((s) => ({ ...s, [person._id]: type }));
      setTimeout(() => setActionStatus((s) => ({ ...s, [person._id]: null })), 3000);
    } catch {
      setActionStatus((s) => ({ ...s, [person._id]: 'error' }));
      setTimeout(() => setActionStatus((s) => ({ ...s, [person._id]: null })), 3000);
    }
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = persons.filter((p) => {
    const t = search.toLowerCase();
    return (
      !t ||
      p.name.toLowerCase().includes(t) ||
      (p.rollNumber  || '').toLowerCase().includes(t) ||
      (p.department  || '').toLowerCase().includes(t) ||
      (p.phone       || '').includes(t)
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="page-wrapper">

      {/* ── Top Nav ── */}
      <nav className="top-nav">
        <div className="nav-brand">
          <span>🚧</span> College Gate
          <span className="badge">Gate Keeper</span>
        </div>
        <div className="nav-user">
          <span>👤 {user?.name}</span>
          <button className="btn-logout" onClick={() => { logout(); navigate('/'); }}>Logout</button>
        </div>
      </nav>

      <div className="main-content" style={{ maxWidth: 860 }}>

        {/* ── QR Scanner Section ── */}
        <div className="card" style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="card-title" style={{ justifyContent: 'center' }}>📷 QR Code Scanner</div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: 20 }}>
            Scan a student's QR pass to instantly check if it is valid, expired, or not eligible.
            Result appears automatically after scan — no button needed.
          </p>
          <button
            className="btn btn-primary btn-lg"
            style={{ minWidth: 220 }}
            onClick={() => setShowScanner(true)}
          >
            📷 Open Scanner
          </button>
        </div>

        {/* ── Persons List Section ── */}
        <div className="card">
          <div className="card-title">👥 Registered Persons</div>

          {/* Search bar */}
          <div style={{ marginBottom: 16 }}>
            <input
              className="form-control"
              placeholder="🔍  Search by name, roll number, department or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="icon">👥</div>
              <p>No persons found</p>
            </div>
          ) : (
            filtered.map((person) => {
              const status    = actionStatus[person._id];
              const isStudent = person.role === 'student';

              return (
                <div
                  key={person._id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                    padding: '14px 16px', borderRadius: 12, border: '1px solid #dde5ff',
                    background: '#fff', marginBottom: 10, transition: 'box-shadow 0.15s',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: isStudent ? '#dbeafe' : '#ede9fe',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                  }}>
                    {isStudent ? '🎓' : '🧑'}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 700, color: '#0b1437', fontSize: '0.95rem' }}>
                      {person.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 3 }}>
                      <span style={{
                        background: isStudent ? '#dbeafe' : '#ede9fe',
                        color: isStudent ? '#1e40af' : '#4c1d95',
                        padding: '1px 7px', borderRadius: 20,
                        fontWeight: 700, fontSize: '0.67rem', marginRight: 6,
                      }}>
                        {person.role.toUpperCase()}
                      </span>
                      {isStudent
                        ? `${person.courseName} · ${person.department} · Sec ${person.section} · ${person.rollNumber} · 📱 ${person.phone}`
                        : `📱 ${person.phone}`}
                    </div>
                  </div>

                  {/* Action buttons / feedback */}
                  {status === 'loading' ? (
                    <div style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 600 }}>⏳ Saving...</div>
                  ) : status === 'entry' ? (
                    <div style={{ background: '#d1fae5', color: '#065f46', padding: '6px 14px', borderRadius: 10, fontWeight: 700, fontSize: '0.82rem' }}>✅ Entry Logged</div>
                  ) : status === 'exit' ? (
                    <div style={{ background: '#ede9fe', color: '#4c1d95', padding: '6px 14px', borderRadius: 10, fontWeight: 700, fontSize: '0.82rem' }}>✅ Exit Logged</div>
                  ) : status === 'error' ? (
                    <div style={{ background: '#fee2e2', color: '#991b1b', padding: '6px 14px', borderRadius: 10, fontWeight: 700, fontSize: '0.82rem' }}>❌ Failed</div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button className="btn btn-success btn-sm" onClick={() => logAction(person, 'entry')}>🚪 Entry</button>
                      <button className="btn btn-danger  btn-sm" onClick={() => logAction(person, 'exit' )}>🚶 Exit</button>
                    </div>
                  )}
                </div>
              );
            })
          )}

          <div style={{ textAlign: 'center', marginTop: 8, color: '#94a3b8', fontSize: '0.78rem' }}>
            {filtered.length} person{filtered.length !== 1 ? 's' : ''} ·{' '}
            <span style={{ cursor: 'pointer', color: '#1a56db' }} onClick={fetchPersons}>↻ Refresh list</span>
          </div>
        </div>
      </div>

      {/* Scanner modal — key prop forces full remount (fresh refs) each open */}
      {showScanner && (
        <QRScanner
          key={Date.now()}
          onResult={handleQRScanned}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Result modal */}
      {scanResult && (
        <ScanResultModal result={scanResult} onClose={() => setScanResult(null)} />
      )}
    </div>
  );
}
