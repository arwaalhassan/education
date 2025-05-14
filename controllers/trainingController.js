const db = require('../db');

// إضافة كورس
exports.addCourse = (req, res) => {
  const { title, description, trainer, price } = req.body;
  const sql = 'INSERT INTO training_courses (title, description, trainer, price) VALUES (?, ?, ?, ?)';
  db.query(sql, [title, description, trainer, price], (err, result) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ success: true, courseId: result.insertId });
  });
};
// حذف كورس بالمعرف
exports.deleteCourse = (req, res) => {
  const { id } = req.params;

  const sql = 'DELETE FROM training_courses WHERE id = ?';

  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'DB error' });

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'الكورس غير موجود' });
    }

    res.json({ success: true, message: 'تم حذف الكورس بنجاح' });
  });
};


exports.registerToCourse = (req, res) => {
  const { user_id, course_id, course_type } = req.body;

  const checkSql = `
    SELECT * FROM registered_courses 
    WHERE user_id = ? AND course_id = ? AND course_type = ?
  `;

  db.query(checkSql, [user_id, course_id, course_type], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Check error', error: err });
    }

    if (results.length > 0) {
      return res.status(409).json({ success: false, message: 'Already registered' });
    }

    // حدد الجدول المناسب حسب نوع الكورس
    let table = '';
    if (course_type === 'training') table = 'training_courses';
    else if (course_type === 'education') table = 'education_courses';
    else if (course_type === 'islamic') table = 'islamic_courses';
    else return res.status(400).json({ success: false, message: 'Invalid course_type' });

    const courseSql = `SELECT title, description, trainer, price FROM ${table} WHERE id = ?`;
    db.query(courseSql, [course_id], (err, courseResult) => {
      if (err || courseResult.length === 0) {
        return res.status(500).json({ success: false, message: 'Course not found', error: err });
      }

      const { title, trainer, price } = courseResult[0];

      const insertSql = `
        INSERT INTO registered_courses (user_id, course_id, course_type, course_title, trainer, price)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      db.query(insertSql, [user_id, course_id, course_type, title, trainer, price], (err, result) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Insert error', error: err });
        }
        res.json({ success: true });
      });
    });
  });
};


// جلب الكورسات
exports.getCourses = (req, res) => {
  const sql = 'SELECT * FROM training_courses';
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
};

// إضافة للجدول الأسبوعي
exports.addSchedule = (req, res) => {
  const { course_id, day_of_week, start_time, end_time, hall_id } = req.body;
  const sql = 'INSERT INTO training_schedule (course_id, day_of_week, start_time, end_time, hall_id) VALUES (?, ?, ?, ?, ?)';
  db.query(sql, [course_id, day_of_week, start_time, end_time, hall_id], (err, result) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ success: true });
  });
};

// جلب الجدول الأسبوعي
exports.getSchedule = (req, res) => {
  const sql = `
    SELECT ts.*, tc.title AS course_title, lh.name AS hall_name 
    FROM training_schedule ts
    JOIN training_courses tc ON ts.course_id = tc.id
    JOIN lecture_halls lh ON ts.hall_id = lh.id
  `;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
};


exports.deleteSchedule = (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM training_schedule WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ success: true, message: 'تم حذف الموعد بنجاح' });
  });
};
// تعديل موعد بالمعرف
exports.updateSchedule = (req, res) => {
  const { id } = req.params;
  const { course_id, day_of_week, start_time, end_time, hall_id } = req.body;

  const sql = `
    UPDATE training_schedule
    SET course_id = ?, day_of_week = ?, start_time = ?, end_time = ?, hall_id = ?
    WHERE id = ?
  `;

  db.query(sql, [course_id, day_of_week, start_time, end_time, hall_id, id], (err, result) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ success: true, message: 'تم تحديث الموعد بنجاح' });
  });
};
