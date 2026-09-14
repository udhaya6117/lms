const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const User = require('../models/User');
const Lesson = require('../models/Lesson');
const LessonProgress = require('../models/LessonProgress');
const Certificate = require('../models/Certificate');
const Notification = require('../models/Notification');
const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');

const dayKey = (value) => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const lastDays = (n) => {
  const days = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push(dayKey(d));
  }
  return days;
};

const trend = (records, field, days = 12) => {
  const keys = lastDays(days);
  return keys.map((day) => ({
    label: day.slice(5),
    value: records.filter((row) => dayKey(row[field] || row.createdAt) === day).length,
  }));
};

const mix = (items, pick, fallback = 'Other') => {
  const counts = {};
  items.forEach((item) => {
    const label = pick(item) || fallback;
    counts[label] = (counts[label] || 0) + 1;
  });
  return Object.entries(counts).map(([label, value]) => ({ label, value }));
};

const recentNotes = async (userId) => {
  const items = await Notification.find({ user: userId, type: { $ne: 'message' } })
    .sort({ createdAt: -1 })
    .limit(8);
  return items.map((n) => ({
    id: n._id,
    title: n.title,
    body: n.body,
    type: n.type,
    read: n.read,
    at: n.createdAt,
  }));
};

const dashboard = asyncHandler(async (req, res) => {
  const { role, _id, name } = req.user;

  if (role === 'student') {
    const enrollments = await Enrollment.find({ student: _id }).sort({ createdAt: -1 });
    const courseIds = enrollments.map((e) => e.course);
    const assignments = await Assignment.find({ course: { $in: courseIds } }).sort({ dueDate: 1 });
    const submissions = await Submission.find({ student: _id });
    const submittedIds = new Set(submissions.map((s) => String(s.assignment)));
    const pending = assignments.filter((a) => !submittedIds.has(String(a._id)));
    const overdue = pending.filter((a) => new Date(a.dueDate) < new Date());
    const courses = await Course.find({ _id: { $in: courseIds } }).populate('trainer', 'name email role');
    const certificates = await Certificate.find({ student: _id });
    const lessons = await Lesson.find({ course: { $in: courseIds } });
    const progressRows = await LessonProgress.find({ student: _id, completed: true });

    const learning = courses.map((course) => {
      const total = lessons.filter((l) => String(l.course) === String(course._id)).length;
      const done = progressRows.filter((p) => String(p.course) === String(course._id)).length;
      return {
        _id: course._id,
        title: course.title,
        trainer: course.trainer?.name,
        percent: total ? Math.round((done / total) * 100) : 0,
        completedLessons: done,
        lessons: total,
      };
    }).sort((a, b) => a.percent - b.percent);

    const avgProgress = learning.length
      ? Math.round(learning.reduce((sum, c) => sum + c.percent, 0) / learning.length)
      : 0;

    return res.json({
      success: true,
      data: {
        role,
        greeting: name,
        stats: [
          { label: 'Courses', value: enrollments.length, hint: 'Currently enrolled', tone: 'blue' },
          { label: 'Avg. progress', value: `${avgProgress}%`, hint: 'Across enrolled paths', tone: 'teal' },
          { label: 'Due work', value: pending.length, hint: `${overdue.length} overdue`, tone: overdue.length ? 'warn' : 'slate' },
          { label: 'Certificates', value: certificates.length, hint: 'Issued on completion', tone: 'ok' },
        ],
        trend: trend(enrollments, 'enrolledAt'),
        mix: mix(submissions, (s) => s.status || 'SUBMITTED'),
        learning,
        queue: pending.slice(0, 8).map((a) => ({
          id: a._id,
          title: a.title,
          dueDate: a.dueDate,
          courseId: a.course,
          overdue: new Date(a.dueDate) < new Date(),
        })),
        activity: await recentNotes(_id),
        spotlight: learning[0] || null,
      },
    });
  }

  if (role === 'trainer') {
    const courses = await Course.find({ trainer: _id }).sort({ updatedAt: -1 });
    const courseIds = courses.map((c) => c._id);
    const assignments = await Assignment.find({ course: { $in: courseIds } });
    const assignmentIds = assignments.map((a) => a._id);
    const submissions = await Submission.find({ assignment: { $in: assignmentIds } })
      .populate('student', 'name email')
      .sort({ submittedAt: -1 });
    const pending = submissions.filter((s) => s.status === 'SUBMITTED');
    const enrollments = await Enrollment.find({ course: { $in: courseIds } });
    const evaluated = submissions.filter((s) => s.status === 'EVALUATED');

    const courseCards = courses.map((course) => {
      const learners = enrollments.filter((e) => String(e.course) === String(course._id)).length;
      const work = assignments.filter((a) => String(a.course) === String(course._id)).length;
      return {
        _id: course._id,
        title: course.title,
        status: course.status || (course.isPublished ? 'PUBLISHED' : 'DRAFT'),
        price: course.price || 0,
        learners,
        assignments: work,
        level: course.level,
      };
    });

    const reviewQueue = pending.slice(0, 8).map((s) => {
      const assignment = assignments.find((a) => String(a._id) === String(s.assignment));
      return {
        id: s._id,
        assignmentId: s.assignment,
        assignmentTitle: assignment?.title || 'Assignment',
        studentName: s.student?.name || 'Student',
        submittedAt: s.submittedAt,
        courseId: assignment?.course,
      };
    });

    return res.json({
      success: true,
      data: {
        role,
        greeting: name,
        stats: [
          { label: 'Courses', value: courses.length, hint: `${courseCards.filter((c) => c.status === 'PUBLISHED').length} published`, tone: 'blue' },
          { label: 'Learners', value: enrollments.length, hint: 'Across your catalog', tone: 'teal' },
          { label: 'To evaluate', value: pending.length, hint: 'Submitted, not marked', tone: pending.length ? 'warn' : 'ok' },
          { label: 'Evaluated', value: evaluated.length, hint: 'Feedback already sent', tone: 'ok' },
        ],
        trend: trend(enrollments, 'enrolledAt'),
        mix: mix(courses, (c) => c.status || (c.isPublished ? 'PUBLISHED' : 'DRAFT')),
        courses: courseCards,
        queue: reviewQueue,
        activity: await recentNotes(_id),
        spotlight: courseCards[0] || null,
      },
    });
  }

  const users = await User.find();
  const courses = await Course.find().populate('trainer', 'name email role');
  const enrollments = await Enrollment.find();
  const submissions = await Submission.find();
  const payments = await Payment.find().sort({ createdAt: -1 });
  const pendingCourses = courses.filter((c) => c.status === 'PENDING_REVIEW');
  const published = courses.filter((c) => c.status === 'PUBLISHED' || c.isPublished).length;
  const revenue = payments
    .filter((p) => p.status === 'SUCCESS')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const students = users.filter((u) => u.role === 'student');
  const trainers = users.filter((u) => u.role === 'trainer');

  const enrollmentByCourse = enrollments.reduce((acc, e) => {
    const key = String(e.course);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const topCourses = [...courses]
    .sort((a, b) => (enrollmentByCourse[String(b._id)] || 0) - (enrollmentByCourse[String(a._id)] || 0))
    .slice(0, 6)
    .map((c) => ({
      _id: c._id,
      title: c.title,
      status: c.status || (c.isPublished ? 'PUBLISHED' : 'DRAFT'),
      trainer: c.trainer?.name,
      learners: enrollmentByCourse[String(c._id)] || 0,
      price: c.price || 0,
    }));

  return res.json({
    success: true,
    data: {
      role,
      greeting: name,
      stats: [
        { label: 'Students', value: students.length, hint: `${students.filter((u) => u.isActive !== false).length} active`, tone: 'blue' },
        { label: 'Trainers', value: trainers.length, hint: 'Faculty accounts', tone: 'teal' },
        { label: 'Published', value: published, hint: `${pendingCourses.length} awaiting review`, tone: pendingCourses.length ? 'warn' : 'ok' },
        { label: 'Enrollments', value: enrollments.length, hint: 'Campus-wide', tone: 'slate' },
        { label: 'Revenue', value: `₹${revenue.toLocaleString('en-IN')}`, hint: `${payments.filter((p) => p.status === 'SUCCESS').length} successful pays`, tone: 'ok' },
        { label: 'Submissions', value: submissions.length, hint: `${submissions.filter((s) => s.status === 'SUBMITTED').length} ungraded`, tone: 'slate' },
      ],
      trend: trend(enrollments, 'enrolledAt'),
      mix: mix(courses, (c) => c.status || (c.isPublished ? 'PUBLISHED' : 'DRAFT')),
      peopleMix: mix(users.filter((u) => u.role !== 'admin'), (u) => u.role),
      courses: topCourses,
      queue: pendingCourses.slice(0, 8).map((c) => ({
        id: c._id,
        title: c.title,
        trainerName: c.trainer?.name,
        status: c.status,
      })),
      activity: await recentNotes(_id),
      payments: payments.slice(0, 6).map((p) => ({
        id: p._id,
        amount: p.amount,
        status: p.status,
        at: p.createdAt,
        transactionId: p.transactionId,
      })),
      spotlight: pendingCourses[0]
        ? { title: pendingCourses[0].title, _id: pendingCourses[0]._id }
        : topCourses[0] || null,
    },
  });
});

module.exports = { dashboard };
