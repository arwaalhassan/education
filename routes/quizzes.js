const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const quizController = require('../controllers/quizController');

// ===================================
// مسارات الأستاذ/المشرف (Instructor/Admin Endpoints)
// ==================================
router.get(
    '/admin/quizzes/:id/details', // تم تعديل المسار ليطابق طلب المتصفح
    auth.authenticateToken, 
    auth.isInstructorOrAdmin, 
    quizController.getQuizDetails
);
router.get(
    '/admin/courses/:courseId/quizzes', 
    auth.authenticateToken, 
    auth.isInstructorOrAdmin, 
    quizController.getQuizzesByCourse 
);
// إنشاء اختبار جديد
router.post(
    '/', 
    auth.authenticateToken, 
    auth.isInstructorOrAdmin, 
    quizController.createQuiz
);

// إضافة سؤال إلى اختبار
router.post(
    '/:quizId/question', 
    auth.authenticateToken, 
    auth.isInstructorOrAdmin, 
    quizController.addQuestionToQuiz
);

// الرابط الناتج: /api/quizzes/admin/:id
router.put('/admin/:id', auth.authenticateToken, auth.isInstructorOrAdmin, quizController.updateQuiz);

// مسار تحديث سؤال محدد
// الرابط الناتج: /api/quizzes/admin/questions/:id
router.put('/admin/questions/:id', auth.authenticateToken, auth.isInstructorOrAdmin, quizController.updateQuestion);

// مسار حذف سؤال محدد
router.delete('/admin/questions/:id', auth.authenticateToken, auth.isInstructorOrAdmin, quizController.deleteQuestion);
// ===================================
// مسارات الطالب (Student Endpoints)
// ===================================

// جلب تفاصيل الاختبار (الأسئلة)
router.get(
    '/:quizId', 
    auth.authenticateToken, 
    quizController.getQuizDetailsForStudent
);

// تقديم الإجابات وحساب الدرجة
router.post(
    '/:quizId/submit', 
    auth.authenticateToken, 
    quizController.submitQuiz
);
router.get(
    '/course/:courseId', 
    auth.authenticateToken, 
    quizController.getQuizzesByCourse // تأكد أن هذه الدالة موجودة في الكنترولر
);
module.exports = router;
