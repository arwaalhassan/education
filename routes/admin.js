// routes/admin.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const multer = require('multer');
// حماية المسارا
const adminMiddleware = [auth.authenticateToken, auth.isAdmin];
const path = require('path');
// إعداد مكان تخزين الصور
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });
// --- [1] مسارات التقارير والإحصائيات (توضع في البداية لأنها ثابتة) ---
router.get('/stats', adminMiddleware, adminController.getStats);
router.get('/advanced-reports', adminMiddleware, adminController.getAdvancedReports);

// --- [2] مسارات المستخدمين (تأكد من الترتيب) ---
router.get('/users', adminMiddleware, adminController.getUsers);
router.post('/users', adminMiddleware, adminController.createUser);

// المسارات التي تحتوي على ID يفضل وضعها بعد المسارات الثابتة
router.patch('/users/:id/status', adminMiddleware, adminController.updateUserStatus); // أضفت الميدلوير للحماية
router.put('/users/:id/role', adminMiddleware, adminController.updateUserRole);

// --- [3] مسارات المدفوعات والوصول ---
router.post('/payments/manual', adminMiddleware, adminController.grantManualAccess);

router.get('/payments/pending', auth.authenticateToken, adminController.getPendingPayments);

// 2. تحديث حالة الطلب (موافقة 'completed' أو رفض 'failed')
router.put('/payments/:id/status', auth.authenticateToken, adminController.updatePaymentStatus);

// --- [4] مسارات الإعلانات ---
router.post('/announcements', auth.authenticateToken, auth.isAdmin, upload.single('image'), adminController.addAnnouncement);
router.delete('/announcements/:id', auth.authenticateToken, auth.isInstructorOrAdmin, adminController.deleteAnnouncement);
// جلب نتائج الطلاب
router.get('/results', adminMiddleware, adminController.getAllStudentResults);
module.exports = router;

