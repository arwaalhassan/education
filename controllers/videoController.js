const connection = require('../config/db');
const path = require('path');
const storageUtils = require('../utils/storage'); 

// [1] دالة رفع المحتوى (فيديو، PDF، Word)
exports.uploadVideo = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'يرجى اختيار ملف لرفعه.' });
    }

    const { course_id, title, description, sort_order } = req.body;
    const instructor_id = req.user.id; 

    // تحديد نوع الملف بناءً على الامتداد لضمان التوافق مع تطبيق Flutter
    const ext = path.extname(req.file.originalname).toLowerCase();
    let contentType = 'video';
    if (ext === '.pdf') contentType = 'pdf';
    else if (ext === '.doc' || ext === '.docx') contentType = 'word';

    try {
        // التحقق من أن الأستاذ هو المسؤول عن هذا المقرر
        const checkCourseQuery = `SELECT id FROM courses WHERE id = ? AND instructor_id = ?`;
        const [course] = await connection.execute(checkCourseQuery, [course_id, instructor_id]);

        if (course.length === 0) {
            return res.status(403).json({ message: 'غير مسموح لك بالرفع لهذا الكورس.' });
        }

        // حفظ البيانات في جدول videos
        // ملاحظة: تأكد من تنفيذ أمر ALTER TABLE لإضافة حقل content_type في MySQL
        const filePath = req.file.path; 

        const insertQuery = `
            INSERT INTO videos (course_id, title, description, sort_order, file_storage_path, content_type)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        await connection.execute(insertQuery, [
            course_id, 
            title, 
            description || null, 
            sort_order || 0, 
            filePath, 
            contentType
        ]);

        res.status(201).json({
            message: 'تم رفع المحتوى بنجاح.',
            type: contentType,
            filePath: filePath
        });

    } catch (error) {
        console.error("Error uploading content:", error);
        res.status(500).json({ message: 'خطأ في الخادم أثناء معالجة الملف.' });
    }
};

/**
 * دالة مساعدة للتحقق من الدفع (مشترك أو دفع يدوي)
 */
const checkPaymentAccess = async (userId, courseId) => {
    const query = `
        SELECT id FROM payments
        WHERE user_id = ? AND course_id = ? AND status IN ('completed', 'manual')
    `;
    const [result] = await connection.execute(query, [userId, courseId]);
    
    // إذا لم يجد دفعاً، نتحقق من جدول enrollments كبديل
    if (result.length === 0) {
        const enrollQuery = `SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?`;
        const [enrollResult] = await connection.execute(enrollQuery, [userId, courseId]);
        return enrollResult.length > 0;
    }
    
    return true;
};

// [2] جلب قائمة الدروس والمواد (فيديوهات + ملفات)
exports.getCourseVideos = async (req, res) => {
    const { courseId } = req.params;
    const userId = req.user.id;

    try {
        // 1. التحقق من الوصول
        if (!await checkPaymentAccess(userId, courseId)) {
            return res.status(403).json({ message: 'يجب الاشتراك في الكورس للوصول للمحتوى.' });
        }

        // 2. جلب كافة المواد مرتبة حسب sort_order
        const videosQuery = `
            SELECT id, title, description, sort_order, content_type, upload_date 
            FROM videos
            WHERE course_id = ?
            ORDER BY sort_order ASC, upload_date ASC
        `;
        const [materials] = await connection.execute(videosQuery, [courseId]);

        res.status(200).json(materials);

    } catch (error) {
        console.error("Error fetching course materials:", error);
        res.status(500).json({ message: 'خطأ في جلب قائمة الدروس.' });
    }
};

// [3] جلب رابط الملف أو البث (آمن ومؤقت)
exports.streamVideo = async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user.id;

    try {
        const videoQuery = `SELECT course_id, file_storage_path, content_type FROM videos WHERE id = ?`;
        const [video] = await connection.execute(videoQuery, [videoId]);

        if (video.length === 0) {
            return res.status(404).json({ message: 'المحتوى غير موجود.' });
        }

        const { course_id, file_storage_path, content_type } = video[0];

        // التحقق من الوصول
        if (!await checkPaymentAccess(userId, course_id)) {
            return res.status(403).json({ message: 'غير مسموح لك بالوصول لهذا الرابط.' });
        }

        // توليد رابط موقّع (سواء كان فيديو للبث أو PDF للتحميل)
        const signedUrl = storageUtils.generateSignedUrl(file_storage_path);

        res.status(200).json({
            message: 'Generated successfully.',
            streamUrl: signedUrl, // تأكد أن الاسم هنا streamUrl وليس url
            type: content_type
        });

    } catch (error) {
        console.error("Error generating URL:", error);
        res.status(500).json({ message: 'خطأ في توليد رابط الوصول.' });
    }
};
