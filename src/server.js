require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const appEvents = require('./events/appEvents');
const User = require('./models/User');
const Course = require('./models/Course');
const Section = require('./models/Section');
const Enrollment = require('./models/Enrollment');

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN || '*', methods: ['GET', 'POST'] }
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    const payload = jwt.verify(token.replace(/^Bearer\s+/, ''), process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(payload.sub).select('_id role isActive');
    if (!user || !user.isActive) return next(new Error('Invalid or inactive user'));
    socket.user = user;
    next();
  } catch (error) {
    if (!['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) {
      console.error('Socket authentication failed', error);
    }
    next(new Error('Invalid socket token'));
  }
});

const reportRoomResult = (socket, acknowledge, result) => {
  if (typeof acknowledge === 'function') acknowledge(result);
  else if (!result.success) socket.emit('room:error', result);
};

io.on('connection', socket => {
  const joinSection = async (sectionId, acknowledge) => {
    try {
      if (!mongoose.isValidObjectId(sectionId)) {
        return reportRoomResult(socket, acknowledge, { success: false, message: 'Invalid section ID' });
      }
      const section = await Section.findById(sectionId).select('_id course faculty isActive');
      if (!section || !section.isActive) {
        return reportRoomResult(socket, acknowledge, { success: false, message: 'Section not found' });
      }

      let allowed = socket.user.role === 'admin';
      if (socket.user.role === 'faculty') {
        allowed = String(section.faculty) === String(socket.user._id);
      } else if (socket.user.role === 'student') {
        allowed = Boolean(await Enrollment.exists({
          student: socket.user._id,
          section: section._id,
          status: 'active'
        }));
      }
      if (!allowed) {
        return reportRoomResult(socket, acknowledge, { success: false, message: 'You cannot join this section' });
      }
      await socket.join(`section:${section._id}`);
      reportRoomResult(socket, acknowledge, { success: true });
    } catch (error) {
      console.error('Failed to authorize section room', error);
      reportRoomResult(socket, acknowledge, { success: false, message: 'Unable to join section' });
    }
  };

  const joinCourse = async (courseId, acknowledge) => {
    try {
      if (!mongoose.isValidObjectId(courseId)) {
        return reportRoomResult(socket, acknowledge, { success: false, message: 'Invalid course ID' });
      }
      const course = await Course.findById(courseId).select('_id isActive');
      if (!course || !course.isActive) {
        return reportRoomResult(socket, acknowledge, { success: false, message: 'Course not found' });
      }

      let allowed = socket.user.role === 'admin';
      if (socket.user.role === 'faculty') {
        allowed = Boolean(await Section.exists({
          course: course._id,
          faculty: socket.user._id,
          isActive: true
        }));
      } else if (socket.user.role === 'student') {
        allowed = Boolean(await Enrollment.exists({
          student: socket.user._id,
          course: course._id,
          status: 'active'
        }));
      }
      if (!allowed) {
        return reportRoomResult(socket, acknowledge, { success: false, message: 'You cannot join this course' });
      }
      await socket.join(`course:${course._id}`);
      reportRoomResult(socket, acknowledge, { success: true });
    } catch (error) {
      console.error('Failed to authorize course room', error);
      reportRoomResult(socket, acknowledge, { success: false, message: 'Unable to join course' });
    }
  };

  socket.on('join:section', joinSection);
  socket.on('join:course', joinCourse);
});

appEvents.on('announcement.created', ({ announcement, recipients }) => {
  if (announcement.audience === 'university') {
    io.emit('announcement:new', announcement);
    return;
  }
  recipients.forEach(room => io.to(room).emit('announcement:new', announcement));
});
appEvents.on('attendance.updated', payload => {
  io.to(`section:${payload.sectionId}`).emit('attendance:updated', payload);
});

(async () => {
  try {
    await connectDB();
    const port = process.env.PORT || 5000;
    server.listen(port, () => console.log(`Campus API running on port ${port}`));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
})();

module.exports = { server, io };
