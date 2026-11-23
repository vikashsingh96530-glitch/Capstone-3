# University Campus Management System

Backend REST API built with Node.js, Express.js, MongoDB, Mongoose, JWT, bcrypt, Socket.IO and EventEmitter.

## Setup

1. Install Node.js 18+ and MongoDB.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and update secrets/database URI.
4. Run `npm run seed`.
5. Run `npm run dev` or `npm start`.

API base URL: `http://localhost:5000/api`

## Seed accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@campus.edu | Admin@123 |
| Faculty | faculty@campus.edu | Faculty@123 |
| Student | student1@campus.edu | Student@123 |

## Main endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET/PATCH /api/auth/me`
- `POST/GET/PATCH/DELETE /api/courses`
- `POST/GET/PATCH/DELETE /api/sections`
- `POST/GET /api/enrollments`
- `POST /api/attendance`
- `GET /api/attendance/me`
- `POST/GET /api/announcements`
- `GET /api/reports/attendance-summary`
- `GET /api/reports/low-attendance?threshold=75`
- `GET /api/reports/enrollment-summary`
- `GET /api/reports/attendance.csv`

Send `Authorization: Bearer <accessToken>` for protected routes.

## Socket.IO

Connect with `{ auth: { token: "<accessToken>" } }`. Room access is checked when joining: admins can join any active room, faculty can join their assigned sections/courses, and students can join rooms for active enrollments. `join:section` and `join:course` accept an optional acknowledgement callback with `{ success, message? }`; rejected joins without a callback emit `room:error`. University announcements are sent to all authenticated sockets, while course and section announcements are sent only to their authorized rooms. Listen for `announcement:new` and `attendance:updated`.

## Tests

Run `npm test`.

## MongoDB indexes and aggregations

The models contain suitable unique indexes for enrolments and attendance. Reports use aggregation pipelines for attendance summaries, low-attendance lists and section/course enrolment counts.
