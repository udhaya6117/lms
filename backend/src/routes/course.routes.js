const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const {
  courseBodyRules,
  updateCourseRules,
  mongoId,
  assignmentRules,
  listQueryRules,
} = require('../validators');
const courseController = require('../controllers/course.controller');
const assignmentController = require('../controllers/assignment.controller');

const router = express.Router();

router.use(authenticate);

router.get('/mine', authorize('student'), courseController.myCourses);
router.get('/pending', authorize('admin'), courseController.pendingCourses);
router.get('/', listQueryRules, validate, courseController.listCourses);
router.post(
  '/',
  authorize('trainer', 'admin'),
  courseBodyRules,
  validate,
  courseController.createCourse
);
router.get('/:id/enrollments', mongoId(), validate, authorize('trainer', 'admin'), courseController.listEnrollments);
router.get('/:id', mongoId(), validate, courseController.getCourse);
router.post('/:id/submit-review', authorize('trainer', 'admin'), mongoId(), validate, courseController.submitForReview);
router.post('/:id/approve', authorize('admin'), mongoId(), validate, courseController.approveCourse);
router.post('/:id/reject', authorize('admin'), mongoId(), validate, courseController.rejectCourse);
router.put(
  '/:id',
  authorize('trainer', 'admin'),
  updateCourseRules,
  validate,
  courseController.updateCourse
);
router.delete(
  '/:id',
  authorize('trainer', 'admin'),
  mongoId(),
  validate,
  courseController.deleteCourse
);
router.post(
  '/:courseId/enroll',
  authorize('student'),
  mongoId('courseId'),
  validate,
  courseController.enroll
);
router.post(
  '/:courseId/assignments',
  authorize('trainer', 'admin'),
  assignmentRules,
  validate,
  assignmentController.createAssignment
);
router.get(
  '/:courseId/assignments',
  mongoId('courseId'),
  validate,
  assignmentController.listAssignments
);

module.exports = router;
