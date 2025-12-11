const express = require('express');
const router = express.Router();
const appController = require('../controllers/appController');
const remoteDbController = require('../controllers/remoteDbController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/test-connection', protect, admin, remoteDbController.testConnection);

router.get('/', protect, appController.getAllApps);
router.post('/save-config', protect, admin, appController.saveAppConfig); // Legacy/Simple save
router.put('/configs/:appKey(*)', protect, admin, appController.saveAppConfig); // Update specific key
router.get('/configs', protect, admin, appController.listAppConfigs);
router.get('/configs/:appKey(*)', protect, admin, appController.getAppConfig);
router.delete('/configs/:appKey(*)', protect, admin, appController.deleteAppConfig);

module.exports = router;
