const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Enrollment = require('../models/Enrollment');
const Section = require('../models/Section');
const { success } = require('../utils/response');

const httpError = (message, statusCode) => Object.assign(new Error(message), { statusCode });

const assignedSectionIds = async user => {
  if (user.role !== 'faculty') return null;
  const sections = await Section.find({ faculty: user._id, isActive: true }).select('_id');
  return sections.map(section => section._id);
};

const restrictSection = (sectionIds, requestedSectionId) => {
  if (sectionIds === null) {
    return requestedSectionId
      ? new mongoose.Types.ObjectId(requestedSectionId)
      : undefined;
  }
  if (requestedSectionId) {
    if (!sectionIds.some(id => String(id) === String(requestedSectionId))) {
      throw httpError('You are not assigned to this section', 403);
    }
    return new mongoose.Types.ObjectId(requestedSectionId);
  }
  return { $in: sectionIds };
};

exports.attendanceSummary = async (req, res, next) => {
  try {
    const sectionIds = await assignedSectionIds(req.user);
    const match = {};
    if (req.params.courseId) match.course = new mongoose.Types.ObjectId(req.params.courseId);
    const sectionFilter = restrictSection(sectionIds, req.params.sectionId);
    if (sectionFilter !== undefined) match.section = sectionFilter;

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: { student: '$student', course: '$course', section: '$section' },
          totalClasses: { $sum: 1 },
          classesAttended: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } }
        }
      },
      { $lookup: { from: 'users', localField: '_id.student', foreignField: '_id', as: 'student' } },
      { $lookup: { from: 'courses', localField: '_id.course', foreignField: '_id', as: 'course' } },
      { $unwind: '$student' },
      { $unwind: '$course' },
      {
        $project: {
          _id: 0,
          student: { id: '$student._id', name: '$student.name', rollNumber: '$student.rollNumber' },
          course: { id: '$course._id', name: '$course.name', code: '$course.code' },
          totalClasses: 1,
          classesAttended: 1,
          percentage: {
            $cond: [
              { $eq: ['$totalClasses', 0] },
              0,
              { $multiply: [{ $divide: ['$classesAttended', '$totalClasses'] }, 100] }
            ]
          }
        }
      },
      { $sort: { percentage: 1 } }
    ];
    const items = await Attendance.aggregate(pipeline);
    success(res, 200, 'Attendance summary', { items });
  } catch (error) {
    next(error);
  }
};

exports.lowAttendance = async (req, res, next) => {
  try {
    const threshold = Number(req.query.threshold || process.env.ATTENDANCE_THRESHOLD || 75);
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
      throw httpError('Attendance threshold must be between 0 and 100', 400);
    }
    const sectionIds = await assignedSectionIds(req.user);
    const match = sectionIds === null ? {} : { section: { $in: sectionIds } };
    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: { student: '$student', course: '$course', section: '$section' },
          total: { $sum: 1 },
          attended: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } }
        }
      },
      {
        $project: {
          student: '$_id.student',
          course: '$_id.course',
          section: '$_id.section',
          total: 1,
          attended: 1,
          percentage: { $multiply: [{ $divide: ['$attended', '$total'] }, 100] }
        }
      },
      { $match: { percentage: { $lt: threshold } } },
      { $lookup: { from: 'users', localField: 'student', foreignField: '_id', as: 'studentInfo' } },
      { $unwind: '$studentInfo' },
      {
        $project: {
          student: {
            id: '$studentInfo._id',
            name: '$studentInfo.name',
            rollNumber: '$studentInfo.rollNumber'
          },
          course: 1,
          section: 1,
          total: 1,
          attended: 1,
          percentage: { $round: ['$percentage', 2] }
        }
      }
    ];
    const items = await Attendance.aggregate(pipeline);
    success(res, 200, 'Low attendance report', { threshold, items });
  } catch (error) {
    next(error);
  }
};

exports.enrollmentSummary = async (req, res, next) => {
  try {
    const sectionIds = await assignedSectionIds(req.user);
    const match = { status: 'active' };
    if (sectionIds !== null) match.section = { $in: sectionIds };
    const pipeline = [
      { $match: match },
      { $group: { _id: { course: '$course', section: '$section' }, count: { $sum: 1 } } },
      { $lookup: { from: 'courses', localField: '_id.course', foreignField: '_id', as: 'course' } },
      { $lookup: { from: 'sections', localField: '_id.section', foreignField: '_id', as: 'section' } },
      { $unwind: '$course' },
      { $unwind: '$section' },
      {
        $project: {
          _id: 0,
          course: { id: '$course._id', code: '$course.code', name: '$course.name' },
          section: { id: '$section._id', name: '$section.name', semester: '$section.semester' },
          studentCount: '$count'
        }
      },
      { $sort: { 'course.code': 1, 'section.name': 1 } }
    ];
    const items = await Enrollment.aggregate(pipeline);
    success(res, 200, 'Enrollment summary', { items });
  } catch (error) {
    next(error);
  }
};

exports.attendanceCsv = async (req, res, next) => {
  try {
    const sectionIds = await assignedSectionIds(req.user);
    const filter = {};
    if (req.params.sectionId) {
      filter.section = restrictSection(sectionIds, req.params.sectionId);
    } else if (sectionIds !== null) {
      filter.section = { $in: sectionIds };
    }
    const records = await Attendance.find(filter).populate('student course section');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.csv"');
    res.write('Student,Roll Number,Course,Section,Date,Status\n');
    records.forEach(record => {
      const fields = [
        record.student?.name,
        record.student?.rollNumber,
        record.course?.code,
        record.section?.name,
        record.date?.toISOString().slice(0, 10),
        record.status
      ];
      const row = fields.map(value => `"${String(value || '').replace(/"/g, '""')}"`).join(',');
      res.write(`${row}\n`);
    });
    res.end();
  } catch (error) {
    next(error);
  }
};
