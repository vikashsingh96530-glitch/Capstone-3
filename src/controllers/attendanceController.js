const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Enrollment = require('../models/Enrollment');
const Section = require('../models/Section');
const AuditLog = require('../models/AuditLog');
const appEvents = require('../events/appEvents');
const { success } = require('../utils/response');

const httpError = (message, statusCode) => Object.assign(new Error(message), { statusCode });

const normalizeDate = value => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw httpError('A valid attendance date is required', 400);
  parsed.setUTCHours(0, 0, 0, 0);
  return parsed;
};

exports.mark = async (req, res, next) => {
  try {
    const { sectionId, date, records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      throw httpError('At least one attendance record is required', 400);
    }

    const studentIds = records.map(record => String(record.student));
    if (studentIds.some(id => !mongoose.isValidObjectId(id))) {
      throw httpError('Each attendance record must contain a valid student ID', 400);
    }
    if (new Set(studentIds).size !== studentIds.length) {
      throw httpError('A student can only appear once per attendance submission', 400);
    }
    if (records.some(record => !['present', 'absent', 'leave'].includes(record.status))) {
      throw httpError('Attendance status must be present, absent, or leave', 400);
    }

    const normalizedDate = normalizeDate(date);
    const section = await Section.findById(sectionId);
    if (!section || !section.isActive) throw httpError('Section not found', 404);
    if (String(section.faculty) !== String(req.user._id)) {
      throw httpError('You are not assigned to this section', 403);
    }

    const enrollments = await Enrollment.find({
      student: { $in: studentIds },
      section: sectionId,
      course: section.course,
      status: 'active'
    }).select('student');
    const enrolledIds = new Set(enrollments.map(enrollment => String(enrollment.student)));
    const unenrolledStudent = studentIds.find(id => !enrolledIds.has(id));
    if (unenrolledStudent) {
      throw httpError(`Student ${unenrolledStudent} is not actively enrolled in this section`, 400);
    }

    await Attendance.bulkWrite(records.map(record => ({
      updateOne: {
        filter: {
          student: record.student,
          course: section.course,
          section: sectionId,
          date: normalizedDate
        },
        update: { $set: { status: record.status, markedBy: req.user._id } },
        upsert: true
      }
    })));

    const savedRecords = await Attendance.find({
      student: { $in: studentIds },
      course: section.course,
      section: sectionId,
      date: normalizedDate
    });
    const recordsByStudent = new Map(savedRecords.map(record => [String(record.student), record]));
    const saved = studentIds.map(id => recordsByStudent.get(id)).filter(Boolean);

    await AuditLog.create({
      action: 'ATTENDANCE_MARKED_OR_CORRECTED',
      entity: 'Attendance',
      performedBy: req.user._id,
      changes: { sectionId, date: normalizedDate, recordCount: saved.length }
    });
    appEvents.emit('attendance.updated', { sectionId, date: normalizedDate, markedBy: req.user._id });
    success(res, 200, 'Attendance saved', { records: saved });
  } catch (error) {
    next(error);
  }
};

exports.myAttendance = async (req, res, next) => {
  try {
    const filter = { student: req.user._id };
    if (req.params.courseId) filter.course = req.params.courseId;
    const records = await Attendance.find(filter).populate('course section').sort({ date: -1 });
    const byCourse = new Map();

    records.forEach(record => {
      const courseId = String(record.course?._id || record.course);
      if (!byCourse.has(courseId)) {
        byCourse.set(courseId, {
          course: record.course,
          total: 0,
          attended: 0,
          percentage: 0,
          records: []
        });
      }
      const summary = byCourse.get(courseId);
      summary.total += 1;
      if (record.status === 'present') summary.attended += 1;
      summary.records.push(record);
    });

    const summary = [...byCourse.values()].map(item => ({
      ...item,
      percentage: item.total ? Number(((item.attended / item.total) * 100).toFixed(2)) : 0
    }));
    success(res, 200, 'Attendance retrieved', { summary });
  } catch (error) {
    next(error);
  }
};

exports.studentAttendance = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (!mongoose.isValidObjectId(studentId)) throw httpError('Invalid student ID', 400);
    if (req.user.role === 'student' && String(req.user._id) !== studentId) {
      throw httpError('You cannot view another student private attendance', 403);
    }

    const filter = { student: studentId };
    if (req.user.role === 'faculty') {
      const sections = await Section.find({ faculty: req.user._id, isActive: true }).select('_id');
      filter.section = { $in: sections.map(section => section._id) };
    }

    const records = await Attendance.find(filter).populate('course section').sort({ date: -1 });
    success(res, 200, 'Student attendance retrieved', { records });
  } catch (error) {
    next(error);
  }
};
