const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Authentication required' });
    const payload = jwt.verify(header.split(' ')[1], process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(payload.sub).select('-refreshTokens');
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'Invalid or inactive user' });
    req.user = user;
    next();
  } catch (error) { next(Object.assign(new Error('Invalid or expired access token'), { statusCode: 401 })); }
};

exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, message: 'You do not have permission for this action' });
  next();
};
