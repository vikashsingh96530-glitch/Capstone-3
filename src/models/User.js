const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'faculty', 'student'], required: true },
  rollNumber: { type: String, sparse: true, trim: true },
  department: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  refreshTokens: [{ tokenHash: String, expiresAt: Date, createdAt: { type: Date, default: Date.now } }]
}, { timestamps: true });

userSchema.pre('save', async function(next) { if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12); next(); });
userSchema.methods.comparePassword = function(password) { return bcrypt.compare(password, this.password); };
userSchema.index({ role: 1, department: 1 });
module.exports = mongoose.model('User', userSchema);
