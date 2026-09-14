# LMS Developer Flow Guide

End-to-end API flows, request/response shapes, and error status codes for this Course & Assignment LMS.

Base URL (local): `http://localhost:5000`  
Frontend proxy: `http://localhost:3000` → `/api` → backend

All JSON responses use one of:

```json
{ "success": true, "data": {} }
```

```json
{ "success": false, "message": "Human readable reason", "errors": [{ "field": "title", "message": "Title is required" }] }
```

`errors` is an empty array unless request validation failed.

Every protected route needs:

```http
Authorization: Bearer <accessToken>
```

Refresh token is an **httpOnly** cookie (`refreshToken`, path `/api/auth`). Send `credentials: 'include'` from the browser.

---

## 1. Roles

| Role | Can do |
|------|--------|
| **admin** | Manage users. View and manage **all** courses, assignments, submissions. |
| **trainer** | Create and manage **own** courses and assignments. View and evaluate submissions on **own** courses. |
| **student** | View published courses, enroll, view assignments on enrolled courses, submit work. |

Frontend route guards only hide screens. The API always re-checks role and ownership.

---

## 2. Auth flow

```text
Register / Login
      │
      ├── 201/200  accessToken in JSON + refreshToken cookie
      │
      ▼
Authenticated requests
      │
      ├── 200  OK
      ├── 401  missing / invalid / expired access token
      │         frontend calls POST /api/auth/refresh once, then retries
      └── 403  valid token, wrong role or ownership
```

### POST `/api/auth/register` — public

Creates a **student** only.

```json
{ "name": "Kiran Nair", "email": "kiran@example.com", "password": "Student@123" }
```

| Status | When |
|--------|------|
| **201** | Account created. `data.accessToken`, `data.user` |
| **400** | Validation: name/email/password rules |
| **409** | Email already exists |
| **429** | Too many auth attempts |

### POST `/api/auth/login` — public

```json
{ "email": "student@lms.com", "password": "Student@123" }
```

| Status | When |
|--------|------|
| **200** | `data.accessToken`, `data.user` `{ id, name, email, role }` |
| **400** | Missing/invalid email or password field |
| **401** | Wrong email or password |
| **403** | Account `isActive = false` |
| **429** | Too many auth attempts |

### POST `/api/auth/refresh` — cookie

No body. Cookie `refreshToken` required.

| Status | When |
|--------|------|
| **200** | New access + rotated refresh cookie |
| **401** | Cookie missing, invalid, expired, or reused |
| **429** | Too many refresh attempts |

### GET `/api/auth/me` — auth

| Status | When |
|--------|------|
| **200** | Current user |
| **401** | No/invalid/expired token, or user disabled |

### POST `/api/auth/logout` — auth

Clears refresh cookie and stored refresh hash.

| Status | When |
|--------|------|
| **200** | Logged out |
| **401** | Not authenticated |

---

## 3. Admin: manage users

All routes: **admin** only.

| Method | Path | Success |
|--------|------|---------|
| GET | `/api/users?page=1&limit=15&search=&role=` | **200** list + `pagination` + `counts` |
| POST | `/api/users` `{ name, email, password, role }` | **201** |
| PUT | `/api/users/:id` | **200** |
| DELETE | `/api/users/:id` | **200** |

| Status | When |
|--------|------|
| **400** | Validation, or admin deletes self |
| **401** | Not authenticated |
| **403** | Trainer or student called these routes |
| **404** | User id not found |
| **409** | Email already in use |

---

## 4. Trainer: course lifecycle

```text
POST /api/courses          201  create (trainer = current user, status DRAFT)
GET  /api/courses          200  trainer sees only own courses
GET  /api/courses/:id      200  owner  |  403 other trainer
PUT  /api/courses/:id      200  owner  |  403 other trainer
DELETE /api/courses/:id    200  owner  |  403 other trainer
```

Admin can list/update/delete **any** course. Admin create is **PUBLISHED**.

### POST `/api/courses`

```json
{ "title": "Node API Design", "description": "Build authenticated Express APIs with validation." }
```

Optional: `category`, `level`, `price`, `durationHours`.

| Status | When |
|--------|------|
| **201** | Course created |
| **400** | Title &lt; 3 chars or description &lt; 10 chars |
| **401** | No token |
| **403** | Student tried to create |

### GET `/api/courses`

Query: `page`, `limit`, `search`, `category`, `level`.

| Caller | Result |
|--------|--------|
| student | Published courses only |
| trainer | Own courses only |
| admin | All courses |

**200** with `data[]` and `pagination: { page, limit, total, pages }`.  
**401** if unauthenticated.

### GET `/api/courses/:id`

