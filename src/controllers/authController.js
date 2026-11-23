const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { success } = require('../utils/response');

const accessToken = user => jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' });
const refreshToken = user => jwt.sign({ sub: user._id, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' });

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'student', rollNumber, department } = req.body;
    if (!['student'].includes(role)) { const err = new Error('Public registration is limited to students'); err.statusCode = 403; throw err; }
    const user = await User.create({ name, email, password, role, rollNumber, department });
    success(res, 201, 'Student registered', { user: { id: user._id, name, email, role, rollNumber, department } });
  } catch (e) { next(e); }
};

exports.adminCreateUser = async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    success(res, 201, 'User created', { user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { next(e); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) { const err = new Error('Invalid email or password'); err.statusCode = 401; throw err; }
    if (!user.isActive) { const err = new Error('Account is inactive'); err.statusCode = 403; throw err; }
    const token = refreshToken(user); const hash = crypto.createHash('sha256').update(token).digest('hex');
    user.refreshTokens.push({ tokenHash: hash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
    await user.save();
    success(res, 200, 'Login successful', { accessToken: accessToken(user), refreshToken: token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { next(e); }
};

exports.refresh = async (req, res, next) => {
  try {
    const payload = jwt.verify(req.body.refreshToken, process.env.JWT_REFRESH_SECRET);
    const hash = crypto.createHash('sha256').update(req.body.refreshToken).digest('hex');
    const user = await User.findOne({ _id: payload.sub, 'refreshTokens.tokenHash': hash, 'refreshTokens.expiresAt': { $gt: new Date() } });
    if (!user) { const err = new Error('Refresh token is invalid or expired'); err.statusCode = 401; throw err; }
    success(res, 200, 'Token refreshed', { accessToken: accessToken(user) });
  } catch (e) { next(Object.assign(e, { statusCode: e.statusCode || 401 })); }
};

exports.logout = async (req, res, next) => {
  try {
    const token = req.body.refreshToken;
    if (token) { const hash = crypto.createHash('sha256').update(token).digest('hex'); await User.updateOne({ _id: req.user._id }, { $pull: { refreshTokens: { tokenHash: hash } } }); }
    success(res, 200, 'Logged out');
  } catch (e) { next(e); }
};

exports.me = async (req, res) => success(res, 200, 'Profile retrieved', { user: req.user });
exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'department'];
    if (req.user.role === 'student') allowed.push('rollNumber');
    const updates = {}; allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    success(res, 200, 'Profile updated', { user });
  } catch (e) { next(e); }
};
