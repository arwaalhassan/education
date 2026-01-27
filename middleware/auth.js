const jwt = require('jsonwebtoken');
const db = require('../config/db');
// يجب تعريف مفتاح التوكن السري في متغيرات البيئة (يفضل)
// يرجى استبدال 'YOUR_SECRET_KEY_HERE' بمفتاح سري حقيقي في ملف .env
const JWT_SECRET = 'EBDA3_PLATFORM_SECURE_KEY_2026';

// =========================================================
// 1. دالة التحقق من التوكن (Authentication Middleware)
// =========================================================
// مهمتها: استخراج التوكن، التحقق من صلاحيته، وإضافة بيانات المستخدم إلى req.user
exports.authenticateToken = (req, res, next) => {
    // 1. استخراج التوكن من الـ Authorization Header
    // الشكل المتوقع: Bearer TOKEN_VALUE
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        // 401 Unauthorized: لا يوجد توكن
        return res.status(401).json({ message: 'Authorization required: Missing authentication token.' });
    }

    // 2. التحقق من التوكن (Verification)
    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Authorization denied: Invalid token.' });
        }

        try {
            // الآن الـ await ستعمل بدون أخطاء
            const [rows] = await db.execute('SELECT is_active, role FROM users WHERE id = ?', [decoded.id]);

            if (rows.length === 0) {
                return res.status(404).json({ message: 'User not found.' });
            }

            const userInDb = rows[0];

            // التحقق من الحساب المعطل
            if (userInDb.is_active === 0 || userInDb.is_active === false) {
                return res.status(403).json({ 
                    message: 'Forbidden: Your account has been disabled by the administrator.' 
                });
            }

            // تحديث بيانات المستخدم في الطلب
            req.user = {
                id: decoded.id,
                role: userInDb.role // نأخذ الدور من الداتابيز ليكون دائماً محدثاً
            };
            
            next();
        } catch (error) {
            console.error("Database error in middleware:", error);
            return res.status(500).json({ message: 'Internal server error.' });
        }
    });
};
// =========================================================
// 2. دالة التحقق من دور المشرف (Authorization Middleware)
// =========================================================
// يجب أن تأتي هذه الدالة بعد authenticateToken
exports.isAdmin = (req, res, next) => {
    // التحقق من أن المستخدم موثق وأن لديه دور 'admin'
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Access restricted to administrators.' });
    }
    next();
};

// =========================================================
// 3. دالة التحقق من دور الأستاذ أو المشرف
// =========================================================
exports.isInstructorOrAdmin = (req, res, next) => {
    // أضفنا 'teacher' لضمان التوافق مع الفرونت-إند
    if (!req.user || !['teacher', 'instructor', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden: Access restricted.' });
    }
    next();
};

// =========================================================
// 4. دالة التحقق من دور الطالب
// =========================================================
exports.isStudent = (req, res, next) => {
    if (!req.user || req.user.role !== 'student') {
        return res.status(403).json({ message: 'Forbidden: Access restricted to Students.' });
    }
    next();
};