| Status | When |
|--------|------|
| **200** | Visible to caller |
| **400** | `:id` is not a Mongo ObjectId |
| **401** | No token |
| **403** | Trainer opening another trainer’s course |
| **404** | Missing id, or student opening a draft (hidden as 404) |

### PUT `/api/courses/:id`

```json
{ "title": "Updated title", "description": "Updated description at least 10 chars." }
```

| Status | When |
|--------|------|
| **200** | Owner or admin updated |
| **400** | Invalid id or body |
| **403** | Trainer updating another trainer’s course |
| **404** | Course not found |

### DELETE `/api/courses/:id`

Also deletes that course’s enrollments, assignments, and submissions.

| Status | When |
|--------|------|
| **200** | `{ data: { id } }` |
| **400** | Invalid id |
| **403** | Trainer deleting another trainer’s course |
| **404** | Course not found |

---

## 5. Student: enroll

```text
GET  /api/courses                 published catalog
POST /api/courses/:courseId/enroll
GET  /api/courses/mine            enrolled courses
```

### POST `/api/courses/:courseId/enroll` — student only

No body.

| Status | When |
|--------|------|
| **201** | Enrollment created |
| **400** | Invalid `courseId`, or course is draft / not published |
| **401** | No token |
| **402** | Paid course and dummy payment not completed |
| **403** | Trainer/admin called enroll |
| **404** | Course does not exist |
| **409** | Same student already enrolled (unique index `{ course, student }`) |

A **different** student can still enroll in the same course (**201**).

---

## 6. Trainer: assignments

Each assignment stores: **title**, **description**, **dueDate**, **maxMarks**.

```text
POST /api/courses/:courseId/assignments   owner trainer / admin
GET  /api/courses/:courseId/assignments   owner, admin, or enrolled student
GET  /api/assignments/mine                student — all enrolled work
```

### POST `/api/courses/:courseId/assignments`

```json
{
  "title": "Weekly practical",
  "description": "Submit a written solution covering this week’s outcomes.",
  "dueDate": "2026-09-20T18:00:00.000Z",
  "maxMarks": 100
}
```

| Status | When |
|--------|------|
| **201** | Assignment created |
| **400** | Missing/invalid title, description, dueDate (must be ISO), or maxMarks (1–1000); invalid `courseId` |
| **403** | Student, or trainer on another trainer’s course |
| **404** | Course not found |

### GET `/api/courses/:courseId/assignments`

| Status | When |
|--------|------|
| **200** | List. Students also get `mySubmission` on each item |
| **400** | Invalid `courseId` |
| **403** | Student not enrolled, or trainer viewing another trainer’s course |
| **404** | Course not found |

---

## 7. Student: submit

```text
Student enrolled?
      ├── no   POST .../submit  → 403
      └── yes
            Due date passed?
              ├── yes  → 400  late submissions rejected
              └── no
                    Already submitted?
                      ├── yes  → 409
                      └── no   → 201  status SUBMITTED
```

### POST `/api/assignments/:assignmentId/submit` — student only

```json
{ "content": "My written solution covering APIs, tests, and edge cases." }
```

`content` must be 10–8000 characters.

| Status | When |
|--------|------|
| **201** | `{ status: "SUBMITTED", submittedAt, marks: null, feedback: "" }` |
| **400** | Invalid `assignmentId`, short content, or **due date has passed** |
| **401** | No token |
| **403** | Not a student, **or not enrolled** in the course |
| **404** | Assignment (or its course) not found |
| **409** | Student already submitted this assignment |

Business rule: late work is **always rejected**. There is no late-accept flag.

### GET `/api/submissions/me` — student

**200** own submissions. **403** if trainer/admin.

### GET `/api/submissions/:id`

| Status | When |
|--------|------|
| **200** | Owner student, course trainer, or admin |
| **400** | Invalid id |
| **403** | Student reading **another student’s** submission; trainer on another trainer’s course |
| **404** | Submission not found |

---

## 8. Trainer: evaluate

```text
GET  /api/assignments/:assignmentId/submissions   list (owner / admin)
PUT  /api/submissions/:id/evaluate                marks + feedback
```

Statuses:

| Status | Meaning |
|--------|---------|
| `SUBMITTED` | Student turned work in; not graded |
| `EVALUATED` | Trainer saved marks and feedback |

### GET `/api/assignments/:assignmentId/submissions`

| Status | When |
|--------|------|
| **200** | Array of submissions with student name/email |
| **403** | Student, or trainer who does not own the course |
| **404** | Assignment not found |

### PUT `/api/submissions/:id/evaluate` — trainer / admin

```json
{ "marks": 88, "feedback": "Clear structure. Add more edge-case coverage." }
```

