const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const categoryController = require('../controllers/category.controller');
const { mongoId } = require('../validators');
const validate = require('../middleware/validate.middleware');

const router = express.Router();
router.use(authenticate);
router.get('/', categoryController.list);
router.post('/', authorize('admin'), categoryController.create);
router.put('/:id', authorize('admin'), mongoId(), validate, categoryController.update);
router.delete('/:id', authorize('admin'), mongoId(), validate, categoryController.remove);

module.exports = router;
