const express = require('express');
const router = express.Router();
const dbController = require('../controllers/dbController');
const { protect, admin } = require('../middleware/authMiddleware');

// Only admins can run raw SQL
router.post('/query', protect, admin, dbController.executeQuery);

module.exports = router;
