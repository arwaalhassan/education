// controllers/adminController.js

const connection = require('../config/db'); 
const bcrypt = require('bcryptjs');

// [1] إنشاء مستخدم جديد (instructor/admin)

exports.createUser = async (req, res) => {    
    const { username, email, password, role, bio, phone_number, bank_account_info } = req.body;
    
    // 1. التحقق من المدخلات الأساسية
    if (!username || !email || !password || !['teacher', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Missing required fields (username, email, password) or invalid role.' });
    }

    try {
        // 2. تشفير كلمة المرور
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // 3. إدراج المستخدم في جدول users
        const userQuery = `
            INSERT INTO users (username, email, password_hash, role) 
            VALUES (?, ?, ?, ?)
        `;
        const [userResult] = await connection.execute(userQuery, [username, email, password_hash, role]);
        const newUserId = userResult.insertId;

        // 4. (خاص بالأساتذة) إذا كان الدور instructor، قم بإنشاء ملفه الشخصي
        if (role === 'teacher') {
            const profileQuery = `
                INSERT INTO instructor_profiles (user_id, bio, phone_number, bank_account_info) 
                VALUES (?, ?, ?, ?)
            `;
            
            // التحسين: التأكد من إدراج NULL بدلاً من سلسلة فارغة ('')
            const instructorData = [
                newUserId,
                bio || null,
                phone_number || null,
                bank_account_info || null
            ];
            
            await connection.execute(profileQuery, instructorData);
        }
        
        // 5. الاستجابة بالنجاح
        res.status(201).json({ 
            message: `User created successfully with role: ${role}`, 
            userId: newUserId 
        });

    } catch (error) {
        console.error("Error creating user:", error);
        // التعامل مع الخطأ 1062 (ER_DUP_ENTRY)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Username or email already exists.' });
        }
        res.status(500).json({ message: 'Server error during user creation.' });
    }
};
// تعديل حالة النشاط للمستخدم (تفعيل/تعطيل)
exports.updateUserStatus = async (req, res) => {
    const { id } = req.params;

    try {
        // تحديث الحالة إلى عكس ما هي عليه الآن تلقائياً (1 يصبح 0 و 0 يصبح 1)
        const [result] = await connection.execute(
            'UPDATE users SET is_active = NOT is_active WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'المستخدم غير موجود' });
        }

        // جلب الحالة الجديدة لإرسالها للفرونت إند (اختياري)
        const [user] = await connection.execute('SELECT is_active FROM users WHERE id = ?', [id]);

        res.status(200).json({
            message: 'تم تحديث حالة الحساب بنجاح',
            is_active: user[0].is_active
        });
    } catch (error) {
        console.error("Error updating status:", error);
        res.status(500).json({ message: 'خطأ في السيرفر' });
    }
};
// --------------------------------------------------------------------------------------

// [2] منح الوصول اليدوي للمقررات
// المسار: POST /api/admin/payments/manual
exports.grantManualAccess = async (req, res) => {
    const { user_id, course_id, amount, transaction_id } = req.body;
    
    if (!user_id || !course_id) {
        return res.status(400).json({ message: 'User ID and Course ID are required.' });
    }

    const paymentAmount = amount || 0.00;
    const manualTransactionId = transaction_id || `MANUAL-${Date.now()}-${user_id}`;

    try {
        // 1. التحقق من وجود المستخدم والمقرر
        const [[userCheck]] = await connection.execute('SELECT id FROM users WHERE id = ?', [user_id]);
        const [[courseCheck]] = await connection.execute('SELECT id FROM courses WHERE id = ?', [course_id]);

        if (!userCheck) {
            return res.status(404).json({ message: 'User not found.' });
        }
        if (!courseCheck) {
            return res.status(404).json({ message: 'Course not found.' });
        }

        // 2. التحقق من عدم وجود دفعة سابقة صالحة
        const checkPaymentQuery = `
            SELECT id FROM payments 
            WHERE user_id = ? AND course_id = ? AND (status = 'completed' OR status = 'manual')
        `;
        const [existingPayment] = await connection.execute(checkPaymentQuery, [user_id, course_id]);
        
        if (existingPayment.length > 0) {
            return res.status(409).json({ message: 'User already has active access (payment/manual record) to this course.' });
        }

        // 3. إدراج سجل الدفعة
        const insertQuery = `
            INSERT INTO payments (user_id, course_id, amount, status, transaction_id) 
            VALUES (?, ?, ?, 'manual', ?)
        `;
        await connection.execute(insertQuery, [user_id, course_id, paymentAmount, manualTransactionId]);
        
        res.status(200).json({ 
            message: 'Manual access granted successfully by Admin.', 
            transactionId: manualTransactionId 
        });

    } catch (error) {
        console.error("Error processing manual payment:", error);
        res.status(500).json({ message: 'Server error during manual access grant.' });
    }
};

