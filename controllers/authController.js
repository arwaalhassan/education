const db = require('../db');

// تسجيل الدخول
const login = (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';

  db.query(sql, [username, password], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'DB ERROR' });

    if (results.length > 0) {
      return res.json({ success: true, user: results[0] });
    } else {
      return res.json({ success: false, message: 'Invalid credentials' });
    }
  });
};

// تسجيل مستخدم جديد
const register = (req, res) => {
  const { username, email, password } = req.body;
const role = 'user'; 


  // التحقق من وجود البريد الإلكتروني مسبقًا
  const checkQuery = 'SELECT * FROM users WHERE email = ?';
  db.query(checkQuery, [email], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error on check' });

    if (results.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }

    const insertQuery = 'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)';
    db.query(insertQuery, [username, email, password, role], (err, result) => {
      if (err) return res.status(500).json({ success: false, message: 'DB error on insert' });

      res.json({
        success: true,
        user: {
          id: result.insertId,
          username,
          email,
          role
        }
      });
    });
  });
};

module.exports = { login, register };

