const connection = require('../config/db');

// [1] إنشاء اختبار جديد (Admin/Instructor)
// المسار: POST /api/quizzes
// [1] إنشاء اختبار جديد (Admin/Instructor)
// [1] إنشاء اختبار جديد
exports.createQuiz = async (req, res) => {
    try {
        // استلام الـ duration أيضاً من الـ body
        const { courseId, title, duration, is_published } = req.body;
        const userId = req.user.id;
        const publishedStatus = is_published !== undefined ? is_published : 1;

        // التحقق من الملكية (كما فعلنا سابقاً)
        const [rows] = await connection.execute(
            'SELECT instructor_id FROM courses WHERE id = ?',
            [courseId]
        );

        if (rows.length === 0 || (req.user.role !== 'admin' && rows[0].instructor_id !== userId)) {
            return res.status(403).json({ message: "صلاحية مرفوضة" });
        }

        // التعديل هنا: إضافة duration للاستعلام
        const [result] = await connection.execute(
            'INSERT INTO quizzes (course_id, title, duration, is_published) VALUES (?, ?, ?, ?)',
            [courseId, title, duration || 30, publishedStatus] // إذا لم يرسل الوقت، نضع 30 كقيمة افتراضية
        );

        return res.status(201).json({
            message: 'تم الإنشاء بنجاح',
            quizId: result.insertId
        });

    } catch (error) {
        console.error("DATABASE ERROR:", error);
        return res.status(500).json({ message: "خطأ في السيرفر", error: error.message });
    }
};
// جلب نتائج الطلاب لاختبار محدد
exports.getQuizResults = async (req, res) => {
    const { quizId } = req.params;
    try {
        const query = `
            SELECT u.username, sa.score, sa.submission_date, 
            (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = ?) as total_questions
            FROM student_answers sa
            JOIN users u ON sa.user_id = u.id
            WHERE sa.quiz_id = ?
            ORDER BY sa.score DESC
        `;
        const [results] = await connection.execute(query, [quizId, quizId]);
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ message: 'خطأ في جلب النتائج' });
    }
};

