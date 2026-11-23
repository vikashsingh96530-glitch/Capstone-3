const mongoose = require('mongoose');
const enrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  status: { type: String, enum: ['active', 'completed', 'dropped'], default: 'active' }
}, { timestamps: true });
enrollmentSchema.index({ student: 1, section: 1 }, { unique: true });
module.exports = mongoose.model('Enrollment', enrollmentSchema);
