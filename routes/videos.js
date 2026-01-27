const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload'); // يستورد ملف الميدل وير الخاص بك
const videoController = require('../controllers/videoController'); // يستورد الكنترولر الذي عرضته

// [1] مسار الرفع (Upload)
// يستخدم uploadMiddleware من ملف upload.js 
// ويستخدم uploadVideo من ملف videoController.js
router.post(
    '/upload',
    auth.authenticateToken,
    auth.isInstructorOrAdmin,
    upload.uploadMiddleware, 
    videoController.uploadVideo
);

// [2] مسار جلب قائمة الدروس (List)
router.get(
    '/course/:courseId/list',
    auth.authenticateToken,
    videoController.getCourseVideos
);

// [3] مسار جلب الرابط الآمن (Stream/Download)
router.get(
    '/stream/:videoId',
    auth.authenticateToken,
    videoController.streamVideo
);

module.exports = router;
