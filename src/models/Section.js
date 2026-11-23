const mongoose = require('mongoose');
const sectionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  semester: { type: String, required: true, trim: true },
  capacity: { type: Number, default: 60, min: 1 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
sectionSchema.index({ course: 1, name: 1, semester: 1 }, { unique: true });
module.exports = mongoose.model('Section', sectionSchema);
