exports.notFound = (req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
exports.errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  if (err.name === 'ValidationError') { statusCode = 400; message = Object.values(err.errors).map(e => e.message).join(', '); }
  if (err.code === 11000) { statusCode = 409; message = 'Duplicate value'; }
  if (process.env.NODE_ENV !== 'test') console.error(err);
  res.status(statusCode).json({ success: false, message, ...(err.errors && { errors: err.errors }) });
};
