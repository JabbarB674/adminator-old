const express = require('express');
const router = express.Router();
const multer = require('multer');
const appController = require('../controllers/appController');
const remoteDbController = require('../controllers/remoteDbController');
const { protect, admin } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/test-connection', protect, admin, remoteDbController.testConnection);
router.post('/configs/:appKey/icon', protect, admin, upload.single('icon'), appController.uploadAppIcon);

router.get('/', protect, appController.getAllApps);
router.post('/save-config', protect, admin, appController.saveAppConfig); // Legacy/Simple save
router.put('/configs/:appKey(*)', protect, admin, appController.saveAppConfig); // Update specific key
router.get('/configs', protect, admin, appController.listAppConfigs);
router.get('/configs/:appKey(*)', protect, admin, appController.getAppConfig);
router.delete('/configs/:appKey(*)', protect, admin, appController.deleteAppConfig);

// Data Proxy Routes (Protected by App Access logic in controller)
router.get('/:appKey/data/:tableName', protect, remoteDbController.getData);

module.exports = router;
