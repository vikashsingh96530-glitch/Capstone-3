exports.success = (res, statusCode, message, data = {}) => res.status(statusCode).json({ success: true, message, data });
exports.paginate = (req) => { const page = Math.max(parseInt(req.query.page, 10) || 1, 1); const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100); return { page, limit, skip: (page - 1) * limit }; };
