const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { dashboard } = require('../controllers/dashboard.controller');

const router = express.Router();
router.use(authenticate);
router.get('/', dashboard);

module.exports = router;
