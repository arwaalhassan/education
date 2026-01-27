// server.js (ملف التطبيق الرئيسي)

const express = require('express');
const app = express();
const cors = require('cors'); 
const path = require('path'); 
const dotenv = require('dotenv'); // لتحميل متغيرات البيئة (مثل JWT_SECRET)

// تحميل متغيرات البيئة من ملف .env
dotenv.config();

// =========================================================
// 1. استيراد المسارات (Routes)
// =========================================================

const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quizzes');
const videoRoutes = require('./routes/videos');    // مسارات الأستاذ/المشرف لرفع المحتوى
const courseRoutes = require('./routes/courses');  // لم يتم تطويرها بعد، لكن تم إضافتها
const studentRoutes = require('./routes/student'); // مسارات الطالب لجلب المحتوى المحمي
const generalRoutes = require('./routes/general');
const paymentRoutes = require('./routes/payments');
// =========================================================
// 2. الإعدادات والـ Middleware العامة
// =========================================================

// تمكين CORS لجميع الطلبات
app.use(cors({
    origin: '*', // السماح لجميع النطاقات بالوصول (يمكنك تضييقها لاحقاً لزيادة الأمان)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
}));

// Middleware لتحليل بيانات الـ JSON
app.use(express.json());

// Middleware لتحليل البيانات من طلبات HTML Forms
app.use(express.urlencoded({ extended: true }));

// تمكين الوصول إلى مجلد التخزين (uploads) بشكل ثابت (Static Access)
// نفترض أن مجلد uploads موجود في جذر المشروع
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =========================================================
// 3. ربط المسارات (Routes) بالمسار الأساسي
// =========================================================

app.use('/api/auth', authRoutes);       // المصادقة: /api/auth/login, /api/auth/register
app.use('/api/admin', adminRoutes);     // المشرف: /api/admin/users, /api/admin/payments/manual
app.use('/api/videos', videoRoutes);    // الأستاذ: /api/videos/upload
app.use('/api/courses', courseRoutes);
app.use('/api/quizzes', quizRoutes);  // المقررات: /api/courses/list
app.use('/api/student', studentRoutes); // الطالب: /api/student/videos
app.use('/api/general', generalRoutes);
app.use('/api/earnings', courseRoutes);
app.use('/api/payments', paymentRoutes);
// =========================================================
// 4. معالجة الأخطاء والبدء
// =========================================================

// معالجة الأخطاء للمسارات غير الموجودة (404 Not Found)
app.use((req, res, next) => {
    res.status(404).json({ message: 'Resource not found. Please check the URL and method.' });
});

// معالج الأخطاء العام (يستخدم لمعالجة أي أخطاء لم يتم التقاطها)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        message: err.message || 'An unexpected error occurred.',
        error: process.env.NODE_ENV === 'production' ? {} : err, // إظهار الخطأ الكامل في التطوير فقط
    });
});

const PORT =  3000;
app.listen(PORT, () => {
console.log(`Server is running on port ${PORT}`);
    console.log(`Test: http://localhost:${PORT}/api/auth/login`);
});
    