// [2] إضافة سؤال إلى اختبار (Admin/Instructor)
// المسار: POST /api/quizzes/:quizId/question
// [2] إضافة سؤال إلى اختبار موجود
exports.addQuestionToQuiz = async (req, res) => {
    const { quizId } = req.params;
    const { question_text, option_a, option_b, option_c, option_d, correct_answer } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // التحقق من المدخلات الأساسية
    if (!question_text || !correct_answer) {
        return res.status(400).json({ message: 'نص السؤال والإجابة الصحيحة مطلوبان' });
    }

    try {
        // 1. التحقق من أن المستخدم يملك الاختبار (أو أدمن)
        if (userRole !== 'admin') {
            const [quizCheck] = await connection.execute(
                `SELECT q.id FROM quizzes q 
                 JOIN courses c ON q.course_id = c.id 
                 WHERE q.id = ? AND c.instructor_id = ?`,
                [quizId, userId]
            );

            if (quizCheck.length === 0) {
                return res.status(403).json({ message: 'ليس لديك صلاحية لتعديل هذا الاختبار' });
            }
        }

        // 2. إدراج السؤال
        const insertQuery = `
            INSERT INTO quiz_questions 
            (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        await connection.execute(insertQuery, [
            quizId, question_text, option_a, option_b, option_c, option_d, correct_answer
        ]);

        res.status(201).json({ message: 'تم إضافة السؤال بنجاح' });

    } catch (error) {
        console.error("Error adding question:", error);
        res.status(500).json({ message: 'خطأ في السيرفر أثناء إضافة السؤال' });
    }
};
// [3] عرض أسئلة الاختبار للطالب (بدون الإجابات الصحيحة)
// المسار: GET /api/quizzes/:quizId
exports.getQuizDetailsForStudent = async (req, res) => {
    const { quizId } = req.params;
    const userId = req.user.id;

    try {
        // 1. التحقق من أن الاختبار منشور (is_published = TRUE)
        const [quizCheck] = await connection.execute('SELECT course_id FROM quizzes WHERE id = ? AND is_published = TRUE', [quizId]);
        if (quizCheck.length === 0) {
            return res.status(404).json({ message: 'Quiz not found or not yet published.' });
        }
        const courseId = quizCheck[0].course_id;

        // 2. التحقق من الدفع (إعادة استخدام منطق payments)
        const [paymentCheck] = await connection.execute(
            `SELECT id FROM payments WHERE user_id = ? AND course_id = ? AND status IN ('completed', 'manual')`,
            [userId, courseId]
        );
        if (paymentCheck.length === 0) {
            return res.status(403).json({ message: 'Access denied. Payment required for this course to access the quiz.' });
        }

        // 3. جلب الأسئلة
        const [questions] = await connection.execute(
            `SELECT id, question_text, option_a, option_b, option_c, option_d FROM quiz_questions WHERE quiz_id = ?`, 
            [quizId]
        );

        res.status(200).json({ quizId, questions });

    } catch (error) {
        console.error("Error fetching quiz details:", error);
        res.status(500).json({ message: 'Server error fetching quiz.' });
    }
};
exports.submitQuiz = async (req, res) => {
    const { quizId } = req.params;
    const { answers } = req.body; // مصفوفة الإجابات القادمة من التطبيق
    const studentId = req.user.id;

    const dbConnection = await connection.getConnection();

    try {
        await dbConnection.beginTransaction();

        // 1. منع الطالب من تقديم الاختبار مرتين (Data Integrity)
        const [existing] = await dbConnection.execute(
            'SELECT id FROM student_answers WHERE user_id = ? AND quiz_id = ?',
            [studentId, quizId]
        );
        if (existing.length > 0) {
            return res.status(400).json({ message: 'لقد قمت بحل هذا الاختبار مسبقاً' });
        }

        // 2. جلب الإجابات الصحيحة والدرجات من جدول الأسئلة
        // نفترض أن كل سؤال له درجة (points)، إذا لم يوجد استخدم 1 كقيمة افتراضية
        const [questions] = await dbConnection.execute(
            'SELECT id, correct_answer FROM quiz_questions WHERE quiz_id = ?',
            [quizId]
        );

        if (questions.length === 0) {
            return res.status(404).json({ message: 'هذا الاختبار لا يحتوي على أسئلة' });
        }

        // 3. حساب النتيجة باستخدام O(n) Logic (أكثر كفاءة من forEach المتداخلة)
        let earnedScore = 0;
        const totalQuestions = questions.length;
        
        // تحويل الإجابات الصحيحة إلى Map للوصول السريع
        const correctMap = new Map(questions.map(q => [q.id, q.correct_answer]));

        answers.forEach(ans => {
            const correctAnswer = correctMap.get(ans.question_id);
            // مقارنة دقيقة (تجنب مشاكل الفراغات وحالة الأحرف)
            if (correctAnswer && String(ans.user_answer).trim() === String(correctAnswer).trim()) {
                earnedScore += 1; // زيادة الدرجة (يمكنك استبدالها بوزن السؤال إذا توفر)
            }
        });

        // حساب النسبة المئوية
        const finalPercentage = (earnedScore / totalQuestions) * 100;

        // 4. التخزين في جدول student_answers بناءً على الـ Describe الخاص بك
        await dbConnection.execute(
            'INSERT INTO student_answers (user_id, quiz_id, score, is_completed) VALUES (?, ?, ?, ?)',
            [
                studentId,
                quizId,
                finalPercentage, // تخزين النسبة المئوية كدرجة (decimal)
                1                // تعيين حالة الاكتمال إلى True
            ]
        );

        await dbConnection.commit();

        // 5. رد احترافي يحتوي على كامل التفاصيل
        res.status(200).json({
            success: true,
            data: {
                correctAnswers: earnedScore,
                totalQuestions: totalQuestions,
                percentage: finalPercentage.toFixed(2),
                status: finalPercentage >= 50 ? 'pass' : 'fail'
            }
        });

    } catch (error) {
        await dbConnection.rollback();
        console.error("Quiz Error:", error);
        res.status(500).json({ message: 'خطأ في معالجة بيانات الاختبار' });
    } finally {
        dbConnection.release();
    }
};

// جلب قائمة الاختبارات لكورس معين (للطالب)
// جلب تفاصيل الاختبار بالكامل مع أسئلته للأدمن
exports.getQuizDetails = async (req, res) => {
    const { id } = req.params;
    try {
        // 1. جلب بيانات الاختبار
        const [quiz] = await connection.execute('SELECT * FROM quizzes WHERE id = ?', [id]);
        
        if (quiz.length === 0) {
            return res.status(404).json({ message: "الاختبار غير موجود" });
        }

        // 2. جلب الأسئلة من الجدول الصحيح quiz_questions
        const [questions] = await connection.execute(
            'SELECT id, question_text, option_a, option_b, option_c, option_d, correct_answer FROM quiz_questions WHERE quiz_id = ?', 
            [id]
        );

        // دمج البيانات وإرسالها
        res.json({ ...quiz[0], questions });
    } catch (error) {
        console.error("Error in getQuizDetails:", error);
        res.status(500).json({ message: "خطأ في السيرفر عند جلب بيانات الاختبار" });
    }
};

// جلب اختبارات كورس معين للأدمن (بدون شرط النشر)
exports.getQuizzesByCourse = async (req, res) => {
    const { courseId } = req.params;
    try {
        const query = `
            SELECT id, title, duration, is_published, creation_date 
            FROM quizzes 
            WHERE course_id = ? 
            ORDER BY creation_date DESC
        `;
        const [quizzes] = await connection.execute(query, [courseId]);
        res.status(200).json(quizzes);
    } catch (error) {
        res.status(500).json({ message: 'خطأ في جلب الاختبارات' });
    }
};

// تحديث سؤال معين
exports.updateQuestion = async (req, res) => {
    const { id } = req.params; // معرف السؤال
    const { question_text, option_a, option_b, option_c, option_d, correct_answer } = req.body;
    try {
        await connection.execute(
            `UPDATE questions SET 
            question_text = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_answer = ? 
            WHERE id = ?`,
            [question_text, option_a, option_b, option_c, option_d, correct_answer, id]
        );
        res.json({ message: "تم تحديث السؤال بنجاح" });
    } catch (error) {
        res.status(500).json({ message: "خطأ في التحديث" });
    }
};
// تحديث بيانات الكويز
exports.updateQuiz = async (req, res) => {
    const { id } = req.params;
    const { title, duration } = req.body;
    try {
        await connection.execute(
            'UPDATE quizzes SET title = ?, duration = ? WHERE id = ?',
            [title, duration, id]
        );
        res.json({ message: "تم تحديث الكويز" });
    } catch (error) {
        res.status(500).json({ message: "خطأ في السيرفر" });
    }
};

// تحديث سؤال محدد
exports.updateQuestion = async (req, res) => {
    const { id } = req.params;
    const { question_text, option_a, option_b, option_c, option_d, correct_answer } = req.body;
    try {
        await connection.execute(
            `UPDATE quiz_questions 
             SET question_text = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_answer = ? 
             WHERE id = ?`,
            [question_text, option_a, option_b, option_c, option_d, correct_answer, id]
        );
        res.json({ message: "تم تحديث السؤال" });
    } catch (error) {
        res.status(500).json({ message: "خطأ في السيرفر" });
    }
};
// دالة حذف سؤال محدد
exports.deleteQuestion = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await connection.execute(
            'DELETE FROM quiz_questions WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "السؤال غير موجود" });
        }

        res.json({ message: "تم حذف السؤال بنجاح" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "خطأ في السيرفر أثناء حذف السؤال" });
    }
};
