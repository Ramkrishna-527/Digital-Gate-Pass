const express = require('express');
const router = express.Router();
const History = require('../models/History');
const { protect, requireRole } = require('../middleware/auth');

// @route GET /api/history  - HOD views all history, with optional search
router.get('/', protect, requireRole('hod'), async (req, res) => {
  try {
    const { search, type, startDate, endDate } = req.query;

    let query = {};

    if (search) {
      query.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { userRoll: { $regex: search, $options: 'i' } },
        { userDept: { $regex: search, $options: 'i' } }
      ];
    }

    if (type) query.type = type;

    if (startDate || endDate) {
      query.scannedAt = {};
      if (startDate) query.scannedAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.scannedAt.$lte = end;
      }
    }

    const history = await History.find(query)
      .sort({ scannedAt: -1 })
      .limit(100)
      .populate('scannedBy', 'name');

    res.json(history);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
