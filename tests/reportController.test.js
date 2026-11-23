jest.mock('../src/models/Attendance', () => ({
  aggregate: jest.fn(),
  find: jest.fn()
}));
jest.mock('../src/models/Enrollment', () => ({ aggregate: jest.fn() }));
jest.mock('../src/models/Section', () => ({ find: jest.fn() }));

const Attendance = require('../src/models/Attendance');
const Section = require('../src/models/Section');
const controller = require('../src/controllers/reportController');

describe('report controller', () => {
  beforeEach(() => jest.clearAllMocks());

  test('limits faculty attendance summaries to assigned sections', async () => {
    const sectionId = '507f1f77bcf86cd799439011';
    Section.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([{ _id: sectionId }])
    });
    Attendance.aggregate.mockResolvedValue([]);

    await controller.attendanceSummary({
      user: { _id: 'faculty-1', role: 'faculty' },
      params: {}
    }, { status: jest.fn().mockReturnThis(), json: jest.fn() }, jest.fn());

    expect(Attendance.aggregate.mock.calls[0][0][0]).toEqual({
      $match: { section: { $in: [sectionId] } }
    });
  });

  test('rejects a faculty CSV request for another faculty member’s section', async () => {
    const ownSectionId = '507f1f77bcf86cd799439011';
    const otherSectionId = '507f1f77bcf86cd799439012';
    Section.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([{ _id: ownSectionId }])
    });
    const next = jest.fn();

    await controller.attendanceCsv({
      user: { _id: 'faculty-1', role: 'faculty' },
      params: { sectionId: otherSectionId }
    }, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    expect(Attendance.find).not.toHaveBeenCalled();
  });

  test('rejects out-of-range attendance thresholds', async () => {
    const next = jest.fn();

    await controller.lowAttendance({
      user: { _id: 'admin-1', role: 'admin' },
      query: { threshold: '101' }
    }, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expect(Attendance.aggregate).not.toHaveBeenCalled();
  });
});
