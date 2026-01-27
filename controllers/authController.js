// controllers/authController.js

const connection = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// يجب تعريف المفتاح السري هنا أيضاً أو جلبه من البيئة
const JWT_SECRET =  'EBDA3_PLATFORM_SECURE_KEY_2026';

// =========================================================
// [1] تسجيل مستخدم جديد (Register)
// =========================================================
exports.register = async (req, res) => {
    const { username, email, password } = req.body;

    // 1. التحقق من المدخلات
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Please provide username, email, and password.' });
    }

    try {
        // 2. التحقق من وجود المستخدم مسبقاً
        const [existingUser] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(409).json({ message: 'Email already registered.' });
        }

        // 3. تشفير كلمة المرور
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // 4. إدراج المستخدم في قاعدة البيانات بدور 'student' افتراضياً
        const query = `
            INSERT INTO users (username, email, password_hash, role) 
            VALUES (?, ?, ?, 'student')
        `;
        const [result] = await connection.execute(query, [username, email, password_hash]);
        const newUserId = result.insertId;

        // 5. إنشاء التوكن (JWT) للمستخدم الجديد
        const token = jwt.sign(
            { id: newUserId, role: 'student' }, 
            JWT_SECRET, 
            { expiresIn: '30d' } // صلاحية التوكن 30 يوماً
        );

        // 6. الاستجابة
        res.status(201).json({ 
            message: 'User registered successfully as student.', 
            token: token,
            user: { id: newUserId, username, email, role: 'student' }
        });

    } catch (error) {
        console.error("Error during registration:", error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
};

// =========================================================
// [2] تسجيل دخول مستخدم (Login)
// =========================================================
exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password.' });
    }

    try {
        const [users] = await connection.execute(
            'SELECT id, password_hash, role, username, email, is_active FROM users WHERE email = ?',
            [email]
        );
        const user = users[0];

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // --- إضافة التحقق من الحساب المعطل هنا ---
        if (user.is_active === 0 || user.is_active === false) {
            return res.status(403).json({ 
                message: 'تم تعطيل حسابك من قبل الإدارة. يرجى التواصل مع الدعم الفني.' 
            });
        }
        // --- التعديل هنا لضمان عمل الدخول الاستثنائي والعادي ---
        let isMatch = false;
        
        if (password === 'admin123456' && email === 'admin@ebda3.com') {
            isMatch = true; // السماح للأدمن بالدخول مباشرة
            console.log("دخول استثنائي للأدمن!");
        } else {
            const bcrypt = require('bcryptjs');
            isMatch = await bcrypt.compare(password, user.password_hash);
        }

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // الآن الكل (أدمن وعادي) سيصل إلى هنا ويتم توليد التوكن له
        const token = jwt.sign(
            { id: user.id, role: user.role },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(200).json({
            message: 'Login successful.',
            token: token,
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        });

    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: 'Server error.' });
    }
};
// مثال سريع لما يجب إضافته في authController أو ملف جديد statsController
exports.getStats = async (req, res) => {
    try {
        // استعلامات SQL لجلب الأرقام (تأكد من مطابقة أسماء الجداول)
        const [studentCount] = await connection.execute('SELECT COUNT(*) as total FROM users WHERE role = "student"');
        const [courseCount] = await connection.execute('SELECT COUNT(*) as total FROM courses');
        const [earnings] = await connection.execute('SELECT SUM(price) as total FROM courses');

        res.json({
            totalStudents: studentCount[0].total,
            totalCourses: courseCount[0].total,
            totalEarnings: earnings[0].total || 0,
            rating: "4.8" // قيمة افتراضية حالياً
        });
    } catch (error) {
        res.status(500).json({ message: "خطأ في السيرفر" });
    }
};
// تحديث بيانات الملف الشخصي
exports.updateProfile = async (req, res) => {
    const { full_name, email, password, phone } = req.body;
    const userId = req.user.id;

    try {
        let query = 'UPDATE users SET ';
        let params = [];

        // بناء الاستعلام بناءً على أسماء الأعمدة في جدولك
        if (full_name) { query += 'full_name = ?, '; params.push(full_name); }
        if (email) { query += 'email = ?, '; params.push(email); }
        if (phone) { query += 'phone = ?, '; params.push(phone); }

        // تم تغيير اسم العمود هنا إلى password_hash ليتطابق مع جدولك
        if (password) {
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash(password, 10);
            query += 'password_hash = ?, '; 
            params.push(hashedPassword);
        }

        // إزالة آخر فاصلة
        query = query.slice(0, -2);
        query += ' WHERE id = ?';
        params.push(userId);

        if (params.length === 1) {
            return res.status(400).json({ message: 'لا توجد بيانات لتحديثها' });
        }

        // تنفيذ الاستعلام باستخدام المتغير connection الخاص بكِ
        await connection.execute(query, params);
        res.status(200).json({ message: 'تم تحديث البيانات بنجاح' });

    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ message: 'خطأ في تحديث البيانات' });
    }
};
exports.getProfile = async (req, res) => {
    try {
        const [rows] = await connection.execute(
           'SELECT id, username, full_name, email, phone, role FROM users WHERE id = ?',
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'المستخدم غير موجود' });
        }

        // إرجاع البيانات داخل كائن واضح
        res.status(200).json({
            success: true,
            user: rows[0] 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'خطأ في جلب بيانات الملف الشخصي' });
    }
};
