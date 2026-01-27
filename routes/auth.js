// routes/auth.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
// المسار: POST /api/auth/register
// الوصف: تسجيل مستخدم جديد (طالب)
router.post('/register', authController.register);

// المسار: POST /api/auth/login
// الوصف: تسجيل الدخول والحصول على التوكن
router.post('/login', authController.login);

// ملاحظة: يمكن إضافة مسار '/verify' هنا لاحقاً للتحقق من التوكن بدون طلب بيانات (محمي بـ authenticateToken)
// جلب بيانات الملف الشخصي (محمي بالتوكن)
router.get('/profile', auth.authenticateToken, authController.getProfile);
router.put('/profile', auth.authenticateToken, authController.updateProfile);
module.exports = router;
