const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { mongoId } = require('../validators');
const validate = require('../middleware/validate.middleware');
const curriculum = require('../controllers/curriculum.controller');
const quiz = require('../controllers/quiz.controller');
const progress = require('../controllers/progress.controller');
const payment = require('../controllers/payment.controller');
const engagement = require('../controllers/engagement.controller');
const messages = require('../controllers/message.controller');

const router = express.Router();
router.use(authenticate);

router.get('/courses/:courseId/curriculum', mongoId('courseId'), validate, curriculum.getCurriculum);
router.post('/courses/:courseId/sections', authorize('trainer', 'admin'), mongoId('courseId'), validate, curriculum.addSection);
router.post('/sections/:sectionId/lessons', authorize('trainer', 'admin'), mongoId('sectionId'), validate, curriculum.addLesson);
router.post('/lessons/:id/complete', authorize('student'), mongoId(), validate, curriculum.completeLesson);

router.post('/courses/:courseId/quizzes', authorize('trainer', 'admin'), mongoId('courseId'), validate, quiz.createQuiz);
router.get('/courses/:courseId/quizzes', mongoId('courseId'), validate, quiz.listQuizzes);
router.post('/quizzes/:id/attempt', authorize('student'), mongoId(), validate, quiz.attemptQuiz);

router.get('/courses/:courseId/progress', mongoId('courseId'), validate, progress.getProgress);
router.get('/certificates/me', authorize('student'), progress.myCertificates);

router.post('/payments/dummy', authorize('student'), payment.dummyPay);
router.get('/payments', payment.listPayments);

router.post('/courses/:courseId/reviews', authorize('student'), mongoId('courseId'), validate, engagement.addReview);
router.get('/courses/:courseId/reviews', mongoId('courseId'), validate, engagement.listReviews);
router.get('/inbox/unread', engagement.unreadCounts);
router.get('/notifications', engagement.myNotifications);
router.put('/notifications/:id/read', mongoId(), validate, engagement.readNotification);
router.get('/messages', messages.inbox);
router.get('/messages/contacts', messages.listContacts);
router.get('/messages/thread/:userId', mongoId('userId'), validate, messages.thread);
router.post('/messages', messages.send);

module.exports = router;
