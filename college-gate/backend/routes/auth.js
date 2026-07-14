const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
};

// @route POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, phone, email, password, role, courseName, department, section, rollNumber } = req.body;

    if (!name || !phone || !password || !role) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    // Check for duplicate phone per role
    const exists = await User.findOne({ phone, role });
    if (exists) {
      return res.status(400).json({ message: 'User already registered with this phone number' });
    }

    // Student needs roll number
    if (role === 'student' && (!rollNumber || !department || !courseName || !section)) {
      return res.status(400).json({ message: 'Students must provide course, department, section, and roll number' });
    }

    // HOD needs email and department
    if (role === 'hod' && (!email || !department)) {
      return res.status(400).json({ message: 'HOD must provide email and department' });
    }

    const user = await User.create({
      name, phone, email, password, role,
      courseName, department, section, rollNumber
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      role: user.role,
      token: generateToken(user._id)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { phone, password, role } = req.body;

    if (!phone || !password || !role) {
      return res.status(400).json({ message: 'Phone, password and role are required' });
    }

    const user = await User.findOne({ phone, role });
    if (!user) {
      return res.status(401).json({ message: 'No account found with this phone and role' });
    }

    const match = await user.matchPassword(password);
    if (!match) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      department: user.department,
      courseName: user.courseName,
      section: user.section,
      rollNumber: user.rollNumber,
      token: generateToken(user._id)
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route GET /api/auth/users  - Gatekeeper gets all registered students & visitors
const { protect, requireRole } = require('../middleware/auth');
router.get('/users', protect, requireRole('gatekeeper'), async (req, res) => {
  try {
    const users = await User.find(
      { role: { $in: ['student', 'visitor'] } },
      'name phone role department section rollNumber courseName createdAt'
    ).sort({ role: 1, name: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
