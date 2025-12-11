const express = require('express');
const router = express.Router();
const dbController = require('../controllers/dbController');
const { protect, admin } = require('../middleware/authMiddleware');

// Only admins can run raw SQL
router.post('/query', protect, admin, dbController.executeQuery);
router.get('/apps', protect, admin, dbController.getApps);

module.exports = router;
