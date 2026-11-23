const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/authController');

router.post('/register',[body('name').trim().notEmpty(),body('email').isEmail(),body('password').isLength({min:8})],validate,c.register);
router.post('/login',[body('email').isEmail(),body('password').notEmpty()],validate,c.login);
router.post('/refresh',[body('refreshToken').notEmpty()],validate,c.refresh);
router.post('/logout',authenticate,c.logout);
router.post('/users',[authenticate,authorize('admin'),body('name').notEmpty(),body('email').isEmail(),body('password').isLength({min:8}),body('role').isIn(['admin','faculty','student'])],validate,c.adminCreateUser);
router.get('/me',authenticate,c.me);
router.patch('/me',authenticate,c.updateProfile);
module.exports=router;
