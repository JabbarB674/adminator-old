const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');

// All routes protected
router.use(protect);

router.post('/', uploadController.uploadMiddleware, uploadController.uploadFile);
router.get('/list', uploadController.listFiles);
router.post('/folder', uploadController.createFolder);
router.post('/delete', uploadController.deleteItem);
router.get('/view', uploadController.viewFile);

module.exports = router;
