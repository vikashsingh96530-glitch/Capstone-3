const router=require('express').Router();
const {body,param}=require('express-validator');
const validate=require('../middleware/validate');
const {authenticate,authorize}=require('../middleware/auth');
const c=require('../controllers/attendanceController');
router.use(authenticate);
router.post('/',authorize('faculty'),[
  body('sectionId').isMongoId(),
  body('date').isISO8601(),
  body('records').isArray({min:1}),
  body('records.*.student').isMongoId(),
  body('records.*.status').isIn(['present','absent','leave'])
],validate,c.mark);
router.get('/me',authorize('student'),c.myAttendance);
router.get('/me/course/:courseId',authorize('student'),param('courseId').isMongoId(),validate,c.myAttendance);
router.get('/student/:studentId',authorize('admin','faculty','student'),param('studentId').isMongoId(),validate,c.studentAttendance);
module.exports=router;
