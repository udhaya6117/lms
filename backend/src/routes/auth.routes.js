const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { cookieCsrfGuard } = require('../middleware/csrf.middleware');
const { registerRules, loginRules } = require('../validators');
const authController = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', cookieCsrfGuard, registerRules, validate, authController.register);
router.post('/login', cookieCsrfGuard, loginRules, validate, authController.login);
router.post('/refresh', cookieCsrfGuard, authController.refresh);
router.post('/logout', cookieCsrfGuard, authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

module.exports = router;
