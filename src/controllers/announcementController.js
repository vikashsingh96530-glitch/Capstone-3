const Announcement = require('../models/Announcement');
const Enrollment = require('../models/Enrollment');
const Section = require('../models/Section');
const Course = require('../models/Course');
const appEvents = require('../events/appEvents');
const { success, paginate } = require('../utils/response');

const httpError = (message, statusCode) => Object.assign(new Error(message), { statusCode });

exports.create = async (req, res, next) => {
  try {
    const { audience, course, section } = req.body;
    const recipients = [];

    if (audience === 'section') {
      const targetSection = await Section.findById(section);
      if (!targetSection || !targetSection.isActive) throw httpError('Section not found', 404);
      if (req.user.role === 'faculty' && String(targetSection.faculty) !== String(req.user._id)) {
        throw httpError('You are not assigned to this section', 403);
      }
      recipients.push(`section:${targetSection._id}`);
    } else if (audience === 'course') {
      const targetCourse = await Course.findById(course);
      if (!targetCourse || !targetCourse.isActive) throw httpError('Course not found', 404);
      if (req.user.role === 'faculty') {
        const assignedSection = await Section.findOne({
          course: targetCourse._id,
          faculty: req.user._id,
          isActive: true
        });
        if (!assignedSection) throw httpError('You are not assigned to this course', 403);
      }
      recipients.push(`course:${targetCourse._id}`);
    }

    const announcement = await Announcement.create({ ...req.body, createdBy: req.user._id });
    appEvents.emit('announcement.created', { announcement, recipients });
    success(res, 201, 'Announcement created', { announcement });
  } catch (error) {
    next(error);
  }
};

exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req);
    const filter = {};

    if (req.user.role === 'student') {
      const enrollments = await Enrollment.find({ student: req.user._id, status: 'active' })
        .select('course section');
      filter.$or = [
        { audience: 'university' },
        { section: { $in: enrollments.map(enrollment => enrollment.section) } },
        { course: { $in: enrollments.map(enrollment => enrollment.course) } }
      ];
    }
    if (req.query.audience) filter.audience = req.query.audience;

    const [items, total] = await Promise.all([
      Announcement.find(filter)
        .populate('course', 'code name')
        .populate('section', 'name semester')
        .populate('createdBy', 'name role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Announcement.countDocuments(filter)
    ]);
    success(res, 200, 'Announcements retrieved', {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};
