const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

// Protect all routes and restrict to Global Admins
router.use(protect);
router.use(admin);

router.get('/', userController.getUsers);
router.get('/profiles', userController.getProfiles);
router.post('/', userController.createUser);
router.put('/:userId', userController.updateUser);

// User Permissions
router.get('/:userId/apps', userController.getUserApps);
router.put('/:userId/apps', userController.updateUserApps);

module.exports = router;
