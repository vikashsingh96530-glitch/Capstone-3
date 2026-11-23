const User = require('../models/User');
const Course = require('../models/Course');
const Section = require('../models/Section');
const Enrollment = require('../models/Enrollment');
const { paginate, success } = require('../utils/response');

const list = Model => async (req, res, next) => { try { const { page, limit, skip } = paginate(req); const filter = {}; ['department','role','isActive','course','semester'].forEach(k => { if (req.query[k] !== undefined) filter[k] = req.query[k]; }); const [items,total] = await Promise.all([Model.find(filter).populate('course faculty').sort({ createdAt: -1 }).skip(skip).limit(limit), Model.countDocuments(filter)]); success(res, 200, 'Records retrieved', { items, pagination: { page, limit, total, pages: Math.ceil(total/limit) } }); } catch(e){next(e);} };

exports.listUsers = list(User);
exports.createUser = async (req,res,next) => { try { const user=await User.create(req.body); success(res,201,'User created',{user}); } catch(e){next(e);} };
exports.getUser = async (req,res,next) => { try { const user=await User.findById(req.params.id); if(!user){const e=new Error('User not found');e.statusCode=404;throw e;} success(res,200,'User retrieved',{user}); } catch(e){next(e);} };
exports.updateUser = async (req,res,next) => { try { delete req.body.password; delete req.body.refreshTokens; const user=await User.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true}); if(!user){const e=new Error('User not found');e.statusCode=404;throw e;} success(res,200,'User updated',{user}); } catch(e){next(e);} };
exports.deleteUser = async (req,res,next) => { try { const user=await User.findByIdAndUpdate(req.params.id,{isActive:false},{new:true}); if(!user){const e=new Error('User not found');e.statusCode=404;throw e;} success(res,200,'User deactivated',{user}); } catch(e){next(e);} };

exports.listCourses=list(Course);
exports.createCourse=async(req,res,next)=>{try{const course=await Course.create(req.body);success(res,201,'Course created',{course});}catch(e){next(e);}};
exports.getCourse=async(req,res,next)=>{try{const course=await Course.findById(req.params.id);if(!course){const e=new Error('Course not found');e.statusCode=404;throw e;}success(res,200,'Course retrieved',{course});}catch(e){next(e);}};
exports.updateCourse=async(req,res,next)=>{try{const course=await Course.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true});if(!course){const e=new Error('Course not found');e.statusCode=404;throw e;}success(res,200,'Course updated',{course});}catch(e){next(e);}};
exports.deleteCourse=async(req,res,next)=>{try{const course=await Course.findByIdAndUpdate(req.params.id,{isActive:false},{new:true});if(!course){const e=new Error('Course not found');e.statusCode=404;throw e;}success(res,200,'Course deactivated',{course});}catch(e){next(e);}};

exports.listSections=list(Section);
exports.createSection=async(req,res,next)=>{try{const [course,faculty]=await Promise.all([Course.findById(req.body.course),req.body.faculty?User.findById(req.body.faculty):Promise.resolve(null)]);if(!course){const e=new Error('Invalid course reference');e.statusCode=400;throw e;}if(req.body.faculty&&(!faculty||faculty.role!=='faculty')){const e=new Error('Invalid faculty reference');e.statusCode=400;throw e;}const section=await Section.create(req.body);success(res,201,'Section created',{section});}catch(e){next(e);}};
exports.updateSection=async(req,res,next)=>{try{if(req.body.faculty){const faculty=await User.findById(req.body.faculty);if(!faculty||faculty.role!=='faculty'){const e=new Error('Invalid faculty reference');e.statusCode=400;throw e;}}const section=await Section.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true});if(!section){const e=new Error('Section not found');e.statusCode=404;throw e;}success(res,200,'Section updated',{section});}catch(e){next(e);}};
exports.deleteSection=async(req,res,next)=>{try{const section=await Section.findByIdAndUpdate(req.params.id,{isActive:false},{new:true});if(!section){const e=new Error('Section not found');e.statusCode=404;throw e;}success(res,200,'Section deactivated',{section});}catch(e){next(e);}};

exports.enrollStudent=async(req,res,next)=>{try{const [student,course,section]=await Promise.all([User.findById(req.body.student),Course.findById(req.body.course),Section.findById(req.body.section)]);if(!student||student.role!=='student'){const e=new Error('Invalid student reference');e.statusCode=400;throw e;}if(!course||!section||String(section.course)!==String(course._id)){const e=new Error('Invalid course or section reference');e.statusCode=400;throw e;}const enrollment=await Enrollment.create({student:student._id,course:course._id,section:section._id});success(res,201,'Student enrolled',{enrollment});}catch(e){next(e);}};
exports.listEnrollments=async(req,res,next)=>{try{const filter={};if(req.query.student)filter.student=req.query.student;if(req.query.section)filter.section=req.query.section;if(req.user.role==='student')filter.student=req.user._id;const items=await Enrollment.find(filter).populate('student course section');success(res,200,'Enrollments retrieved',{items});}catch(e){next(e);}};
