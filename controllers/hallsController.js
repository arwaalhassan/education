const db = require('../db');

exports.getHalls = (req, res) => {
  db.query('SELECT * FROM lecture_halls', (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
};

exports.addHall = (req, res) => {
  const { name, location } = req.body;
  db.query('INSERT INTO lecture_halls (name, location) VALUES (?, ?)', [name, location], (err, result) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ success: true, hallId: result.insertId });
  });
};

exports.deleteHalls = (req, res) => {
  const { id } = req.params;

  const sql = 'DELETE FROM lecture_halls WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'غير موجود' });
    }
    res.json({ success: true, message: 'تم حذف  بنجاح' });
  });
};

