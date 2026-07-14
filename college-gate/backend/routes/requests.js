const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const crypto = require('crypto');
const Request = require('../models/Request');
const { protect, requireRole } = require('../middleware/auth');

const CAUSE_DURATIONS = {
  lunch: { label: 'Lunch Break', minutes: 60 },
  medical: { label: 'Medical / Health', minutes: null }, // entire day
  personal: { label: 'Personal Work', minutes: 120 },
  family: { label: 'Family Emergency', minutes: null },
  sports: { label: 'Sports / Event', minutes: 180 },
  library: { label: 'Library / Study', minutes: 90 },
  bank: { label: 'Bank / ATM', minutes: 60 },
  custom: { label: 'Custom', minutes: null }
};

// @route POST /api/requests  - Student/Visitor submits request
router.post('/', protect, requireRole('student', 'visitor'), async (req, res) => {
  try {
    const { type, cause, customCause, duration, durationMinutes, tillFivepm } = req.body;
    const user = req.user;

    const hodDept = user.department || 'General';

    const newReq = await Request.create({
      requestedBy: user._id,
      requesterName: user.name,
      requesterRole: user.role,
      requesterDept: user.department || null,
      requesterRoll: user.rollNumber || null,
      requesterPhone: user.phone,
      type,
      cause,
      customCause: customCause || null,
      duration,
      durationMinutes: durationMinutes || null,
      tillFivepm: tillFivepm || false,
      hodDepartment: hodDept
    });

    res.status(201).json(newReq);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route GET /api/requests/mine  - Get own requests
router.get('/mine', protect, async (req, res) => {
  try {
    const requests = await Request.find({ requestedBy: req.user._id })
      .sort({ requestedAt: -1 })
      .limit(20);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route GET /api/requests/pending  - HOD gets pending requests for their dept
router.get('/pending', protect, requireRole('hod'), async (req, res) => {
  try {
    const query = { status: 'pending' };
    if (req.user.department) {
      query.$or = [
        { hodDepartment: req.user.department },
        { requesterRole: 'visitor' }
      ];
    }
    const requests = await Request.find(query).sort({ requestedAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route PUT /api/requests/:id/approve  - HOD approves
router.put('/:id/approve', protect, requireRole('hod'), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ message: 'Request already processed' });

    // Generate QR token
    const qrToken = crypto.randomBytes(20).toString('hex');

    // QR expires at end of day (23:59) by default
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Class Over → 5 PM sharp
    const fivePM = new Date();
    fivePM.setHours(17, 0, 0, 0);

    let qrExpiresAt = endOfDay;

    if (request.tillFivepm) {
      // "Class Over" — expires at 5 PM
      qrExpiresAt = fivePM < endOfDay ? fivePM : endOfDay;
    } else if (request.durationMinutes) {
      // Custom/fixed duration — expires durationMinutes from now
      const expiry = new Date(Date.now() + request.durationMinutes * 60000);
      qrExpiresAt = expiry < endOfDay ? expiry : endOfDay;
    }

    const qrData = JSON.stringify({
      token: qrToken,
      requestId: request._id,
      name: request.requesterName,
      type: request.type,
      expiresAt: qrExpiresAt.toISOString()
    });

    const qrImage = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' }
    });

    request.status = 'approved';
    request.processedAt = new Date();
    request.processedBy = req.user._id;
    request.qrCode = qrImage;
    request.qrToken = qrToken;
    request.qrExpiresAt = qrExpiresAt;
    await request.save();

    res.json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route PUT /api/requests/:id/reject  - HOD rejects
router.put('/:id/reject', protect, requireRole('hod'), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ message: 'Request already processed' });

    request.status = 'rejected';
    request.processedAt = new Date();
    request.processedBy = req.user._id;
    await request.save();

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route GET /api/requests/causes  - Get predefined causes
router.get('/causes', (req, res) => {
  res.json(CAUSE_DURATIONS);
});

module.exports = router;
