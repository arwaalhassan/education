// routes/student.js

const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticateToken } = require('../middleware/auth'); 

// تطبيق الـ Middleware على جميع مسارات الطالب
router.use(authenticateToken); 

// المسار الأول: /api/student/videos
router.get('/videos', studentController.getVideos);

// المسار الثاني: /api/student/videos/:videoId
router.get('/videos/:videoId', studentController.getVideoById);

module.exports = router;
