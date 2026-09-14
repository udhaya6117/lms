const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { createUserRules, updateUserRules, mongoId, listQueryRules } = require('../validators');
const userController = require('../controllers/user.controller');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/', listQueryRules, validate, userController.listUsers);
router.get('/:id', mongoId(), validate, userController.getUser);
router.post('/', createUserRules, validate, userController.createUser);
router.put('/:id', updateUserRules, validate, userController.updateUser);
router.delete('/:id', mongoId(), validate, userController.deleteUser);

module.exports = router;
