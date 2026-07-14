const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true },
  email: { type: String, sparse: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['student', 'visitor', 'hod', 'gatekeeper'],
    required: true
  },
  // Student-specific
  courseName: { type: String },
  department: { type: String },
  section: { type: String },
  rollNumber: { type: String },
  // HOD-specific
  // department is shared
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
