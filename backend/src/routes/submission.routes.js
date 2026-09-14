const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { evaluateRules, mongoId } = require('../validators');
const submissionController = require('../controllers/submission.controller');

const router = express.Router();

router.use(authenticate);

router.get('/me', authorize('student'), submissionController.mySubmissions);
router.get('/:id', mongoId(), validate, submissionController.getSubmission);
router.put(
  '/:id/evaluate',
  authorize('trainer', 'admin'),
  evaluateRules,
  validate,
  submissionController.evaluate
);

module.exports = router;