Marks must be a number **≥ 0** and **≤ assignment.maxMarks**.

| Status | When |
|--------|------|
| **200** | `status` becomes `EVALUATED`; `marks` and `feedback` saved |
| **400** | Marks missing, not a number, or outside `0…maxMarks` |
| **403** | Student, or trainer evaluating another trainer’s course |
| **404** | Submission not found |

---

## 9. Shared error map

Use this when wiring a client.

| Code | Meaning | Typical `message` |
|------|---------|-------------------|
| **400** | Bad input / business rule | Validation failed; invalid id; course not published; due date passed; marks out of range |
| **401** | Auth failed | Authentication required; Invalid or expired authentication credentials; Access token expired; Invalid email or password |
| **402** | Payment required | Paid course needs dummy checkout first |
| **403** | Forbidden | Wrong role; another trainer’s course; not enrolled; another student’s submission |
| **404** | Not found | Course / assignment / submission / user / route not found |
| **409** | Conflict | Already enrolled; email taken; already submitted |
| **429** | Rate limited | Too many requests / auth attempts |
| **500** | Server error | Generic `An unexpected error occurred` in production |

Unknown URL: **404** `Route not found: GET /api/does-not-exist`.

Mongo duplicate key (`11000`) is mapped to **409**. Cast errors are **400**.

---

## 10. Full happy path (copy for Postman)

Replace tokens after login.

```http
# 1. Trainer logs in
POST /api/auth/login
{ "email": "trainer@lms.com", "password": "Trainer@123" }

# 2. Create course
POST /api/courses
Authorization: Bearer <trainerToken>
{ "title": "Node API Design", "description": "Build authenticated Express APIs with RBAC." }

# 3. Admin publishes (trainer creates DRAFT)
POST /api/auth/login
{ "email": "admin@lms.com", "password": "Admin@123" }

POST /api/courses/<courseId>/approve
Authorization: Bearer <adminToken>

# 4. Add assignment
POST /api/courses/<courseId>/assignments
Authorization: Bearer <trainerToken>
{ "title": "Weekly practical", "description": "Submit a short written solution.", "dueDate": "2026-12-01T18:00:00.000Z", "maxMarks": 100 }

# 5. Student logs in and enrolls
POST /api/auth/login
{ "email": "student@lms.com", "password": "Student@123" }

POST /api/courses/<courseId>/enroll
Authorization: Bearer <studentToken>

# 6. Submit
POST /api/assignments/<assignmentId>/submit
Authorization: Bearer <studentToken>
{ "content": "Here is my enrolled submission covering APIs and tests." }

# 7. Trainer lists and grades
GET /api/assignments/<assignmentId>/submissions
Authorization: Bearer <trainerToken>

PUT /api/submissions/<submissionId>/evaluate
Authorization: Bearer <trainerToken>
{ "marks": 88, "feedback": "Solid structure." }
```

Expected successes: login **200**, course **201**, approve **200**, assignment **201**, enroll **201**, submit **201**, list **200**, evaluate **200**.

---

## 11. Frontend mapping

| Screen | Calls |
|--------|--------|
| Login | `POST /api/auth/login` |
| Dashboard | `GET /api/dashboard` |
| Available courses | `GET /api/courses?page&search` · `POST /api/courses/:id/enroll` |
| My courses | `GET /api/courses/mine` |
| Assignments | `GET /api/assignments/mine` |
| Submissions | `GET /api/submissions/me` |
| Trainer dashboard | `GET/POST /api/courses` |
| Course detail | course + assignments + enroll + create assignment + submit |
| Review submissions | `GET .../submissions` · `PUT .../evaluate` |

On **401**, `frontend/src/api/client.js` calls `POST /api/auth/refresh` once and retries the original request.

---

## 12. Demo accounts (after seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@lms.com | Admin@123 |
| Trainer | trainer@lms.com | Trainer@123 |
| Other trainer | trainer2@lms.com | Trainer@123 |
| Student | student@lms.com | Student@123 |
| Other student | student2@lms.com | Student@123 |

Use `trainer2` / `student2` to verify **403** isolation (edit another course, read another submission, submit without enroll).

Seeded reviewer course: **Wrench Wise — Assignment Walkthrough** (`trainer@lms.com` owns it, `student@lms.com` is enrolled).

| Assignment | Student state | What to do |
|---|---|---|
| 1. Graded example — Authorization practical | `EVALUATED` 88/100 | Student: My submissions |
| 2. Waiting for marks — Enrollment rules | `SUBMITTED` | Trainer: Review submissions → evaluate |
| 3. Your turn — Submit a solution | not submitted | Student: submit once |
| 4. Late work — Due date has passed | overdue | Submit is rejected |
