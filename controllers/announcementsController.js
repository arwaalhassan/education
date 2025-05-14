const db = require('../db');
exports.addAnnouncement = (req, res) => {
  const { content } = req.body;
  const image = req.file ? req.file.filename : null;

  if (!content || content.trim() === '') {
    return res.status(400).json({ error: 'محتوى الإعلان مطلوب' });
  }

  const sql = 'INSERT INTO announcements (content, image) VALUES (?, ?)';
  db.query(sql, [content, image], (err, result) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ success: true, id: result.insertId });
  });
};
 
 exports.getAnnouncements = (req, res) => {
  const sql = 'SELECT * FROM announcements ORDER BY id DESC';
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows.map(row => ({
  ...row,
  imageUrl: row.image ? `http://yourdomain.com/uploads/${row.image}` : null
})));

  });
};


exports.deleteAnnouncement = (req, res) => {
  const { id } = req.params;

  const sql = 'DELETE FROM announcements WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'الإعلان غير موجود' });
    }
    res.json({ success: true, message: 'تم حذف الإعلان بنجاح' });
  });
};

