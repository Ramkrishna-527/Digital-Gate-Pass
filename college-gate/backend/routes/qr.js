const express = require('express');
const router = express.Router();
const Request = require('../models/Request');
const History = require('../models/History');
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');

// @route POST /api/qr/manual-log  - Gatekeeper manually logs entry/exit (ID card check, after-5pm exit)
router.post('/manual-log', protect, requireRole('gatekeeper'), async (req, res) => {
  try {
    const { userId, type, cause } = req.body;
    const person = await User.findById(userId).select('-password');
    if (!person) return res.status(404).json({ message: 'User not found' });

    await History.create({
      user: person._id,
      userName: person.name,
      userRole: person.role,
      userDept: person.department || null,
      userRoll: person.rollNumber || null,
      type,
      cause: cause || (type === 'entry' ? 'College Entry (ID Check)' : 'College Exit'),
      scanResult: 'eligible',
      scannedBy: req.user._id
    });

    res.json({ success: true, message: `${type} logged for ${person.name}` });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route POST /api/qr/scan  - Gatekeeper scans QR
router.post('/scan', protect, requireRole('gatekeeper'), async (req, res) => {
  try {
    const { qrData } = req.body;

    let parsed;
    try {
      parsed = JSON.parse(qrData);
    } catch {
      return res.json({ result: 'not_eligible', message: 'Invalid QR Code' });
    }

    const { token, requestId, expiresAt } = parsed;

    const request = await Request.findById(requestId);
    if (!request || request.qrToken !== token) {
      return res.json({ result: 'not_eligible', message: 'QR Code not recognized' });
    }

    if (request.status !== 'approved') {
      return res.json({ result: 'not_eligible', message: 'Request was not approved' });
    }

    const now = new Date();
    const expiry = new Date(expiresAt);

    let result, message;

    if (now > expiry) {
      result = 'expired';
      message = `Was eligible till ${expiry.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      result = 'eligible';
      message = `Eligible till ${expiry.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    }

    // Log the scan
    await History.create({
      user: request.requestedBy,
      userName: request.requesterName,
      userRole: request.requesterRole,
      userDept: request.requesterDept,
      userRoll: request.requesterRoll,
      request: request._id,
      type: request.type,
      cause: request.cause,
      scanResult: result,
      scannedBy: req.user._id
    });

    res.json({
      result,
      message,
      name: request.requesterName,
      role: request.requesterRole,
      type: request.type,
      cause: request.cause,
      expiresAt: expiry.toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