// --------------------------------------------------------------------------------------

// [3] جلب قائمة المستخدمين (للوحة التحكم)
// المسار: GET /api/admin/users
exports.getUsers = async (req, res) => {
    try {
        // يتم استثناء hash كلمة المرور دائماً لأسباب أمنية
        const [users] = await connection.execute('SELECT id, username, email, role, is_active FROM users');
        res.status(200).json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: 'Server error fetching user list.' });
    }
};

// --------------------------------------------------------------------------------------

// [4] تعديل حالة الدفع/الوصول (لإلغاء الوصول يدوياً إذا لزم الأمر)
// المسار: PUT /api/admin/payments/:paymentId/status
exports.getPendingPayments = async (req, res) => {
    try {
        const query = `
            SELECT 
                p.id, 
                p.amount, 
                p.payment_method, 
                p.payment_date, 
                u.username, 
                c.title as course_title 
            FROM payments p
            JOIN users u ON p.user_id = u.id
            JOIN courses c ON p.course_id = c.id
            WHERE p.status = 'pending'
            ORDER BY p.payment_date DESC
        `;
        
        const [rows] = await connection.execute(query);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching pending payments:", error);
        res.status(500).json({ message: "حدث خطأ أثناء جلب الطلبات" });
    }
};

// [2] تحديث حالة الطلب (موافقة أو رفض)
exports.updatePaymentStatus = async (req, res) => {
    const { id } = req.params; // معرف الطلب من الرابط
    const { status } = req.body; // الحالة الجديدة من الفرونت إيند

    // التحقق من أن الحالة المرسلة صحيحة
    if (!['completed', 'failed'].includes(status)) {
        return res.status(400).json({ message: "حالة غير صالحة" });
    }

    try {
        const [result] = await connection.execute(
            'UPDATE payments SET status = ? WHERE id = ?',
            [status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "الطلب غير موجود" });
        }

        res.status(200).json({ 
            success: true, 
            message: status === 'completed' ? "تم تفعيل الاشتراك بنجاح" : "تم رفض الطلب" 
        });
    } catch (error) {
        console.error("Error updating payment status:", error);
        res.status(500).json({ message: "حدث خطأ في السيرفر أثناء التحديث" });
    }
};
// --------------------------------------------------------------------------------------

// [5] جلب الإعلانات (للوحة التحكم) - توحيد نمط الاتصال
// المسار: GET /api/admin/announcements
exports.getAnnouncements = async (req, res) => {
    try {
        const [rows] = await connection.execute('SELECT id, content, image_url, created_at FROM announcements ORDER BY created_at DESC');
        
        // يمكن معالجة الروابط هنا لتكون مطلقة إذا كانت الروابط نسبية
        const announcements = rows.map(row => ({
            ...row,
            // مثال على معالجة رابط الصورة
            imageUrl: row.image_url ? `http://yourdomain.com/uploads/announcements/${row.image_url}` : null
        }));

        res.status(200).json(announcements);
    } catch (error) {
        console.error("Error fetching announcements:", error);
        res.status(500).json({ message: 'Server error fetching announcements list.' });
    }
};

// --------------------------------------------------------------------------------------

// [6] حذف إعلان (للوحة التحكم) - توحيد نمط الاتصال
// المسار: DELETE /api/admin/announcements/:id
exports.deleteAnnouncement = async (req, res) => {
    const { id } = req.params;

    try {
        const sql = 'DELETE FROM announcements WHERE id = ?';
        const [result] = await connection.execute(sql, [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'الإعلان غير موجود' });
        }
        res.status(200).json({ success: true, message: 'تم حذف الإعلان بنجاح' });

    } catch (error) {
        console.error("Error deleting announcement:", error);
        res.status(500).json({ message: 'Server error during announcement deletion.' });
    }
};
// تحديث رتبة المستخدم (Admin/Teacher/Student)
// تحديث رتبة المستخدم (طالب، أستاذ، مدير)
exports.updateUserRole = async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    try {
        await connection.execute(
            'UPDATE users SET role = ? WHERE id = ?',
            [role, id]
        );
        res.status(200).json({ message: 'تم تحديث الرتبة بنجاح' });
    } catch (error) {
        console.error("Error updating role:", error);
        res.status(500).json({ message: 'خطأ في السيرفر أثناء تحديث الرتبة' });
    }
};
// [7] جلب إحصائيات المنصة (للوحة التحكم)
// المسار: GET /api/admin/stats
exports.getStats = async (req, res) => {
    try {
        // 1. عدد الطلاب - استخدام connection بدلاً من db
        const [studentRows] = await connection.execute('SELECT COUNT(*) as total FROM users WHERE role = "student"');

        // 2. إحصائيات الكورسات - استخدام connection بدلاً من db
        const [courseRows] = await connection.execute('SELECT COUNT(*) as total, SUM(price) as potential_revenue FROM courses');

        // 3. توزيع الكورسات حسب الفرع - استخدام connection بدلاً من db
        const [branchRows] = await connection.execute('SELECT branch, COUNT(*) as count FROM courses GROUP BY branch');

        res.json({
            totalStudents: studentRows[0].total,
            totalCourses: courseRows[0].total,
            totalEarnings: courseRows[0].potential_revenue || 0,
            branches: branchRows, 
            rating: "4.9" 
        });
    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ message: "خطأ في جلب بيانات الإحصائيات" });
    }
};

