jest.mock('../src/models/Attendance', () => ({
  bulkWrite: jest.fn(),
  find: jest.fn()
}));
jest.mock('../src/models/Enrollment', () => ({ find: jest.fn() }));
jest.mock('../src/models/Section', () => ({
  findById: jest.fn(),
  find: jest.fn()
}));
jest.mock('../src/models/AuditLog', () => ({ create: jest.fn() }));

const Attendance = require('../src/models/Attendance');
const Enrollment = require('../src/models/Enrollment');
const Section = require('../src/models/Section');
const AuditLog = require('../src/models/AuditLog');
const controller = require('../src/controllers/attendanceController');

const makeResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn()
});

describe('attendance controller', () => {
  beforeEach(() => jest.clearAllMocks());

  test('validates every enrollment before writing attendance', async () => {
    const sectionId = '507f1f77bcf86cd799439011';
    const studentId = '507f1f77bcf86cd799439012';
    Section.findById.mockResolvedValue({ _id: sectionId, course: 'course-1', faculty: 'faculty-1', isActive: true });
    Enrollment.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
    const next = jest.fn();

    await controller.mark({
      body: { sectionId, date: '2026-03-20', records: [{ student: studentId, status: 'present' }] },
      user: { _id: 'faculty-1' }
    }, makeResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expect(Attendance.bulkWrite).not.toHaveBeenCalled();
    expect(AuditLog.create).not.toHaveBeenCalled();
  });

  test('rejects duplicate students before writing attendance', async () => {
    const sectionId = '507f1f77bcf86cd799439011';
    const studentId = '507f1f77bcf86cd799439012';
    const next = jest.fn();

    await controller.mark({
      body: {
        sectionId,
        date: '2026-03-20',
        records: [
          { student: studentId, status: 'present' },
          { student: studentId, status: 'absent' }
        ]
      },
      user: { _id: 'faculty-1' }
    }, makeResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expect(Section.findById).not.toHaveBeenCalled();
    expect(Attendance.bulkWrite).not.toHaveBeenCalled();
  });

  test('marks enrolled students in one batch and records the normalized date', async () => {
    const sectionId = '507f1f77bcf86cd799439011';
    const studentId = '507f1f77bcf86cd799439012';
    const record = { student: studentId, course: 'course-1', section: sectionId, status: 'present' };
    Section.findById.mockResolvedValue({
      _id: sectionId,
      course: 'course-1',
      faculty: 'faculty-1',
      isActive: true
    });
    Enrollment.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([{ student: studentId }])
    });
    Attendance.bulkWrite.mockResolvedValue({});
    Attendance.find.mockResolvedValue([record]);
    AuditLog.create.mockResolvedValue({});
    const res = makeResponse();

    await controller.mark({
      body: { sectionId, date: '2026-03-20T19:30:00-05:00', records: [{ student: studentId, status: 'present' }] },
      user: { _id: 'faculty-1' }
    }, res, jest.fn());

    expect(Attendance.bulkWrite).toHaveBeenCalledWith([{
      updateOne: {
        filter: {
          student: studentId,
          course: 'course-1',
          section: sectionId,
          date: new Date('2026-03-21T00:00:00.000Z')
        },
        update: { $set: { status: 'present', markedBy: 'faculty-1' } },
        upsert: true
      }
    }]);
    expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ changes: expect.objectContaining({ recordCount: 1 }) }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('limits faculty attendance lookups to their assigned sections', async () => {
    const sectionId = '507f1f77bcf86cd799439011';
    const studentId = '507f1f77bcf86cd799439012';
    const records = [{ student: studentId, section: sectionId }];
    Section.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: sectionId }]) });
    Attendance.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue(records)
    });
    const res = makeResponse();

    await controller.studentAttendance({
      params: { studentId },
      user: { _id: 'faculty-1', role: 'faculty' }
    }, res, jest.fn());

    expect(Attendance.find).toHaveBeenCalledWith({
      student: studentId,
      section: { $in: [sectionId] }
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: { records }
    }));
  });
});
