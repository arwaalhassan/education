const db = require('../db');

// عرض جميع الروابط
const getAllLinks = (req, res) => {
  const sql = 'SELECT * FROM platform_links ORDER BY created_at DESC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, links: results });
  });
};

// إضافة رابط جديد
const addLink = (req, res) => {
  const { title, url } = req.body;
  if (!title || !url) {
    return res.status(400).json({ success: false, message: 'Title and URL are required' });
  }

  const sql = 'INSERT INTO platform_links (title, url) VALUES (?, ?)';
  db.query(sql, [title, url], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: 'Insert failed' });
    res.json({ success: true, message: 'Link added successfully', id: result.insertId });
  });
};

// حذف رابط
const deleteLink = (req, res) => {
  const { id } = req.params;

  const sql = 'DELETE FROM platform_links WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: 'Delete failed' });

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Link not found' });
    }

    res.json({ success: true, message: 'Link deleted successfully' });
  });
};

module.exports = { getAllLinks, addLink, deleteLink };

