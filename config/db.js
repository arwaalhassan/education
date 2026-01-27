// config/db.js (الإصدار الصحيح باستخدام Promises)

// استيراد واجهة Promises من mysql2
const mysql = require('mysql2/promise'); 

// البيانات الخاصة بك:
const DB_CONFIG = {
    host: 'localhost',
    user: 'admin',
    password: 'Admin@123#',
    database: 'flutter_app',
    waitForConnections: true, // مهم جداً
    connectionLimit: 10,      // يُفضل استخدام Pool في بيئات الإنتاج
    queueLimit: 0,
    connectTimeout: 10000
};

// =========================================================
// *التحسين*: استخدام Pool بدلاً من Connection مفرد
// =========================================================
// Pool هو الأفضل للخادم لأنه يدير اتصالات متعددة
const pool = mysql.createPool(DB_CONFIG);

// يمكن إضافة اختبار اتصال لمرة واحدة
pool.getConnection()
    .then(connection => {
        console.log('Connect to DB success using Pool.');
        connection.release(); // إعادة الاتصال إلى الـ Pool
    })
    .catch(err => {
        console.error('Error connecting to database Pool:', err);
    });


// تصدير الـ Pool (الذي يدعم .execute)
module.exports = pool; 

// ملاحظة: إذا كنت تصر على استخدام createConnection، يجب استبدالها بـ createPool كما هو موضح أعلاه للحصول على أفضل أداء.
