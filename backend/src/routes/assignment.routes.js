const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { submitRules, mongoId } = require('../validators');
const assignmentController = require('../controllers/assignment.controller');
const submissionController = require('../controllers/submission.controller');

const router = express.Router();

router.use(authenticate);

router.get('/mine', authorize('student'), assignmentController.myAssignments);
router.post(
  '/:assignmentId/submit',
  authorize('student'),
  submitRules,
  validate,
  submissionController.submit
);
router.get(
  '/:assignmentId/submissions',
  authorize('trainer', 'admin'),
  mongoId('assignmentId'),
  validate,
  submissionController.listForAssignment
);
router.get(
  '/:id',
  mongoId('id'),
  validate,
  assignmentController.getAssignment
);

module.exports = router;
