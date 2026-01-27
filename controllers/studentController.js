// controllers/studentController.js

const connection = require('../config/db');

// =========================================================
// [1] جلب قائمة الفيديوهات التي يملكها الطالب
// =========================================================
exports.getVideos = async (req, res) => {
    // 1. استخلاص مُعرف المستخدم من التوكن (req.user تم تعيينه في الـ Middleware)
    const userId = req.user.id;

    try {
        // 2. الاستعلام عن قاعدة البيانات: جلب جميع الفيديوهات المرتبطة بـ user_id هذا.
        // نفترض أن لدينا جدول ربط يسمى user_videos
        const query = `
            SELECT 
                v.id, v.title, v.description
            FROM 
                videos v
            JOIN 
                user_videos uv ON v.id = uv.video_id
            WHERE 
                uv.user_id = ?
        `;
        const [videos] = await connection.execute(query, [userId]);

        if (videos.length === 0) {
            return res.status(404).json({ message: 'لم يتم العثور على فيديوهات لديك حق الوصول إليها.' });
        }

        // 3. إرجاع قائمة الفيديوهات (دون المسار الحقيقي للملف)
        res.status(200).json({ 
            message: `تم العثور على ${videos.length} فيديو.`,
            videos: videos
        });

    } catch (error) {
        console.error("Error fetching videos:", error);
        res.status(500).json({ message: 'خطأ في الخادم أثناء جلب الفيديوهات.' });
    }
};

// =========================================================
// [2] جلب رابط تشغيل فيديو محدد (التحقق من الدفع)
// =========================================================
exports.getVideoById = async (req, res) => {
    const userId = req.user.id;
    const { videoId } = req.params;

    try {
        // 1. **التحقق الأمني الحاسم**: هل يمتلك المستخدم حق الوصول إلى هذا الفيديو؟
        const [accessCheck] = await connection.execute(
            'SELECT user_id FROM user_videos WHERE user_id = ? AND video_id = ?', 
            [userId, videoId]
        );

        if (accessCheck.length === 0) {
            // وصول مرفوض (Forbidden)
            return res.status(403).json({ message: 'وصول مرفوض. لم تقم بشراء هذا الفيديو/الدورة أو ليس لديك صلاحية.' });
        }

        // 2. تم منح الوصول: جلب التفاصيل، بما في ذلك المسار الحساس (file_path)
        const [videoResult] = await connection.execute(
            'SELECT title, description, file_storage_path FROM videos WHERE id = ?', 
            [videoId]
        );
        const video = videoResult[0];

        if (!video) {
            return res.status(404).json({ message: 'الفيديو غير موجود.' });
        }
        
        // 3. إرجاع مسار التشغيل الآمن (وهو رابط الفيديو الفعلي)
        res.status(200).json({
            message: 'تم الوصول إلى الفيديو بنجاح.',
            video: {
                title: video.title,
                description: video.description,
                // هذا هو الرابط الفعلي للملف:
                stream_url: video.file_storage_path 
            }
        });

    } catch (error) {
        console.error("Error fetching video by ID:", error);
        res.status(500).json({ message: 'خطأ في الخادم أثناء جلب رابط الفيديو.' });
    }
};
