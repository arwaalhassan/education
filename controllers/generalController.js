// يجب استيراد الاتصال بقاعدة البيانات في بداية الملف
const connection = require('../config/db'); 

// [1] جلب الإعلانات
exports.getAnnouncements = async (req, res) => {
    try {
        const query = 'SELECT id, content, image_url, created_at FROM announcements ORDER BY created_at DESC';
        const [announcements] = await connection.execute(query);

        // معالجة الرابط ليتمكن الفرونت إند من قراءته
        const formattedAnnouncements = announcements.map(ann => ({
            ...ann,
            imageUrl: ann.image_url ? `http://192.168.1.128:3000/uploads/${ann.image_url}` : null
        }));

        res.status(200).json(formattedAnnouncements);
    } catch (error) {
        console.error("Error in getAnnouncements:", error);
        res.status(500).json({ message: 'Server error fetching announcements.' });
    }
};

// [2] جلب روابط المنصة
exports.getPlatformLinks = async (req, res) => {
    try {
        const query = 'SELECT id, title, url FROM platform_links ORDER BY title ASC';
        const [links] = await connection.execute(query);
        res.status(200).json(links);
    } catch (error) {
        console.error("Error in getPlatformLinks:", error);
        res.status(500).json({ message: 'Server error fetching links.' });
    }
};

// [3] جلب الإحصائيات (تأكد من وجود هذه الدالة لأنها مستخدمة في الراوتر)
exports.getStats = async (req, res) => {
    try {
        const [students] = await connection.execute('SELECT COUNT(*) as total FROM users WHERE role = "student"');
        const [courses] = await connection.execute('SELECT COUNT(*) as total FROM courses');
        const [earnings] = await connection.execute('SELECT SUM(price) as total FROM payments WHERE status = "completed"');

        res.status(200).json({
            totalStudents: students[0].total,
            totalCourses: courses[0].total,
            totalEarnings: earnings[0].total || 0,
            rating: "4.9" // قيمة افتراضية أو من قاعدة البيانات
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats' });
    }
};
