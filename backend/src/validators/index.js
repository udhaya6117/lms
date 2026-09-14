const { body, param, query } = require('express-validator');

const mongoId = (name = 'id') =>
  param(name).isMongoId().withMessage(`${name} must be a valid id`);

const registerRules = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8, max: 72 })
    .withMessage('Password must be at least 8 characters'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const createUserRules = [
  ...registerRules,
  body('role').isIn(['admin', 'trainer', 'student']).withMessage('Invalid role'),
];

const updateUserRules = [
  mongoId(),
  body('name').optional().trim().isLength({ min: 2, max: 80 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().isIn(['admin', 'trainer', 'student']),
  body('isActive').optional().isBoolean(),
  body('password').optional().isLength({ min: 8, max: 72 }),
];

const courseBodyRules = [
  body('title').trim().isLength({ min: 3, max: 120 }).withMessage('Title is required'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be at least 10 characters'),
  body('isPublished').optional().isBoolean(),
];

const updateCourseRules = [
  mongoId(),
  body('title').optional().trim().isLength({ min: 3, max: 120 }),
  body('description').optional().trim().isLength({ min: 10, max: 2000 }),
  body('isPublished').optional().isBoolean(),
];

const assignmentRules = [
  param('courseId').isMongoId().withMessage('courseId must be a valid id'),
  body('title').trim().isLength({ min: 3, max: 120 }).withMessage('Title is required'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 4000 })
    .withMessage('Description is required'),
  body('dueDate').isISO8601().withMessage('dueDate must be a valid date'),
  body('maxMarks').isInt({ min: 1, max: 1000 }).withMessage('maxMarks must be 1-1000'),
];

const submitRules = [
  param('assignmentId').isMongoId().withMessage('assignmentId must be a valid id'),
  body('content')
    .trim()
    .isLength({ min: 10, max: 8000 })
    .withMessage('Submission content must be at least 10 characters'),
];

const evaluateRules = [
  mongoId(),
  body('marks').isFloat({ min: 0 }).withMessage('marks must be a number >= 0'),
  body('feedback').optional().trim().isLength({ max: 2000 }),
];

const listQueryRules = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().trim().isLength({ max: 80 }),
  query('role').optional().isIn(['admin', 'trainer', 'student']),
];

module.exports = {
  mongoId,
  registerRules,
  loginRules,
  createUserRules,
  updateUserRules,
  courseBodyRules,
  updateCourseRules,
  assignmentRules,
  submitRules,
  evaluateRules,
  listQueryRules,
};
