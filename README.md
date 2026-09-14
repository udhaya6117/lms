# LMS Course & Assignment Management System

A small Learning Management System built with **React.js**, **Node.js**, **Express.js**, and **MongoDB**. The focus is backend authorization, API design, validation, error handling, and a maintainable project structure — not visual complexity.

Authorization is enforced on the server. Frontend route guards are UX only.

## Bonus features

The assignment asked for any two. This repo includes:

1. **Request validation** — `express-validator` on bodies, params, and list queries, with a consistent 400 payload.
2. **Refresh token authentication** — short-lived JWT access tokens plus rotating httpOnly refresh cookies.
3. **Rate limiting** — separate limits for `/api` and auth routes (`express-rate-limit`).
4. **Pagination and search** — course and user list endpoints accept `page`, `limit`, and `search`.
5. **Automated testing** — Node’s test runner + Supertest covers the required authorization and validation scenarios.

## Prerequisites

- Node.js 18+
- MongoDB 6+ (local or Atlas), **or** just Node.js — the API falls back to an in-memory MongoDB via `mongodb-memory-server` when the configured URI is unreachable.

## Setup and run

### 1. MongoDB (optional)

Use a local MongoDB instance or an Atlas connection string in `backend/.env`.

### 2. Backend

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

API: `http://localhost:5000`  
Health: `GET /api/health`

An empty database is seeded automatically on first start. To reset campus data:

```bash
npm run seed
```

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

UI: `http://localhost:3000`

Create React App proxies `/api` to the backend. Keep both processes running.

Change JWT secrets in the environment before any real deployment. Production refuses to start with the example secrets.

## Deploy on Vercel (free, no domain)

The UI and API share one `https://….vercel.app` URL so login cookies and `/api` calls work the same as on localhost. You do not need a paid domain.

### 1. Atlas (already free)

