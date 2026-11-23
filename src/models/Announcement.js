const mongoose = require('mongoose');
const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  audience: { type: String, enum: ['university', 'section', 'course'], required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
announcementSchema.index({ audience: 1, createdAt: -1 });
module.exports = mongoose.model('Announcement', announcementSchema);
