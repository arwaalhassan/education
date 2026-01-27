const multer = require('multer');
const path = require('path');
const fs = require('fs');

// التأكد من وجود المجلدات برمجياً لتجنب الأخطاء
const uploadDir = 'uploads/materials';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // سنحفظ كل شيء في مجلد واحد أو يمكنك تقسيمها بناءً على نوع الملف
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // الحفاظ على الاسم الأصلي مع إضافة اللاحقة الفريدة
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 150 // قمنا برفع الحجم لـ 150 ميجابايت ليتناسب مع الفيديوهات
    },
    fileFilter: (req, file, cb) => {
        // التعديل هنا: السماح بالفيديو + PDF + Word
        const allowedTypes = [
            'video/mp4', 'video/mpeg', 'video/quicktime', // فيديوهات
            'application/pdf',                            // PDF
            'application/msword',                         // Word .doc
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // Word .docx
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('نوع الملف غير مدعوم! يسمح فقط بالفيديوهات، PDF، و Word.'), false);
        }
    }
}).single('file'); // غيرنا الاسم لـ 'file' ليكون عاماً للمواد التعليمية

exports.uploadMiddleware = (req, res, next) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `خطأ في الرفع: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ message: err.message });
        }
        
        // إذا لم يتم اختيار ملف أصلاً
        if (!req.file) {
            return res.status(400).json({ message: "يرجى اختيار ملف لرفعه" });
        }
        
        next();
    });
};
