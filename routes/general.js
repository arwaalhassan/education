const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const generalController = require('../controllers/generalController');

router.get('/announcements', auth.authenticateToken, generalController.getAnnouncements);
router.get('/platform-links', auth.authenticateToken, generalController.getPlatformLinks);
router.get('/stats', auth.authenticateToken, generalController.getStats);
module.exports = router;
