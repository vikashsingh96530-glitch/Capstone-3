const router=require('express').Router();
const {body,query}=require('express-validator');
const validate=require('../middleware/validate');
const {authenticate,authorize}=require('../middleware/auth');
const c=require('../controllers/announcementController');
router.use(authenticate);
router.post('/',authorize('admin','faculty'),[
  body('title').trim().notEmpty(),
  body('message').notEmpty(),
  body('audience').isIn(['university','section','course']),
  body('section').custom((value,{req})=>req.body.audience!=='section'||/^[a-f\d]{24}$/i.test(value||'')),
  body('course').custom((value,{req})=>req.body.audience!=='course'||/^[a-f\d]{24}$/i.test(value||''))
],validate,c.create);
router.get('/',query('audience').optional().isIn(['university','section','course']),validate,c.list);
module.exports=router;
