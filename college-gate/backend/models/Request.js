const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requesterName: { type: String, required: true },
  requesterRole: { type: String, required: true },
  requesterDept: { type: String },
  requesterRoll: { type: String },
  requesterPhone: { type: String },
  type: { type: String, enum: ['entry', 'exit'], required: true },
  cause: { type: String, required: true },
  customCause: { type: String },
  duration: { type: String, required: true }, // e.g., "1h", "entire_day"
  durationMinutes: { type: Number }, // null = entire day
  tillFivepm: { type: Boolean, default: false }, // class_over cause → expire at 5PM
  requestedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  processedAt: { type: Date },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  qrCode: { type: String }, // base64 QR image
  qrToken: { type: String }, // unique token embedded in QR
  qrExpiresAt: { type: Date },
  hodDepartment: { type: String } // which HOD should handle this
});

module.exports = mongoose.model('Request', requestSchema);
