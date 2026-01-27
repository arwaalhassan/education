// controllers/courseController.js

const connection = require('../config/db');

// =========================================================
// [1] إنشاء مقرر جديد
// المسار: POST /api/courses
// الحماية: Instructor أو Admin
// =========================================================
exports.createCourse = async (req, res) => {
    // استخلاص البيانات من الجسم (Body)
    const { title, description, branch, price } = req.body;
    
    // استخلاص بيانات المُنفِّذ من التوكن (req.user)
    const requestUserId = req.user.id;
    const requestUserRole = req.user.role;

    // تحديد Instructor_id: إذا كان الطلب من أستاذ، فإنه يُسند لنفسه (استخدام requestUserId).
    // إذا كان من مشرف، يمكنه تمرير instructor_id في الـ body.
    const finalInstructorId = (requestUserRole === 'teacher') ? requestUserId : req.body.instructor_id;

    // 1. التحقق من المدخلات الأساسية
    if (!title || !branch || !price || !finalInstructorId) {
        return res.status(400).json({ message: 'Missing required fields (title, branch, price, instructor ID).' });
    }
    if (!['scientific', 'literary'].includes(branch)) {
        return res.status(400).json({ message: 'Invalid branch value. Must be scientific or literary.' });
    }

    try {
        // 2. التحقق من أن المُعرِّف النهائي (finalInstructorId) موجود ودوره instructor (فقط إذا كان المنفذ admin)
        if (requestUserRole === 'admin') {
            const [instructorCheck] = await connection.execute(
                'SELECT id FROM users WHERE id = ? AND (role = "teacher" OR role = "admin")',
                [finalInstructorId]
            );
            if (instructorCheck.length === 0) {
                return res.status(404).json({ message: 'Instructor ID is invalid or User is not an Instructor.' });
            }
        }
        
        // 3. إدراج المقرر في جدول courses
        const insertQuery = `
            INSERT INTO courses (title, description, branch, price, instructor_id)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await connection.execute(insertQuery, [title, description || null, branch, price, finalInstructorId]);

        res.status(201).json({ 
            message: 'Course created successfully.', 
            courseId: result.insertId 
        });

    } catch (error) {
        console.error("Error creating course:", error);
        res.status(500).json({ message: 'Server error during course creation.' });
    }
};

// =========================================================
// [2] تعديل مقرر موجود
// المسار: PUT /api/courses/:courseId
// الحماية: Admin أو Instructor المسؤول عن المقرر
// =========================================================
exports.updateCourse = async (req, res) => {
    const { courseId } = req.params;
    const { title, description, branch, price, instructor_id } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // بناء نص الاستعلام والبيانات ديناميكياً
    let updateFields = [];
    let updateValues = [];

    if (title) { updateFields.push('title = ?'); updateValues.push(title); }
    if (description !== undefined) { 
        updateFields.push('description = ?'); 
        updateValues.push(description || null); // السماح بتمرير Null أو سلسلة فارغة
    }
    if (branch) { updateFields.push('branch = ?'); updateValues.push(branch); }
    if (price !== undefined) { updateFields.push('price = ?'); updateValues.push(price); }
    
    // ملاحظة: يُفضل السماح للمشرف فقط بتغيير instructor_id
    if (instructor_id && userRole === 'admin') { 
        updateFields.push('instructor_id = ?'); 
        updateValues.push(instructor_id); 
    }
    
    if (updateFields.length === 0) {
        return res.status(400).json({ message: 'No fields provided for update.' });
    }

    try {
        // 1. التحقق من صلاحيات التعديل (Admin أو الأستاذ المسؤول)
        let checkAuthQuery;
        let checkParams = [courseId];

        if (userRole === 'admin') {
            // المشرف لديه صلاحية التعديل على أي مقرر
            checkAuthQuery = 'SELECT id FROM courses WHERE id = ?';
        } else if (userRole === 'teacher') {
            // الأستاذ يمكنه التعديل فقط على مقرراته
            checkAuthQuery = 'SELECT id FROM courses WHERE id = ? AND instructor_id = ?';
            checkParams.push(userId);
        } else {
            // هذا الشرط يتم التعامل معه بالفعل بواسطة isInstructorOrAdmin في الـ routes، لكنه إضافة أمنية جيدة
            return res.status(403).json({ message: 'Forbidden: Role not authorized to modify courses.' });
        }
        
        // جلب المقرر للتأكد من وجوده والتحقق من الصلاحية
        const [courseCheck] = await connection.execute(checkAuthQuery, checkParams);

        if (courseCheck.length === 0) {
            return res.status(404).json({ message: 'Course not found or unauthorized access.' });
        }

        // 2. تنفيذ عملية التحديث
        const updateQuery = `UPDATE courses SET ${updateFields.join(', ')} WHERE id = ?`;
        updateValues.push(courseId);

        const [result] = await connection.execute(updateQuery, updateValues);

        if (result.affectedRows === 0) {
            return res.status(200).json({ message: 'Course updated successfully (or no changes made).' });
        }

        res.status(200).json({ message: 'Course updated successfully.' });

    } catch (error) {
        console.error("Error updating course:", error);
        res.status(500).json({ message: 'Server error during course update.' });
    }
};

// =========================================================
// [3] جلب قائمة المقررات
// المسار: GET /api/courses
// الحماية: لا توجد حماية (عام)
// =========================================================
exports.getCourses = async (req, res) => {
    const userId = req.user ? req.user.id : null;

    // استعلام يستخدم EXISTS للتأكد من حالة الاشتراك بدون تكرار الصفوف
    const query = `
        SELECT 
            c.id, c.title, c.description, c.branch, c.price, 
            u.username, 
            EXISTS(
                SELECT 1 FROM payments p 
                WHERE p.course_id = c.id 
                AND p.user_id = ? 
                AND (p.status = 'completed' OR p.status = 'manual')
            ) AS is_enrolled
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
    `;

    try {
        const [courses] = await connection.execute(query, [userId]);
        res.status(200).json(courses);
    } catch (error) {
        res.status(500).json({ message: 'خطأ في جلب الكورسات' });
    }
};
// =========================================================
// [4] جلب مقرر واحد بالتفصيل (للعرض العام)
// =========================================================
exports.getCourseById = async (req, res) => {
    const { courseId } = req.params;
    
    const query = `
        SELECT 
            c.id, c.title, c.description, c.branch, c.price, 
            u.username AS instructor_name 
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
        WHERE c.id = ?
    `;

    try {
        const [course] = await connection.execute(query, [courseId]);

        if (course.length === 0) {
            return res.status(404).json({ message: 'Course not found.' });
        }

        res.status(200).json(course[0]);

    } catch (error) {
        console.error("Error fetching course details:", error);
        res.status(500).json({ message: 'Server error fetching course details.' });
    }
};

// =========================================================
// [5] حذف مقرر
// المسار: DELETE /api/courses/:courseId
// الحماية: Admin فقط (أو Admin/Instructor مع تحقق من الملكية)
// =========================================================
exports.deleteCourse = async (req, res) => {
    const { courseId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
        // 1. التحقق من الصلاحية والملكية
        let checkQuery = 'SELECT instructor_id FROM courses WHERE id = ?';
        const [courseCheck] = await connection.execute(checkQuery, [courseId]);

        if (courseCheck.length === 0) {
            return res.status(404).json({ message: 'Course not found.' });
        }

        const courseInstructorId = courseCheck[0].instructor_id;

        // التحقق من التفويض (Authorization): إما أن يكون مشرفاً أو الأستاذ المالك
        if (userRole !== 'admin' && userRole !== 'teacher') {
             return res.status(403).json({ message: 'Forbidden: Role not authorized to delete courses.' });
        }
        if (userRole === 'teacher' && courseInstructorId !== userId) {
            return res.status(403).json({ message: 'Forbidden: You can only delete your own courses.' });
        }

        // 2. حذف المقرر
        const deleteQuery = 'DELETE FROM courses WHERE id = ?';
        await connection.execute(deleteQuery, [courseId]);

        res.status(200).json({ message: 'Course deleted successfully.' });

    } catch (error) {
        console.error("Error deleting course:", error);
        res.status(500).json({ message: 'Server error during course deletion.' });
    }
};
exports.getTeacherEarnings = async (req, res) => {
    try {
        const teacherId = req.user.id; 

        // تأكد من استخدام كلمة connection وليس db
        const [rows] = await connection.execute(`
            SELECT SUM(p.amount) as totalSales
            FROM payments p
            JOIN courses c ON p.course_id = c.id
            WHERE c.instructor_id = ? AND p.status = 'completed'
        `, [teacherId]);

        const totalSales = rows[0].totalSales || 0;
        const platformCommission = totalSales * 0.20; 
        const netEarnings = totalSales - platformCommission;

        res.json({
            totalSales,
            platformCommission,
            netEarnings
        });
    } catch (error) {
        console.error(error); // مهم لرؤية الخطأ في السيرفر
        res.status(500).json({ message: "خطأ في حساب الأرباح" });
    }
};
// دالة البحث عن الكورسات في السيرفر
exports.searchCourses = async (req, res) => {
    try {
        const { query } = req.query; // جلب الكلمة من الرابط ?query=...

        if (!query || query.trim() === '') {
            return res.status(200).json([]);
        }

        // الاستعلام باستخدام LIKE للبحث الجزئي
        const sql = `
            SELECT id, title, description, branch, price, instructor_id, video_url 
            FROM courses 
            WHERE (title LIKE ? OR description LIKE ?) 
            AND status = 'published'
        `;
        
        const searchTerm = `%${query}%`;
        const [rows] = await connection.execute(sql, [searchTerm, searchTerm]);

        res.status(200).json(rows);
    } catch (error) {
        console.error("خطأ في البحث:", error);
        res.status(500).json({ message: "فشل البحث في السيرفر" });
    }
};
exports.getEnrolledCourses = async (req, res) => {
    try {
        // req.user.id قادمة من Middleware التحقق من التوكن
        const userId = req.user.id; 

        const sql = `
            SELECT c.* FROM courses c
            INNER JOIN enrollments e ON c.id = e.course_id
            WHERE e.user_id = ?
        `;

        const [rows] = await connection.execute(sql, [userId]);

        // إرجاع قائمة الدورات للطالب
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching enrolled courses:", error);
        res.status(500).json({ message: "فشل في جلب دوراتك المشترك بها" });
    }
};
exports.enrollInCourse = async (req, res) => {
    try {
        const { course_id } = req.body;
        const userId = req.user.id;

        // 1. الفحص قبل الإدخال (Pre-check)
        const checkSql = "SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?";
        const [existing] = await connection.execute(checkSql, [userId, course_id]);

        if (existing.length > 0) {
            return res.status(400).json({ message: "أنت مشترك بالفعل في هذه الدورة ولا يمكنك الاشتراك مجدداً" });
        }

        // 2. إذا لم يكن مشتركاً، نقوم بالإدخال
        const sql = "INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)";
        await connection.execute(sql, [userId, course_id]);

        res.status(200).json({ message: "تم الاشتراك في الدورة بنجاح!" });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: "أنت مشترك بالفعل" });
        }
        res.status(500).json({ message: "حدث خطأ أثناء الاشتراك" });
    }
};
