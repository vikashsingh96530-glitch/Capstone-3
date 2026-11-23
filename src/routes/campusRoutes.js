const router=require('express').Router();
const {body}=require('express-validator');
const validate=require('../middleware/validate');
const {authenticate,authorize}=require('../middleware/auth');
const c=require('../controllers/campusController');

router.get('/users',authenticate,authorize('admin'),c.listUsers);
router.post('/users',authenticate,authorize('admin'),[body('name').notEmpty(),body('email').isEmail(),body('password').isLength({min:8}),body('role').isIn(['admin','faculty','student'])],validate,c.createUser);
router.get('/users/:id',authenticate,authorize('admin'),c.getUser);
router.patch('/users/:id',authenticate,authorize('admin'),c.updateUser);
router.delete('/users/:id',authenticate,authorize('admin'),c.deleteUser);

router.route('/courses').get(authenticate,authorize('admin','faculty','student'),c.listCourses).post(authenticate,authorize('admin'),[body('code').notEmpty(),body('name').notEmpty(),body('credits').isInt({min:1}),body('department').notEmpty()],validate,c.createCourse);
router.route('/courses/:id').get(authenticate,authorize('admin','faculty','student'),c.getCourse).patch(authenticate,authorize('admin'),c.updateCourse).delete(authenticate,authorize('admin'),c.deleteCourse);

router.route('/sections').get(authenticate,authorize('admin','faculty','student'),c.listSections).post(authenticate,authorize('admin'),[body('name').notEmpty(),body('course').isMongoId(),body('semester').notEmpty()],validate,c.createSection);
router.route('/sections/:id').patch(authenticate,authorize('admin'),c.updateSection).delete(authenticate,authorize('admin'),c.deleteSection);

router.post('/enrollments',authenticate,authorize('admin'),[body('student').isMongoId(),body('course').isMongoId(),body('section').isMongoId()],validate,c.enrollStudent);
router.get('/enrollments',authenticate,authorize('admin','faculty','student'),c.listEnrollments);
module.exports=router;
