const db = require('../db');
exports.getUserCourses = (req, res) => {
 const sql = `
    SELECT 
      rc.id,
      rc.user_id,
      rc.course_id,
      rc.course_type,
      rc.course_title,
      rc.trainer,
      rc.price,
      u.email
    FROM 
      registered_courses rc
    JOIN 
      users u ON rc.user_id = u.id;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err
      });
    }

    res.json({
      success: true,
      data: results
    });
  });
};


