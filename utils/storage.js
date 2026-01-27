// utils/storage.js

/**
 * تولد رابط الوصول للملفات المخزنة محلياً.
 * ملاحظة: في بيئة التطوير المحلية، نعيد المسار النسبي 
 * ليقوم تطبيق Flutter بدمجه مع عنوان IP السيرفر.
 * * @param {string} filePath - المسار الفعلي للملف (مثلاً: uploads/material/video_123.mp4)
 * @returns {string|null} - رابط البث أو المسار للوصول للملف
 */
exports.generateSignedUrl = (filePath) => {
    // 1. التحقق من وجود مسار للملف لتجنب أخطاء Null في Flutter
    if (!filePath) {
        console.error("Storage Error: filePath is missing or null");
        return null;
    }

    // 2. معالجة المسار لضمان تنسيق URL صحيح
    // التأكد من أن المسار يبدأ بـ / إذا لم يكن موجوداً
    let formattedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;

    // 3. في بيئة السيرفر المحلي (Localhost/IP):
    // نعيد المسار الذي يبدأ بـ /uploads/material/...
    // تطبيق Flutter سيستلم هذا المسار ويضيف قبله http://192.168.1.128:3000
    
    return formattedPath;
};