In [MongoDB Atlas](https://cloud.mongodb.com) → Network Access → add `0.0.0.0/0` (Vercel IPs change). Copy your `MONGODB_URI`. Seed locally once (`cd backend && npm run seed`) so Vercel does **not** have to create 80 bcrypt users on a 10-second function.

### 2. Create two JWT secrets

On your PC:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use one line as `JWT_ACCESS_SECRET` and the other as `JWT_REFRESH_SECRET`. They must be different.

### 3. Import the GitHub repo

1. Open [https://vercel.com/signup](https://vercel.com/signup) and continue with **GitHub** (Hobby / free).
2. **Add New… → Project** → import `udhaya6117/lms`.
3. Leave **Root Directory** empty (the repo root).
4. Framework Preset: **Other**.
5. Before you click Deploy, open **Environment Variables** and add:

| Name | Value |
|------|--------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | your Atlas URI |
| `JWT_ACCESS_SECRET` | first generated secret |
| `JWT_REFRESH_SECRET` | second generated secret |
| `COOKIE_SAMESITE` | `lax` |
| `SEED_ON_EMPTY` | `false` |
| `USE_MEMORY_DB` | `false` |

Vercel sets `VERCEL_URL` for you, so CORS/CSRF work without a custom `CLIENT_ORIGIN`.

6. Click **Deploy**. Wait for the build to go green.
7. Open the `.vercel.app` URL. Login with the seeded demo accounts.

### 4. If login fails

- Atlas Network Access must allow `0.0.0.0/0`.
- Secrets must be 32+ characters and not the `.env.example` placeholders.
- Check the Vercel deployment → **Logs** for `MongoDB connected` or a blocked-secrets error.
- After the first successful deploy, optional: set `CLIENT_ORIGIN` to `https://your-project.vercel.app` and redeploy.

Local `npm start` is unchanged. The CRA proxy still talks to `localhost:5000`.

### Demo accounts (local seed only)

These logins exist so reviewers can walk the app after `npm run seed`. They are **not** production credentials. Override them with `SEED_ADMIN_PASSWORD`, `SEED_TRAINER_PASSWORD`, and `SEED_STUDENT_PASSWORD` in `backend/.env`. Production will not auto-seed unless `SEED_ON_EMPTY=true` **and** those passwords are no longer the demo defaults. Seed scripts do not print passwords when `NODE_ENV=production`.

| Role | Email | Password (default demo) |
|------|-------|----------|
| Admin | admin@lms.com | Admin@123 |
| Trainer | trainer@lms.com | Trainer@123 |
| Trainer (isolation tests) | trainer2@lms.com | Trainer@123 |
| Student | student@lms.com | Student@123 |
| Student | student2@lms.com | Student@123 |

Public registration creates **student** accounts only. Trainers and admins are created by an admin or the seed script.

The campus seed creates **12 trainers**, **72 students**, catalog courses, enrollments, assignments, mixed submissions, and a reviewer walkthrough course.

All trainers share `SEED_TRAINER_PASSWORD` (default `Trainer@123`). All students share `SEED_STUDENT_PASSWORD` (default `Student@123`).

### Reviewer walkthrough (after seed)

Open **Wrench Wise — Assignment Walkthrough** (owned by `trainer@lms.com`, enrolled for `student@lms.com`):

1. **Graded example** — student already has `EVALUATED` marks and feedback.
2. **Waiting for marks** — student work is `SUBMITTED`. Trainer opens Review submissions and grades it.
3. **Your turn** — student can submit once. A second submit returns **409**.
4. **Late work** — due date has passed. Submit is rejected (**400**).

`student2@lms.com` is not enrolled in that course (403 if they try to submit). They are enrolled in **Node.js API Design** owned by `trainer2@lms.com`, so trainer isolation can be checked. Admin **Approvals** has **Full-Stack Capstone** waiting to publish.

## Project architecture

```text
lms/
  backend/
    src/
      config/db.js                 # MongoDB connection + first-run seed
      models/                      # Mongoose schemas and indexes
      middleware/
        auth.middleware.js         # access JWT
        role.middleware.js         # RBAC
        validate.middleware.js
        rateLimit.middleware.js
        error.middleware.js
      controllers/
      routes/
      validators/
      utils/
      store/campusSeed.js
      app.js
      server.js
      seed.js
    tests/scenarios.test.js
  frontend/
    src/
      api/client.js                # fetch wrapper + refresh
      context/AuthContext.jsx
      components/                  # layout, protected routes, UI
      pages/                       # login, dashboards, catalog, assignments
```

```text
User
 │
 ├── Trainer ──────→ Course
 │                      │
 │                      └── Assignment
 │
 └── Student ──→ Enrollment ─┘
                    │
                    └── Submission
```

## Database design

Persisted in **MongoDB**. Major collections and relationships:

```text
User 1 ──< Course.trainer
User 1 ──< Enrollment.student
Course 1 ──< Enrollment.course
Course 1 ──< Assignment.course
Assignment 1 ──< Submission.assignment
User 1 ──< Submission.student
```

### Collections

**users**

- `name`, `email` (unique, lowercase), `password` (bcrypt, not selected by default)
- `role`: `admin` | `trainer` | `student`
- `isActive`
- `refreshTokenHash`, `refreshTokenId` (rotation / reuse detection)

**courses**

- `title`, `description`, `trainer`, `isPublished`
- `status`: `DRAFT` | `PENDING_REVIEW` | `PUBLISHED` | `REJECTED`
- optional catalog fields: `category`, `level`, `price`, `durationHours`

**enrollments**

- `course`, `student`, `enrolledAt`
- unique compound index `{ course, student }`

**assignments**

- `course`, `title`, `description`, `dueDate`, `maxMarks`

**submissions**

- `assignment`, `student`, `content`, `submittedAt`
- `marks`, `feedback`, `status` (`SUBMITTED` | `EVALUATED`)
- unique compound index `{ assignment, student }`

Supporting collections used by the extra learning-path features: `categories`, `sections`, `lessons`, `lessonprogresses`, `quizzes`, `questions`, `quizattempts`, `certificates`, `reviews`, `notifications`, `payments`.

## Authentication and authorization

- Login / register issue an **access JWT** (default 15 minutes) in the JSON body and a **refresh JWT** in an httpOnly cookie (`path=/api/auth`).
- Access tokens are sent as `Authorization: Bearer <token>`.
- `POST /api/auth/refresh` rotates the refresh token (new id + hash stored on the user). Reused or invalid refresh tokens return 401.
- Logout clears the cookie and unsets the stored refresh hash.
- `authenticate` verifies the access token and loads an **active** user from MongoDB. Disabled accounts are rejected even if the JWT is still valid.
- `authorize(...roles)` enforces role. **Ownership is checked in controllers** (a trainer can only mutate their own courses; an admin can manage all).
- Frontend `ProtectedRoute` is UX only. Every mutating API still checks role and ownership.

## API details

All JSON responses use:

```json
{ "success": true, "data": {} }
```

or

```json
{ "success": false, "message": "…", "errors": [{ "field": "title", "message": "…" }] }
```

### Auth

| Method | Path | Access | Notes |
|--------|------|--------|-------|
| POST | `/api/auth/register` | public | Creates a student |
| POST | `/api/auth/login` | public | `{ email, password }` |
| POST | `/api/auth/refresh` | cookie | Rotates tokens |
| POST | `/api/auth/logout` | auth | |
| GET | `/api/auth/me` | auth | Current user |

### Users (admin)

| Method | Path |
|--------|------|
| GET | `/api/users` Query: `page`, `limit`, `search`, `role` |
| POST | `/api/users` `{ name, email, password, role }` |
| PUT | `/api/users/:id` |
| DELETE | `/api/users/:id` |

### Courses

| Method | Path | Access |
|--------|------|--------|
| POST | `/api/courses` | trainer, admin |
| GET | `/api/courses` | auth; trainer sees own; student sees `PUBLISHED`; admin sees all. Query: `page`, `limit`, `search`, `category`, `level` |
| GET | `/api/courses/mine` | student enrollments |
| GET | `/api/courses/:id` | auth + visibility rules |
| PUT | `/api/courses/:id` | owner trainer or admin |
| DELETE | `/api/courses/:id` | owner trainer or admin |
| POST | `/api/courses/:courseId/enroll` | student; **409** if already enrolled |

### Assignments

| Method | Path | Access |
|--------|------|--------|
| POST | `/api/courses/:courseId/assignments` | owner trainer or admin `{ title, description, dueDate, maxMarks }` |
| GET | `/api/courses/:courseId/assignments` | enrolled student, owner trainer, admin |
| GET | `/api/assignments/mine` | student; assignments across enrollments |

### Submissions

| Method | Path | Access |
|--------|------|--------|
| POST | `/api/assignments/:assignmentId/submit` | enrolled student; rejected after due date; one submission |
| GET | `/api/assignments/:assignmentId/submissions` | owner trainer or admin |
| GET | `/api/submissions/me` | student |
| GET | `/api/submissions/:id` | owner student, course trainer, or admin |
| PUT | `/api/submissions/:id/evaluate` | course trainer or admin `{ marks, feedback }` |

### Status codes

- **400** validation, due date passed, marks out of range, invalid id
- **401** missing or expired credentials
- **403** role, ownership, enrollment, or another student’s submission
- **404** unknown course, assignment, or submission
- **409** duplicate enroll, email, or resubmit
- **429** rate limit
- **500** unexpected server errors (generic message in production)

## Frontend

Protected routes wrap the authenticated shell. Role-specific screens:

- Login / Register
- Dashboard (role-aware KPIs and queues)
- Available courses (catalog + search)
- My courses / learning path
- Assignments (student work across enrollments)
- Course detail (assignments, enroll, curriculum)
- Student submissions
- Trainer workspace (create/manage owned courses)
- Assignment submission review (marks, feedback, status)
- Admin user directory

The API client stores the access token, sends it on every request, and refreshes once on 401 using the httpOnly cookie.

## Assumptions / business rules

- Public register always assigns role `student`.
- Trainers cannot change another trainer’s courses or evaluate their submissions. Admins can.
- Students may view published courses before enrolling; assignments require enrollment.
- Late submissions are **rejected**.
- A student may submit **once** per assignment (no overwrite).
- Marks must be between `0` and the assignment `maxMarks`. Evaluation sets status to `EVALUATED`.
- Unpublished / draft courses are hidden from students.
- Submission content is text (no file storage in this version).
- Paid catalog items use a dummy checkout before enrollment. Free published courses enroll directly.

## Tests

Uses an in-memory MongoDB. No local server required.

```bash
cd backend
npm test
```

The suite checks:

- missing / invalid tokens
- trainer isolation on `PUT` / `DELETE /api/courses/:id`
- invalid and unknown course ids
- duplicate enrollment
- submit without enrollment
- submit after the due date
- student A cannot read student B’s submission
- marks outside `0…maxMarks`
- successful evaluation by the owning trainer

## What changes would you make if this application had to support thousands of users in production?

- Keep list endpoints paginated (already started) and rely on the existing indexes on `enrollments.student`, `assignments.course`, and `submissions.assignment`. Add covering indexes for the hottest dashboard queries after measuring them.
- Run multiple stateless API instances behind a load balancer. JWT access tokens do not need session affinity. Store refresh-token hashes in Redis if per-user document updates become a hotspot, and keep reuse detection.
- Use a MongoDB replica set, connection pooling, and read preference for catalog queries. Cache published course lists in Redis with a short TTL.
- Keep rate limits on login and submit. Move any future file uploads to object storage (S3) rather than the database.
- Emit structured logs and metrics (latency, 4xx/5xx, enrollment rate). `/api/health` is already present for orchestration.
- Split read-heavy dashboards from write APIs only when metrics show a bottleneck. Do not start with microservices.

## Environment variables

See `backend/.env.example`. Never commit production secrets. `.env` is gitignored.

Production start requires `MONGODB_URI`, `CLIENT_ORIGIN`, and unique JWT secrets of at least 32 characters. In-memory MongoDB is disabled in production.

## Extra features (beyond the assignment)

These extras are **not** substitutes for the required brief APIs (courses, enroll, assignments, submit, evaluate, RBAC). Reviewers can ignore them.

- **Course approval** — trainers submit a draft; admins publish. Extra study sections after approve do not re-enter review.
- **Study documents** — section/lesson text used as the learning path.
- **Messages** — in-app threads with the same RBAC/ownership rules.
- **Notifications, quizzes, certificates, dummy payments, reviews** — optional campus UX on the same auth model.

User-generated text on these surfaces is sanitized the same way as assignment submissions.

## Repository (assignment Section 10)

GitHub: [https://github.com/udhaya6117/lms](https://github.com/udhaya6117/lms)

## Production hardening

- **Secrets** stay in `.env`. JWT defaults are rejected in production. Demo passwords come from `SEED_*` and are not logged in production.
- **XSS** — request bodies strip HTML/control characters before validation. The UI also renders user text as plain text (React does not use `dangerouslySetInnerHTML`).
- **CSRF** — refresh/login/logout cookie routes check `Origin` / `Referer` against `CLIENT_ORIGIN`. Refresh cookies are httpOnly, path-scoped to `/api/auth`, `SameSite=lax` in development, and `Secure` + configurable `COOKIE_SAMESITE` in production.
- **CORS** allows only origins listed in `CLIENT_ORIGIN`.
