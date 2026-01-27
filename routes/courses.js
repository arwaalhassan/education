const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const auth = require('../middleware/auth');

// --- [المسارات الثابتة - توضع أولاً] ---
router.get('/search', courseController.searchCourses);
router.get('/earnings', auth.authenticateToken, auth.isInstructorOrAdmin, courseController.getTeacherEarnings);
router.get('/enrolled', auth.authenticateToken, courseController.getEnrolledCourses);

// --- [المسارات التي تستخدم ID - توضع لاحقاً] ---

// جلب كورس واحد (هذا هو المسار الذي كان ينقصك ويسبب 404 للأدمن)
router.get('/:courseId', courseController.getCourseById); 

// جلب كل الكورسات
router.get('/', auth.authenticateToken, courseController.getCourses);

// إنشاء كورس
router.post('/', auth.authenticateToken, auth.isInstructorOrAdmin, courseController.createCourse);

// تعديل كورس
router.put('/:courseId', auth.authenticateToken, auth.isInstructorOrAdmin, courseController.updateCourse);

// حذف كورس
router.delete('/:courseId', auth.authenticateToken, auth.isInstructorOrAdmin, courseController.deleteCourse);

// الاشتراك
router.post('/enroll', auth.authenticateToken, courseController.enrollInCourse);

module.exports = router;
