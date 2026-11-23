require('dotenv').config();
const mongoose=require('mongoose');
const connectDB=require('./config/db');
const User=require('./models/User');
const Course=require('./models/Course');
const Section=require('./models/Section');
const Enrollment=require('./models/Enrollment');
const Attendance=require('./models/Attendance');
const Announcement=require('./models/Announcement');

(async()=>{try{await connectDB();await Promise.all([User.deleteMany(),Course.deleteMany(),Section.deleteMany(),Enrollment.deleteMany(),Attendance.deleteMany(),Announcement.deleteMany()]);
const users=await User.create([
{name:'Campus Admin',email:'admin@campus.edu',password:'Admin@123',role:'admin',department:'Administration'},
{name:'Dr. Asha Verma',email:'faculty@campus.edu',password:'Faculty@123',role:'faculty',department:'Computer Science'},
{name:'Rahul Sharma',email:'student1@campus.edu',password:'Student@123',role:'student',rollNumber:'CS2026001',department:'Computer Science'},
{name:'Priya Singh',email:'student2@campus.edu',password:'Student@123',role:'student',rollNumber:'CS2026002',department:'Computer Science'}]);
const admin=users[0],faculty=users[1],student1=users[2],student2=users[3];
const course=await Course.create({code:'CS101',name:'Introduction to Programming',credits:4,department:'Computer Science',description:'Programming fundamentals'});
const section=await Section.create({name:'A',course:course._id,faculty:faculty._id,semester:'Semester 1',capacity:60});
await Enrollment.create([{student:student1._id,course:course._id,section:section._id},{student:student2._id,course:course._id,section:section._id}]);
for(let i=0;i<10;i++){const date=new Date();date.setDate(date.getDate()-i);date.setHours(0,0,0,0);await Attendance.create([{student:student1._id,course:course._id,section:section._id,date,status:i<8?'present':'absent',markedBy:faculty._id},{student:student2._id,course:course._id,section:section._id,date,status:i<6?'present':'absent',markedBy:faculty._id}]);}
await Announcement.create({title:'Welcome to Semester 1',message:'Classes begin this week. Please check your timetable.',audience:'university',createdBy:admin._id});
console.log('Seed completed');console.log('Accounts:');console.log('admin@campus.edu / Admin@123');console.log('faculty@campus.edu / Faculty@123');console.log('student1@campus.edu / Student@123');await mongoose.disconnect();}catch(e){console.error(e);process.exit(1)}})();
