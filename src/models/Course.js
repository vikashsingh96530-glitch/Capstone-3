const mongoose = require('mongoose');
const courseSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  credits: { type: Number, required: true, min: 1 },
  department: { type: String, required: true, trim: true },
  description: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
courseSchema.index({ department: 1, name: 1 });
module.exports = mongoose.model('Course', courseSchema);
