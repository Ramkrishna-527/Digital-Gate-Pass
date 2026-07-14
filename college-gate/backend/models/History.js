const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userRole: { type: String, required: true },
  userDept: { type: String },
  userRoll: { type: String },
  request: { type: mongoose.Schema.Types.ObjectId, ref: 'Request' },
  type: { type: String, enum: ['entry', 'exit'] },
  cause: { type: String },
  scanResult: { type: String, enum: ['eligible', 'not_eligible', 'expired'] },
  scannedAt: { type: Date, default: Date.now },
  scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('History', historySchema);