exports.getAdvancedReports = async (req, res) => {
    try {
        // 1. الإحصائيات الأساسية (الطلاب، الكورسات، الأرباح)
        const [studentsCount] = await connection.execute('SELECT COUNT(*) as count FROM users WHERE role = "student"');
        const [coursesCount] = await connection.execute('SELECT COUNT(*) as count FROM courses');
        const [earningsSum] = await connection.execute('SELECT SUM(amount) as sum FROM payments WHERE status = "completed"');

        // 2. الكورسات الأكثر مبيعاً
        const [topCourses] = await connection.execute(`
            SELECT c.title, COUNT(p.id) as sales_count 
            FROM courses c 
            LEFT JOIN payments p ON c.id = p.course_id 
            GROUP BY c.id 
            ORDER BY sales_count DESC LIMIT 5
        `);

        // 3. أداء الاختبارات (متوسط الدرجات لكل اختبار من عمود score)
        const [quizPerf] = await connection.execute(`
            SELECT q.title as quiz_title, AVG(sa.score) as average_score
            FROM quizzes q
            JOIN student_answers sa ON q.id = sa.quiz_id
            GROUP BY q.id
        `).catch(() => [[]]);

        // 4. الطلاب الذين اشتروا ولم يختبروا (الخاملين)
        const [inactiveStudents] = await connection.execute(`
            SELECT u.username, u.email, c.title as course_name
            FROM users u
            JOIN payments p ON u.id = p.user_id
            JOIN courses c ON p.course_id = c.id
            WHERE u.id NOT IN (SELECT DISTINCT user_id FROM student_answers)
            LIMIT 5
        `).catch(() => [[]]);

        // إرسال البيانات النهائية
        res.status(200).json({
            summary: {
                totalStudents: studentsCount[0]?.count || 0,
                totalCourses: coursesCount[0]?.count || 0,
                totalEarnings: earningsSum[0]?.sum || 0,
                averageGrade: quizPerf.length > 0 ? Math.round(quizPerf[0].average_score) : 0
            },
            topCourses: topCourses || [],
            quizPerformance: quizPerf || [],
            inactiveStudents: inactiveStudents || []
        });

    } catch (error) {
        console.error("Database Error Details:", error);
        res.status(500).json({ 
            message: "Internal Server Error", 
            error: error.message // سيظهر لك بالضبط ما هو الحقل المفقود لو حدث خطأ
        });
    }
};
exports.addAnnouncement = async (req, res) => {
    const { content } = req.body;
    const imageUrl = req.file ? req.file.filename : null; // اسم الملف المخزن

    try {
        const query = 'INSERT INTO announcements (content, image_url, created_at) VALUES (?, ?, NOW())';
        await connection.execute(query, [content, imageUrl]);
        
        res.status(201).json({ message: 'تم إضافة الإعلان بنجاح' });
    } catch (error) {
        console.error("Error adding announcement:", error);
        res.status(500).json({ message: 'خطأ في السيرفر أثناء الإضافة' });
    }
};
// جلب نتائج الطلاب التفصيلية
exports.getAllStudentResults = async (req, res) => {
    try {
        const query = `
            SELECT 
                sa.id,
                u.username AS student_name,
                q.title AS quiz_title,
                c.title AS course_name,
                sa.score,
                sa.submission_date,
                sa.is_completed
            FROM student_answers sa
            INNER JOIN users u ON sa.user_id = u.id
            INNER JOIN quizzes q ON sa.quiz_id = q.id
            LEFT JOIN courses c ON q.course_id = c.id
            ORDER BY sa.submission_date DESC
        `;

        const [results] = await connection.execute(query);
        
        // سجل للتحقق في التيرمينال
        console.log(`[Results] Found ${results.length} records.`);
        
        res.status(200).json(results);
    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ message: "خطأ في جلب بيانات النتائج" });
    }
};
