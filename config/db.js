const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// تحميل الإعدادات من ملف .env (للتطوير المحلي)
dotenv.config();

const DB_CONFIG = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 25432, // المنفذ الخاص بـ Aiven
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
    // هذا السطر ضروري جداً للاتصال بـ Aiven السحابي
    ssl: {
        rejectUnauthorized: false
    }
};

const pool = mysql.createPool(DB_CONFIG);

// اختبار الاتصال
pool.getConnection()
    .then(connection => {
        console.log('✅ Connected to Aiven MySQL Database successfully!');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
    });

module.exports = pool;
