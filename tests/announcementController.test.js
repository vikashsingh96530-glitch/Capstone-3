jest.mock('../src/models/Announcement', () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn()
}));
jest.mock('../src/models/Enrollment', () => ({ find: jest.fn() }));
jest.mock('../src/models/Section', () => ({
  findById: jest.fn(),
  findOne: jest.fn()
}));
jest.mock('../src/models/Course', () => ({ findById: jest.fn() }));
jest.mock('../src/events/appEvents', () => ({ emit: jest.fn() }));

const Announcement = require('../src/models/Announcement');
const Enrollment = require('../src/models/Enrollment');
const Section = require('../src/models/Section');
const appEvents = require('../src/events/appEvents');
const controller = require('../src/controllers/announcementController');

describe('announcement controller', () => {
  beforeEach(() => jest.clearAllMocks());

  test('limits student announcement queries to university and active enrollments', async () => {
    const courseId = '507f1f77bcf86cd799439011';
    const sectionId = '507f1f77bcf86cd799439012';
    const filter = {
      $or: [
        { audience: 'university' },
        { section: { $in: [sectionId] } },
        { course: { $in: [courseId] } }
      ],
      audience: 'course'
    };
    Enrollment.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([{ course: courseId, section: sectionId }])
    });
    const query = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([])
    };
    Announcement.find.mockReturnValue(query);
    Announcement.countDocuments.mockResolvedValue(0);
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await controller.list({
      user: { _id: 'student-1', role: 'student' },
      query: { audience: 'course', page: '1', limit: '10' }
    }, res, jest.fn());

    expect(Enrollment.find).toHaveBeenCalledWith({ student: 'student-1', status: 'active' });
    expect(Announcement.find).toHaveBeenCalledWith(filter);
    expect(Announcement.countDocuments).toHaveBeenCalledWith(filter);
    expect(query.populate).toHaveBeenCalledTimes(3);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('prevents faculty from targeting another faculty member’s section', async () => {
    Section.findById.mockResolvedValue({
      _id: '507f1f77bcf86cd799439012',
      faculty: 'faculty-2',
      isActive: true
    });
    const next = jest.fn();

    await controller.create({
      body: { title: 'Update', message: 'Details', audience: 'section', section: '507f1f77bcf86cd799439012' },
      user: { _id: 'faculty-1', role: 'faculty' }
    }, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    expect(Announcement.create).not.toHaveBeenCalled();
    expect(appEvents.emit).not.toHaveBeenCalled();
  });
});
